import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants';
import { MovementDto, WebhookDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('deposit')
  @HttpCode(200)
  deposit(@CurrentUser('id') userId: string, @Body() dto: MovementDto) {
    return this.payments.deposit(userId, dto.montant, dto.operateur, dto.phone);
  }

  @Post('withdraw')
  @HttpCode(200)
  @RequirePermission(PERMISSIONS.WALLET_WITHDRAW)
  withdraw(@CurrentUser('id') userId: string, @Body() dto: MovementDto) {
    return this.payments.withdraw(userId, dto.montant, dto.operateur, dto.phone);
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  webhook(@Headers('x-webhook-secret') secret: string, @Body() dto: WebhookDto) {
    return this.payments.handleWebhook(secret, dto.idempotencyKey, dto.status);
  }
}
