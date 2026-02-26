import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { TokenService } from './token.service';
import { Subject } from 'rxjs';

export interface AccessibleProperty {
  id: string;
  name: string;
  city?: string;
  is_current: boolean;
}

@Injectable({ providedIn: 'root' })
export class ActivePropertyService {
  private api = inject(ApiService);
  private token = inject(TokenService);

  /** All properties the user can access */
  private _properties = signal<AccessibleProperty[]>([]);
  readonly properties = this._properties.asReadonly();

  /** The currently active property ID */
  readonly propertyId = computed(() => {
    const user = this.token.user();
    return user?.property_id || '';
  });

  /** The currently active property object */
  readonly currentProperty = computed(() => {
    const pid = this.propertyId();
    return this._properties().find(p => p.id === pid) || null;
  });

  /** Human readable name of current property */
  readonly propertyName = computed(() => {
    return this.currentProperty()?.name || 'My Hotel';
  });

  /** Whether tenant has multiple properties */
  readonly isMultiProperty = computed(() => this._properties().length > 1);

  /** Emits when property is switched — components subscribe to reload data */
  readonly propertySwitched$ = new Subject<string>();

  /** Switching in progress flag */
  private _switching = signal(false);
  readonly switching = this._switching.asReadonly();

  /**
   * Load accessible properties from API.
   * Call this once on layout init.
   */
  load(): void {
    this.api.get('/auth/accessible-properties').subscribe({
      next: (r: any) => {
        if (r?.success) {
          this._properties.set(r.data || []);
        }
      },
      error: () => {
        // Fallback: use /properties endpoint
        this.api.get('/properties').subscribe((r: any) => {
          if (r?.success) {
            const pid = this.propertyId();
            this._properties.set((r.data || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              city: p.city,
              is_current: p.id === pid,
            })));
          }
        });
      },
    });
  }

  /**
   * Switch to a different property.
   * Issues new JWT via API, updates tokens and user data.
   * Emits propertySwitched$ so components can reload.
   */
  switchTo(propertyId: string): void {
    if (propertyId === this.propertyId() || this._switching()) return;
    this._switching.set(true);

    this.api.post('/auth/switch-property', { property_id: propertyId }).subscribe({
      next: (r: any) => {
        this._switching.set(false);
        if (r?.success && r.data) {
          // Update tokens
          this.token.setTokens(r.data.access_token, r.data.refresh_token);
          this.token.setUser(r.data.user);

          // Update properties list to reflect new current
          this._properties.update(props => props.map(p => ({
            ...p,
            is_current: p.id === propertyId,
          })));

          // Notify all listening components to reload their data
          this.propertySwitched$.next(propertyId);

          // Reload page to ensure all components fetch fresh data for new property
          setTimeout(() => window.location.href = '/dashboard', 300);
        }
      },
      error: () => {
        this._switching.set(false);
      },
    });
  }
}
