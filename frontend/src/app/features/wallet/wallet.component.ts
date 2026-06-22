import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { WalletService } from '../../core/data/wallet.service';
import { OperateurId, Transaction, TxType } from '../../core/models';
import { FcfaPipe } from '../../shared/fcfa.pipe';

type Mode = 'depot' | 'retrait' | null;

@Component({
  selector: 'miang-wallet',
  imports: [RouterLink, FcfaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.scss',
})
export class WalletComponent {
  private readonly wallet = inject(WalletService);
  private readonly auth = inject(AuthService);

  protected readonly solde = this.wallet.solde;
  protected readonly transactions = this.wallet.transactions;
  protected readonly operateurs = this.wallet.operateurs;
  /** KYC must be verified before a withdrawal (rule: 18+ & identity). */
  protected readonly kycOk = computed(() => this.auth.currentUser()?.kyc === 'verifie');

  protected readonly mode = signal<Mode>(null);
  protected readonly montant = signal<number | null>(null);
  protected readonly operateur = signal<OperateurId>('airtel');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly misesRapides = [1_000, 5_000, 10_000, 25_000];

  ouvrir(mode: Exclude<Mode, null>): void {
    this.mode.set(mode);
    this.montant.set(null);
    this.operateur.set('airtel');
    this.error.set(null);
  }

  fermer(): void {
    this.mode.set(null);
  }

  onMontant(event: Event): void {
    const v = Number((event.target as HTMLInputElement).value.replace(/\D/g, ''));
    this.montant.set(Number.isNaN(v) || v === 0 ? null : v);
  }

  confirmer(): void {
    const m = this.montant();
    const mode = this.mode();
    if (!m || m <= 0 || !mode) {
      this.error.set('Entre un montant valide');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const op = this.operateur();
    const obs =
      mode === 'depot' ? this.wallet.deposer(m, op) : this.wallet.retirer(m, op);
    obs.subscribe({
      next: () => {
        this.busy.set(false);
        this.fermer();
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.error.set(err.message ?? 'Opération impossible');
      },
    });
  }

  icone(type: TxType): string {
    switch (type) {
      case 'gain':
        return 'ti-trophy';
      case 'retrait':
        return 'ti-arrow-down';
      case 'depot':
        return 'ti-plus';
      case 'remboursement':
        return 'ti-arrow-back-up';
      default:
        return 'ti-coin';
    }
  }

  classeMontant(tx: Transaction): string {
    if (tx.montant > 0) {
      return 'text-em';
    }
    return tx.type === 'retrait' ? 'text-coral' : 'muted';
  }

  signe(tx: Transaction): string {
    return tx.montant > 0 ? '+' : '';
  }

  quand(iso: string): string {
    const d = new Date(iso);
    const jours = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (jours <= 0) return `aujourd'hui · ${heure}`;
    if (jours === 1) return `hier · ${heure}`;
    if (jours === 2) return `avant-hier · ${heure}`;
    return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · ${heure}`;
  }
}
