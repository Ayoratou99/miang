import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Miango — MIANG's mascot: a golden coin with a face. Guides the onboarding tour
 * and brightens the info / welcome / empty screens.
 */
@Component({
  selector: 'miang-miango',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="taille()"
      [attr.height]="hauteur()"
      viewBox="0 0 90 96"
      role="img"
      aria-label="Miango, la mascotte"
    >
      <path d="M70 42 Q82 34 77 24" stroke="#E0A50F" stroke-width="5" fill="none" stroke-linecap="round" />
      <circle cx="77" cy="23" r="4.5" fill="#F3B61F" />
      <path d="M20 52 Q9 53 13 62" stroke="#E0A50F" stroke-width="5" fill="none" stroke-linecap="round" />
      <circle cx="13" cy="62" r="4.5" fill="#F3B61F" />
      <rect x="39" y="73" width="5" height="13" rx="2.5" fill="#E0A50F" />
      <rect x="46" y="73" width="5" height="13" rx="2.5" fill="#E0A50F" />
      <circle cx="45" cy="46" r="30" fill="#F3B61F" />
      <circle cx="45" cy="46" r="25" fill="none" stroke="#E0A50F" stroke-width="3" />
      <circle cx="33" cy="52" r="3" fill="#FF6B4A" opacity="0.5" />
      <circle cx="57" cy="52" r="3" fill="#FF6B4A" opacity="0.5" />
      <ellipse cx="38" cy="44" rx="4.2" ry="5.2" fill="#fff" />
      <ellipse cx="52" cy="44" rx="4.2" ry="5.2" fill="#fff" />
      <circle cx="39" cy="45" r="2.1" fill="#07140F" />
      <circle cx="53" cy="45" r="2.1" fill="#07140F" />
      <path d="M38 54 Q45 61 52 54" stroke="#07140F" stroke-width="3" fill="none" stroke-linecap="round" />
    </svg>
  `,
})
export class MiangoComponent {
  readonly taille = input(64);
  protected readonly hauteur = computed(() => Math.round((this.taille() * 96) / 90));
}
