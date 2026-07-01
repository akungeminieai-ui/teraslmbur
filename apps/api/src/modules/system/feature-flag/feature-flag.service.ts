import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Checks if a feature flag is enabled dynamically for a given outlet or user.
   */
  async isEnabled(key: string, context?: { outletId?: string; userId?: string }): Promise<boolean> {
    const outletScope = context?.outletId || 'global';
    const userScope = context?.userId || 'global';
    const cacheKey = `feature_flag:${key}:${outletScope}:${userScope}`;
    const redis = this.redis.getClient();

    try {
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        return cached === 'true';
      }
    } catch (e) {
      this.logger.warn(`Failed to read feature flag cache key: ${cacheKey}`);
    }

    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
    });

    if (!flag) {
      return false;
    }

    const enabled = await this.evaluateFlag(flag, context);

    try {
      // Cache results for 30s to handle real-time percentage checks and scheduled expirations
      await redis.set(cacheKey, enabled ? 'true' : 'false', 'EX', 30);
    } catch (e) {
      this.logger.warn(`Failed to write feature flag cache key: ${cacheKey}`);
    }

    return enabled;
  }

  private async evaluateFlag(flag: any, context?: { outletId?: string; userId?: string }): Promise<boolean> {
    // 1. Core global toggle
    if (!flag.enabled) return false;

    // 2. Scheduled activation check
    const now = new Date();
    if (flag.startDate && now < new Date(flag.startDate)) {
      return false;
    }

    // 3. Scheduled expiration check
    if (flag.endDate && now > new Date(flag.endDate)) {
      return false;
    }

    // 4. Evaluate flag dependencies (all parent flags must be active)
    if (flag.dependencies && flag.dependencies.length > 0) {
      for (const depKey of flag.dependencies) {
        const depEnabled = await this.isEnabled(depKey, context);
        if (!depEnabled) return false;
      }
    }

    // 5. Evaluate custom rules list (outlet & user permissions lists)
    if (flag.rules && typeof flag.rules === 'object') {
      const rules = flag.rules as Record<string, any>;
      if (rules.outlets && Array.isArray(rules.outlets)) {
        if (!context?.outletId || !rules.outlets.includes(context.outletId)) {
          return false;
        }
      }
      if (rules.users && Array.isArray(rules.users)) {
        if (!context?.userId || !rules.users.includes(context.userId)) {
          return false;
        }
      }
    }

    // 6. Evaluate percentage rollout (0-100%)
    if (flag.rolloutPercentage < 100) {
      const targetHashSeed = context?.outletId || context?.userId || 'global-anonymous-seed';
      const hashVal = this.getHashNumber(targetHashSeed + flag.key);
      const bucket = hashVal % 100;
      if (bucket >= flag.rolloutPercentage) {
        return false;
      }
    }

    return true;
  }

  private getHashNumber(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }
}
