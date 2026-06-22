import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Couleur } from '../core/models';
import { initiales } from '../core/mock/seed';

const MAP: Record<Couleur, { bg: string; fg: string }> = {
  forest: { bg: '#0E4D38', fg: '#F3B61F' },
  em: { bg: '#16A07A', fg: '#07140F' },
  gold: { bg: '#F3B61F', fg: '#07140F' },
  coral: { bg: '#FF6B4A', fg: '#07140F' },
};

/** Round avatar — shows a photo when `image` is set, else initials in the palette. */
@Component({
  selector: 'miang-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (image()) {
      <img
        class="avatar-img"
        [src]="image()"
        [style.width.px]="taille()"
        [style.height.px]="taille()"
        alt=""
      />
    } @else {
      <span
        class="avatar"
        [style.width.px]="taille()"
        [style.height.px]="taille()"
        [style.background]="couleurs().bg"
        [style.color]="couleurs().fg"
        [style.font-size.px]="police()"
        >{{ texte() ?? auto() }}</span
      >
    }
  `,
  styles: [
    `
      .avatar-img {
        border-radius: 50%;
        object-fit: cover;
        display: block;
        flex-shrink: 0;
      }
    `,
  ],
})
export class AvatarComponent {
  readonly nom = input('');
  readonly texte = input<string | null>(null);
  readonly couleur = input<Couleur>('forest');
  readonly taille = input(40);
  readonly image = input<string | null>(null);

  protected readonly auto = computed(() => initiales(this.nom()));
  protected readonly couleurs = computed(() => MAP[this.couleur()]);
  protected readonly police = computed(() => Math.round(this.taille() * 0.36));
}
