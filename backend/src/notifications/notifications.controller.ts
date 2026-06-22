import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  /** Public: the PWA fetches the VAPID public key before subscribing to push. */
  @Public()
  @Get('config')
  publicConfig() {
    return { vapidPublicKey: this.config.get<string>('vapid.publicKey') ?? '' };
  }

  @Get('notifications')
  list(@CurrentUser('id') userId: string) {
    return this.notifications.list(userId);
  }

  @Get('notifications/unread-count')
  unread(@CurrentUser('id') userId: string) {
    return this.notifications.unreadCount(userId);
  }

  @Post('notifications/read/:id')
  read(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notifications.markRead(userId, id);
  }

  @Post('notifications/push/subscribe')
  subscribe(@CurrentUser('id') userId: string, @Body() dto: SubscribePushDto) {
    return this.notifications.subscribe(userId, dto);
  }
}
