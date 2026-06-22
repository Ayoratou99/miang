import { Injectable, computed, inject } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { Ami, Couleur, DemandeAmi } from '../models';
import { MOI, PERSONNES } from '../mock/seed';
import { MockStore } from '../mock/store';

export interface ResultatRecherche {
  username: string;
  nom: string;
  couleur: Couleur;
  online: boolean;
  estAmi: boolean;
  demandeEnvoyee: boolean;
}

@Injectable({ providedIn: 'root' })
export class FriendsService {
  private readonly store = inject(MockStore);

  readonly nbDemandes = computed(() => this.store.demandes().length);

  amis(): Observable<Ami[]> {
    const list = this.store.amis().map((a) => ({ ...a, enLigne: this.store.isOnline(a.username) }));
    return of(list).pipe(delay(140));
  }

  demandes(): Observable<DemandeAmi[]> {
    return of(this.store.demandes()).pipe(delay(140));
  }

  accepter(id: string): Observable<void> {
    const demande = this.store.demandes().find((d) => d.id === id);
    if (demande) {
      this.store.amis.update((list) => [
        { id: `f-${demande.id}`, nom: demande.nom, username: demande.username, couleur: demande.couleur, enLigne: false },
        ...list,
      ]);
      this.store.demandes.update((list) => list.filter((d) => d.id !== id));
    }
    return of(undefined).pipe(delay(150));
  }

  refuser(id: string): Observable<void> {
    this.store.demandes.update((list) => list.filter((d) => d.id !== id));
    return of(undefined).pipe(delay(150));
  }

  /** Search the directory by @username or name (excludes me). */
  rechercher(q: string): Observable<ResultatRecherche[]> {
    const term = q.trim().toLowerCase().replace(/^@/, '');
    const results = !term
      ? []
      : PERSONNES.filter(
          (p) =>
            p.username !== MOI.username &&
            (p.username.includes(term) || p.nom.toLowerCase().includes(term)),
        ).map((p) => ({
          username: p.username,
          nom: p.nom,
          couleur: p.couleur,
          online: this.store.isOnline(p.username),
          estAmi: this.store.estAmi(p.username),
          demandeEnvoyee: this.store.sentRequests().has(p.username),
        }));
    return of(results).pipe(delay(180));
  }

  envoyerDemande(username: string): Observable<void> {
    this.store.envoyerDemande(username);
    return of(undefined).pipe(delay(160));
  }
}
