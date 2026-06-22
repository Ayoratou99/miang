import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { FriendsService } from '../../core/data/friends.service';
import { WalletService } from '../../core/data/wallet.service';
import { OnboardingService } from '../../core/onboarding.service';
import { PushService } from '../../core/push.service';
import { AvatarComponent } from '../../shared/avatar.component';
import { CropperComponent } from '../../shared/cropper.component';
import { FcfaPipe } from '../../shared/fcfa.pipe';

@Component({
  selector: 'miang-profile',
  imports: [RouterLink, AvatarComponent, FcfaPipe, CropperComponent],
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

  // Photo upload + crop
  protected readonly imageBrute = signal<string | null>(null);
  protected readonly cropperOuvert = signal(false);

  compact(n: number): string {
    return n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
  }

  onFichier(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.imageBrute.set(reader.result as string);
      this.cropperOuvert.set(true);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  onCropped(dataUrl: string): void {
    const u = this.user();
    if (u) {
      this.auth.setUser({ ...u, avatarUrl: dataUrl });
    }
    this.cropperOuvert.set(false);
    this.imageBrute.set(null);
  }

  onCropAnnule(): void {
    this.cropperOuvert.set(false);
    this.imageBrute.set(null);
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
