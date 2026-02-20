const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow = null;
let tray = null;
const APP_URL = process.env.LODGIK_APP_URL || 'https://app.lodgik.io';

// ─── Single Instance Lock ───────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// ─── Create Window ──────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Lodgik Hotel Management',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── System Tray ────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  try {
    tray = new Tray(nativeImage.createEmpty());
  } catch (e) {
    tray = new Tray(iconPath);
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Lodgik', click: () => { if (mainWindow) mainWindow.show(); else createWindow(); } },
    { type: 'separator' },
    { label: 'Check for Updates', click: () => autoUpdater.checkForUpdates() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray.setToolTip('Lodgik Hotel Management');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { if (mainWindow) mainWindow.show(); });
}

// ─── Auto-Update ────────────────────────────────────────────────
function setupAutoUpdate() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    showNotification('Update Available', `Version ${info.version} is downloading...`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    showNotification('Update Ready', `Version ${info.version} will be installed on restart.`);
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err.message);
  });

  // Check for updates every 4 hours
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000);
}

// ─── Native Notifications ───────────────────────────────────────
function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: path.join(__dirname, '..', 'assets', 'icon.png') }).show();
  }
}

// IPC: Allow web app to trigger native notifications
ipcMain.on('show-notification', (event, { title, body }) => {
  showNotification(title, body);
});

// ─── App Lifecycle ──────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();
  setupAutoUpdate();
});

app.on('window-all-closed', () => {
  // Keep running in tray on macOS
  if (process.platform !== 'darwin') {
    // Don't quit, keep tray
  }
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
  else mainWindow.show();
});

app.on('before-quit', () => { app.isQuitting = true; });
