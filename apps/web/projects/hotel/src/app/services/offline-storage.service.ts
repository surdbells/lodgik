import { Injectable, OnDestroy } from '@angular/core';

interface SyncQueueItem {
  id: string;
  method: string;
  url: string;
  body?: any;
  timestamp: number;
  retries: number;
}

interface CachedData {
  key: string;
  data: any;
  cachedAt: number;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class OfflineStorageService implements OnDestroy {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'lodgik_hotel_offline';
  private readonly DB_VERSION = 1;
  private _isOnline = navigator.onLine;
  private heartbeatTimer: any;
  private syncTimer: any;
  private onlineHandler = () => this.handleOnline();
  private offlineHandler = () => this.handleOffline();

  get isOnline(): boolean { return this._isOnline; }

  constructor() {
    this.initDB();
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
    this.heartbeatTimer = setInterval(() => this.checkConnectivity(), 30000);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.db?.close();
  }

  // ─── IndexedDB Setup ────────────────────────────────────────
  private initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = (e: any) => {
        const db = e.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      req.onsuccess = (e: any) => { this.db = e.target.result; resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  // ─── Cache Operations ───────────────────────────────────────
  async cacheData(key: string, data: any, ttlMinutes: number = 60): Promise<void> {
    if (!this.db) await this.initDB();
    const item: CachedData = { key, data, cachedAt: Date.now(), expiresAt: Date.now() + (ttlMinutes * 60000) };
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cache', 'readwrite');
      tx.objectStore('cache').put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cache', 'readonly');
      const req = tx.objectStore('cache').get(key);
      req.onsuccess = () => {
        const item = req.result as CachedData | undefined;
        if (!item || item.expiresAt < Date.now()) { resolve(null); return; }
        resolve(item.data as T);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async clearCache(): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cache', 'readwrite');
      tx.objectStore('cache').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ─── Sync Queue (Offline Mutations) ─────────────────────────
  async addToSyncQueue(method: string, url: string, body?: any): Promise<string> {
    if (!this.db) await this.initDB();
    const item: SyncQueueItem = { id: crypto.randomUUID(), method, url, body, timestamp: Date.now(), retries: 0 };
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('syncQueue', 'readwrite');
      tx.objectStore('syncQueue').add(item);
      tx.oncomplete = () => resolve(item.id);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('syncQueue', 'readonly');
      const req = tx.objectStore('syncQueue').index('timestamp').getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async removeSyncItem(id: string): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('syncQueue', 'readwrite');
      tx.objectStore('syncQueue').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getSyncQueueCount(): Promise<number> {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('syncQueue', 'readonly');
      const req = tx.objectStore('syncQueue').count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // ─── Auto-Sync on Reconnect ─────────────────────────────────
  async processSync(fetchFn: (method: string, url: string, body?: any) => Promise<boolean>): Promise<{ synced: number; failed: number }> {
    const queue = await this.getSyncQueue();
    let synced = 0, failed = 0;
    for (const item of queue) {
      try {
        const ok = await fetchFn(item.method, item.url, item.body);
        if (ok) { await this.removeSyncItem(item.id); synced++; }
        else { failed++; }
      } catch { failed++; }
    }
    return { synced, failed };
  }

  // ─── Connectivity ───────────────────────────────────────────
  private handleOnline(): void {
    this._isOnline = true;
    console.log('[Offline] Back online — triggering sync');
  }

  private handleOffline(): void {
    this._isOnline = false;
    console.log('[Offline] Connection lost');
  }

  private async checkConnectivity(): Promise<void> {
    try {
      const resp = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
      this._isOnline = resp.ok;
    } catch {
      this._isOnline = false;
    }
  }

  // ─── Pre-cache Critical Data ────────────────────────────────
  async preCacheCriticalData(apiBase: string, token: string, propertyId: string): Promise<void> {
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    const endpoints = [
      { key: `rooms_${propertyId}`, url: `${apiBase}/rooms?property_id=${propertyId}`, ttl: 30 },
      { key: `bookings_today_${propertyId}`, url: `${apiBase}/bookings/today?property_id=${propertyId}`, ttl: 10 },
      { key: `guests_${propertyId}`, url: `${apiBase}/guests?property_id=${propertyId}&limit=100`, ttl: 30 },
      { key: `room_types_${propertyId}`, url: `${apiBase}/room-types?property_id=${propertyId}`, ttl: 120 },
    ];
    for (const ep of endpoints) {
      try {
        const resp = await fetch(ep.url, { headers });
        if (resp.ok) {
          const data = await resp.json();
          await this.cacheData(ep.key, data, ep.ttl);
        }
      } catch { /* offline, skip */ }
    }
  }
}
