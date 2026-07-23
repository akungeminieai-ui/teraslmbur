import { Controller, Post, Body, UseInterceptors, UploadedFile, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from '../application/media.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

interface ExpressFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@ApiTags('Media')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a product photo / media file' })
  async upload(
    @UploadedFile() file: ExpressFile,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.mediaService.createMedia(
      file.originalname,
      file.buffer,
      file.mimetype,
      userId,
    );
  }

  @Post('generate-ai')
  @ApiOperation({ summary: 'Generate a food/beverage photo using mock AI' })
  async generateAi(
    @Body() body: { prompt: string },
    @CurrentUser('id') userId: string,
  ) {
    if (!body.prompt) {
      throw new BadRequestException('Prompt is required');
    }
    return this.mediaService.generateAiImage(body.prompt, userId);
  }
}
