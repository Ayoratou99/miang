import { Controller, Get, Query } from '@nestjs/common';
import { PresenceService } from './presence.service';

@Controller('presence')
export class PresenceController {
  constructor(private readonly presence: PresenceService) {}

  /** GET /presence?ids=a,b,c → { a: true, b: false, ... } */
  @Get()
  who(@Query('ids') ids?: string) {
    const list = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    return this.presence.whoIsOnline(list);
  }
}
