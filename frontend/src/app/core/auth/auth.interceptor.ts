import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE } from '../api';
import { AuthService } from './auth.service';

/** Attaches the access token and transparently refreshes once on 401. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isApi = req.url.startsWith(API_BASE);
  const isAuthRoute = req.url.includes(`${API_BASE}/auth/`);
  const token = auth.accessToken;

  const authorized =
    token && isApi ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authorized).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && isApi && !isAuthRoute && auth.refreshToken) {
        return auth.refresh().pipe(
          switchMap(() =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${auth.accessToken}` } })),
          ),
          catchError((refreshErr) => {
            auth.clearSession();
            void router.navigate(['/bienvenue']);
            return throwError(() => refreshErr);
          }),
        );
      }
      return throwError(() => err);
    }),
  );
};
