import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('System Health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check liveness and database connections' })
  async getHealth() {
    const dbHealthy = await this.checkDatabase();
    const redisHealthy = await this.checkRedis();

    const healthy = dbHealthy && redisHealthy;

    const status = {
      status: healthy ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      uptime: process.uptime(),
      details: {
        database: dbHealthy ? 'UP' : 'DOWN',
        redis: redisHealthy ? 'UP' : 'DOWN',
        queue: redisHealthy ? 'UP' : 'DOWN', // Queue runs over Redis
        storage: 'UP', // Mocked R2 Storage Provider status
      },
    };

    if (!healthy) {
      throw new ServiceUnavailableException(status);
    }

    return status;
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Check if API container is running' })
  getLiveness() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Verify if downstream microservices are ready' })
  async getReadiness() {
    return this.getHealth();
  }

  @Get('version')
  @ApiOperation({ summary: 'Retrieve system versioning details' })
  getVersion() {
    return {
      version: '1.0.0',
      hash: process.env.COMMIT_SHA || 'dev-commit-hash',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (e) {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const pong = await this.redis.getClient().ping();
      return pong === 'PONG';
    } catch (e) {
      return false;
    }
  }
}
