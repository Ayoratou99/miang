import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OnboardingService } from '../../core/onboarding.service';
import { MiangoComponent } from '../../shared/miango.component';

@Component({
  selector: 'miang-info',
  imports: [MiangoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './info.component.html',
  styleUrl: './info.component.scss',
})
export class InfoComponent {
  private readonly onboarding = inject(OnboardingService);
  private readonly router = inject(Router);

  protected readonly etapes = [
    'Recharge ton portefeuille via Airtel ou Moov Money.',
    'Rejoins une session… ou crée la tienne.',
    'Place ta mise avant 23 h 59.',
    'À minuit, tirage aléatoire vérifiable : le gagnant empoche tout.',
  ];

  rejouerGuide(): void {
    this.onboarding.rejouer();
    this.router.navigate(['/accueil']);
  }
}
