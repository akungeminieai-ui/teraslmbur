import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SettingsService implements OnModuleInit {
  private defaultTtl = 3600; // 1 hour default cache TTL

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    // Warm cache on application startup for the default outlet
    try {
      await this.warmCache('default-outlet');
    } catch (e) {
      console.warn('⚠️ Settings cache warm-up skipped: ', String(e));
    }
  }

  private getCacheKey(key: string, outletId?: string): string {
    return `setting:${outletId || 'global'}:${key}`;
  }

  /**
   * Retrieves a setting value dynamically, checking Redis cache first.
   * If cache misses, queries PostgreSQL and caches the result.
   */
  async get(key: string, outletId?: string): Promise<string> {
    const cacheKey = this.getCacheKey(key, outletId);

    // 1. Try reading from Redis Cache
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached !== null) return cached;
    } catch (e) {
      console.warn('⚠️ Redis cache read error: ', e);
    }

    // 2. Cache Miss: Fetch from DB joining SettingValue and SettingDefinition
    const definition = await this.prisma.settingDefinition.findUnique({
      where: { key },
    });

    if (!definition) {
      throw new BadRequestException(`Undefined configuration key: ${key}`);
    }

    let valRecord: any = null;
    if (outletId) {
      valRecord = await this.prisma.settingValue.findUnique({
        where: {
          definitionId_outletId: {
            definitionId: definition.id,
            outletId,
          },
        },
      });
    }

    // If outlet-specific value not found, check global value (outletId is null)
    if (!valRecord) {
      valRecord = await this.prisma.settingValue.findFirst({
        where: {
          definitionId: definition.id,
          outletId: null,
        },
      });
    }

    const finalValue = valRecord ? valRecord.value : (definition.defaultValue || '');

    // 3. Cache the resolved value in Redis
    try {
      await this.redis.set(cacheKey, finalValue, this.defaultTtl);
    } catch (e) {
      console.warn('⚠️ Redis cache write error: ', e);
    }

    return finalValue;
  }

  /**
   * Sets/updates a setting value, invalidates associated cache keys.
   */
  async set(key: string, value: string, outletId?: string): Promise<void> {
    const definition = await this.prisma.settingDefinition.findUnique({
      where: { key },
    });

    if (!definition) {
      throw new BadRequestException(`Cannot assign value for undefined key: ${key}`);
    }

    // TODO: Apply optional validationRule regex checks here if definition.validationRule is configured

    const existing = await this.prisma.settingValue.findFirst({
      where: {
        definitionId: definition.id,
        outletId: outletId || null,
      },
    });

    if (existing) {
      await this.prisma.settingValue.update({
        where: { id: existing.id },
        data: { value },
      });
    } else {
      await this.prisma.settingValue.create({
        data: {
          definitionId: definition.id,
          outletId: outletId || null,
          value,
        },
      });
    }

    // Invalidate the cache
    const cacheKey = this.getCacheKey(key, outletId);
    try {
      await this.redis.del(cacheKey);
    } catch (e) {
      console.warn('⚠️ Redis cache invalidation error: ', e);
    }
  }

  /**
   * Pre-loads all active settings values for an outlet into Redis.
   */
  async warmCache(outletId?: string): Promise<void> {
    const values = await this.prisma.settingValue.findMany({
      where: { outletId: outletId || null },
      include: { definition: true },
    });

    for (const val of values) {
      const cacheKey = this.getCacheKey(val.definition.key, outletId);
      await this.redis.set(cacheKey, val.value, this.defaultTtl);
    }
  }

  /**
   * Invalidates all cache entries for an outlet.
   */
  async invalidateOutletCache(outletId?: string): Promise<void> {
    const pattern = `setting:${outletId || 'global'}:*`;
    try {
      await this.redis.delPattern(pattern);
    } catch (e) {
      console.warn('⚠️ Redis pattern invalidation failed: ', e);
    }
  }
}
