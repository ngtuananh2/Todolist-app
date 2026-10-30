const WINDOW_SIZES = Object.freeze({
  '800x600': Object.freeze({ width: 800, height: 600, label: '800 × 600 — Nhỏ' }),
  '1024x700': Object.freeze({ width: 1024, height: 700, label: '1024 × 700 — Gọn' }),
  '1200x780': Object.freeze({ width: 1200, height: 780, label: '1200 × 780 — Mặc định' }),
  '1366x768': Object.freeze({ width: 1366, height: 768, label: '1366 × 768 — HD' }),
  '1600x900': Object.freeze({ width: 1600, height: 900, label: '1600 × 900 — HD+' }),
  '1920x1080': Object.freeze({ width: 1920, height: 1080, label: '1920 × 1080 — Full HD' })
});

const DEFAULT_WINDOW_SIZE = '1200x780';

function getWindowSize(value) {
  return WINDOW_SIZES[value] || null;
}

function getWindowSizeOptions() {
  return Object.entries(WINDOW_SIZES).map(([value, size]) => ({
    value,
    width: size.width,
    height: size.height,
    label: size.label
  }));
}

function getWindowBounds(windowSize, workArea) {
  const size = getWindowSize(windowSize);
  if (!size || !workArea || !Number.isFinite(workArea.width) || !Number.isFinite(workArea.height)) {
    return null;
  }

  const width = Math.max(1, Math.min(size.width, Math.floor(workArea.width)));
  const height = Math.max(1, Math.min(size.height, Math.floor(workArea.height)));

  return {
    width,
    height,
    minWidth: Math.min(800, width),
    minHeight: Math.min(600, height)
  };
}

module.exports = {
  DEFAULT_WINDOW_SIZE,
  WINDOW_SIZES,
  getWindowSize,
  getWindowSizeOptions,
  getWindowBounds
};
