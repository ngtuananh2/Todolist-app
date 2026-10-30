const test = require('node:test');
const assert = require('node:assert/strict');
const {
  applyLoginItemSettings,
  isAutoStartSupported
} = require('../src/config/desktop-settings');

test('enables and disables Windows login launch for packaged builds', () => {
  const calls = [];
  const app = {
    isPackaged: true,
    getPath: key => key === 'exe' ? 'C:\\TaskFlow\\TaskFlow.exe' : '',
    setLoginItemSettings: options => calls.push(options)
  };

  assert.equal(isAutoStartSupported(app, 'win32'), true);
  assert.equal(applyLoginItemSettings(app, true, 'win32'), true);
  assert.equal(applyLoginItemSettings(app, false, 'win32'), true);
  assert.deepEqual(calls, [
    { openAtLogin: true, path: 'C:\\TaskFlow\\TaskFlow.exe' },
    { openAtLogin: false, path: 'C:\\TaskFlow\\TaskFlow.exe' }
  ]);
});

test('does not advertise or apply login launch outside packaged Windows', () => {
  const app = {
    isPackaged: false,
    setLoginItemSettings() {
      assert.fail('Login launch must not be changed for an unpackaged app');
    }
  };

  assert.equal(isAutoStartSupported(app, 'win32'), false);
  assert.equal(applyLoginItemSettings(app, true, 'win32'), false);
  assert.equal(isAutoStartSupported({ isPackaged: true }, 'win32'), false);
  assert.equal(isAutoStartSupported({ isPackaged: true }, 'darwin'), false);
});
