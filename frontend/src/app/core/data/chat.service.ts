import { Injectable, computed, inject } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { Conversation, ConversationType, Message, Page, Participant } from '../models';
import { MOI, couleurDepuis, personneDe } from '../mock/seed';
import { MockStore } from '../mock/store';

let seq = 100000;
const nextId = () => `msg-${seq++}`;
const now = () => Date.now();
const hhmm = (ts: number) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly store = inject(MockStore);

  readonly conversations = this.store.conversations.asReadonly();
  readonly totalNonLus = computed(() => this.store.conversations().reduce((n, c) => n + c.nonLus, 0));

  /** Paginated + searchable conversation list, optionally filtered by type. */
  liste(recherche = '', type?: ConversationType, page = 0, pageSize = 12): Observable<Page<Conversation>> {
    const q = recherche.trim().toLowerCase();
    const items = this.store
      .conversations()
      .filter((c) => !type || c.type === type)
      .filter((c) => !q || c.titre.toLowerCase().includes(q) || c.dernierMessage.toLowerCase().includes(q));
    const start = page * pageSize;
    const slice = items.slice(start, start + pageSize);
    return of({ items: slice, hasMore: start + pageSize < items.length }).pipe(delay(140));
  }

  /** Full filtered conversation list (component reveals it incrementally). */
  listeToutes(recherche = '', type?: ConversationType): Observable<Conversation[]> {
    const q = recherche.trim().toLowerCase();
    const items = this.store
      .conversations()
      .filter((c) => !type || c.type === type)
      .filter((c) => !q || c.titre.toLowerCase().includes(q) || c.dernierMessage.toLowerCase().includes(q));
    return of(items).pipe(delay(120));
  }

  get(id: string): Observable<Conversation | undefined> {
    return of(this.store.conversations().find((c) => c.id === id)).pipe(delay(100));
  }

  conversationDeSession(sessionId: string): Conversation | undefined {
    return this.store.conversations().find((c) => c.sessionId === sessionId);
  }

  /** A window of messages, ascending. Omit `beforeTs` for the latest page. */
  messagesPage(conversationId: string, beforeTs?: number, limit = 20): Observable<Page<Message>> {
    const all = this.store.messages()[conversationId] ?? [];
    const pool = beforeTs == null ? all : all.filter((m) => m.ts < beforeTs);
    const items = pool.slice(Math.max(0, pool.length - limit));
    return of({ items, hasMore: pool.length > limit }).pipe(delay(160));
  }

  envoyer(conversationId: string, corps: string): Observable<Message> {
    const ts = now();
    const message: Message = {
      id: nextId(),
      conversationId,
      auteurUsername: MOI.username,
      auteurId: MOI.username,
      auteurNom: MOI.nom,
      auteurCouleur: MOI.couleur,
      corps,
      type: 'text',
      le: hhmm(ts),
      ts,
      moi: true,
    };
    this.push(message, `Vous : ${corps}`);
    return of(message).pipe(delay(90));
  }

  /** Share a session as a registerable invite card (private chat « + » menu). */
  envoyerInvite(conversationId: string, sessionId: string): Observable<Message> {
    const session = this.store.sessions().find((s) => s.id === sessionId);
    const ts = now();
    const message: Message = {
      id: nextId(),
      conversationId,
      auteurUsername: MOI.username,
      auteurId: MOI.username,
      auteurNom: MOI.nom,
      auteurCouleur: MOI.couleur,
      corps: `Rejoins « ${session?.titre ?? 'une session'} » sur MIANG`,
      type: 'invite',
      le: hhmm(ts),
      ts,
      moi: true,
      inviteSessionId: sessionId,
      inviteTitre: session?.titre,
      inviteMiseMin: session?.miseMin,
    };
    this.push(message, `Vous : invitation à « ${session?.titre ?? 'une session'} »`);
    return of(message).pipe(delay(90));
  }

  addSystemMessage(sessionId: string, corps: string): void {
    const conv = this.conversationDeSession(sessionId);
    if (!conv) return;
    const ts = now();
    this.push(
      {
        id: nextId(),
        conversationId: conv.id,
        auteurUsername: null,
        corps,
        type: 'system',
        le: hhmm(ts),
        ts,
        moi: false,
      },
      corps,
    );
  }

  ensureSessionParticipant(_sessionId: string): void {
    /* participants are tracked on the session itself in the mock */
  }

  marquerLu(conversationId: string): void {
    this.store.conversations.update((list) =>
      list.map((c) => (c.id === conversationId ? { ...c, nonLus: 0 } : c)),
    );
  }

  creerPourSession(sessionId: string, titre: string): Conversation {
    const conv: Conversation = {
      id: `c-${sessionId}`,
      type: 'session',
      titre,
      couleur: couleurDepuis(sessionId),
      dernierMessage: 'Session créée — invite tes potos !',
      dernierLe: hhmm(now()),
      nonLus: 0,
      sessionId,
    };
    this.store.conversations.update((list) => [conv, ...list]);
    this.store.messages.update((map) => ({
      ...map,
      [conv.id]: [
        {
          id: nextId(),
          conversationId: conv.id,
          auteurUsername: null,
          corps: 'Session créée — invite tes potos !',
          type: 'system',
          le: hhmm(now()),
          ts: now(),
          moi: false,
        },
      ],
    }));
    return conv;
  }

  /** Participants of a session (for the panel + @mentions), presence-stamped. */
  participantsDeSession(sessionId: string): Participant[] {
    const s = this.store.sessions().find((x) => x.id === sessionId);
    return s ? this.store.withPresence(s).participants : [];
  }

  personne(username: string) {
    return personneDe(username);
  }

  private push(message: Message, apercu: string): void {
    this.store.messages.update((map) => ({
      ...map,
      [message.conversationId]: [...(map[message.conversationId] ?? []), message],
    }));
    this.store.conversations.update((list) =>
      list.map((c) =>
        c.id === message.conversationId ? { ...c, dernierMessage: apercu, dernierLe: message.le } : c,
      ),
    );
  }
}
