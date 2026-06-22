import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** The MIANG app icon: a gold rounded square holding the « M » monogram in ink. */
@Component({
  selector: 'miang-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="logo-tile"
      [style.width.px]="taille()"
      [style.height.px]="taille()"
      [style.border-radius.px]="radius()"
    >
      <svg [attr.width]="glyphe()" [attr.height]="glyphe()" viewBox="0 0 60 60">
        <polyline
          points="9,46 9,14 30,38 51,14 51,46"
          fill="none"
          stroke="#07140F"
          stroke-width="9"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
  `,
  styles: [
    `
      .logo-tile {
        background: var(--gold);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
    `,
  ],
})
export class LogoComponent {
  readonly taille = input(54);
  protected readonly radius = computed(() => Math.round(this.taille() * 0.28));
  protected readonly glyphe = computed(() => Math.round(this.taille() * 0.56));
}
