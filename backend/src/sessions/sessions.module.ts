import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { WalletModule } from '../wallet/wallet.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [WalletModule, ChatModule],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
