import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FriendsService, ResultatRecherche } from '../../core/data/friends.service';
import { Ami, DemandeAmi } from '../../core/models';
import { AvatarComponent } from '../../shared/avatar.component';
import { ParticipantSheetComponent } from '../../shared/participant-sheet.component';

@Component({
  selector: 'miang-friends',
  imports: [RouterLink, AvatarComponent, ParticipantSheetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './friends.component.html',
  styleUrl: './friends.component.scss',
})
export class FriendsComponent {
  private readonly friends = inject(FriendsService);

  protected readonly amis = signal<Ami[]>([]);
  protected readonly demandes = signal<DemandeAmi[]>([]);
  protected readonly recherche = signal('');
  protected readonly resultats = signal<ResultatRecherche[]>([]);
  protected readonly profilSel = signal<string | null>(null);

  constructor() {
    this.recharger();
  }

  private recharger(): void {
    this.friends.amis().subscribe((a) => this.amis.set(a));
    this.friends.demandes().subscribe((d) => this.demandes.set(d));
  }

  onRecherche(q: string): void {
    this.recherche.set(q);
    this.friends.rechercher(q).subscribe((r) => this.resultats.set(r));
  }

  ajouter(username: string): void {
    this.friends.envoyerDemande(username).subscribe(() => {
      this.resultats.update((list) =>
        list.map((r) => (r.username === username ? { ...r, demandeEnvoyee: true } : r)),
      );
    });
  }

  accepter(id: string): void {
    this.friends.accepter(id).subscribe(() => this.recharger());
  }

  refuser(id: string): void {
    this.friends.refuser(id).subscribe(() => this.recharger());
  }

  voirProfil(username: string): void {
    this.profilSel.set(username);
  }
}
