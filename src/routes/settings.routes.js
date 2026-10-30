const { Router } = require('express');
const { readAppSettings, writeAppSettings } = require('../config/app-settings');
const { getWindowBounds, getWindowSize, getWindowSizeOptions } = require('../config/window-size');
const { applyLoginItemSettings, isAutoStartSupported } = require('../config/desktop-settings');

let electronApp = null;
let electronBrowserWindow = null;
let electronScreen = null;
try {
  ({ app: electronApp, BrowserWindow: electronBrowserWindow, screen: electronScreen } = require('electron'));
} catch (_) {
  electronApp = null;
}

const router = Router();

function applyWindowSize(windowSize) {
  if (!electronBrowserWindow || !electronScreen) return false;
  const mainWindow = electronBrowserWindow.getAllWindows()[0];
  if (!mainWindow || mainWindow.isDestroyed()) return false;

  const { workArea } = electronScreen.getDisplayMatching(mainWindow.getBounds());
  const bounds = getWindowBounds(windowSize, workArea);
  if (!bounds) return false;

  mainWindow.setMinimumSize(bounds.minWidth, bounds.minHeight);
  mainWindow.setSize(bounds.width, bounds.height);
  mainWindow.center();
  return true;
}

router.get('/', async (req, res, next) => {
  try {
    const settings = await readAppSettings();
    res.json({
      ...settings,
      windowSizeOptions: getWindowSizeOptions(),
      desktopCapabilities: { launchOnStartup: isAutoStartSupported(electronApp) }
    });
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const patch = req.body;
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      return res.status(400).json({ error: 'Cài đặt không hợp lệ' });
    }

    const allowedKeys = ['launchOnStartup', 'windowSize'];
    const unknownKeys = Object.keys(patch).filter(key => !allowedKeys.includes(key));
    if (unknownKeys.length || !Object.keys(patch).length) {
      return res.status(400).json({ error: 'Cài đặt không hợp lệ' });
    }

    if (Object.hasOwn(patch, 'launchOnStartup') && typeof patch.launchOnStartup !== 'boolean') {
      return res.status(400).json({ error: 'launchOnStartup phải là true hoặc false' });
    }
    if (Object.hasOwn(patch, 'windowSize') && !getWindowSize(patch.windowSize)) {
      return res.status(400).json({ error: 'Kích thước cửa sổ không được hỗ trợ' });
    }

    if (Object.hasOwn(patch, 'launchOnStartup')) {
      applyLoginItemSettings(electronApp, patch.launchOnStartup);
    }
    const settings = await writeAppSettings(patch);
    const windowSizeApplied = Object.hasOwn(patch, 'windowSize') ? applyWindowSize(settings.windowSize) : undefined;
    res.json({ ...settings, windowSizeOptions: getWindowSizeOptions(), ...(windowSizeApplied !== undefined ? { windowSizeApplied } : {}) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;