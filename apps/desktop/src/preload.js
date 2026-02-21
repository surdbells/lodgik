const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lodgikDesktop', {
  showNotification: (title, body) => {
    ipcRenderer.send('show-notification', { title, body });
  },
  platform: process.platform,
  version: require('../../package.json').version,
  isDesktop: true,
});

// ─── Offline API ──────────────────────────────────────────────
const { ipcRenderer } = require('electron');
window.lodgikOffline = {
  getStatus: () => ipcRenderer.invoke('offline:status'),
  cacheGet: (key) => ipcRenderer.invoke('offline:cache-get', key),
  cacheSet: (key, data, ttl) => ipcRenderer.invoke('offline:cache-set', key, data, ttl),
  queueAdd: (method, url, body) => ipcRenderer.invoke('offline:queue-add', method, url, body),
  queueCount: () => ipcRenderer.invoke('offline:queue-count'),
  clearCache: () => ipcRenderer.invoke('offline:clear-cache'),
};
