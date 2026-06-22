import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DrawService } from '../../core/data/draw.service';
import { SessionsService } from '../../core/data/sessions.service';
import { DrawResult, SessionMise } from '../../core/models';
import { MOI } from '../../core/mock/seed';
import { FcfaPipe } from '../../shared/fcfa.pipe';

@Component({
  selector: 'miang-draw',
  imports: [RouterLink, FcfaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './draw.component.html',
  styleUrl: './draw.component.scss',
})
export class DrawComponent implements OnInit, OnDestroy {
  private readonly sessionsService = inject(SessionsService);
  private readonly drawService = inject(DrawService);

  readonly id = input.required<string>();

  protected readonly session = signal<SessionMise | undefined>(undefined);

  protected readonly rot = signal(0);
  protected readonly boxText = signal('@—');
  protected readonly won = signal(false);
  protected readonly running = signal(false);
  protected readonly statut = signal('Le sort tourne…');
  protected readonly resultat = signal<DrawResult | null>(null);
  protected readonly jaiGagne = computed(() => this.resultat()?.gagnantUsername === MOI.username);

  private timers: ReturnType<typeof setTimeout>[] = [];

  ngOnInit(): void {
    this.sessionsService.get(this.id()).subscribe((s) => {
      this.session.set(s);
      this.timers.push(setTimeout(() => this.spin(), 500));
    });
  }

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  spin(): void {
    const s = this.session();
    if (this.running() || !s) {
      return;
    }
    this.running.set(true);
    this.won.set(false);
    this.resultat.set(null);
    this.statut.set('Le sort tourne…');

    this.drawService.tirer(s).subscribe((result) => {
      const gagnant = '@' + result.gagnantUsername;
      const turns = 6 + Math.floor(Math.random() * 4);
      this.rot.update((r) => r + turns * 360 + Math.floor(Math.random() * 360));

      let step = 0;
      const total = 46;
      const tick = () => {
        step++;
        this.boxText.set(step >= total ? gagnant : this.randName());
        if (step < total) {
          const d = Math.min(28 + step * step * 0.8, 440);
          this.timers.push(setTimeout(tick, d));
        } else {
          this.boxText.set(gagnant);
          this.won.set(true);
          this.statut.set('');
          this.resultat.set(result);
          this.running.set(false);
        }
      };
      tick();
    });
  }

  private randName(): string {
    const pool = this.drawService.pool;
    return '@' + pool[Math.floor(Math.random() * pool.length)];
  }
}
