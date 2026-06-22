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
import { Conversation, Message, SessionMise } from '../../core/models';
import { AvatarComponent } from '../../shared/avatar.component';
import { FcfaPipe } from '../../shared/fcfa.pipe';
import { ParticipantSheetComponent } from '../../shared/participant-sheet.component';

@Component({
  selector: 'miang-chat',
  imports: [RouterLink, FcfaPipe, AvatarComponent, ParticipantSheetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent {
  private readonly chat = inject(ChatService);
  private readonly sessionsService = inject(SessionsService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();
  protected readonly liste = viewChild<ElementRef<HTMLElement>>('liste');

  protected readonly conversation = signal<Conversation | undefined>(undefined);
  protected readonly messages = signal<Message[]>([]);
  protected readonly hasMoreOlder = signal(false);
  protected readonly loadingOlder = signal(false);
  protected readonly brouillon = signal('');
  protected readonly profilOuvert = signal(false);

  protected readonly inviteOuvert = signal(false);
  protected readonly mesSessions = signal<SessionMise[]>([]);
  protected readonly rechercheInvite = signal('');
  protected readonly sessionsInvite = computed(() => {
    const q = this.rechercheInvite().trim().toLowerCase();
    return this.mesSessions().filter((s) => !q || s.titre.toLowerCase().includes(q));
  });

  private lastId = '';

  constructor() {
    effect(() => {
      const id = this.id();
      if (id && id !== this.lastId) {
        this.lastId = id;
        this.charger();
      }
    });
  }

  private charger(): void {
    this.chat.get(this.id()).subscribe((c) => this.conversation.set(c));
    this.chat.marquerLu(this.id());
    this.chat.messagesPage(this.id()).subscribe((page) => {
      this.messages.set(page.items);
      this.hasMoreOlder.set(page.hasMore);
      setTimeout(() => this.versLeBas(), 0);
    });
  }

  onScroll(): void {
    const el = this.liste()?.nativeElement;
    if (!el || el.scrollTop > 60 || this.loadingOlder() || !this.hasMoreOlder()) return;
    const oldest = this.messages()[0]?.ts;
    if (oldest == null) return;
    this.loadingOlder.set(true);
    const prevHeight = el.scrollHeight;
    this.chat.messagesPage(this.id(), oldest).subscribe((page) => {
      this.messages.update((cur) => [...page.items, ...cur]);
      this.hasMoreOlder.set(page.hasMore);
      this.loadingOlder.set(false);
      setTimeout(() => (el.scrollTop = el.scrollHeight - prevHeight), 0);
    });
  }

  envoyer(): void {
    const corps = this.brouillon().trim();
    if (!corps) return;
    this.chat.envoyer(this.id(), corps).subscribe((msg) => {
      this.messages.update((cur) => [...cur, msg]);
      this.brouillon.set('');
      setTimeout(() => this.versLeBas(), 0);
    });
  }

  ouvrirInvite(): void {
    this.inviteOuvert.set(true);
    this.rechercheInvite.set('');
    this.sessionsService.listeToutes({}).subscribe((list) => this.mesSessions.set(list));
  }

  envoyerInvite(sessionId: string): void {
    this.chat.envoyerInvite(this.id(), sessionId).subscribe((msg) => {
      this.messages.update((cur) => [...cur, msg]);
      this.inviteOuvert.set(false);
      setTimeout(() => this.versLeBas(), 0);
    });
  }

  rejoindre(sessionId?: string): void {
    if (sessionId) this.router.navigate(['/sessions', sessionId]);
  }

  private versLeBas(): void {
    const el = this.liste()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
