// ==================== GLOBAL UTILS ====================
// Provides: Theme, Loading, Toast, Global Search, Keyboard Shortcuts, Backup
// Include on ALL pages: <script src="global-utils.js"></script>
(function () {
  'use strict';

  const nativeFetch = window.fetch.bind(window);
  const OFFLINE_QUEUE_KEY = 'taskflow_offline_queue_v1';
  let replayingOfflineQueue = false;

  function isQueueableRequest(input, init = {}) {
    const request = new Request(input, init);
    const method = request.method.toUpperCase();
    const url = new URL(request.url, location.origin);
    return url.origin === location.origin
      && url.pathname.startsWith('/api/')
      && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
      && !/^\/api\/(auth|ai|dashboard\/(?:backup|restore|import)|app-settings)/.test(url.pathname);
  }

  function readOfflineQueue() {
    try {
      const value = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.error('[offline] Không thể đọc hàng đợi:', error);
      return [];
    }
  }

  function writeOfflineQueue(queue) {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    updateOfflineQueueStatus(queue.length);
  }

  function updateOfflineQueueStatus(count = readOfflineQueue().length) {
    const status = document.getElementById('taskflow-network-status');
    if (!status || navigator.onLine) return;
    status.textContent = count
      ? `Đang ngoại tuyến — ${count} thay đổi sẽ được đồng bộ khi có mạng.`
      : 'Đang ngoại tuyến — thay đổi sẽ được đồng bộ khi có mạng.';
  }

  function serializeRequest(input, init = {}) {
    const request = new Request(input, init);
    return request.clone().text().then(body => ({
      url: request.url,
      method: request.method,
      headers: [...request.headers.entries()],
      body
    }));
  }

  async function queueRequest(input, init) {
    const queue = readOfflineQueue();
    queue.push(await serializeRequest(input, init));
    writeOfflineQueue(queue);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if ('sync' in registration) registration.sync.register('taskflow-offline-sync').catch(() => {});
      }).catch(() => {});
    }
    return new Response(JSON.stringify({ queued: true, pending: queue.length }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async function replayOfflineQueue() {
    if (replayingOfflineQueue || !navigator.onLine) return;
    replayingOfflineQueue = true;
    try {
      const queue = readOfflineQueue();
      const remaining = [];
      for (const item of queue) {
        try {
          const response = await nativeFetch(item.url, {
            method: item.method,
            headers: item.headers,
            body: item.method === 'DELETE' ? undefined : item.body,
            credentials: 'same-origin'
          });
          if (!response.ok && response.status !== 409) remaining.push(item);
        } catch {
          remaining.push(item);
          break;
        }
      }
      writeOfflineQueue(remaining);
      if (queue.length && !remaining.length) window.globalUtils?.guToast?.('Đã đồng bộ các thay đổi đang chờ', 'success');
    } finally {
      replayingOfflineQueue = false;
    }
  }

  window.fetch = async function taskflowFetch(input, init = {}) {
    if (!isQueueableRequest(input, init)) return nativeFetch(input, init);
    if (!navigator.onLine) return queueRequest(input, init);
    try {
      return await nativeFetch(input, init);
    } catch (error) {
      return queueRequest(input, init).catch(() => { throw error; });
    }
  };

  const SEARCH_API = '/api/dashboard/search';
  const BACKUP_API = '/api/dashboard/backup';
  const RESTORE_API = '/api/dashboard/restore';

  const PAGES = [
    { key: '1', label: 'Dashboard', url: '/dashboard.html' },
    { key: '2', label: 'Công việc', url: '/' },
    { key: '3', label: 'Habit Tracker', url: '/habit.html' },
    { key: '4', label: 'Second Brain', url: '/brain.html' },
    { key: '5', label: 'English', url: '/english.html' },
    { key: '6', label: 'Trading', url: '/trading.html' },
    { label: 'Lịch trình', url: '/schedule.html' },
    { label: 'Cài đặt', url: '/settings.html' }
  ];

  const MODULE_ICONS = {
    todo: '📋', note: '📝', vocab: '📖', trade: '📊', habit: '💪'
  };
  const MODULE_URLS = {
    todo: '/', note: '/brain.html', vocab: '/english.html', trade: '/trading.html', habit: '/habit.html'
  };

  function initNetworkStatus() {
    const update = () => {
      document.documentElement.dataset.network = navigator.onLine ? 'online' : 'offline';
      const existing = document.getElementById('taskflow-network-status');
      if (navigator.onLine) {
        existing?.remove();
        replayOfflineQueue();
        return;
      }
      if (existing) return;
      const status = document.createElement('div');
      status.id = 'taskflow-network-status';
      status.setAttribute('role', 'status');
      status.textContent = 'Đang ngoại tuyến — thay đổi sẽ được đồng bộ khi có mạng.';
      document.body.appendChild(status);
      updateOfflineQueueStatus();
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  }

  // ==================== THEME (centralized) ====================
  function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    document.documentElement.style.colorScheme = saved;
    // Also set on body for compatibility with brain.js selectors
    document.body?.setAttribute('data-theme', saved);
    updateThemeIcons(saved);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.style.colorScheme = next;
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
    return (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';
  }

  // ==================== NAV DATE-TIME (shared) ====================
  function formatNavDateTime(date = new Date()) {
    const weekday = date.toLocaleDateString('vi-VN', { weekday: 'short' }).replace('.', '');
    const dayMonth = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `${weekday}, ${dayMonth} ${time}`;
  }

  function updateNavDateTime() {
    const el = document.getElementById('nav-date');
    if (!el) return;

    const now = new Date();
    el.textContent = formatNavDateTime(now);
    el.title = now.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function startNavDateTimeClock() {
    updateNavDateTime();
    setInterval(updateNavDateTime, 1000);
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

    const notification = {
      success: { icon: '✓', title: 'Thành công' },
      error: { icon: '!', title: 'Có lỗi xảy ra' },
      warning: { icon: '!', title: 'Lưu ý' },
      info: { icon: 'i', title: 'Thông báo' }
    }[type] || { icon: 'i', title: 'Thông báo' };
    const el = document.createElement('div');
    el.className = `gu-toast gu-toast-${type}`;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    el.innerHTML = `
      <span class="gu-toast-icon" aria-hidden="true">${notification.icon}</span>
      <span class="gu-toast-content">
        <strong class="gu-toast-title">${notification.title}</strong>
        <span class="gu-toast-msg"></span>
      </span>
      <button class="gu-toast-close" type="button" aria-label="Đóng thông báo">×</button>
      <span class="gu-toast-progress" aria-hidden="true"></span>
    `;
    el.querySelector('.gu-toast-msg').textContent = String(msg);
    toastContainer.appendChild(el);
    el.querySelector('.gu-toast-progress').style.animationDuration = `${duration}ms`;

    while (toastContainer.children.length > 4) {
      toastContainer.firstElementChild.remove();
    }

    let dismissTimer;
    const dismiss = () => {
      clearTimeout(dismissTimer);
      if (el.classList.contains('hide')) return;
      el.classList.remove('show');
      el.classList.add('hide');
      setTimeout(() => el.remove(), 260);
    };
    const scheduleDismiss = () => {
      clearTimeout(dismissTimer);
      dismissTimer = setTimeout(dismiss, duration);
    };

    requestAnimationFrame(() => el.classList.add('show'));
    el.querySelector('.gu-toast-close').addEventListener('click', dismiss);
    el.addEventListener('mouseenter', () => {
      clearTimeout(dismissTimer);
      el.classList.add('paused');
    });
    el.addEventListener('mouseleave', () => {
      el.classList.remove('paused');
      scheduleDismiss();
    });
    scheduleDismiss();
  }

  function installToastAlerts() {
    window.alert = message => {
      const text = String(message ?? '');
      const type = /^(?:❌|lỗi\b|không thể\b|error\b)/i.test(text) || /thất bại|lỗi kết nối/i.test(text)
        ? 'error'
        : /^(?:✅|đã\b)/i.test(text)
          ? 'success'
          : /vui lòng|chưa có|không có|cần ít nhất|không tìm thấy/i.test(text)
            ? 'warning'
            : 'info';
      guToast(text, type, type === 'error' ? 6000 : 4200);
    };
  }

  function bindDesktopUpdateNotifications() {
    if (!window.taskflowUpdates?.onStatus) return;
    window.taskflowUpdates.onStatus(status => {
      if (status.status === 'available') {
        guToast(`Có phiên bản TaskFlow ${status.version}. Đang tải về...`, 'info', 6000);
      } else if (status.status === 'downloaded') {
        guToast(`Đã tải phiên bản ${status.version}. Mở Cài đặt để khởi động lại và cài đặt.`, 'success', 8000);
      } else if (status.status === 'no-release') {
        guToast('Chưa có bản cập nhật nào được phát hành trên GitHub. Bạn có thể tải và cài bản mới thủ công.', 'warning', 8000);
      } else if (status.status === 'error') {
        guToast('Không thể kiểm tra hoặc tải bản cập nhật. Vui lòng thử lại trong Cài đặt.', 'error', 7000);
      }
    });
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

  function injectCompactNavigation() {
    const navRight = document.querySelector('.nav-right');
    if (!navRight || document.getElementById('gu-nav-menu')) return;

    const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
    const links = PAGES.map(page => {
      const path = page.url.replace(/\/+$/, '') || '/';
      const active = path === currentPath ? ' aria-current="page"' : '';
      return `<a class="gu-nav-menu-link"${active} href="${page.url}">${escHtml(page.label)}</a>`;
    }).join('');

    const wrapper = document.createElement('div');
    wrapper.className = 'gu-nav-menu-wrap';
    wrapper.innerHTML = `
      <button class="nav-btn gu-nav-menu-toggle" id="gu-nav-menu" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="gu-nav-menu-panel" title="Mở điều hướng">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        <span class="gu-nav-menu-label">Mục</span>
      </button>
      <div class="gu-nav-menu-panel" id="gu-nav-menu-panel" role="menu" hidden>${links}</div>
    `;
    navRight.prepend(wrapper);

    const toggle = wrapper.querySelector('.gu-nav-menu-toggle');
    const panel = wrapper.querySelector('.gu-nav-menu-panel');
    const setOpen = open => {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    };

    toggle.addEventListener('click', event => {
      event.stopPropagation();
      setOpen(panel.hidden);
    });
    panel.addEventListener('click', event => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('click', event => {
      if (!wrapper.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) {
        setOpen(false);
        toggle.focus();
      }

      async function injectAccountControls() {
        const navRight = document.querySelector('.nav-right');
        if (!navRight || document.getElementById('taskflow-account')) return;

        const account = document.createElement('div');
        account.className = 'taskflow-account';
        account.id = 'taskflow-account';
        account.innerHTML = '<a class="taskflow-account-login" href="/auth.html">Đăng nhập</a>';
        navRight.appendChild(account);

        try {
          const response = await nativeFetch('/api/auth/me', { credentials: 'same-origin' });
          if (!response.ok) return;
          const result = await response.json();
          if (!result.authenticated || !result.user?.email) return;

          account.innerHTML = `
            <button class="taskflow-account-toggle" type="button" aria-expanded="false" aria-controls="taskflow-account-menu">
              <span class="taskflow-account-avatar" aria-hidden="true">${escHtml(result.user.email.slice(0, 1).toUpperCase())}</span>
              <span class="taskflow-account-email">${escHtml(result.user.email)}</span>
              <span aria-hidden="true">⌄</span>
            </button>
            <div class="taskflow-account-menu" id="taskflow-account-menu" hidden>
              <div class="taskflow-account-menu-email">${escHtml(result.user.email)}</div>
              <button type="button" class="taskflow-account-logout">Đăng xuất</button>
            </div>`;

          const toggle = account.querySelector('.taskflow-account-toggle');
          const menu = account.querySelector('.taskflow-account-menu');
          toggle.addEventListener('click', event => {
            event.stopPropagation();
            const open = menu.hidden;
            menu.hidden = !open;
            toggle.setAttribute('aria-expanded', String(open));
          });
          account.querySelector('.taskflow-account-logout').addEventListener('click', async () => {
            const logoutButton = account.querySelector('.taskflow-account-logout');
            logoutButton.disabled = true;
            try {
              const logoutResponse = await nativeFetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
              if (!logoutResponse.ok) throw new Error('Không thể đăng xuất');
              window.location.replace('/auth.html');
            } catch (error) {
              console.error('[auth] Logout failed:', error);
              logoutButton.disabled = false;
              guToast('Không thể đăng xuất. Vui lòng thử lại.', 'error');
            }
          });
          document.addEventListener('click', event => {
            if (!account.contains(event.target)) {
              menu.hidden = true;
              toggle.setAttribute('aria-expanded', 'false');
            }
          });
        } catch (error) {
          console.error('[auth] Không thể tải trạng thái tài khoản:', error);
        }
      }
    });
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

  async function importModuleFile(moduleName, file) {
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('File vượt quá giới hạn 5 MB');
      const payload = JSON.parse(await file.text());
      if (payload.module !== moduleName) {
        throw new Error('File không thuộc module này');
      }
      if (!window.confirm('Dữ liệu trong file sẽ được gộp vào dữ liệu hiện có. Các mục trùng sẽ được bỏ qua. Tiếp tục?')) return;

      const response = await fetch(`/api/dashboard/import/${encodeURIComponent(moduleName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không thể nhập dữ liệu');

      const importedCount = Object.values(result.imported || {}).reduce((sum, count) => sum + count, 0);
      const skippedCount = Object.values(result.skipped || {}).reduce((sum, count) => sum + count, 0);
      guToast(`Đã nhập ${importedCount} mục; bỏ qua ${skippedCount} mục trùng.`, 'success');
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      guToast(error.message || 'Không thể đọc file nhập', 'error');
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
    const startButton = document.getElementById('pomo-start');
    if (startButton) {
      startButton.textContent = 'Bắt đầu';
      startButton.classList.remove('running');
    }
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
    document.querySelectorAll('[data-import-module]').forEach(button => {
      const moduleName = button.dataset.importModule;
      const input = document.querySelector(`[data-import-module-file="${moduleName}"]`);
      if (!input) return;

      button.addEventListener('click', () => input.click());
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (file) await importModuleFile(moduleName, file);
        input.value = '';
      });
    });

    // Theme button
    const themeButton = document.getElementById('btn-theme');
    if (themeButton && themeButton.getAttribute('data-theme-bound') !== 'true') {
      themeButton.setAttribute('data-theme-bound', 'true');
      themeButton.addEventListener('click', (event) => {
        event.preventDefault();
        toggleTheme();
      });
    }

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
    if (location.pathname !== '/auth.html' && location.pathname !== '/offline.html') {
      fetch('/api/auth/me', { credentials: 'same-origin' }).then(response => {
        if (response.status === 401) location.replace('/auth.html');
      }).catch(() => {});
    }
    initTheme();
    initNetworkStatus();
    injectAccountControls();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(error => {
        console.error('[pwa] Không thể đăng ký service worker:', error);
      });
    }
    startNavDateTimeClock();
    injectCompactNavigation();
    injectUI();
    installToastAlerts();
    bindDesktopUpdateNotifications();
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
    updateNavDateTime,
    showLoading, hideLoading, guToast,
    togglePomodoro, loadNotifications, updatePomoSettings
  };
})();
