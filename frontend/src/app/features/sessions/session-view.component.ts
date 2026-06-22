import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChatService } from '../../core/data/chat.service';
import { SessionsService } from '../../core/data/sessions.service';
import { WalletService } from '../../core/data/wallet.service';
import { Message, SessionMise } from '../../core/models';
import { AvatarComponent } from '../../shared/avatar.component';
import { CountdownRingComponent } from '../../shared/countdown-ring.component';
import { FcfaPipe } from '../../shared/fcfa.pipe';
import { ParticipantSheetComponent } from '../../shared/participant-sheet.component';

@Component({
  selector: 'miang-session-view',
  imports: [RouterLink, FcfaPipe, CountdownRingComponent, AvatarComponent, ParticipantSheetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './session-view.component.html',
  styleUrl: './session-view.component.scss',
})
export class SessionViewComponent {
  private readonly sessionsService = inject(SessionsService);
  private readonly chat = inject(ChatService);
  private readonly wallet = inject(WalletService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly liste = viewChild<ElementRef<HTMLElement>>('liste');

  protected readonly session = signal<SessionMise | undefined>(undefined);
  protected readonly solde = this.wallet.solde;

  protected readonly messages = signal<Message[]>([]);
  protected readonly hasMoreOlder = signal(false);
  protected readonly loadingOlder = signal(false);

  protected readonly brouillon = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly flash = signal<string | null>(null);

  protected readonly panneauOuvert = signal(false);
  protected readonly profilSel = signal<string | null>(null);

  protected readonly mises = signal<number | null>(null);
  protected readonly montant = computed(() => this.mises() ?? this.session()?.miseMin ?? 0);
  protected readonly insuffisant = computed(() => this.montant() > this.solde());

  // @mention autocomplete
  protected readonly mentionQuery = signal<string | null>(null);
  protected readonly mentions = computed(() => {
    const q = this.mentionQuery();
    if (q == null) return [];
    const term = q.toLowerCase();
    return this.participants()
      .filter((p) => !p.moi && (p.username.includes(term) || p.nom.toLowerCase().includes(term)))
      .slice(0, 6);
  });

  protected readonly participants = computed(() => {
    const parts = [...(this.session()?.participants ?? [])];
    return parts.sort((a, b) => Number(b.online) - Number(a.online) || b.montant - a.montant);
  });
  protected readonly enLigneCount = computed(() => this.participants().filter((p) => p.online).length);

  private lastId = '';

  constructor() {
    // Reload when the route's :id changes (component is reused across sessions).
    effect(() => {
      const id = this.id();
      if (id && id !== this.lastId) {
        this.lastId = id;
        this.chargerSession();
      }
    });
  }

  private convId(): string | undefined {
    return this.chat.conversationDeSession(this.id())?.id;
  }

  private chargerSession(): void {
    this.sessionsService.get(this.id()).subscribe((s) => {
      this.session.set(s);
      this.mises.set(null);
      // Load the chat history when registered OR when the session is over (read-only).
      if (s?.inscrit || s?.statut === 'drawn') {
        this.chargerMessages();
      } else {
        this.messages.set([]);
      }
    });
  }

  private chargerMessages(): void {
    const cid = this.convId();
    if (!cid) {
      this.messages.set([]);
      return;
    }
    this.chat.messagesPage(cid).subscribe((page) => {
      this.messages.set(page.items);
      this.hasMoreOlder.set(page.hasMore);
      setTimeout(() => this.versLeBas(), 0);
    });
  }

  onScroll(): void {
    const el = this.liste()?.nativeElement;
    if (!el || el.scrollTop > 60 || this.loadingOlder() || !this.hasMoreOlder()) return;
    const cid = this.convId();
    const oldest = this.messages()[0]?.ts;
    if (!cid || oldest == null) return;
    this.loadingOlder.set(true);
    const prevHeight = el.scrollHeight;
    this.chat.messagesPage(cid, oldest).subscribe((page) => {
      this.messages.update((cur) => [...page.items, ...cur]);
      this.hasMoreOlder.set(page.hasMore);
      this.loadingOlder.set(false);
      setTimeout(() => {
        el.scrollTop = el.scrollHeight - prevHeight;
      }, 0);
    });
  }

  onInput(value: string): void {
    this.brouillon.set(value);
    const m = /@([\w.]*)$/.exec(value);
    this.mentionQuery.set(m ? m[1]! : null);
  }

  choisirMention(username: string): void {
    this.brouillon.update((v) => v.replace(/@([\w.]*)$/, `@${username} `));
    this.mentionQuery.set(null);
  }

  envoyer(): void {
    const corps = this.brouillon().trim();
    const cid = this.convId();
    if (!corps || !cid) return;
    this.chat.envoyer(cid, corps).subscribe((msg) => {
      this.messages.update((cur) => [...cur, msg]);
      this.brouillon.set('');
      this.mentionQuery.set(null);
      setTimeout(() => this.versLeBas(), 0);
    });
  }

  ajuster(delta: number): void {
    const min = this.session()?.miseMin ?? 0;
    this.mises.set(Math.max(min, this.montant() + delta));
  }

  onMise(value: string): void {
    const n = Number(value.replace(/\D/g, ''));
    this.mises.set(Number.isNaN(n) ? 0 : n);
  }

  miser(): void {
    const s = this.session();
    if (!s) return;
    this.error.set(null);
    this.busy.set(true);
    this.sessionsService.miser(s.id, this.montant()).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.flash.set('Mise placée — bienvenue dans la session !');
        this.session.set(updated);
        this.chargerMessages();
        setTimeout(() => this.flash.set(null), 2500);
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.error.set(err.message ?? 'Mise impossible');
      },
    });
  }

  voirProfil(username: string | null | undefined): void {
    if (!username || username === 'kevin_mba') return;
    this.panneauOuvert.set(false);
    this.profilSel.set(username);
  }

  voirTirage(): void {
    const s = this.session();
    if (s) this.router.navigate(['/tirage', s.id]);
  }

  private versLeBas(): void {
    const el = this.liste()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
