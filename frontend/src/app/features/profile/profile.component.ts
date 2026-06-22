import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { FriendsService } from '../../core/data/friends.service';
import { WalletService } from '../../core/data/wallet.service';
import { OnboardingService } from '../../core/onboarding.service';
import { PushService } from '../../core/push.service';
import { Couleur } from '../../core/models';
import { AvatarComponent } from '../../shared/avatar.component';
import { FcfaPipe } from '../../shared/fcfa.pipe';

const PALETTE: Couleur[] = ['forest', 'em', 'gold', 'coral'];

@Component({
  selector: 'miang-profile',
  imports: [RouterLink, AvatarComponent, FcfaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly wallet = inject(WalletService);
  private readonly friends = inject(FriendsService);
  private readonly push = inject(PushService);
  private readonly onboarding = inject(OnboardingService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.currentUser;
  protected readonly solde = this.wallet.solde;
  protected readonly nbDemandes = this.friends.nbDemandes;
  protected readonly pushSupporte = this.push.supported;
  protected readonly pushOn = signal(this.push.permission === 'granted');

  compact(n: number): string {
    return n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
  }

  /** No real photo upload in the mock — cycle the avatar colour as a stand-in. */
  changerPhoto(): void {
    const u = this.user();
    if (!u) {
      return;
    }
    const next = PALETTE[(PALETTE.indexOf(u.couleur) + 1) % PALETTE.length]!;
    this.auth.setUser({ ...u, couleur: next });
  }

  activerPush(): void {
    void this.push.enable().then((ok) => this.pushOn.set(ok));
  }

  rejouerGuide(): void {
    this.onboarding.rejouer();
    this.router.navigate(['/accueil']);
  }

  deconnexion(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/bienvenue']));
  }
}
