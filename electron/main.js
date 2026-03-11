const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

try {
  const config = require('./runtime-config');
  Object.assign(process.env, config);
} catch (_) { }

const { registerDbHandlers } = require('./db-handlers');
const { registerLlmHandlers } = require('./llm-handlers');

// app.isPackaged is true only in the distributed build — reliable unlike NODE_ENV
const isDev = !app.isPackaged;

// WebGPU (required by MediaPipe LLM) — flags must be set before app.ready.
// On Windows Electron 34+, D3D12 is the reliable backend; do NOT force Vulkan.
app.commandLine.appendSwitch('enable-unsafe-webgpu');
app.commandLine.appendSwitch('enable-features', 'WebGPU,WebGPUExperimentalFeatures,WebGPUSubgroups');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-gpu-process-crash-limit');

let loadURL;
if (!isDev) {
  const serve = require('electron-serve');
  loadURL = serve({ directory: path.join(__dirname, '..', 'out') });
}

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: '#2B2D31',
    icon: path.join(__dirname, '..', 'public', 'LogoSplashScreen.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,           // workers need access to WebGPU device
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.setMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    await loadURL(mainWindow);
  }

  mainWindow.on('closed', () => app.quit());

  ipcMain.on('window:minimize', () => mainWindow.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow.close());

  return mainWindow;
}

function setupAutoUpdater(mainWindow) {
  if (isDev) return; // auto-updates are only for production builds
  // if (isDev) {
  //   autoUpdater.forceDevUpdateConfig = true;
  // };

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('updater:available', info);
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('updater:downloaded', info);
  });

  autoUpdater.on('error', (err) => {
    console.error('[auto-updater]', err.message);
  });

  ipcMain.handle('updater:download', () => {
    autoUpdater.downloadUpdate().catch((err) => {
      console.error('[auto-updater] downloadUpdate failed:', err.message);
    });
  });

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall();
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[auto-updater] checkForUpdates failed:', err.message);
  });
}

app.whenReady().then(() => {
  registerDbHandlers();
  registerLlmHandlers();
  createWindow().then((win) => setupAutoUpdater(win));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
