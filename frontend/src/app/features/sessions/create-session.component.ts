import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionsService } from '../../core/data/sessions.service';
import { FcfaPipe } from '../../shared/fcfa.pipe';

@Component({
  selector: 'miang-create-session',
  imports: [RouterLink, FcfaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './create-session.component.html',
  styleUrl: './create-session.component.scss',
})
export class CreateSessionComponent {
  private readonly sessionsService = inject(SessionsService);
  private readonly router = inject(Router);

  protected readonly misesRapides = [500, 1_000, 2_000, 5_000, 10_000, 25_000];
  protected readonly covers = ['🎉', '🔥', '💰', '🏆', '🌴', '⚡', '🎲', '👑'];

  protected readonly titre = signal('');
  protected readonly miseMin = signal(1_000);
  protected readonly maxParticipants = signal<number | null>(null);
  protected readonly cover = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly valide = computed(() => this.titre().trim().length >= 3 && this.miseMin() >= 100);

  onMise(value: string): void {
    const n = Number(value.replace(/\D/g, ''));
    this.miseMin.set(Number.isNaN(n) ? 0 : n);
  }

  onMax(value: string): void {
    const v = value.replace(/\D/g, '');
    this.maxParticipants.set(v === '' ? null : Number(v));
  }

  toggleCover(c: string): void {
    this.cover.set(this.cover() === c ? null : c);
  }

  submit(): void {
    if (!this.valide() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.sessionsService
      .creer({
        titre: this.titre(),
        miseMin: this.miseMin(),
        maxParticipants: this.maxParticipants(),
        coverImage: this.cover(),
      })
      .subscribe({
        next: (s) => this.router.navigate(['/sessions', s.id]),
        error: () => {
          this.busy.set(false);
          this.error.set('Création impossible, réessaie.');
        },
      });
  }
}
