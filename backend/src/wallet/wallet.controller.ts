import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  async me(@CurrentUser('id') userId: string) {
    return { soldeFcfa: await this.wallet.balance(userId) };
  }

  @Get('transactions')
  transactions(@CurrentUser('id') userId: string) {
    return this.wallet.transactions(userId);
  }
}
