import { Injectable, inject } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { Profil } from '../models';
import { MockStore } from '../mock/store';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly store = inject(MockStore);

  profil(username: string): Observable<Profil> {
    return of(this.store.profil(username)).pipe(delay(120));
  }

  /** Block / unblock — returns the new blocked state. */
  toggleBlocage(username: string): Observable<boolean> {
    return of(this.store.toggleBlocage(username)).pipe(delay(150));
  }

  envoyerDemande(username: string): Observable<void> {
    this.store.envoyerDemande(username);
    return of(undefined).pipe(delay(160));
  }
}
