import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionsService } from '../../core/data/sessions.service';
import { SessionMise } from '../../core/models';
import { FcfaPipe } from '../../shared/fcfa.pipe';

@Component({
  selector: 'miang-history',
  imports: [RouterLink, FcfaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
})
export class HistoryComponent {
  private readonly sessionsService = inject(SessionsService);
  private readonly router = inject(Router);

  protected readonly items = signal<SessionMise[]>([]);

  constructor() {
    this.sessionsService.historique().subscribe((s) => this.items.set(s));
  }

  estMonGain(s: SessionMise): boolean {
    return s.gagnantUsername === 'kevin_mba';
  }

  quand(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
  }

  ouvrir(s: SessionMise): void {
    this.router.navigate(['/sessions', s.id]);
  }
}
