import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class SequenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Generates a concurrency-safe, gapless transaction-locked sequence number.
   * Uses PostgreSQL FOR UPDATE row locking.
   *
   * @param key The sequence namespace (e.g. 'order', 'receipt', 'invoice', 'purchase_order', 'expense', 'inventory_transaction', 'shift', 'reservation')
   * @param outletId The operational outlet identifier
   * @returns Configured formatted sequence number
   */
  async generate(key: string, outletId: string): Promise<string> {
    const today = new Date();
    const yyyy = today.getFullYear().toString();
    const mm = (today.getMonth() + 1).toString().padStart(2, '0');
    const dd = today.getDate().toString().padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    try {
      // 1. Fetch sequence counter atomically with FOR UPDATE lock
      const counter = await this.prisma.$transaction(async (tx) => {
        // Ensure record exists (INSERT ... ON CONFLICT DO NOTHING)
        const id = `${key}_${outletId}_${dateStr}`;
        await tx.$executeRawUnsafe(`
          INSERT INTO "Sequence" ("id", "key", "outletId", "date", "current", "updatedAt")
          VALUES ('${id}', '${key}', '${outletId}', '${dateStr}', 0, NOW())
          ON CONFLICT ("key", "outletId", "date") DO NOTHING
        `);

        // Select and lock the row
        const rows: any[] = await tx.$queryRawUnsafe(`
          SELECT "current" FROM "Sequence"
          WHERE "key" = '${key}' AND "outletId" = '${outletId}' AND "date" = '${dateStr}'
          FOR UPDATE
        `);

        if (!rows || rows.length === 0) {
          throw new Error('Sequence row lock acquisition failed');
        }

        const nextVal = (rows[0].current ?? 0) + 1;

        // Update the counter
        await tx.$executeRawUnsafe(`
          UPDATE "Sequence"
          SET "current" = ${nextVal}, "updatedAt" = NOW()
          WHERE "key" = '${key}' AND "outletId" = '${outletId}' AND "date" = '${dateStr}'
        `);

        return nextVal;
      });

      // 2. Fetch format configuration from system settings
      let formatSettingVal = '';
      try {
        formatSettingVal = await this.settingsService.get(`sequence_format_${key}`, outletId);
      } catch (e) {
        // default settings fallback will trigger
      }

      // Default formats based on keys
      let formatPattern = 'TL-{OUTLET}-{YYYYMMDD}-{0001}';
      if (key === 'receipt' || key === 'invoice') {
        formatPattern = 'INV-{YYYYMMDD}-{000001}';
      } else if (key === 'purchase_order') {
        formatPattern = 'PO-{YYYYMMDD}-{00001}';
      } else if (key === 'expense') {
        formatPattern = 'EXP-{YYYYMMDD}-{00001}';
      } else if (key === 'inventory_transaction') {
        formatPattern = 'TX-{YYYYMMDD}-{000001}';
      } else if (key === 'shift') {
        formatPattern = 'SH-{YYYYMMDD}-{001}';
      } else if (key === 'reservation') {
        formatPattern = 'RES-{YYYYMMDD}-{0001}';
      }

      if (formatSettingVal) {
        formatPattern = formatSettingVal;
      }

      // 3. Resolve template placeholders
      let outletCode = 'MAIN';
      const outlet = await this.prisma.outlet.findUnique({
        where: { id: outletId },
      });
      if (outlet && outlet.code) {
        outletCode = outlet.code;
      }

      let formatted = formatPattern
        .replace('{OUTLET}', outletCode)
        .replace('{YYYYMMDD}', dateStr);

      // Match padding placeholders like {0001} or {000001}
      const paddingMatch = formatted.match(/\{([0]+1)\}/);
      if (paddingMatch) {
        const placeholder = paddingMatch[0]; // e.g. "{0001}"
        const padLength = paddingMatch[1].length; // e.g. 4
        const paddedValue = counter.toString().padStart(padLength, '0');
        formatted = formatted.replace(placeholder, paddedValue);
      }

      return formatted;
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Could not generate sequence identifier',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
