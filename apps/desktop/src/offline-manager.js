/**
 * Lodgik Desktop Offline Manager
 * Uses better-sqlite3 for local caching and sync queue management.
 * Integrates with Electron's main process.
 */
const path = require('path');
const { app, ipcMain, Notification } = require('electron');

// In production, better-sqlite3 would be installed. For now, use JSON file fallback.
const fs = require('fs');
const DATA_DIR = path.join(app.getPath('userData'), 'offline_data');

class OfflineManager {
  constructor() {
    this.isOnline = true;
    this.syncQueue = [];
    this.cache = {};
    this.dataDir = DATA_DIR;
    this.ensureDataDir();
    this.loadState();
    this.startHeartbeat();
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
  }

  // ─── State Persistence ────────────────────────────────────
  loadState() {
    try {
      const queuePath = path.join(this.dataDir, 'sync_queue.json');
      const cachePath = path.join(this.dataDir, 'cache.json');
      if (fs.existsSync(queuePath)) this.syncQueue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      if (fs.existsSync(cachePath)) this.cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch (e) { console.error('[Offline] Failed to load state:', e); }
  }

  saveState() {
    try {
      fs.writeFileSync(path.join(this.dataDir, 'sync_queue.json'), JSON.stringify(this.syncQueue));
      fs.writeFileSync(path.join(this.dataDir, 'cache.json'), JSON.stringify(this.cache));
    } catch (e) { console.error('[Offline] Failed to save state:', e); }
  }

  // ─── Cache ─────────────────────────────────────────────────
  cacheData(key, data, ttlMinutes = 60) {
    this.cache[key] = { data, cachedAt: Date.now(), expiresAt: Date.now() + (ttlMinutes * 60000) };
    this.saveState();
  }

  getCachedData(key) {
    const item = this.cache[key];
    if (!item || item.expiresAt < Date.now()) return null;
    return item.data;
  }

  clearCache() { this.cache = {}; this.saveState(); }

  // ─── Sync Queue ────────────────────────────────────────────
  addToQueue(method, url, body) {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    this.syncQueue.push({ id, method, url, body, timestamp: Date.now(), retries: 0 });
    this.saveState();
    return id;
  }

  getQueueCount() { return this.syncQueue.length; }

  async processQueue(fetchFn) {
    let synced = 0, failed = 0;
    const remaining = [];
    for (const item of this.syncQueue) {
      try {
        const ok = await fetchFn(item.method, item.url, item.body);
        if (ok) { synced++; } else { item.retries++; remaining.push(item); failed++; }
      } catch { item.retries++; remaining.push(item); failed++; }
    }
    this.syncQueue = remaining;
    this.saveState();
    return { synced, failed };
  }

  // ─── Heartbeat ─────────────────────────────────────────────
  startHeartbeat() {
    setInterval(async () => {
      const wasOnline = this.isOnline;
      try {
        const https = require('https');
        await new Promise((resolve, reject) => {
          const req = https.get('https://app.lodgik.io/api/health', { timeout: 5000 }, (res) => resolve(res.statusCode === 200));
          req.on('error', () => reject());
          req.on('timeout', () => { req.destroy(); reject(); });
        });
        this.isOnline = true;
      } catch { this.isOnline = false; }

      if (!wasOnline && this.isOnline && this.syncQueue.length > 0) {
        new Notification({ title: 'Lodgik', body: `Back online! ${this.syncQueue.length} actions pending sync.` }).show();
      }
    }, 30000);
  }

  // ─── IPC Handlers ──────────────────────────────────────────
  registerIPC() {
    ipcMain.handle('offline:status', () => ({ isOnline: this.isOnline, queueCount: this.syncQueue.length }));
    ipcMain.handle('offline:cache-get', (_, key) => this.getCachedData(key));
    ipcMain.handle('offline:cache-set', (_, key, data, ttl) => { this.cacheData(key, data, ttl); return true; });
    ipcMain.handle('offline:queue-add', (_, method, url, body) => this.addToQueue(method, url, body));
    ipcMain.handle('offline:queue-count', () => this.getQueueCount());
    ipcMain.handle('offline:clear-cache', () => { this.clearCache(); return true; });
  }
}

module.exports = { OfflineManager };
