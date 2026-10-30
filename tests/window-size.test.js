const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_WINDOW_SIZE,
  getWindowSize,
  getWindowSizeOptions,
  getWindowBounds
} = require('../src/config/window-size');

test('provides a default size that meets the desktop window minimum', () => {
  const size = getWindowSize(DEFAULT_WINDOW_SIZE);
  assert.deepEqual({ width: size.width, height: size.height }, { width: 1200, height: 780 });
  assert.ok(size.width >= 800);
  assert.ok(size.height >= 600);
});

test('returns only supported window sizes', () => {
  assert.equal(getWindowSize('1x1'), null);
  assert.deepEqual(getWindowSizeOptions().map(option => option.value), [
    '800x600',
    '1024x700',
    '1200x780',
    '1366x768',
    '1600x900',
    '1920x1080'
  ]);
});

test('fits selected size and minimum constraints within the available work area', () => {
  assert.deepEqual(getWindowBounds('1920x1080', { width: 1366, height: 768 }), {
    width: 1366,
    height: 768,
    minWidth: 800,
    minHeight: 600
  });
  assert.deepEqual(getWindowBounds('1200x780', { width: 640, height: 480 }), {
    width: 640,
    height: 480,
    minWidth: 640,
    minHeight: 480
  });
  assert.equal(getWindowBounds('invalid', { width: 1200, height: 780 }), null);
});
