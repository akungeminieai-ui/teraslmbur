import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Non-blocking connection init for sub-100ms serverless cold start
    this.$connect().catch(() => {});
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
