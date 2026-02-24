import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Subject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshDone$ = new Subject<boolean>();

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);

  // Skip auth for public endpoints
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
    (path.match(/\/plans$/) !== null && !path.includes('/admin/') && !path.includes('/gym/')) ||
    path.endsWith('/apps/latest') ||
    path.endsWith('/apps/version-check');

  if (isPublic) {
    return next(req);
  }

  // Attach current token
  const token = tokenService.getAccessToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || req.url.includes('/auth/refresh')) {
        return throwError(() => error);
      }

      // If already refreshing, queue this request and wait
      if (isRefreshing) {
        return refreshDone$.pipe(
          filter(v => v !== null),
          take(1),
          switchMap(success => {
            if (success) {
              return next(withToken(req, tokenService.getAccessToken()!));
            }
            return throwError(() => error);
          })
        );
      }

      // First 401 — start refresh
      isRefreshing = true;

      return authService.refresh().pipe(
        switchMap(res => {
          isRefreshing = false;
          if (res.success && res.data) {
            refreshDone$.next(true);
            return next(withToken(req, tokenService.getAccessToken()!));
          }
          refreshDone$.next(false);
          authService.navigateToLogin();
          return throwError(() => error);
        }),
        catchError(refreshErr => {
          isRefreshing = false;
          refreshDone$.next(false);
          authService.navigateToLogin();
          return throwError(() => refreshErr);
        })
      );
    })
  );
};

function withToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
