import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KycService } from '../../core/data/kyc.service';
import { PieceType } from '../../core/models';

interface TypePiece {
  id: PieceType;
  label: string;
  icon: string;
}

@Component({
  selector: 'miang-kyc',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kyc.component.html',
  styleUrl: './kyc.component.scss',
})
export class KycComponent {
  private readonly kyc = inject(KycService);

  protected readonly statut = this.kyc.statut;
  protected readonly dossier = this.kyc.dossier;

  protected readonly types: TypePiece[] = [
    { id: 'cni', label: "Carte nationale d'identité", icon: 'ti-id' },
    { id: 'passeport', label: 'Passeport', icon: 'ti-book-2' },
    { id: 'permis', label: 'Permis de conduire', icon: 'ti-steering-wheel' },
  ];

  protected readonly etape = signal(1);
  protected readonly type = signal<PieceType | null>(null);
  protected readonly numero = signal('');
  protected readonly docNom = signal<string | null>(null);
  protected readonly docPreview = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly valide = computed(
    () => !!this.type() && this.numero().trim().length >= 3 && !!this.docNom(),
  );

  libelleType(t: PieceType | null | undefined): string {
    return this.types.find((x) => x.id === t)?.label ?? '—';
  }

  choisirType(t: PieceType): void {
    this.type.set(t);
    this.etape.set(2);
  }

  onDoc(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.docNom.set(file.name);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => this.docPreview.set(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      this.docPreview.set(null);
    }
  }

  soumettre(): void {
    if (!this.valide() || this.busy()) return;
    this.busy.set(true);
    this.kyc
      .soumettre({ type: this.type()!, numero: this.numero().trim(), fichierNom: this.docNom()! })
      .subscribe(() => this.busy.set(false));
  }

  simuler(decision: 'verifie' | 'rejete'): void {
    this.kyc.simuler(decision);
  }

  recommencer(): void {
    this.kyc.recommencer();
    this.etape.set(1);
    this.type.set(null);
    this.numero.set('');
    this.docNom.set(null);
    this.docPreview.set(null);
  }
}
