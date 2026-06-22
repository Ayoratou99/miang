import { HttpClient } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { Observable, delay, of, tap, throwError } from 'rxjs';
import { API_BASE, USE_MOCK } from '../api';
import { AuthResponse, Utilisateur } from '../models';
import { MOI } from '../mock/seed';

const ACCESS_KEY = 'miang_access';
const REFRESH_KEY = 'miang_refresh';
const USER_KEY = 'miang_user';

export interface RegisterPayload {
  nom: string;
  username: string;
  phone: string;
  motDePasse: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly user = signal<Utilisateur | null>(this.readUser());
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => !!this.user() && !!this.accessToken);

  constructor(private readonly http: HttpClient) {}

  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  register(payload: RegisterPayload): Observable<{ message: string; phone: string }> {
    if (USE_MOCK) {
      return of({ message: 'Code envoyé par WhatsApp', phone: payload.phone }).pipe(delay(450));
    }
    return this.http.post<{ message: string; phone: string }>(`${API_BASE}/auth/register`, payload);
  }

  verifyOtp(phone: string, code: string): Observable<AuthResponse> {
    if (USE_MOCK) {
      if (!/^\d{6}$/.test(code)) {
        return throwError(() => ({ status: 400, error: { message: 'Code invalide' } })).pipe(
          delay(350),
        );
      }
      return of(this.mockSession()).pipe(
        delay(500),
        tap((res) => this.setSession(res)),
      );
    }
    return this.http
      .post<AuthResponse>(`${API_BASE}/auth/verify-otp`, { phone, code })
      .pipe(tap((res) => this.setSession(res)));
  }

  resendOtp(phone: string): Observable<{ message: string }> {
    if (USE_MOCK) {
      return of({ message: 'Code renvoyé' }).pipe(delay(400));
    }
    return this.http.post<{ message: string }>(`${API_BASE}/auth/resend-otp`, { phone });
  }

  login(identifiant: string, motDePasse: string): Observable<AuthResponse> {
    if (USE_MOCK) {
      if (!identifiant.trim() || !motDePasse) {
        return throwError(() => ({ status: 401, error: { message: 'Identifiants requis' } })).pipe(
          delay(350),
        );
      }
      return of(this.mockSession()).pipe(
        delay(550),
        tap((res) => this.setSession(res)),
      );
    }
    return this.http
      .post<AuthResponse>(`${API_BASE}/auth/login`, { identifiant, motDePasse })
      .pipe(tap((res) => this.setSession(res)));
  }

  refresh(): Observable<AuthResponse> {
    if (USE_MOCK) {
      return of(this.mockSession()).pipe(tap((res) => this.setSession(res)));
    }
    return this.http
      .post<AuthResponse>(`${API_BASE}/auth/refresh`, { refreshToken: this.refreshToken })
      .pipe(tap((res) => this.setSession(res)));
  }

  logout(): Observable<unknown> {
    if (USE_MOCK) {
      this.clearSession();
      return of(null).pipe(delay(120));
    }
    const refreshToken = this.refreshToken;
    return this.http
      .post(`${API_BASE}/auth/logout`, { refreshToken })
      .pipe(tap({ next: () => this.clearSession(), error: () => this.clearSession() }));
  }

  setUser(user: Utilisateur): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.user.set(user);
  }

  setSession(res: AuthResponse): void {
    localStorage.setItem(ACCESS_KEY, res.accessToken);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.utilisateur));
    this.user.set(res.utilisateur);
  }

  clearSession(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
  }

  /** Mock auth always resolves to the demo persona so seed data stays coherent. */
  private mockSession(): AuthResponse {
    return {
      accessToken: 'mock.access.' + Math.abs(this.hash(Date().toString())),
      refreshToken: 'mock.refresh',
      utilisateur: { ...MOI },
    };
  }

  private hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return h;
  }

  private readUser(): Utilisateur | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as Utilisateur) : null;
  }
}
