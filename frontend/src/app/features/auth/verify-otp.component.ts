import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'miang-verify-otp',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verify-otp.component.html',
  styleUrl: './auth.scss',
})
export class VerifyOtpComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Bound from the ?phone= query param (withComponentInputBinding). */
  readonly phone = input('');

  protected readonly champs = viewChildren<ElementRef<HTMLInputElement>>('otp');
  protected readonly chiffres = signal<string[]>(['', '', '', '', '', '']);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly compte = signal(42);

  private timer?: ReturnType<typeof setInterval>;

  protected readonly masque = computed(() => this.masquer(this.phone()));
  protected readonly complet = computed(() => this.chiffres().every((c) => c !== ''));
  protected readonly compteTexte = computed(() => {
    const s = this.compte();
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });

  ngOnInit(): void {
    this.demarrerCompte();
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  onInput(i: number, event: Event): void {
    const el = event.target as HTMLInputElement;
    const v = el.value.replace(/\D/g, '').slice(-1);
    el.value = v;
    const arr = [...this.chiffres()];
    arr[i] = v;
    this.chiffres.set(arr);
    if (v && i < 5) {
      this.champs()[i + 1]?.nativeElement.focus();
    }
  }

  onKeydown(i: number, event: KeyboardEvent): void {
    const el = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !el.value && i > 0) {
      this.champs()[i - 1]?.nativeElement.focus();
    }
  }

  verifier(): void {
    if (!this.complet()) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.verifyOtp(this.phone(), this.chiffres().join('')).subscribe({
      next: () => this.router.navigate(['/accueil']),
      error: (err: { error?: { message?: string } }) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Code incorrect, réessaie.');
      },
    });
  }

  renvoyer(): void {
    if (this.compte() > 0) {
      return;
    }
    this.auth.resendOtp(this.phone()).subscribe(() => this.demarrerCompte());
  }

  private demarrerCompte(): void {
    this.compte.set(42);
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      this.compte.update((v) => (v > 0 ? v - 1 : 0));
      if (this.compte() === 0 && this.timer) {
        clearInterval(this.timer);
        this.timer = undefined;
      }
    }, 1000);
  }

  private masquer(p: string): string {
    if (!p) {
      return '+241 ·· ·· ·· 41';
    }
    const d = p.replace(/\D/g, '');
    return `+${d.slice(0, 3)} ·· ·· ·· ${d.slice(-2)}`;
  }
}
