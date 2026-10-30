function isAutoStartSupported(app, platform = process.platform) {
  return platform === 'win32' && Boolean(app?.isPackaged)
    && typeof app.setLoginItemSettings === 'function';
}

function applyLoginItemSettings(app, launchOnStartup, platform = process.platform) {
  if (!isAutoStartSupported(app, platform)) return false;

  app.setLoginItemSettings({
    openAtLogin: Boolean(launchOnStartup),
    path: app.getPath('exe')
  });
  return true;
}

module.exports = { isAutoStartSupported, applyLoginItemSettings };
