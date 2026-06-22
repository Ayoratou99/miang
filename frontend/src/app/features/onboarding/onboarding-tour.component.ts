import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { OnboardingService } from '../../core/onboarding.service';
import { MiangoComponent } from '../../shared/miango.component';

interface Etape {
  icon: string;
  titre: string;
  texte: string;
}

@Component({
  selector: 'miang-onboarding-tour',
  imports: [MiangoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './onboarding-tour.component.html',
  styleUrl: './onboarding-tour.component.scss',
})
export class OnboardingTourComponent {
  private readonly onboarding = inject(OnboardingService);

  protected readonly i = signal(0);
  protected readonly etapes: Etape[] = [
    {
      icon: 'ti-wallet',
      titre: 'Ton portefeuille',
      texte: 'Ton solde en temps réel. Recharge ou retire via Airtel & Moov Money.',
    },
    {
      icon: 'ti-flame',
      titre: 'Les sessions',
      texte: 'Rejoins une session en cours : une cagnotte commune que tu peux remporter.',
    },
    {
      icon: 'ti-plus',
      titre: 'Crée ta session',
      texte: 'Un titre, une mise minimale, et tu invites tes potos. Simple comme bonjour.',
    },
    {
      icon: 'ti-message-circle',
      titre: 'Le chat',
      texte: 'Discute avec les joueurs, dans la session ou en message privé.',
    },
    {
      icon: 'ti-info-circle',
      titre: 'Tout sur MIANG',
      texte: 'Le tirage de minuit, les règles et le jeu responsable, c’est dans l’onglet Info.',
    },
  ];

  protected readonly etape = computed(() => this.etapes[this.i()]!);
  protected readonly dernier = computed(() => this.i() === this.etapes.length - 1);

  suivant(): void {
    if (this.dernier()) {
      this.onboarding.terminer();
    } else {
      this.i.update((v) => v + 1);
    }
  }

  passer(): void {
    this.onboarding.terminer();
  }
}
