import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { KycStatut, PieceType } from '../models';

export interface KycDossier {
  type: PieceType;
  numero: string;
  fichierNom: string;
}

@Injectable({ providedIn: 'root' })
export class KycService {
  private readonly auth = inject(AuthService);

  readonly dossier = signal<KycDossier | null>(null);
  readonly statut = computed<KycStatut>(() => this.auth.currentUser()?.kyc ?? 'aucun');

  /** Submit the identity document → status becomes « en attente de validation ». */
  soumettre(dossier: KycDossier): Observable<void> {
    this.dossier.set(dossier);
    this.setStatut('en_attente');
    return of(undefined).pipe(delay(700));
  }

  /** Demo: simulate the back-office decision so all states can be shown. */
  simuler(decision: 'verifie' | 'rejete'): void {
    this.setStatut(decision);
  }

  recommencer(): void {
    this.dossier.set(null);
    this.setStatut('aucun');
  }

  private setStatut(kyc: KycStatut): void {
    const u = this.auth.currentUser();
    if (u) {
      this.auth.setUser({ ...u, kyc });
    }
  }
}
