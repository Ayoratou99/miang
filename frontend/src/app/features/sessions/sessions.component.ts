import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { SessionsService } from '../../core/data/sessions.service';
import { WalletService } from '../../core/data/wallet.service';
import { SessionFiltre, SessionMise } from '../../core/models';
import { AvatarComponent } from '../../shared/avatar.component';
import { CountdownComponent } from '../../shared/countdown.component';
import { FcfaPipe } from '../../shared/fcfa.pipe';
import { InfiniteScrollDirective } from '../../shared/infinite-scroll.directive';
import { LogoComponent } from '../../shared/logo.component';

const PAGE = 8;

@Component({
  selector: 'miang-sessions',
  imports: [RouterLink, FcfaPipe, CountdownComponent, AvatarComponent, LogoComponent, InfiniteScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sessions.component.html',
  styleUrl: './sessions.component.scss',
})
export class SessionsComponent {
  private readonly sessionsService = inject(SessionsService);
  private readonly wallet = inject(WalletService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly solde = this.wallet.solde;
  protected readonly user = this.auth.currentUser;

  protected readonly loading = signal(false);
  protected readonly filtresOuverts = signal(false);

  protected readonly recherche = signal('');
  protected readonly montantMin = signal<number | null>(null);
  protected readonly montantMax = signal<number | null>(null);
  protected readonly joueursMin = signal<number | null>(null);
  protected readonly joueursMax = signal<number | null>(null);

  private readonly all = signal<SessionMise[]>([]);
  private readonly shown = signal(PAGE);
  protected readonly items = computed(() => this.all().slice(0, this.shown()));
  protected readonly hasMore = computed(() => this.shown() < this.all().length);

  private reqId = 0;

  constructor() {
    this.recharger();
  }

  private filtre(): SessionFiltre {
    return {
      recherche: this.recherche(),
      montantMin: this.montantMin(),
      montantMax: this.montantMax(),
      joueursMin: this.joueursMin(),
      joueursMax: this.joueursMax(),
    };
  }

  recharger(): void {
    const my = ++this.reqId;
    this.loading.set(true);
    this.sessionsService.listeToutes(this.filtre()).subscribe((list) => {
      if (my !== this.reqId) return;
      this.all.set(list);
      this.shown.set(PAGE);
      this.loading.set(false);
    });
  }

  chargerSuite(): void {
    if (this.hasMore()) this.shown.update((s) => s + PAGE);
  }

  onRecherche(value: string): void {
    this.recherche.set(value);
    this.recharger();
  }

  num(value: string): number | null {
    const n = Number(value.replace(/\D/g, ''));
    return value.trim() === '' || Number.isNaN(n) ? null : n;
  }

  appliquerFiltres(): void {
    this.filtresOuverts.set(false);
    this.recharger();
  }

  reinitialiser(): void {
    this.montantMin.set(null);
    this.montantMax.set(null);
    this.joueursMin.set(null);
    this.joueursMax.set(null);
    this.appliquerFiltres();
  }

  ouvrir(s: SessionMise): void {
    this.router.navigate(['/sessions', s.id]);
  }
}
