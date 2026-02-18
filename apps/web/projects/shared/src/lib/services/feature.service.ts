import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { TenantFeatures } from '../models';

@Injectable({ providedIn: 'root' })
export class FeatureService {
  private api = inject(ApiService);
  private _features = signal<TenantFeatures | null>(null);
  private _loaded = signal(false);

  readonly features = this._features.asReadonly();
  readonly enabledModules = computed(() => this._features()?.enabled_modules ?? []);
  readonly loaded = this._loaded.asReadonly();

  load(): void {
    this.api.get<TenantFeatures>('/features/tenant').subscribe(res => {
      if (res.success) {
        this._features.set(res.data);
        this._loaded.set(true);
      }
    });
  }

  isEnabled(moduleKey: string): boolean {
    return this.enabledModules().includes(moduleKey);
  }

  hasAny(...moduleKeys: string[]): boolean {
    const enabled = this.enabledModules();
    return moduleKeys.some(k => enabled.includes(k));
  }

  hasAll(...moduleKeys: string[]): boolean {
    const enabled = this.enabledModules();
    return moduleKeys.every(k => enabled.includes(k));
  }
}
