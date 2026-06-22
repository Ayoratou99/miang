import { Injectable } from '@angular/core';
import { Observable, delay, map, of } from 'rxjs';
import { DrawResult, SessionMise } from '../models';
import { POOL_PSEUDOS, initiales } from '../mock/seed';

function hex(n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

/**
 * The real draw is 100% server-side and provably-fair: the server seed hash is
 * sealed before midnight and the seed revealed afterwards. On the client we only
 * play the suspense — the winner is authoritative, never computed in the app.
 */
@Injectable({ providedIn: 'root' })
export class DrawService {
  /** Pseudonyms paraded by the wheel during the suspense animation. */
  readonly pool = POOL_PSEUDOS;

  tirer(session: SessionMise): Observable<DrawResult> {
    const participants = session.participants.length
      ? session.participants
      : POOL_PSEUDOS.map((u) => ({ username: u, nom: u }));
    const gagnant = participants[Math.floor(Math.random() * participants.length)]!;
    const nom = 'nom' in gagnant && gagnant.nom ? gagnant.nom : gagnant.username;
    const result: DrawResult = {
      sessionId: session.id,
      gagnantUsername: gagnant.username,
      gagnantNom: nom || initiales(gagnant.username),
      montant: session.potTotal,
      serverSeedHash: hex(64),
      serverSeed: hex(64),
      clientSeed: hex(16),
      nonce: Math.floor(Math.random() * 99999),
      tireLe: new Date().toISOString(),
    };
    return of(result).pipe(delay(120), map((r) => r));
  }
}
