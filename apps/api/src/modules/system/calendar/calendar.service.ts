import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class BusinessCalendarService {
  constructor(private readonly prisma: PrismaService) {}

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
      const setting = await this.prisma.setting.findFirst({
        where: {
          key: 'business_day_start_hour',
          outletId,
        },
      });

      if (setting && setting.value) {
        const parts = setting.value.split(':');
        if (parts.length >= 2) {
          startHour = parseInt(parts[0], 10);
          startMinute = parseInt(parts[1], 10);
        }
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
