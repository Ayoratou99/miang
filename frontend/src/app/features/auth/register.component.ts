import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TELEPHONE_PREFIXE } from '../../core/api';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'miang-register',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.component.html',
  styleUrl: './auth.scss',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly prefixe = TELEPHONE_PREFIXE;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nom: ['', [Validators.required]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9 ]{6,}$/)]],
    motDePasse: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    const phone = this.prefixe + v.phone.replace(/\s/g, '');
    this.auth
      .register({
        nom: v.nom,
        username: v.username.replace(/^@/, ''),
        phone,
        motDePasse: v.motDePasse,
      })
      .subscribe({
        next: (res) => this.router.navigate(['/verification'], { queryParams: { phone: res.phone } }),
        error: (err: { error?: { message?: string } }) => {
          this.loading.set(false);
          this.error.set(err.error?.message ?? 'Inscription impossible');
        },
      });
  }
}
