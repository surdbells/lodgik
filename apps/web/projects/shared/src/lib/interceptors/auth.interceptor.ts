import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);

  // Skip auth for public endpoints
  if (req.url.includes('/auth/login') || req.url.includes('/auth/register') ||
      req.url.includes('/auth/refresh') || req.url.includes('/plans') ||
      req.url.includes('/apps/latest') || req.url.includes('/apps/version-check') ||
      req.url.includes('/onboarding/register') || req.url.includes('/onboarding/verify-invite')) {
    return next(req);
  }

  const token = tokenService.getAccessToken();
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isRefreshing && !req.url.includes('/auth/refresh')) {
        isRefreshing = true;
        return authService.refresh().pipe(
          switchMap(res => {
            isRefreshing = false;
            if (res.success) {
              const newToken = tokenService.getAccessToken();
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
              });
              return next(retryReq);
            }
            authService.navigateToLogin();
            return throwError(() => error);
          }),
          catchError(refreshErr => {
            isRefreshing = false;
            authService.navigateToLogin();
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
