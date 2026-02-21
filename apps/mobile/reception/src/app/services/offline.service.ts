import { Injectable } from '@angular/core';
import { ApplicationSettings, Connectivity } from '@nativescript/core';

interface SyncItem {
  id: string;
  method: string;
  url: string;
  body?: any;
  timestamp: number;
  retries: number;
}

const SYNC_QUEUE_KEY = 'offline_sync_queue';
const CACHE_PREFIX = 'offline_cache_';

@Injectable({ providedIn: 'root' })
export class OfflineService {
  private _isOnline = true;

  get isOnline(): boolean { return this._isOnline; }

  constructor() {
    this.checkConnectivity();
    Connectivity.startMonitoring((change: number) => {
      this._isOnline = change !== Connectivity.connectionType.none;
      if (this._isOnline) { console.log('[Offline] Reconnected — ready to sync'); }
      else { console.log('[Offline] Connection lost'); }
    });
  }

  private checkConnectivity(): void {
    const type = Connectivity.getConnectionType();
    this._isOnline = type !== Connectivity.connectionType.none;
  }

  // ─── Cache (ApplicationSettings) ────────────────────────────
  cacheData(key: string, data: any, ttlMinutes: number = 60): void {
    const item = { data, cachedAt: Date.now(), expiresAt: Date.now() + (ttlMinutes * 60000) };
    ApplicationSettings.setString(CACHE_PREFIX + key, JSON.stringify(item));
  }

  getCachedData<T>(key: string): T | null {
    const raw = ApplicationSettings.getString(CACHE_PREFIX + key, '');
    if (!raw) return null;
    try {
      const item = JSON.parse(raw);
      if (item.expiresAt < Date.now()) { ApplicationSettings.remove(CACHE_PREFIX + key); return null; }
      return item.data as T;
    } catch { return null; }
  }

  clearCache(): void {
    // NativeScript doesn't have getAllKeys, so we track cached keys
    const keys = this.getCachedKeys();
    keys.forEach(k => ApplicationSettings.remove(CACHE_PREFIX + k));
    ApplicationSettings.remove('offline_cached_keys');
  }

  private getCachedKeys(): string[] {
    const raw = ApplicationSettings.getString('offline_cached_keys', '[]');
    try { return JSON.parse(raw); } catch { return []; }
  }

  private trackCacheKey(key: string): void {
    const keys = this.getCachedKeys();
    if (!keys.includes(key)) { keys.push(key); ApplicationSettings.setString('offline_cached_keys', JSON.stringify(keys)); }
  }

  // ─── Sync Queue ─────────────────────────────────────────────
  addToSyncQueue(method: string, url: string, body?: any): string {
    const queue = this.getSyncQueue();
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    queue.push({ id, method, url, body, timestamp: Date.now(), retries: 0 });
    ApplicationSettings.setString(SYNC_QUEUE_KEY, JSON.stringify(queue));
    return id;
  }

  getSyncQueue(): SyncItem[] {
    const raw = ApplicationSettings.getString(SYNC_QUEUE_KEY, '[]');
    try { return JSON.parse(raw); } catch { return []; }
  }

  getSyncQueueCount(): number { return this.getSyncQueue().length; }

  removeSyncItem(id: string): void {
    const queue = this.getSyncQueue().filter(i => i.id !== id);
    ApplicationSettings.setString(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  clearSyncQueue(): void { ApplicationSettings.remove(SYNC_QUEUE_KEY); }

  async processSync(fetchFn: (method: string, url: string, body?: any) => Promise<boolean>): Promise<{ synced: number; failed: number }> {
    const queue = this.getSyncQueue();
    let synced = 0, failed = 0;
    for (const item of queue) {
      try {
        const ok = await fetchFn(item.method, item.url, item.body);
        if (ok) { this.removeSyncItem(item.id); synced++; }
        else { failed++; }
      } catch { failed++; }
    }
    return { synced, failed };
  }

  // ─── Pre-cache critical data ────────────────────────────────
  async preCacheCritical(apiService: any): Promise<void> {
    try {
      apiService.getRooms().subscribe((r: any) => { if (r?.data) { this.cacheData('rooms', r.data, 30); this.trackCacheKey('rooms'); } });
      apiService.getBookings().subscribe((r: any) => { if (r?.data) { this.cacheData('bookings', r.data, 10); this.trackCacheKey('bookings'); } });
      apiService.getGuests().subscribe((r: any) => { if (r?.data) { this.cacheData('guests', r.data, 30); this.trackCacheKey('guests'); } });
    } catch { /* offline — skip */ }
  }
}
