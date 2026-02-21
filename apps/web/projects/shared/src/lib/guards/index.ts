import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../services/token.service';
import { FeatureService } from '../services/feature.service';
import { UserRole } from '../models';

export const authGuard: CanActivateFn = () => {
  const token = inject(TokenService);
  const router = inject(Router);
  if (token.isAuthenticated()) return true;
  router.navigate(['/login']);
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const token = inject(TokenService);
  const router = inject(Router);
  if (token.isAuthenticated() && token.isAdmin()) return true;
  router.navigate(['/login']);
  return false;
};

export function roleGuard(...roles: UserRole[]): CanActivateFn {
  return () => {
    const token = inject(TokenService);
    const router = inject(Router);
    const role = token.role();
    if (token.isAuthenticated() && role && roles.includes(role)) return true;
    router.navigate(['/login']);
    return false;
  };
}

export const featureGuard = (moduleKey: string): CanActivateFn => {
  return () => {
    const token = inject(TokenService);
    const features = inject(FeatureService);
    const router = inject(Router);

    if (!token.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    // If features not loaded yet, allow access (will be gated in UI via directive)
    if (!features.loaded()) return true;

    if (features.isEnabled(moduleKey)) return true;

    // Module not enabled — redirect to features page
    router.navigate(['/features']);
    return false;
  };
};
