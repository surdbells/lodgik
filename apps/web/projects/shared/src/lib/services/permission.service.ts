import { Injectable, inject, computed } from '@angular/core';
import { TokenService } from './token.service';

/**
 * PermissionService
 *
 * Provides reactive, signal-based permission checking for templates and
 * components. Backed by TokenService.permissions signal — automatically
 * reactive when permissions are refreshed after login or property switch.
 *
 * Usage in components:
 *   readonly canCheckIn = this.perm.has('bookings.check_in');
 *
 * Usage in templates (via directives — see permission.directive.ts):
 *   <button *hasPerm="'bookings.cancel'">Cancel</button>
 *   <button [permDisable]="'folios.apply_discount'">Apply Discount</button>
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private token = inject(TokenService);

  /**
   * Returns a computed signal that is true when the user has the permission.
   * Use this in component class bodies to create reactive boolean signals.
   *
   * Example:
   *   readonly canVoidInvoice = this.perm.has('invoices.void');
   */
  has(permissionKey: string) {
    return computed(() => this.token.can(permissionKey));
  }

  /**
   * Returns a computed signal that is true when the user has ALL permissions.
   */
  hasAll(...permissionKeys: string[]) {
    return computed(() => this.token.canAll(...permissionKeys));
  }

  /**
   * Returns a computed signal that is true when the user has ANY permission.
   */
  hasAny(...permissionKeys: string[]) {
    return computed(() => this.token.canAny(...permissionKeys));
  }

  /**
   * Synchronous point-in-time check. Use in guards and route logic.
   * For reactive template use, prefer has() signals or directives.
   */
  check(permissionKey: string): boolean {
    return this.token.can(permissionKey);
  }
}
