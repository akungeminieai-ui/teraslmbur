import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class BusinessCalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Translates a calendar timestamp into the corresponding operational Business Date.
   *
   * @param date The calendar timestamp (defaults to current time)
   * @param outletId The operational outlet identifier
   * @returns String formatted business date in "YYYY-MM-DD" format
   */
  async getBusinessDate(date: Date = new Date(), outletId?: string): Promise<string> {
    let startHour = 6; // default 6 AM
    let startMinute = 0;

    // Fetch operational business day start setting if available
    if (outletId) {
      try {
        const startVal = await this.settingsService.get('business_day_start_hour', outletId);
        if (startVal) {
          const parts = startVal.split(':');
          const hStr = parts[0];
          const mStr = parts[1];
          if (hStr !== undefined && mStr !== undefined) {
            startHour = parseInt(hStr, 10);
            startMinute = parseInt(mStr, 10);
          }
        }
      } catch (e) {
        // Fallback to defaults
      }
    }

    const checkDate = new Date(date);
    const checkHour = checkDate.getHours();
    const checkMinute = checkDate.getMinutes();

    // If time is before operational start hour, subtract one calendar day
    const isBeforeStart = 
      checkHour < startHour || 
      (checkHour === startHour && checkMinute < startMinute);

    if (isBeforeStart) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const yyyy = checkDate.getFullYear();
    const mm = (checkDate.getMonth() + 1).toString().padStart(2, '0');
    const dd = checkDate.getDate().toString().padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }
}
