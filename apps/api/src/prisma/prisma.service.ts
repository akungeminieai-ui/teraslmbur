import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (_err) {
      // Prisma Client lazily connects on first query
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
