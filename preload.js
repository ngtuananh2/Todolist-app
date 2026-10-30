const { contextBridge, clipboard, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('taskflowClipboard', {
  readImageDataUrl() {
    try {
      const image = clipboard.readImage();
      if (!image || image.isEmpty()) return '';
      return image.toDataURL();
    } catch (_) {
      return '';
    }
  }
});

contextBridge.exposeInMainWorld('taskflowUpdates', {
  getVersion() {
    return ipcRenderer.invoke('taskflow-updates:get-version');
  },
  getStatus() {
    return ipcRenderer.invoke('taskflow-updates:get-status');
  },
  check() {
    return ipcRenderer.invoke('taskflow-updates:check');
  },
  install() {
    return ipcRenderer.invoke('taskflow-updates:install');
  },
  onStatus(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Update status listener must be a function.');
    }
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('taskflow-updates:status', listener);
    return () => ipcRenderer.removeListener('taskflow-updates:status', listener);
  }
});