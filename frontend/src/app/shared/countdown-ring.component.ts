import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  input,
  signal,
} from '@angular/core';

const WINDOW_MS = 24 * 3600 * 1000;

/** Compact animated ring that depletes toward the 20:00 draw, with live HH:MM:SS. */
@Component({
  selector: 'miang-countdown-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="ring-pill" [class.imminent]="imminent()">
      <svg viewBox="0 0 40 40" width="34" height="34">
        <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(245,239,225,0.14)" stroke-width="4" />
        <circle
          class="prog"
          cx="20"
          cy="20"
          r="16"
          fill="none"
          stroke="currentColor"
          stroke-width="4"
          stroke-linecap="round"
          [attr.stroke-dasharray]="C"
          [attr.stroke-dashoffset]="offset()"
          transform="rotate(-90 20 20)"
        />
      </svg>
      <span class="ring-text wm">{{ texte() }}</span>
    </span>
  `,
  styles: [
    `
      .ring-pill {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: var(--gold);
        padding: 3px 10px 3px 3px;
        border-radius: 999px;
        background: rgba(243, 182, 31, 0.1);
        border: 1px solid var(--gold-line);
      }
      .ring-pill svg {
        display: block;
      }
      .prog {
        transition: stroke-dashoffset 1s linear;
      }
      .ring-text {
        font-size: 13px;
        letter-spacing: 0.5px;
        font-variant-numeric: tabular-nums;
      }
      .imminent {
        color: var(--coral);
        border-color: rgba(255, 107, 74, 0.5);
        background: rgba(255, 107, 74, 0.12);
        animation: pulse 1s ease-in-out infinite;
      }
      @keyframes pulse {
        0%,
        100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.04);
        }
      }
    `,
  ],
})
export class CountdownRingComponent implements OnInit, OnDestroy {
  readonly cible = input<string>('');

  protected readonly C = 2 * Math.PI * 16;
  protected readonly texte = signal('--:--:--');
  protected readonly fraction = signal(1);
  protected readonly imminent = signal(false);
  protected readonly offset = computed(() => this.C * (1 - this.fraction()));

  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.tick();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private cibleMs(): number {
    const c = this.cible();
    if (c) return new Date(c).getTime();
    const t = new Date();
    t.setHours(20, 0, 0, 0);
    if (t.getTime() <= Date.now()) t.setDate(t.getDate() + 1);
    return t.getTime();
  }

  private tick(): void {
    const diff = Math.max(0, this.cibleMs() - Date.now());
    const total = Math.floor(diff / 1000);
    const hh = Math.floor(total / 3600);
    const mm = Math.floor((total % 3600) / 60);
    const ss = total % 60;
    const p = (n: number) => String(n).padStart(2, '0');
    this.texte.set(`${p(hh)}:${p(mm)}:${p(ss)}`);
    this.fraction.set(Math.max(0, Math.min(1, diff / WINDOW_MS)));
    this.imminent.set(diff <= 60 * 60 * 1000); // last hour
  }
}
