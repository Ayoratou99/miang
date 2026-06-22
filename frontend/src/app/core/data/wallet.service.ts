import { Injectable, inject } from '@angular/core';
import { Observable, delay, map, of, throwError } from 'rxjs';
import { OperateurId, Transaction, TxType } from '../models';
import { OPERATEURS } from '../mock/seed';
import { MockStore } from '../mock/store';

let seq = 100;
const nextId = () => `tx-${seq++}`;

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly store = inject(MockStore);

  readonly solde = this.store.solde.asReadonly();
  readonly transactions = this.store.transactions.asReadonly();
  readonly operateurs = OPERATEURS;

  liste(): Observable<Transaction[]> {
    return of(this.store.transactions()).pipe(delay(120));
  }

  deposer(montant: number, operateur: OperateurId): Observable<Transaction> {
    return of(null).pipe(
      delay(650),
      map(() => this.enregistrer('depot', `Dépôt — ${this.nom(operateur)}`, montant, operateur)),
    );
  }

  retirer(montant: number, operateur: OperateurId): Observable<Transaction> {
    if (montant > this.store.solde()) {
      return throwError(() => new Error('Solde insuffisant')).pipe(delay(250));
    }
    return of(null).pipe(
      delay(650),
      map(() => this.enregistrer('retrait', `Retrait — ${this.nom(operateur)}`, -montant, operateur)),
    );
  }

  miser(montant: number, titreSession: string): Observable<Transaction> {
    if (montant > this.store.solde()) {
      return throwError(() => new Error('Solde insuffisant')).pipe(delay(200));
    }
    return of(null).pipe(
      delay(350),
      map(() => this.enregistrer('mise', `Mise — ${titreSession}`, -montant)),
    );
  }

  crediterGain(montant: number, titreSession: string): void {
    this.enregistrer('gain', `Gain — ${titreSession}`, montant);
  }

  peutCouvrir(montant: number): boolean {
    return montant <= this.store.solde();
  }

  private enregistrer(type: TxType, libelle: string, montant: number, operateur?: OperateurId): Transaction {
    this.store.solde.update((s) => s + montant);
    const tx: Transaction = {
      id: nextId(),
      type,
      libelle,
      montant,
      date: new Date().toISOString(),
      operateur,
    };
    this.store.transactions.update((list) => [tx, ...list]);
    return tx;
  }

  private nom(id: OperateurId): string {
    return this.operateurs.find((o) => o.id === id)?.nom ?? 'Mobile Money';
  }
}
