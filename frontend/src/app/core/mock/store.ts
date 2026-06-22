import { Injectable, signal } from '@angular/core';
import {
  Ami,
  Conversation,
  DemandeAmi,
  Message,
  Participant,
  Profil,
  SessionMise,
  Transaction,
} from '../models';
import {
  MOI,
  SOLDE_INITIAL,
  genConversations,
  genHistory,
  genMessages,
  genOpenSessions,
  onlineSeed,
  personneDe,
  seedAmis,
  seedDemandes,
  seedTransactions,
  statsDe,
} from './seed';

/**
 * Single in-memory source of truth for the mock layer. Holds every collection as
 * a signal so presence, blocks, friend-requests and profiles stay consistent
 * across the home, chat, friends and profile screens.
 */
@Injectable({ providedIn: 'root' })
export class MockStore {
  readonly sessions = signal<SessionMise[]>(genOpenSessions());
  readonly history = signal<SessionMise[]>(genHistory());
  readonly conversations = signal<Conversation[]>([]);
  readonly messages = signal<Record<string, Message[]>>({});
  readonly amis = signal<Ami[]>(seedAmis());
  readonly demandes = signal<DemandeAmi[]>(seedDemandes());

  readonly online = signal<Set<string>>(onlineSeed());
  readonly blocked = signal<Set<string>>(new Set<string>());
  readonly sentRequests = signal<Set<string>>(new Set<string>());

  readonly solde = signal(SOLDE_INITIAL);
  readonly transactions = signal<Transaction[]>(seedTransactions());

  constructor() {
    const convs = genConversations(this.sessions());
    this.conversations.set(convs);
    this.messages.set(genMessages(convs));
  }

  isOnline(username: string): boolean {
    return this.online().has(username);
  }

  /** Re-stamp the live online flag onto a session's participants. */
  withPresence(s: SessionMise): SessionMise {
    return {
      ...s,
      participants: s.participants.map((p) => ({ ...p, online: this.isOnline(p.username) })),
    };
  }

  estAmi(username: string): boolean {
    return this.amis().some((a) => a.username === username);
  }

  profil(username: string): Profil {
    const p = personneDe(username);
    return {
      id: username,
      nom: p.nom,
      username: p.username,
      couleur: p.couleur,
      online: this.isOnline(username),
      stats: statsDe(username),
      estMoi: username === MOI.username,
      estAmi: this.estAmi(username),
      demandeEnvoyee: this.sentRequests().has(username),
      bloque: this.blocked().has(username),
    };
  }

  toggleBlocage(username: string): boolean {
    const set = new Set(this.blocked());
    const now = !set.has(username);
    if (now) set.add(username);
    else set.delete(username);
    this.blocked.set(set);
    return now;
  }

  envoyerDemande(username: string): void {
    if (this.estAmi(username)) return;
    const set = new Set(this.sentRequests());
    set.add(username);
    this.sentRequests.set(set);
  }

  participant(username: string, montant = 0): Participant {
    const p = personneDe(username);
    return {
      userId: username,
      username: p.username,
      nom: p.nom,
      couleur: p.couleur,
      montant,
      moi: username === MOI.username,
      online: this.isOnline(username),
    };
  }
}
