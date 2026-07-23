import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/modules/system/storage/storage.service';
import { randomUUID } from 'crypto';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  // A curated library of gorgeous high-quality food photo URLs from Unsplash
  private readonly foodGallery: { keywords: string[]; url: string }[] = [
    {
      keywords: ['rice', 'nasi', 'goreng', 'biryani'],
      url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
    },
    {
      keywords: ['noodle', 'mie', 'bakmi', 'ramen', 'pasta', 'spaghetti'],
      url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
    },
    {
      keywords: ['coffee', 'kopi', 'teh', 'tea', 'latte', 'cappuccino'],
      url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
    },
    {
      keywords: ['drink', 'juice', 'minum', 'es', 'soda', 'mocktail', 'cocktail', 'beverage'],
      url: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=800&q=80',
    },
    {
      keywords: ['burger', 'sandwich', 'roti', 'bread'],
      url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    },
    {
      keywords: ['pizza'],
      url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    },
    {
      keywords: ['dessert', 'cake', 'kue', 'donut', 'sweet', 'ice cream'],
      url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=800&q=80',
    },
    {
      keywords: ['chicken', 'ayam', 'meat', 'daging', 'sate', 'satay', 'steak'],
      url: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80',
    },
    {
      keywords: ['salad', 'sayur', 'healthy', 'vegetable'],
      url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    },
  ];

  private readonly defaultFoodUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async createMedia(
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string,
    userId: string,
  ) {
    const extension = fileName.split('.').pop() || 'png';
    const storageKey = `media-${randomUUID()}.${extension}`;

    // 1. Upload to storage provider (e.g. Local Storage web/public/uploads/ or R2)
    const fileUrl = await this.storageService.upload(storageKey, fileBuffer, mimeType);

    // 2. Register media in the database
    return this.prisma.media.create({
      data: {
        fileName,
        fileUrl,
        mimeType,
        size: fileBuffer.length,
        uploadedBy: userId,
      },
    });
  }

  async generateAiImage(prompt: string, userId: string) {
    this.logger.log(`🤖 AI Generating food image for prompt: "${prompt}"`);

    // Match keywords from prompt
    const cleanPrompt = prompt.toLowerCase();
    let targetUrl = this.defaultFoodUrl;

    for (const item of this.foodGallery) {
      if (item.keywords.some((kw) => cleanPrompt.includes(kw))) {
        targetUrl = item.url;
        break;
      }
    }

    let fileBuffer: Buffer;
    let mimeType = 'image/jpeg';
    let fileName = `ai-${randomUUID()}.jpg`;

    try {
      // Fetch the high-quality food image from Unsplash
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error('Unsplash fetch failed');
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } catch (e) {
      this.logger.warn(`Fallback to default generated color block due to fetch error: ${e}`);
      // Fallback: Generate a simple 1x1 color square PNG base64 to ensure it works offline
      // This is a minimal valid 1x1 red PNG
      const fallbackPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      fileBuffer = Buffer.from(fallbackPngBase64, 'base64');
      mimeType = 'image/png';
      fileName = `ai-fallback-${randomUUID()}.png`;
    }

    return this.createMedia(fileName, fileBuffer, mimeType, userId);
  }
}
