const { app, BrowserWindow, Tray, Menu, nativeImage, screen, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { readAppSettings } = require('./src/config/app-settings');
const { DEFAULT_WINDOW_SIZE, getWindowBounds } = require('./src/config/window-size');
const { applyLoginItemSettings } = require('./src/config/desktop-settings');

let mainWindow;
let tray;
let server;
let PORT = 3000;
let updateStatus = { status: 'idle' };
let updateCheckStarted = false;

// Hardware acceleration and memory optimization switches
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

function createStartupPage(message, errorMessage = '') {
  const detail = errorMessage
    ? `<p class="error">${errorMessage.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])}</p>`
    : '<p>Đang nạp dữ liệu và dịch vụ...</p>';

  return `<!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { box-sizing: border-box; }
          body { align-items: center; background: #f4f3f1; color: #292524; display: flex; font: 14px "Segoe UI", sans-serif; justify-content: center; margin: 0; min-height: 100vh; }
          main { text-align: center; }
          .mark { align-items: center; background: #57534e; border-radius: 14px; color: #fff; display: inline-flex; font-size: 24px; font-weight: 700; height: 54px; justify-content: center; margin-bottom: 16px; width: 54px; }
          h1 { font-size: 20px; margin: 0 0 8px; }
          p { color: #78716c; margin: 0; }
          .spinner { animation: spin 0.8s linear infinite; border: 3px solid #d6d3d1; border-radius: 50%; border-top-color: #57534e; height: 24px; margin: 20px auto 0; width: 24px; }
          .error { color: #b91c1c; max-width: 420px; }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body><main><div class="mark">T</div><h1>${message}</h1>${detail}${errorMessage ? '' : '<div class="spinner"></div>'}</main></body>
    </html>`;
}

async function startBackendAndLoadApp() {
  try {
    const { startServer, PORT: serverPort } = require('./server');
    PORT = serverPort;
    server = await startServer({ deferDatabaseConnection: true });

    if (mainWindow && !mainWindow.isDestroyed()) {
      await mainWindow.loadURL(`http://localhost:${PORT}`);
      checkForUpdates();
    }
  } catch (error) {
    console.error('❌ Không thể khởi động dịch vụ TaskFlow:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(createStartupPage('Không thể khởi động TaskFlow', error.message))}`);
      dialog.showErrorBox('TaskFlow', `Không thể khởi động dịch vụ ứng dụng.\n\n${error.message}`);
    }
  }
}

function createWindow(windowSizePreference = DEFAULT_WINDOW_SIZE, { startupSplash = false } = {}) {
  const { workArea } = screen.getPrimaryDisplay();
  const bounds = getWindowBounds(windowSizePreference, workArea)
    || getWindowBounds(DEFAULT_WINDOW_SIZE, workArea);
  if (!bounds) throw new Error('Không thể xác định kích thước cửa sổ TaskFlow cho màn hình hiện tại.');

  mainWindow = new BrowserWindow({
    ...bounds,
    title: 'TaskFlow — Quản lý công việc',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#f4f3f1',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: false,
      disableBlinkFeatures: 'AutomationControlled'
    },
    autoHideMenuBar: true,
    show: false,
    frame: true,
    titleBarStyle: 'default',
    backgroundThrottling: true
  });
  mainWindow.center();

  const initialPage = startupSplash
    ? `data:text/html;charset=utf-8,${encodeURIComponent(createStartupPage('TaskFlow đang khởi động'))}`
    : `http://localhost:${PORT}`;
  mainWindow.loadURL(initialPage).catch(error => {
    console.error('❌ Không thể tải giao diện TaskFlow:', error);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (startupSplash) {
      startBackendAndLoadApp();
    }
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  // Create a simple tray icon
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch (e) {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mở TaskFlow',
      click: showMainWindow
    },
    { type: 'separator' },
    {
      label: 'Thoát',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('TaskFlow — Quản lý công việc');
  tray.setContextMenu(contextMenu);

  tray.on('click', showMainWindow);
  tray.on('double-click', showMainWindow);
}

function isAutoUpdateSupported() {
  return app.isPackaged && process.platform === 'win32' && !process.env.PORTABLE_EXECUTABLE_DIR;
}

function publishUpdateStatus(status) {
  updateStatus = status;
  BrowserWindow.getAllWindows().forEach(window => {
    if (!window.isDestroyed()) {
      window.webContents.send('taskflow-updates:status', status);
    }
  });
}

function getUpdateErrorStatus(error) {
  if (error?.statusCode === 404) {
    return { status: 'no-release' };
  }
  return { status: 'error' };
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => {
    publishUpdateStatus({ status: 'checking' });
  });
  autoUpdater.on('update-available', info => {
    publishUpdateStatus({ status: 'available', version: info.version });
  });
  autoUpdater.on('update-not-available', info => {
    publishUpdateStatus({ status: 'current', version: info.version });
  });
  autoUpdater.on('download-progress', progress => {
    publishUpdateStatus({ status: 'downloading', percent: Math.round(progress.percent) });
  });
  autoUpdater.on('update-downloaded', info => {
    publishUpdateStatus({ status: 'downloaded', version: info.version });
  });
  autoUpdater.on('error', error => {
    console.error('❌ Không thể cập nhật TaskFlow:', error);
    publishUpdateStatus(getUpdateErrorStatus(error));
  });

  ipcMain.handle('taskflow-updates:get-version', () => app.getVersion());
  ipcMain.handle('taskflow-updates:get-status', () => updateStatus);
  ipcMain.handle('taskflow-updates:check', async () => {
    if (!isAutoUpdateSupported()) {
      publishUpdateStatus({ status: 'unsupported' });
      return updateStatus;
    }

    try {
      publishUpdateStatus({ status: 'checking' });
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('❌ Không thể kiểm tra cập nhật TaskFlow:', error);
      publishUpdateStatus(getUpdateErrorStatus(error));
    }
    return updateStatus;
  });
  ipcMain.handle('taskflow-updates:install', () => {
    if (updateStatus.status !== 'downloaded') {
      throw new Error('Chưa có bản cập nhật nào sẵn sàng cài đặt.');
    }
    app.isQuitting = true;
    autoUpdater.quitAndInstall();
  });
}

function checkForUpdates() {
  if (!isAutoUpdateSupported() || updateCheckStarted) return;
  updateCheckStarted = true;
  autoUpdater.checkForUpdates().catch(error => {
    console.error('❌ Không thể kiểm tra cập nhật TaskFlow khi khởi động:', error);
    publishUpdateStatus(getUpdateErrorStatus(error));
  });
}

app.whenReady().then(async () => {
  process.env.TASKFLOW_USER_DATA_PATH = app.getPath('userData');

  setupAutoUpdater();
  const appSettings = await readAppSettings();
  applyLoginItemSettings(app, appSettings.launchOnStartup);

  console.log('🖥️  Electron app starting...');

  createWindow(appSettings.windowSize, { startupSplash: true });
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      readAppSettings().then(settings => createWindow(settings.windowSize)).catch(err => {
        console.error('❌ Không thể tải cài đặt cửa sổ:', err.message);
        createWindow();
      });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (server) {
    server.close();
  }
});
