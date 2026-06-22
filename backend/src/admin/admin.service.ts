import { Injectable } from '@nestjs/common';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  async kpis() {
    const [utilisateurs, sessionsOuvertes, pots, retraitsEnAttente] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.session.count({ where: { statut: 'open' } }),
      this.prisma.session.aggregate({ _sum: { potTotal: true }, where: { statut: 'open' } }),
      this.prisma.paymentIntent.count({ where: { direction: 'retrait', statut: 'pending' } }),
    ]);
    return {
      utilisateurs,
      sessionsOuvertes,
      potCumuleFcfa: pots._sum.potTotal ?? 0,
      retraitsEnAttente,
    };
  }

  pendingWithdrawals() {
    return this.prisma.paymentIntent.findMany({
      where: { direction: 'retrait', statut: 'pending' },
      include: { user: { select: { username: true, nom: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  approveWithdrawal(id: string) {
    return this.payments.settleIntent(id, 'success');
  }

  rejectWithdrawal(id: string) {
    return this.payments.settleIntent(id, 'failed');
  }
}
