import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusService } from './event-bus.service';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Set to true to allow wildcards (e.g. 'order.*')
      wildcard: true,
      // The maximum number of listeners that can be assigned to an event
      maxListeners: 20,
    }),
  ],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventBusModule {}
