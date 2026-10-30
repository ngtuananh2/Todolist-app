const fs = require('fs/promises');
const path = require('path');
const { DEFAULT_WINDOW_SIZE, getWindowSize } = require('./window-size');

const DEFAULT_APP_SETTINGS = {
  launchOnStartup: false,
  windowSize: DEFAULT_WINDOW_SIZE
};

function getAppSettingsFilePath() {
  const baseDir = process.env.TASKFLOW_USER_DATA_PATH || path.join(process.cwd(), 'file_backup');
  return path.join(baseDir, 'app-settings.json');
}

async function readAppSettings() {
  const filePath = getAppSettingsFilePath();

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const stored = JSON.parse(raw);
    return {
      ...DEFAULT_APP_SETTINGS,
      ...stored,
      launchOnStartup: Boolean(stored.launchOnStartup),
      windowSize: getWindowSize(stored.windowSize) ? stored.windowSize : DEFAULT_WINDOW_SIZE
    };
  } catch (err) {
    if (err?.code === 'ENOENT') {
      return { ...DEFAULT_APP_SETTINGS };
    }

    throw err;
  }
}

async function writeAppSettings(patch) {
  const filePath = getAppSettingsFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const current = await readAppSettings();
  const next = { ...current, ...patch };
  await fs.writeFile(filePath, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

module.exports = {
  DEFAULT_APP_SETTINGS,
  getAppSettingsFilePath,
  readAppSettings,
  writeAppSettings
};