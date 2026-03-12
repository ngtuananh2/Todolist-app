// ==================== SETTINGS PAGE ====================
(function () {
  'use strict';

  const SETTINGS_KEY = 'taskflow_settings';

  // Default settings
  const DEFAULTS = {
    font: 'Inter',
    pomoWork: 25,
    pomoShort: 5,
    pomoLong: 15,
    notifDeadline: true,
    notifVocab: true,
    notifHabit: true
  };

  // ── Load / Save ──
  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch { return { ...DEFAULTS }; }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  // ── Apply settings to the page ──
  function applySettings(settings) {
    // Font
    if (settings.font && settings.font !== 'Inter') {
      document.body.style.fontFamily = `'${settings.font}', sans-serif`;
    } else {
      document.body.style.fontFamily = '';
    }

    // Update Pomodoro in global-utils (if available)
    if (window.globalUtils?.updatePomoSettings) {
      window.globalUtils.updatePomoSettings(settings.pomoWork, settings.pomoShort, settings.pomoLong);
    }
  }

  // ── Populate form from settings ──
  function populateForm(settings) {
    // Dark mode toggle
    const darkToggle = document.getElementById('setting-dark-mode');
    if (darkToggle) {
      darkToggle.checked = window.globalUtils?.isDarkTheme?.() || false;
    }

    // Font
    const fontSelect = document.getElementById('setting-font');
    if (fontSelect) fontSelect.value = settings.font || 'Inter';

    // Pomodoro
    const pomoWork = document.getElementById('setting-pomo-work');
    const pomoShort = document.getElementById('setting-pomo-short');
    const pomoLong = document.getElementById('setting-pomo-long');
    if (pomoWork) pomoWork.value = settings.pomoWork || 25;
    if (pomoShort) pomoShort.value = settings.pomoShort || 5;
    if (pomoLong) pomoLong.value = settings.pomoLong || 15;

    // Notifications
    const notifDeadline = document.getElementById('setting-notif-deadline');
    const notifVocab = document.getElementById('setting-notif-vocab');
    const notifHabit = document.getElementById('setting-notif-habit');
    if (notifDeadline) notifDeadline.checked = settings.notifDeadline !== false;
    if (notifVocab) notifVocab.checked = settings.notifVocab !== false;
    if (notifHabit) notifHabit.checked = settings.notifHabit !== false;

    // Notification permission button
    updateNotifPermBtn();
  }

  function updateNotifPermBtn() {
    const btn = document.getElementById('setting-notif-perm');
    if (!btn) return;
    if (!('Notification' in window)) {
      btn.textContent = 'Không hỗ trợ';
      btn.disabled = true;
      btn.style.opacity = '.5';
    } else if (Notification.permission === 'granted') {
      btn.textContent = '✅ Đã cấp quyền';
      btn.disabled = true;
      btn.style.opacity = '.7';
    } else if (Notification.permission === 'denied') {
      btn.textContent = '❌ Đã từ chối';
      btn.disabled = true;
      btn.style.opacity = '.5';
    } else {
      btn.textContent = 'Cấp quyền';
      btn.disabled = false;
    }
  }

  // ── Bind events ──
  function bindEvents() {
    const settings = loadSettings();

    // Dark mode
    document.getElementById('setting-dark-mode')?.addEventListener('change', (e) => {
      if (window.globalUtils?.toggleTheme) window.globalUtils.toggleTheme();
    });

    // Font
    document.getElementById('setting-font')?.addEventListener('change', function () {
      settings.font = this.value;
      saveSettings(settings);
      applySettings(settings);
      showToast('Đã đổi font chữ');
    });

    // Pomodoro inputs
    ['setting-pomo-work', 'setting-pomo-short', 'setting-pomo-long'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', function () {
        const val = Math.max(1, parseInt(this.value) || 1);
        this.value = val;
        const s = loadSettings();
        if (id === 'setting-pomo-work') s.pomoWork = val;
        if (id === 'setting-pomo-short') s.pomoShort = val;
        if (id === 'setting-pomo-long') s.pomoLong = val;
        saveSettings(s);
        applySettings(s);
        showToast('Đã cập nhật thời gian Pomodoro');
      });
    });

    // Notification toggles
    document.getElementById('setting-notif-deadline')?.addEventListener('change', function () {
      const s = loadSettings();
      s.notifDeadline = this.checked;
      saveSettings(s);
      showToast(this.checked ? 'Bật nhắc deadline' : 'Tắt nhắc deadline');
    });

    document.getElementById('setting-notif-vocab')?.addEventListener('change', function () {
      const s = loadSettings();
      s.notifVocab = this.checked;
      saveSettings(s);
      showToast(this.checked ? 'Bật nhắc từ vựng' : 'Tắt nhắc từ vựng');
    });

    document.getElementById('setting-notif-habit')?.addEventListener('change', function () {
      const s = loadSettings();
      s.notifHabit = this.checked;
      saveSettings(s);
      showToast(this.checked ? 'Bật nhắc thói quen' : 'Tắt nhắc thói quen');
    });

    // Notification permission
    document.getElementById('setting-notif-perm')?.addEventListener('click', async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        updateNotifPermBtn();
        if (perm === 'granted') {
          showToast('Đã cấp quyền thông báo!', 'success');
        }
      }
    });

    // Backup
    document.getElementById('setting-backup')?.addEventListener('click', () => {
      if (window.globalUtils?.exportBackup) {
        window.globalUtils.exportBackup();
      }
    });

    // Restore
    const restoreBtn = document.getElementById('setting-restore');
    const restoreFile = document.getElementById('restore-file');
    restoreBtn?.addEventListener('click', () => restoreFile?.click());
    restoreFile?.addEventListener('change', async function () {
      if (!this.files.length) return;
      const file = this.files[0];
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const res = await fetch('/api/dashboard/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Restore failed');
        showToast('Khôi phục dữ liệu thành công! Tải lại trang...', 'success');
        setTimeout(() => location.reload(), 1500);
      } catch (e) {
        showToast('Lỗi khôi phục: ' + e.message, 'error');
      }
      this.value = '';
    });

    // Reset all data
    document.getElementById('setting-reset')?.addEventListener('click', async () => {
      const confirmed = confirm('⚠️ Bạn có chắc muốn XÓA TOÀN BỘ dữ liệu?\n\nHành động này KHÔNG thể hoàn tác!\n\nNhấn OK để xác nhận.');
      if (!confirmed) return;
      
      const confirmed2 = confirm('🔴 LẦN CUỐI: Xác nhận xóa tất cả?\n\nTất cả todos, notes, vocab, habits, trades sẽ bị xóa vĩnh viễn.');
      if (!confirmed2) return;

      try {
        // Delete all collections via individual API calls
        const endpoints = [
          '/api/todos', '/api/tags', '/api/subtasks'
        ];
        
        // Get all items and delete them
        showToast('Đang xóa dữ liệu...', 'info');
        
        // Use backup restore with empty data to effectively clear
        const res = await fetch('/api/dashboard/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            todos: [], tags: [], notes: [], vocabs: [],
            trades: [], tradingAccounts: [], habits: [], habitLogs: []
          })
        });
        
        if (res.ok) {
          localStorage.clear();
          showToast('Đã xóa toàn bộ dữ liệu!', 'success');
          setTimeout(() => location.reload(), 1500);
        } else {
          throw new Error('API error');
        }
      } catch (e) {
        showToast('Lỗi xóa dữ liệu', 'error');
      }
    });
  }

  // ── Toast helper (uses global if available, else simple) ──
  function showToast(msg, type = 'success') {
    if (window.globalUtils?.guToast) {
      window.globalUtils.guToast(msg, type);
    }
  }

  // ── Nav date ──
  function setNavDate() {
    const el = document.getElementById('nav-date');
    if (!el) return;
    const d = new Date();
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    el.textContent = `${days[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
  }

  // ── Init ──
  function init() {
    setNavDate();
    const settings = loadSettings();
    populateForm(settings);
    applySettings(settings);
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
