import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LedgerType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface LedgerRef {
  ref?: string;
  sessionId?: string;
  paymentIntentId?: string;
}

/**
 * Internal money authority. NEVER driven directly by the client to move money.
 * Every balance change is a signed ledger entry written in the SAME PG
 * transaction as the wallet update (append-only, atomic).
 */
@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureWallet(userId: string): Promise<void> {
    await this.prisma.wallet.upsert({ where: { userId }, create: { userId }, update: {} });
  }

  async balance(userId: string): Promise<number> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    return wallet?.soldeFcfa ?? 0;
  }

  async transactions(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return [];
    }
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return entries.map((e) => ({
      id: e.id,
      type: e.type,
      libelle: e.ref ?? this.defaultLabel(e.type),
      montant: e.montant,
      date: e.createdAt.toISOString(),
    }));
  }

  /**
   * Apply a signed movement inside an existing transaction (compose with stakes/payouts).
   * Positive = credit, negative = debit. Throws if it would overdraw.
   */
  async applyInTx(
    tx: Prisma.TransactionClient,
    userId: string,
    montant: number,
    type: LedgerType,
    ref?: LedgerRef,
  ): Promise<number> {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Portefeuille introuvable');
    }
    const soldeApres = wallet.soldeFcfa + montant;
    if (soldeApres < 0) {
      throw new BadRequestException('Solde insuffisant');
    }
    await tx.wallet.update({ where: { id: wallet.id }, data: { soldeFcfa: soldeApres } });
    await tx.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        type,
        montant,
        soldeApres,
        ref: ref?.ref,
        sessionId: ref?.sessionId,
        paymentIntentId: ref?.paymentIntentId,
      },
    });
    return soldeApres;
  }

  credit(userId: string, montant: number, type: LedgerType, ref?: LedgerRef): Promise<number> {
    return this.prisma.$transaction((tx) => this.applyInTx(tx, userId, Math.abs(montant), type, ref));
  }

  debit(userId: string, montant: number, type: LedgerType, ref?: LedgerRef): Promise<number> {
    return this.prisma.$transaction((tx) =>
      this.applyInTx(tx, userId, -Math.abs(montant), type, ref),
    );
  }

  private defaultLabel(type: LedgerType): string {
    const map: Record<LedgerType, string> = {
      depot: 'Dépôt',
      retrait: 'Retrait',
      mise: 'Mise',
      gain: 'Gain',
      remboursement: 'Remboursement',
    };
    return map[type];
  }
}
