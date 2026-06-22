import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_DRAW } from '../common/constants';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletModule } from '../wallet/wallet.module';
import { DrawController } from './draw.controller';
import { DrawService } from './draw.service';

@Module({
  imports: [WalletModule, NotificationsModule, BullModule.registerQueue({ name: QUEUE_DRAW })],
  controllers: [DrawController],
  providers: [DrawService],
  exports: [DrawService, BullModule],
})
export class DrawModule {}
