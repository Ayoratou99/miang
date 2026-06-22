import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';

const PROVIDER_NAME: Record<PaymentProvider, string> = {
  airtel: 'Airtel Money',
  moov: 'Moov Money',
};

type WebhookStatus = 'success' | 'failed';

/**
 * Deposits/withdrawals via the Mobile Money aggregator. Provider callbacks are
 * IDEMPOTENT: keyed on `idempotencyKey`, a replayed callback never double-credits.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly config: ConfigService,
  ) {}

  private get isStub(): boolean {
    return this.config.get<string>('mobileMoney.provider') === 'stub';
  }

  async deposit(userId: string, montant: number, provider: PaymentProvider, phone?: string) {
    if (montant <= 0) {
      throw new BadRequestException('Montant invalide');
    }
    const key = randomUUID();
    await this.prisma.paymentIntent.create({
      data: {
        userId,
        provider,
        direction: 'depot',
        montant,
        statut: 'pending',
        phone,
        idempotencyKey: key,
        refProvider: `stub-${key.slice(0, 8)}`,
      },
    });
    // Real provider would push a webhook asynchronously; the stub confirms inline.
    if (this.isStub) {
      await this.confirm(key, 'success');
    }
    return { soldeFcfa: await this.wallet.balance(userId) };
  }

  async withdraw(userId: string, montant: number, provider: PaymentProvider, phone?: string) {
    if (montant <= 0) {
      throw new BadRequestException('Montant invalide');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    // Non-negotiable: KYC (age + identity) verified before any withdrawal.
    if (user.kyc !== 'verifie') {
      throw new ForbiddenException({
        message: 'Vérifie ton identité (KYC) avant de retirer.',
        code: 'KYC_REQUIRED',
      });
    }
    const key = randomUUID();
    // Reserve the funds immediately (debit), keyed to a pending intent.
    await this.prisma.$transaction(async (tx) => {
      const intent = await tx.paymentIntent.create({
        data: {
          userId,
          provider,
          direction: 'retrait',
          montant,
          statut: 'pending',
          phone,
          idempotencyKey: key,
          refProvider: `stub-${key.slice(0, 8)}`,
        },
      });
      await this.wallet.applyInTx(tx, userId, -montant, 'retrait', {
        ref: `Retrait — ${PROVIDER_NAME[provider]}`,
        paymentIntentId: intent.id,
      });
    });
    if (this.isStub) {
      await this.confirm(key, 'success');
    }
    return { soldeFcfa: await this.wallet.balance(userId) };
  }

  /** Provider webhook entrypoint — secret-checked, then idempotent. */
  async handleWebhook(secret: string | undefined, idempotencyKey: string, status: WebhookStatus) {
    if (secret !== this.config.get<string>('mobileMoney.webhookSecret')) {
      throw new UnauthorizedException('Signature webhook invalide');
    }
    await this.confirm(idempotencyKey, status);
    return { received: true };
  }

  /** Admin settlement of a withdrawal (approve/reject) by intent id. Idempotent. */
  async settleIntent(intentId: string, status: WebhookStatus): Promise<{ ok: true }> {
    const intent = await this.prisma.paymentIntent.findUnique({ where: { id: intentId } });
    if (!intent) {
      throw new NotFoundException('Paiement introuvable');
    }
    await this.confirm(intent.idempotencyKey, status);
    return { ok: true };
  }

  /** Idempotent settlement. A replayed callback on a terminal intent is a no-op. */
  private async confirm(idempotencyKey: string, status: WebhookStatus): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const intent = await tx.paymentIntent.findUnique({ where: { idempotencyKey } });
      if (!intent) {
        throw new NotFoundException('Paiement introuvable');
      }
      if (intent.statut !== 'pending') {
        return; // already settled — idempotent no-op
      }
      const name = PROVIDER_NAME[intent.provider];
      if (status === 'success') {
        if (intent.direction === 'depot') {
          await this.wallet.applyInTx(tx, intent.userId, intent.montant, 'depot', {
            ref: `Dépôt — ${name}`,
            paymentIntentId: intent.id,
          });
        }
        // retrait success → funds already left at initiation; nothing to move.
        await tx.paymentIntent.update({ where: { id: intent.id }, data: { statut: 'success' } });
      } else {
        if (intent.direction === 'retrait') {
          // Provider rejected → give the reserved funds back.
          await this.wallet.applyInTx(tx, intent.userId, intent.montant, 'remboursement', {
            ref: `Remboursement — ${name}`,
            paymentIntentId: intent.id,
          });
        }
        await tx.paymentIntent.update({ where: { id: intent.id }, data: { statut: 'failed' } });
      }
    });
  }
}
