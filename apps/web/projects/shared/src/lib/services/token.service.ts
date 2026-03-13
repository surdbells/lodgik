import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from './api.service';
import { User } from '../models';

const ACCESS_TOKEN_KEY  = 'lodgik_access_token';
const REFRESH_TOKEN_KEY = 'lodgik_refresh_token';
const USER_KEY          = 'lodgik_user';
const PERMISSIONS_KEY   = 'lodgik_permissions';

/** Roles that bypass all RBAC checks — always have every permission. */
const BYPASS_ROLES = ['super_admin', 'property_admin'] as const;

@Injectable({ providedIn: 'root' })
export class TokenService {
  private api = inject(ApiService);

  private _user        = signal<User | null>(this.loadUser());
  private _permissions = signal<string[]>(this.loadPermissions());
  private _permLoading = signal(false);

  readonly user            = this._user.asReadonly();
  readonly permissions     = this._permissions.asReadonly();
  readonly permLoading     = this._permLoading.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user() && !!this.getAccessToken());
  readonly isAdmin         = computed(() => this._user()?.role === 'super_admin');
  readonly role            = computed(() => this._user()?.role ?? null);
  readonly tenantId        = computed(() => this._user()?.tenant_id ?? null);

  // ── Token accessors ──────────────────────────────────────────────────

  getAccessToken(): string | null  { return localStorage.getItem(ACCESS_TOKEN_KEY); }
  getRefreshToken(): string | null { return localStorage.getItem(REFRESH_TOKEN_KEY); }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PERMISSIONS_KEY);
    this._user.set(null);
    this._permissions.set([]);
  }

  isTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  // ── Permission management ────────────────────────────────────────────

  /**
   * Fetch the current user's permission set from the backend and cache it.
   * Called once after a successful login, and after a property switch.
   * Bypass roles skip the network call and get sentinel ['*'].
   */
  fetchPermissions(propertyId: string): void {
    const userRole = this._user()?.role;
    if (!userRole) return;

    if ((BYPASS_ROLES as readonly string[]).includes(userRole)) {
      this.setPermissions(['*']);
      return;
    }

    if (!propertyId) return;

    this._permLoading.set(true);

    this.api.get<{ permissions: string[] }>(
        '/rbac/my-permissions',
        { property_id: propertyId }
      )
      .subscribe({
        next: (res: { success: boolean; data: { permissions: string[] } }) => {
          if (res.success && res.data?.permissions) {
            this.setPermissions(res.data.permissions);
          }
          this._permLoading.set(false);
        },
        error: () => {
          this._permLoading.set(false);
        },
      });
  }

  setPermissions(permissions: string[]): void {
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
    this._permissions.set(permissions);
  }

  /** True if the user has a specific permission (or is a bypass role). */
  can(permissionKey: string): boolean {
    const perms = this._permissions();
    if (perms.includes('*')) return true;
    return perms.includes(permissionKey);
  }

  /** True only if ALL supplied permission keys are granted. */
  canAll(...permissionKeys: string[]): boolean {
    return permissionKeys.every(k => this.can(k));
  }

  /** True if ANY of the supplied permission keys are granted. */
  canAny(...permissionKeys: string[]): boolean {
    return permissionKeys.some(k => this.can(k));
  }

  // ── Private helpers ──────────────────────────────────────────────────

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private loadPermissions(): string[] {
    try {
      const raw = localStorage.getItem(PERMISSIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
