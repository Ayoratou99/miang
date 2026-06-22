import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ChatService } from '../../core/data/chat.service';
import { Conversation, ConversationType } from '../../core/models';
import { AvatarComponent } from '../../shared/avatar.component';
import { InfiniteScrollDirective } from '../../shared/infinite-scroll.directive';

const PAGE = 12;

@Component({
  selector: 'miang-messages',
  imports: [AvatarComponent, InfiniteScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss',
})
export class MessagesComponent {
  private readonly chat = inject(ChatService);
  private readonly router = inject(Router);

  protected readonly onglet = signal<ConversationType>('session');
  protected readonly recherche = signal('');
  protected readonly loading = signal(false);

  private readonly all = signal<Conversation[]>([]);
  private readonly shown = signal(PAGE);

  // Client-side reveal: deterministic, race-free.
  protected readonly items = computed(() => this.all().slice(0, this.shown()));
  protected readonly hasMore = computed(() => this.shown() < this.all().length);

  private reqId = 0;

  constructor() {
    this.recharger();
  }

  setOnglet(t: ConversationType): void {
    if (this.onglet() === t) return;
    this.onglet.set(t);
    this.recharger();
  }

  onRecherche(value: string): void {
    this.recherche.set(value);
    this.recharger();
  }

  recharger(): void {
    const my = ++this.reqId;
    this.loading.set(true);
    this.chat.listeToutes(this.recherche(), this.onglet()).subscribe((list) => {
      if (my !== this.reqId) return;
      this.all.set(list);
      this.shown.set(PAGE);
      this.loading.set(false);
    });
  }

  chargerSuite(): void {
    if (this.hasMore()) this.shown.update((s) => s + PAGE);
  }

  ouvrir(c: Conversation): void {
    if (c.type === 'session' && c.sessionId) {
      this.router.navigate(['/sessions', c.sessionId]);
    } else {
      this.router.navigate(['/messages', c.id]);
    }
  }
}
