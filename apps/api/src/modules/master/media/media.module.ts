import { Module } from '@nestjs/common';
import { MediaController } from './presentation/media.controller';
import { MediaService } from './application/media.service';
import { StorageModule } from '@/modules/system/storage/storage.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [StorageModule, PrismaModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
