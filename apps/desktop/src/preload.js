const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lodgikDesktop', {
  showNotification: (title, body) => {
    ipcRenderer.send('show-notification', { title, body });
  },
  platform: process.platform,
  version: require('../../package.json').version,
  isDesktop: true,
});
