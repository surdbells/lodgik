import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);

  // Skip auth for public endpoints (exact path matching)
  const publicPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/onboarding/register',
    '/onboarding/verify-invite',
  ];

  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;

  const isPublic = publicPaths.some(p => path.endsWith(p)) ||
    path.match(/\/plans$/) !== null && !path.includes('/admin/') && !path.includes('/gym/') ||
    path.endsWith('/apps/latest') ||
    path.endsWith('/apps/version-check');

  if (isPublic) {
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
