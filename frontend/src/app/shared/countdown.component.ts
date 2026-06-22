import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, input, signal } from '@angular/core';

/** Live HH:MM:SS countdown to a target (defaults to the next local midnight — the draw). */
@Component({
  selector: 'miang-countdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span>{{ texte() }}</span>`,
})
export class CountdownComponent implements OnInit, OnDestroy {
  /** Target ISO timestamp. Empty → next local midnight. */
  readonly cible = input<string>('');
  readonly format = input<'full' | 'court'>('full');

  protected readonly texte = signal('—');
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.tick();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private cibleMs(): number {
    const c = this.cible();
    if (c) {
      return new Date(c).getTime();
    }
    // Default target: the next 20:00 local (the draw moment).
    const t = new Date();
    t.setHours(20, 0, 0, 0);
    if (t.getTime() <= Date.now()) {
      t.setDate(t.getDate() + 1);
    }
    return t.getTime();
  }

  private tick(): void {
    const diff = Math.max(0, this.cibleMs() - Date.now());
    const total = Math.floor(diff / 1000);
    const hh = Math.floor(total / 3600);
    const mm = Math.floor((total % 3600) / 60);
    const ss = total % 60;
    const p = (n: number) => String(n).padStart(2, '0');
    this.texte.set(this.format() === 'court' ? `${p(hh)}:${p(mm)}` : `${p(hh)}:${p(mm)}:${p(ss)}`);
  }
}
