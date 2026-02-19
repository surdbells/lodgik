import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { RouterExtensions } from '@nativescript/angular';
import { ApiService } from '../services/api.service';

export const guestAuthGuard: CanActivateFn = () => {
  const api = inject(ApiService);
  const router = inject(RouterExtensions);

  if (api.isLoggedIn()) return true;
  router.navigate(['/login'], { clearHistory: true });
  return false;
};
