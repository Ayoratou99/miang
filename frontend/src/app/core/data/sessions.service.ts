import { Injectable, inject } from '@angular/core';
import { Observable, delay, map, of, switchMap, throwError } from 'rxjs';
import { Page, SessionFiltre, SessionMise } from '../models';
import { MOI, personneDe, prochainTirageIso } from '../mock/seed';
import { MockStore } from '../mock/store';
import { ChatService } from './chat.service';
import { WalletService } from './wallet.service';

let seq = 1;
const nextId = () => `s-new-${seq++}`;

@Injectable({ providedIn: 'root' })
export class SessionsService {
  private readonly store = inject(MockStore);
  private readonly wallet = inject(WalletService);
  private readonly chat = inject(ChatService);

  /** Paginated, filtered list of OPEN sessions (drawn ones live in history). */
  liste(filtre: SessionFiltre = {}, page = 0, pageSize = 8): Observable<Page<SessionMise>> {
    const q = (filtre.recherche ?? '').trim().toLowerCase();
    let items = this.store
      .sessions()
      .filter((s) => s.statut === 'open')
      .filter((s) => !q || s.titre.toLowerCase().includes(q) || s.createdParUsername.includes(q))
      .filter((s) => filtre.montantMin == null || s.miseMin >= filtre.montantMin!)
      .filter((s) => filtre.montantMax == null || s.miseMin <= filtre.montantMax!)
      .filter((s) => filtre.joueursMin == null || s.joueurs >= filtre.joueursMin!)
      .filter((s) => filtre.joueursMax == null || s.joueurs <= filtre.joueursMax!)
      .map((s) => this.store.withPresence(s));
    const start = page * pageSize;
    const slice = items.slice(start, start + pageSize);
    return of({ items: slice, hasMore: start + pageSize < items.length }).pipe(delay(180));
  }

  /** Full filtered list of OPEN sessions (component reveals it incrementally). */
  listeToutes(filtre: SessionFiltre = {}): Observable<SessionMise[]> {
    const q = (filtre.recherche ?? '').trim().toLowerCase();
    const items = this.store
      .sessions()
      .filter((s) => s.statut === 'open')
      .filter((s) => !q || s.titre.toLowerCase().includes(q) || s.createdParUsername.includes(q))
      .filter((s) => filtre.montantMin == null || s.miseMin >= filtre.montantMin!)
      .filter((s) => filtre.montantMax == null || s.miseMin <= filtre.montantMax!)
      .filter((s) => filtre.joueursMin == null || s.joueurs >= filtre.joueursMin!)
      .filter((s) => filtre.joueursMax == null || s.joueurs <= filtre.joueursMax!)
      .map((s) => this.store.withPresence(s));
    return of(items).pipe(delay(160));
  }

  get(id: string): Observable<SessionMise | undefined> {
    const s = this.store.sessions().find((x) => x.id === id) ?? this.store.history().find((x) => x.id === id);
    return of(s ? this.store.withPresence(s) : undefined).pipe(delay(140));
  }

  historique(): Observable<SessionMise[]> {
    return of(this.store.history().filter((s) => s.inscrit).map((s) => this.store.withPresence(s))).pipe(
      delay(160),
    );
  }

  creer(input: {
    titre: string;
    miseMin: number;
    maxParticipants: number | null;
    coverImage?: string | null;
  }): Observable<SessionMise> {
    const session: SessionMise = {
      id: nextId(),
      titre: input.titre.trim(),
      miseMin: input.miseMin,
      maxParticipants: input.maxParticipants,
      coverImage: input.coverImage ?? null,
      potTotal: 0,
      joueurs: 0,
      statut: 'open',
      drawAt: prochainTirageIso(),
      createdParUsername: MOI.username,
      participants: [],
      maMise: 0,
      inscrit: false,
      complet: false,
    };
    return of(session).pipe(
      delay(450),
      map((s) => {
        this.store.sessions.update((list) => [s, ...list]);
        this.chat.creerPourSession(s.id, s.titre);
        return s;
      }),
    );
  }

  miser(sessionId: string, montant: number): Observable<SessionMise> {
    const session = this.store.sessions().find((s) => s.id === sessionId);
    if (!session) return throwError(() => new Error('Session introuvable'));
    if (session.statut !== 'open') return throwError(() => new Error('Session fermée'));
    if (montant < session.miseMin) return throwError(() => new Error(`Mise minimale : ${session.miseMin} F`));
    if (session.complet && !session.inscrit) return throwError(() => new Error('Session complète'));

    return this.wallet.miser(montant, session.titre).pipe(
      delay(40),
      switchMap(() => {
        this.store.sessions.update((list) =>
          list.map((s) => (s.id === sessionId ? this.appliquer(s, montant) : s)),
        );
        if (!this.chat.conversationDeSession(sessionId)) {
          this.chat.creerPourSession(sessionId, session.titre);
        }
        this.chat.addSystemMessage(sessionId, `Vous avez misé ${montant.toLocaleString('fr-FR')} F`);
        return this.get(sessionId).pipe(map((s) => s!));
      }),
    );
  }

  private appliquer(s: SessionMise, montant: number): SessionMise {
    const deja = s.participants.some((p) => p.moi);
    const participants = deja
      ? s.participants.map((p) => (p.moi ? { ...p, montant: p.montant + montant } : p))
      : [...s.participants, this.store.participant(MOI.username, montant)];
    const joueurs = deja ? s.joueurs : s.joueurs + 1;
    return {
      ...s,
      participants,
      maMise: s.maMise + montant,
      inscrit: true,
      potTotal: s.potTotal + montant,
      joueurs,
      complet: s.maxParticipants != null && joueurs >= s.maxParticipants,
    };
  }
}
