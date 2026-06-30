import { Module, Global } from '@nestjs/common';
import { BusinessCalendarService } from './calendar.service';

@Global()
@Module({
  providers: [BusinessCalendarService],
  exports: [BusinessCalendarService],
})
export class BusinessCalendarModule {}
