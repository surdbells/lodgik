import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../services/token.service';
import { UserRole } from '../models';

export const authGuard: CanActivateFn = () => {
  const token = inject(TokenService);
  const router = inject(Router);

  if (token.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const token = inject(TokenService);
  const router = inject(Router);

  if (token.isAuthenticated() && token.isAdmin()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export function roleGuard(...roles: UserRole[]): CanActivateFn {
  return () => {
    const token = inject(TokenService);
    const router = inject(Router);
    const role = token.role();

    if (token.isAuthenticated() && role && roles.includes(role)) {
      return true;
    }

    router.navigate(['/login']);
    return false;
  };
}

export const featureGuard = (moduleKey: string): CanActivateFn => {
  return () => {
    // Dynamic import to avoid circular deps
    const token = inject(TokenService);
    // For now, just check auth — FeatureGuard will be enhanced when FeatureService is loaded
    return token.isAuthenticated();
  };
};
