// ==================== GLOBAL UTILS ====================
// Provides: Theme, Loading, Toast, Global Search, Keyboard Shortcuts, Backup
// Include on ALL pages: <script src="global-utils.js"></script>
(function () {
  'use strict';

  const SEARCH_API = '/api/dashboard/search';
  const BACKUP_API = '/api/dashboard/backup';
  const RESTORE_API = '/api/dashboard/restore';

  const PAGES = [
    { key: '1', label: 'Dashboard', url: '/dashboard.html' },
    { key: '2', label: 'Công việc', url: '/' },
    { key: '3', label: 'Habit Tracker', url: '/habit.html' },
    { key: '4', label: 'Second Brain', url: '/brain.html' },
    { key: '5', label: 'English', url: '/english.html' },
    { key: '6', label: 'Trading', url: '/trading.html' }
  ];

  const MODULE_ICONS = {
    todo: '📋', note: '📝', vocab: '📖', trade: '📊', habit: '💪'
  };
  const MODULE_URLS = {
    todo: '/', note: '/brain.html', vocab: '/english.html', trade: '/trading.html', habit: '/habit.html'
  };

  // ==================== THEME (centralized) ====================
  function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    // Also set on body for compatibility with brain.js selectors
    document.body?.setAttribute('data-theme', saved);
    updateThemeIcons(saved);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.body?.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcons(next);
    return next;
  }

  function updateThemeIcons(theme) {
    const iconLight = document.getElementById('theme-icon-light');
    const iconDark = document.getElementById('theme-icon-dark');
    if (iconLight) iconLight.style.display = theme === 'dark' ? 'none' : 'block';
    if (iconDark) iconDark.style.display = theme === 'dark' ? 'block' : 'none';
  }

  function isDarkTheme() {
    return (document.documentElement.getAttribute('data-theme') || 'light') === 'dark';
  }

  // ==================== LOADING SPINNER ====================
  let loadingCount = 0;

  function injectLoader() {
    if (document.getElementById('gu-loader-overlay')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="gu-loader-overlay" id="gu-loader-overlay">
        <div class="gu-loader-spinner">
          <svg viewBox="0 0 50 50" width="40" height="40">
            <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="90 150" stroke-dashoffset="0">
              <animateTransform attributeName="transform" type="rotate" dur="0.8s" from="0 25 25" to="360 25 25" repeatCount="indefinite"/>
            </circle>
          </svg>
          <span class="gu-loader-text" id="gu-loader-text">Đang tải...</span>
        </div>
      </div>
    `);
  }

  function showLoading(text) {
    loadingCount++;
    const overlay = document.getElementById('gu-loader-overlay');
    if (overlay) {
      overlay.classList.add('active');
      const textEl = document.getElementById('gu-loader-text');
      if (textEl && text) textEl.textContent = text;
    }
  }

  function hideLoading() {
    loadingCount = Math.max(0, loadingCount - 1);
    if (loadingCount === 0) {
      document.getElementById('gu-loader-overlay')?.classList.remove('active');
    }
  }

  // ==================== TOAST NOTIFICATIONS ====================
  let toastContainer = null;

  function injectToastContainer() {
    if (document.getElementById('gu-toast-container')) return;
    const el = document.createElement('div');
    el.id = 'gu-toast-container';
    el.className = 'gu-toast-container';
    document.body.appendChild(el);
    toastContainer = el;
  }

  function guToast(msg, type = 'info', duration = 3000) {
    if (!toastContainer) toastContainer = document.getElementById('gu-toast-container');
    if (!toastContainer) return;

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `gu-toast gu-toast-${type}`;
    el.innerHTML = `<span class="gu-toast-icon">${icons[type] || icons.info}</span><span class="gu-toast-msg">${escHtml(msg)}</span>`;
    toastContainer.appendChild(el);

    // Trigger enter animation
    requestAnimationFrame(() => el.classList.add('show'));

    setTimeout(() => {
      el.classList.remove('show');
      el.classList.add('hide');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // ==================== NOTIFICATIONS ====================
  let notifData = [];

  function injectNotificationBell() {
    // Insert bell button next to theme button
    const themeBtn = document.getElementById('btn-theme');
    if (!themeBtn || document.getElementById('btn-notif')) return;

    const bell = document.createElement('button');
    bell.className = 'nav-btn';
    bell.id = 'btn-notif';
    bell.title = 'Thông báo';
    bell.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="notif-badge" id="notif-badge" style="display:none">0</span>`;
    themeBtn.parentNode.insertBefore(bell, themeBtn);

    // Dropdown panel
    const panel = document.createElement('div');
    panel.className = 'notif-panel';
    panel.id = 'notif-panel';
    panel.innerHTML = `<div class="notif-header"><h4>🔔 Thông báo</h4></div><div class="notif-list" id="notif-list"><div class="notif-empty">Không có thông báo</div></div>`;
    document.body.appendChild(panel);

    bell.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && e.target !== bell) panel.classList.remove('active');
    });

    // Auto-load notifications
    loadNotifications();
    setInterval(loadNotifications, 300000); // refresh every 5 min
  }

  async function loadNotifications() {
    try {
      const res = await fetch('/api/dashboard/notifications');
      const data = await res.json();
      notifData = data.notifications || [];
      renderNotifications();
    } catch (e) { /* silent */ }
  }

  function renderNotifications() {
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notif-list');
    if (!list) return;

    if (badge) {
      badge.textContent = notifData.length;
      badge.style.display = notifData.length > 0 ? 'flex' : 'none';
    }

    if (notifData.length === 0) {
      list.innerHTML = '<div class="notif-empty">✅ Không có thông báo mới</div>';
      return;
    }

    list.innerHTML = notifData.map(n => `
      <a class="notif-item notif-${n.priority}" href="${n.url}">
        <span class="notif-icon">${n.icon}</span>
        <div class="notif-info">
          <div class="notif-title">${escHtml(n.title)}</div>
          <div class="notif-msg">${escHtml(n.message)}</div>
        </div>
      </a>
    `).join('');
  }

  // ==================== INJECT UI ====================
  function injectUI() {
    injectLoader();
    injectToastContainer();
    injectNotificationBell();

    // Global Search Overlay
    if (!document.getElementById('gs-overlay')) {
      const gsHTML = `
        <div class="gs-overlay" id="gs-overlay">
          <div class="gs-box">
            <div class="gs-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" class="gs-input" id="gs-input" placeholder="Tìm kiếm toàn bộ hệ thống..." autocomplete="off">
              <span class="gs-kbd">ESC</span>
            </div>
            <div class="gs-results" id="gs-results"></div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', gsHTML);
    }

    // Keyboard Shortcuts Modal
    if (!document.getElementById('ks-overlay')) {
      const ksHTML = `
        <div class="ks-overlay" id="ks-overlay">
          <div class="ks-box">
            <div class="ks-header">
              <h3>⌨️ Phím tắt</h3>
              <button class="ks-close" id="ks-close">&times;</button>
            </div>
            <div class="ks-body">
              <div class="ks-row"><span class="ks-action">Tìm kiếm toàn cục</span><div class="ks-keys"><span class="ks-key">Ctrl</span><span class="ks-key">K</span></div></div>
              <div class="ks-row"><span class="ks-action">Đổi giao diện</span><div class="ks-keys"><span class="ks-key">Ctrl</span><span class="ks-key">D</span></div></div>
              <div class="ks-row"><span class="ks-action">Dashboard</span><div class="ks-keys"><span class="ks-key">Alt</span><span class="ks-key">1</span></div></div>
              <div class="ks-row"><span class="ks-action">Công việc</span><div class="ks-keys"><span class="ks-key">Alt</span><span class="ks-key">2</span></div></div>
              <div class="ks-row"><span class="ks-action">Habit Tracker</span><div class="ks-keys"><span class="ks-key">Alt</span><span class="ks-key">3</span></div></div>
              <div class="ks-row"><span class="ks-action">Second Brain</span><div class="ks-keys"><span class="ks-key">Alt</span><span class="ks-key">4</span></div></div>
              <div class="ks-row"><span class="ks-action">English</span><div class="ks-keys"><span class="ks-key">Alt</span><span class="ks-key">5</span></div></div>
              <div class="ks-row"><span class="ks-action">Trading</span><div class="ks-keys"><span class="ks-key">Alt</span><span class="ks-key">6</span></div></div>
              <div class="ks-row"><span class="ks-action">Export Backup</span><div class="ks-keys"><span class="ks-key">Ctrl</span><span class="ks-key">Shift</span><span class="ks-key">E</span></div></div>
              <div class="ks-row"><span class="ks-action">Pomodoro Timer</span><div class="ks-keys"><span class="ks-key">Ctrl</span><span class="ks-key">P</span></div></div>
              <div class="ks-row"><span class="ks-action">Phím tắt</span><div class="ks-keys"><span class="ks-key">?</span></div></div>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', ksHTML);
    }
  }

  // ===== Global Search =====
  let searchTimeout = null;

  function openSearch() {
    const overlay = document.getElementById('gs-overlay');
    if (!overlay) return;
    overlay.classList.add('active');
    const input = document.getElementById('gs-input');
    input.value = '';
    document.getElementById('gs-results').innerHTML = '';
    setTimeout(() => input.focus(), 50);
  }

  function closeSearch() {
    document.getElementById('gs-overlay')?.classList.remove('active');
  }

  function handleSearchInput() {
    const query = document.getElementById('gs-input')?.value?.trim();
    clearTimeout(searchTimeout);
    if (!query || query.length < 2) {
      document.getElementById('gs-results').innerHTML = '';
      return;
    }
    document.getElementById('gs-results').innerHTML = '<div class="gs-loading">Đang tìm kiếm...</div>';
    searchTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`${SEARCH_API}?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        renderSearchResults(data);
      } catch (e) {
        document.getElementById('gs-results').innerHTML = '<div class="gs-no-results">Lỗi kết nối</div>';
      }
    }, 250);
  }

  function renderSearchResults(data) {
    const container = document.getElementById('gs-results');
    if (!container) return;

    const all = [];
    if (data.todos) data.todos.forEach(t => all.push({ module: 'todo', title: t.title, meta: t.description || '', url: MODULE_URLS.todo }));
    if (data.notes) data.notes.forEach(n => all.push({ module: 'note', title: n.title, meta: n.category || n.content?.substring(0, 60) || '', url: MODULE_URLS.note }));
    if (data.vocabs) data.vocabs.forEach(v => all.push({ module: 'vocab', title: v.word, meta: v.meaning || '', url: MODULE_URLS.vocab }));
    if (data.trades) data.trades.forEach(t => all.push({ module: 'trade', title: t.symbol, meta: `${t.type} | ${t.status}`, url: MODULE_URLS.trade }));
    if (data.habits) data.habits.forEach(h => all.push({ module: 'habit', title: h.name, meta: h.category || '', url: MODULE_URLS.habit }));

    if (all.length === 0) {
      container.innerHTML = '<div class="gs-no-results">Không tìm thấy kết quả</div>';
      return;
    }

    container.innerHTML = all.slice(0, 15).map(item => `
      <a class="gs-item" href="${item.url}">
        <div class="gs-item-icon ${item.module}">${MODULE_ICONS[item.module] || '📄'}</div>
        <div class="gs-item-info">
          <div class="gs-item-title">${escHtml(item.title)}</div>
          <div class="gs-item-meta">${escHtml(item.meta)}</div>
        </div>
      </a>
    `).join('');
  }

  // ===== Keyboard Shortcuts =====
  function openShortcuts() {
    document.getElementById('ks-overlay')?.classList.add('active');
  }

  function closeShortcuts() {
    document.getElementById('ks-overlay')?.classList.remove('active');
  }

  // ===== Backup / Restore =====
  async function exportBackup() {
    try {
      guToast('Đang tạo bản sao lưu...', 'info');
      const res = await fetch(BACKUP_API);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taskflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      guToast('Đã tải bản sao lưu!', 'success');
    } catch (e) {
      guToast('Lỗi tạo bản sao lưu', 'error');
    }
  }

  async function exportModule(moduleName) {
    try {
      guToast(`Đang xuất dữ liệu ${moduleName}...`, 'info');
      const res = await fetch(`/api/dashboard/export/${moduleName}`);
      if (!res.ok) throw new Error('Export failed');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taskflow-${moduleName}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      guToast(`Đã xuất dữ liệu ${moduleName}!`, 'success');
    } catch (e) {
      guToast('Lỗi xuất dữ liệu', 'error');
    }
  }

  // ==================== POMODORO TIMER (global) ====================
  function getPomoSettings() {
    try {
      const raw = localStorage.getItem('taskflow_settings');
      if (raw) { const s = JSON.parse(raw); return { work: (s.pomoWork || 25) * 60, short: (s.pomoShort || 5) * 60, long: (s.pomoLong || 15) * 60 }; }
    } catch {}
    return { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
  }
  let POMO = getPomoSettings();
  const POMO_CIRC = 2 * Math.PI * 70;
  let pomoState = { running: false, remaining: POMO.work, total: POMO.work, session: 1, isBreak: false, interval: null };

  function updatePomoSettings(workMin, shortMin, longMin) {
    POMO = { work: workMin * 60, short: shortMin * 60, long: longMin * 60 };
    if (!pomoState.running) {
      resetPomoTimer();
    }
  }

  function injectPomodoro() {
    if (document.getElementById('pomo-overlay')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="pomo-overlay" id="pomo-overlay">
        <div class="pomo-box" style="position:relative">
          <button class="pomo-close" id="pomo-close">&times;</button>
          <div class="pomo-title" id="pomo-label">Tập trung</div>
          <svg class="pomo-ring" width="160" height="160" viewBox="0 0 160 160">
            <circle class="pomo-ring-bg" cx="80" cy="80" r="70"/>
            <circle class="pomo-ring-fill" id="pomo-ring" cx="80" cy="80" r="70" stroke-dasharray="${POMO_CIRC}" stroke-dashoffset="0" transform="rotate(-90 80 80)"/>
          </svg>
          <div class="pomo-time" id="pomo-time">25:00</div>
          <div class="pomo-btns">
            <button class="pomo-btn pomo-btn-start" id="pomo-start">Bắt đầu</button>
            <button class="pomo-btn pomo-btn-reset" id="pomo-reset">Đặt lại</button>
          </div>
          <div class="pomo-session" id="pomo-session">Phiên 1/4</div>
        </div>
      </div>
    `);

    document.getElementById('pomo-close').addEventListener('click', closePomodoro);
    document.getElementById('pomo-overlay').addEventListener('click', e => { if (e.target.id === 'pomo-overlay') closePomodoro(); });
    document.getElementById('pomo-start').addEventListener('click', togglePomoTimer);
    document.getElementById('pomo-reset').addEventListener('click', resetPomoTimer);
  }

  function togglePomodoro() {
    if (!document.getElementById('pomo-overlay')) injectPomodoro();
    const overlay = document.getElementById('pomo-overlay');
    overlay.classList.toggle('active');
    updatePomoDisplay();
  }

  function closePomodoro() {
    document.getElementById('pomo-overlay')?.classList.remove('active');
  }

  function togglePomoTimer() {
    if (pomoState.running) {
      // Pause
      clearInterval(pomoState.interval);
      pomoState.running = false;
      document.getElementById('pomo-start').textContent = 'Tiếp tục';
      document.getElementById('pomo-start').classList.remove('running');
    } else {
      // Start
      pomoState.running = true;
      document.getElementById('pomo-start').textContent = 'Tạm dừng';
      document.getElementById('pomo-start').classList.add('running');
      pomoState.interval = setInterval(pomoTick, 1000);
    }
  }

  function pomoTick() {
    pomoState.remaining--;
    if (pomoState.remaining <= 0) {
      clearInterval(pomoState.interval);
      pomoState.running = false;
      
      // Notify
      if (pomoState.isBreak) {
        guToast('Hết giờ nghỉ! Bắt đầu phiên mới 🍅', 'info');
        pomoState.isBreak = false;
        pomoState.total = POMO.work;
        pomoState.remaining = POMO.work;
      } else {
        pomoState.session++;
        if (pomoState.session > 4) pomoState.session = 1;
        const isLong = pomoState.session === 1;
        guToast(isLong ? 'Nghỉ dài 15 phút! ☕' : 'Nghỉ ngắn 5 phút! 🎉', 'success');
        pomoState.isBreak = true;
        pomoState.total = isLong ? POMO.long : POMO.short;
        pomoState.remaining = pomoState.total;
      }

      // Try browser notification
      if (Notification.permission === 'granted') {
        new Notification('🍅 Pomodoro', { body: pomoState.isBreak ? 'Thời gian nghỉ!' : 'Bắt đầu làm việc!' });
      }

      document.getElementById('pomo-start').textContent = 'Bắt đầu';
      document.getElementById('pomo-start').classList.remove('running');
    }
    updatePomoDisplay();
  }

  function resetPomoTimer() {
    clearInterval(pomoState.interval);
    pomoState = { running: false, remaining: POMO.work, total: POMO.work, session: 1, isBreak: false, interval: null };
    document.getElementById('pomo-start').textContent = 'Bắt đầu';
    document.getElementById('pomo-start').classList.remove('running');
    updatePomoDisplay();
  }

  function updatePomoDisplay() {
    const min = Math.floor(pomoState.remaining / 60);
    const sec = pomoState.remaining % 60;
    const timeEl = document.getElementById('pomo-time');
    if (timeEl) timeEl.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

    const ring = document.getElementById('pomo-ring');
    if (ring) {
      const progress = 1 - (pomoState.remaining / pomoState.total);
      ring.setAttribute('stroke-dashoffset', POMO_CIRC * (1 - progress));
      ring.classList.toggle('break', pomoState.isBreak);
    }

    const label = document.getElementById('pomo-label');
    if (label) label.textContent = pomoState.isBreak ? 'Nghỉ ngơi' : 'Tập trung';

    const session = document.getElementById('pomo-session');
    if (session) session.textContent = `Phiên ${pomoState.session}/4`;
  }

  // ===== Event Binding =====
  function bindGlobalEvents() {
    // Theme button
    document.getElementById('btn-theme')?.addEventListener('click', () => toggleTheme());

    // Search overlay click to close
    document.getElementById('gs-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'gs-overlay') closeSearch();
    });

    // Search input
    document.getElementById('gs-input')?.addEventListener('input', handleSearchInput);

    // Shortcuts close
    document.getElementById('ks-close')?.addEventListener('click', closeShortcuts);
    document.getElementById('ks-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'ks-overlay') closeShortcuts();
    });

    // Global keyboard
    document.addEventListener('keydown', e => {
      const tag = (e.target.tagName || '').toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;

      // Ctrl+K — Global search
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        openSearch();
        return;
      }

      // ESC — close overlays
      if (e.key === 'Escape') {
        if (document.getElementById('gs-overlay')?.classList.contains('active')) { closeSearch(); return; }
        if (document.getElementById('ks-overlay')?.classList.contains('active')) { closeShortcuts(); return; }
      }

      // Ctrl+D — toggle theme
      if (e.ctrlKey && !e.shiftKey && e.key === 'd') {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // Ctrl+Shift+E — export backup
      if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        exportBackup();
        return;
      }

      // Ctrl+P — Pomodoro timer
      if (e.ctrlKey && !e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (window.globalUtils?.togglePomodoro) window.globalUtils.togglePomodoro();
        return;
      }

      // ? — show shortcuts (only when not in input)
      if (!isInput && e.key === '?') {
        e.preventDefault();
        openShortcuts();
        return;
      }

      // Alt+1-6 — navigate pages
      if (e.altKey && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const page = PAGES[parseInt(e.key) - 1];
        if (page) window.location.href = page.url;
      }
    });
  }

  // ===== Helpers =====
  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ===== Init =====
  function initGlobalUtils() {
    initTheme();
    injectUI();
    bindGlobalEvents();
  }

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalUtils);
  } else {
    initGlobalUtils();
  }

  // Expose for other scripts
  window.globalUtils = {
    openSearch, closeSearch, openShortcuts, closeShortcuts, exportBackup, exportModule,
    toggleTheme, isDarkTheme, initTheme, updateThemeIcons,
    showLoading, hideLoading, guToast,
    togglePomodoro, loadNotifications, updatePomoSettings
  };
})();
