import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ProfileService } from '../core/data/profile.service';
import { Profil } from '../core/models';
import { AvatarComponent } from './avatar.component';
import { FcfaPipe } from './fcfa.pipe';

/** Bottom-sheet profile of a player: stats, friend-request and block actions. */
@Component({
  selector: 'miang-participant-sheet',
  imports: [AvatarComponent, FcfaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './participant-sheet.component.html',
  styleUrl: './participant-sheet.component.scss',
})
export class ParticipantSheetComponent {
  readonly username = input.required<string>();
  readonly closed = output<void>();

  private readonly profileSvc = inject(ProfileService);
  protected readonly profil = signal<Profil | null>(null);
  protected readonly busy = signal(false);

  constructor() {
    effect(() => {
      const u = this.username();
      this.profileSvc.profil(u).subscribe((p) => this.profil.set(p));
    });
  }

  demander(): void {
    const p = this.profil();
    if (!p || p.demandeEnvoyee || p.estAmi) return;
    this.busy.set(true);
    this.profileSvc.envoyerDemande(p.username).subscribe(() => {
      this.busy.set(false);
      this.profileSvc.profil(p.username).subscribe((np) => this.profil.set(np));
    });
  }

  bloquer(): void {
    const p = this.profil();
    if (!p) return;
    this.busy.set(true);
    this.profileSvc.toggleBlocage(p.username).subscribe(() => {
      this.busy.set(false);
      this.profileSvc.profil(p.username).subscribe((np) => this.profil.set(np));
    });
  }

  fermer(): void {
    this.closed.emit();
  }
}
