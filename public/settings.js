// ==================== SETTINGS PAGE ====================
(function () {
  'use strict';

  const SETTINGS_KEY = 'taskflow_settings';
  const REMINDER_KEY = 'taskflow_smart_reminders';
  const APP_SETTINGS_KEY = 'taskflow_app_settings';

  // Default settings
  const DEFAULTS = {
    font: 'Inter',
    pomoWork: 25,
    pomoShort: 5,
    pomoLong: 15,
    notifDeadline: true,
    notifVocab: true,
    notifHabit: true,
    notifSchedule: true,
    launchOnStartup: false
  };

  let fallbackToastTimer = null;

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

  async function loadAppSettings() {
    const res = await fetch('/api/app-settings');
    if (!res.ok) throw new Error(`Không thể tải cài đặt ứng dụng (HTTP ${res.status})`);
    const data = await res.json();
    return { launchOnStartup: false, windowSize: '1200x780', ...data };
  }

  async function saveAppSettings(patch) {
    const current = await loadAppSettings();
    const res = await fetch('/api/app-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `Không thể lưu cài đặt (HTTP ${res.status})`);
    const next = { ...current, ...result, ...patch };
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(next));
    return { settings: next, windowSizeApplied: result.windowSizeApplied };
  }

  function updateSettings(patch) {
    const current = loadSettings();
    const next = { ...current, ...patch };
    saveSettings(next);
    return next;
  }

  function loadReminderState() {
    try {
      const raw = JSON.parse(localStorage.getItem(REMINDER_KEY) || '{}');
      return {
        enabled: Boolean(raw.enabled),
        snoozed: raw.snoozed && typeof raw.snoozed === 'object' ? raw.snoozed : {},
        fired: raw.fired && typeof raw.fired === 'object' ? raw.fired : {}
      };
    } catch {
      return { enabled: false, snoozed: {}, fired: {} };
    }
  }

  function saveReminderState(state) {
    localStorage.setItem(REMINDER_KEY, JSON.stringify(state));
  }

  function getNotifPermission() {
    try {
      if (!('Notification' in window)) return 'unsupported';
      return Notification.permission;
    } catch {
      return 'unsupported';
    }
  }

  function setThemeByToggle(checked) {
    const next = checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    document.body?.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    if (window.globalUtils?.updateThemeIcons) {
      window.globalUtils.updateThemeIcons(next);
    }
  }

  async function exportBackupFallback() {
    const res = await fetch('/api/dashboard/backup');
    if (!res.ok) throw new Error('Không thể sao lưu dữ liệu');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
    // Startup
    const startupToggle = document.getElementById('setting-launch-startup');
    if (startupToggle) {
      const supported = settings.desktopCapabilities?.launchOnStartup === true;
      startupToggle.checked = supported && Boolean(settings.launchOnStartup);
      startupToggle.disabled = !supported;
      const status = document.getElementById('setting-launch-startup-status');
      if (status && !supported) {
        status.textContent = 'Chỉ khả dụng trong ứng dụng desktop đã đóng gói trên Windows.';
      }
    }

    const windowSize = document.getElementById('setting-window-size');
    if (windowSize) {
      if (Array.isArray(settings.windowSizeOptions) && settings.windowSizeOptions.length) {
        windowSize.replaceChildren(...settings.windowSizeOptions.map(option => {
          const element = document.createElement('option');
          element.value = option.value;
          element.textContent = option.label;
          return element;
        }));
      }
      windowSize.value = settings.windowSize || '1200x780';
    }

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
    const notifSchedule = document.getElementById('setting-notif-schedule');
    if (notifDeadline) notifDeadline.checked = settings.notifDeadline !== false;
    if (notifVocab) notifVocab.checked = settings.notifVocab !== false;
    if (notifHabit) notifHabit.checked = settings.notifHabit !== false;
    if (notifSchedule) notifSchedule.checked = settings.notifSchedule === true;

    // Notification permission button
    updateNotifPermBtn();
  }

  function updateNotifPermBtn() {
    const btn = document.getElementById('setting-notif-perm');
    if (!btn) return;
    const permission = getNotifPermission();
    if (permission === 'unsupported') {
      btn.textContent = 'Không hỗ trợ';
      btn.disabled = true;
      btn.style.opacity = '.5';
    } else if (permission === 'granted') {
      btn.textContent = '✅ Đã cấp quyền';
      btn.disabled = false;
      btn.style.opacity = '1';
    } else if (permission === 'denied') {
      btn.textContent = '❌ Đã từ chối';
      btn.disabled = false;
      btn.style.opacity = '1';
    } else {
      btn.textContent = 'Cấp quyền';
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  }

  function updateUpdateStatus(status) {
    const statusEl = document.getElementById('setting-update-status');
    const installBtn = document.getElementById('setting-update-install');
    const checkBtn = document.getElementById('setting-update-check');
    if (!statusEl || !installBtn || !checkBtn) return;

    installBtn.hidden = status.status !== 'downloaded';
    checkBtn.disabled = status.status === 'checking' || status.status === 'downloading';

    const messages = {
      idle: 'Tự động kiểm tra phiên bản mới khi mở ứng dụng desktop.',
      unsupported: 'Tự cập nhật chỉ khả dụng trong bản desktop Windows đã cài bằng trình cài đặt.',
      checking: 'Đang kiểm tra phiên bản mới...',
      'no-release': 'Chưa có bản cập nhật nào được phát hành trên GitHub. Cần phát hành bản mới trước khi tự cập nhật hoạt động.',
      available: `Có phiên bản ${status.version}. Đang tải về...`,
      downloading: `Đang tải bản cập nhật... ${status.percent}%`,
      downloaded: `Đã tải phiên bản ${status.version}. Khởi động lại để cài đặt.`,
      current: `Bạn đang dùng phiên bản mới nhất (${status.version}).`,
      error: 'Không thể kiểm tra hoặc tải cập nhật. Vui lòng thử lại.'
    };
    statusEl.textContent = messages[status.status] || messages.idle;
  }

  function initUpdateControls() {
    const api = window.taskflowUpdates;
    const checkBtn = document.getElementById('setting-update-check');
    const installBtn = document.getElementById('setting-update-install');
    if (!checkBtn || !installBtn) return;
    if (!api) {
      updateUpdateStatus({ status: 'unsupported' });
      checkBtn.disabled = true;
      return;
    }

    api.getVersion()
      .then(version => {
        const versionEl = document.getElementById('setting-app-version');
        if (versionEl) versionEl.textContent = version;
      })
      .catch(error => {
        console.error('[settings] Cannot read desktop app version:', error);
      });

    api.getStatus()
      .then(updateUpdateStatus)
      .catch(error => {
        console.error('[settings] Cannot read update status:', error);
        updateUpdateStatus({ status: 'error' });
      });
    api.onStatus(updateUpdateStatus);

    checkBtn.addEventListener('click', async () => {
      checkBtn.disabled = true;
      try {
        updateUpdateStatus(await api.check());
      } catch (error) {
        console.error('[settings] Update check failed:', error);
        updateUpdateStatus({ status: 'error' });
      }
    });

    installBtn.addEventListener('click', async () => {
      installBtn.disabled = true;
      try {
        await api.install();
      } catch (error) {
        console.error('[settings] Update installation failed:', error);
        showToast(error.message || 'Không thể cài đặt bản cập nhật', 'error');
        installBtn.disabled = false;
      }
    });
  }

  // ── Bind events ──
  function bindEvents() {
    initUpdateControls();

    // Startup launch
    document.getElementById('setting-launch-startup')?.addEventListener('change', async function () {
      const toggle = this;
      toggle.disabled = true;
      try {
        await saveAppSettings({ launchOnStartup: toggle.checked });
        showToast(toggle.checked ? 'Đã bật khởi động cùng Windows' : 'Đã tắt khởi động cùng Windows');
      } catch (err) {
        toggle.checked = !toggle.checked;
        showToast(err.message || 'Không thể lưu cài đặt khởi động', 'error');
      } finally {
        toggle.disabled = false;
      }
    });

    document.getElementById('setting-window-size')?.addEventListener('change', async function () {
      const select = this;
      const previousValue = select.dataset.savedValue || '1200x780';
      select.disabled = true;
      try {
        const result = await saveAppSettings({ windowSize: select.value });
        select.dataset.savedValue = select.value;
        if (result.windowSizeApplied) {
          showToast(`Đã đổi kích thước cửa sổ thành ${select.value.replace('x', ' × ')}`);
        } else {
          showToast('Đã lưu cài đặt. Kích thước chỉ áp dụng trong ứng dụng desktop Electron.', 'info');
        }
      } catch (err) {
        select.value = previousValue;
        showToast(err.message || 'Không thể lưu kích thước cửa sổ', 'error');
      } finally {
        select.disabled = false;
      }
    });

    // Dark mode
    document.getElementById('setting-dark-mode')?.addEventListener('change', () => {
      const darkToggle = document.getElementById('setting-dark-mode');
      setThemeByToggle(Boolean(darkToggle?.checked));
    });

    // Font
    document.getElementById('setting-font')?.addEventListener('change', function () {
      const next = updateSettings({ font: this.value });
      applySettings(next);
      showToast('Đã đổi font chữ');
    });

    // Pomodoro inputs
    ['setting-pomo-work', 'setting-pomo-short', 'setting-pomo-long'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', function () {
        const val = Math.max(1, parseInt(this.value) || 1);
        this.value = val;
        const patch = {};
        if (id === 'setting-pomo-work') patch.pomoWork = val;
        if (id === 'setting-pomo-short') patch.pomoShort = val;
        if (id === 'setting-pomo-long') patch.pomoLong = val;
        const next = updateSettings(patch);
        applySettings(next);
        showToast('Đã cập nhật thời gian Pomodoro');
      });
    });

    // Notification toggles
    document.getElementById('setting-notif-deadline')?.addEventListener('change', function () {
      updateSettings({ notifDeadline: this.checked });
      showToast(this.checked ? 'Bật nhắc deadline' : 'Tắt nhắc deadline');
    });

    document.getElementById('setting-notif-vocab')?.addEventListener('change', function () {
      updateSettings({ notifVocab: this.checked });
      showToast(this.checked ? 'Bật nhắc từ vựng' : 'Tắt nhắc từ vựng');
    });

    document.getElementById('setting-notif-habit')?.addEventListener('change', function () {
      updateSettings({ notifHabit: this.checked });
      showToast(this.checked ? 'Bật nhắc thói quen' : 'Tắt nhắc thói quen');
    });

    document.getElementById('setting-notif-schedule')?.addEventListener('change', function () {
      updateSettings({ notifSchedule: this.checked });

      const reminder = loadReminderState();
      reminder.enabled = this.checked;
      saveReminderState(reminder);

      showToast(this.checked ? 'Bật nhắc lịch trình thông minh' : 'Tắt nhắc lịch trình thông minh');
    });

    // Notification permission
    document.getElementById('setting-notif-perm')?.addEventListener('click', async () => {
      const permission = getNotifPermission();
      if (permission === 'unsupported') {
        showToast('Trình duyệt không hỗ trợ Notification API', 'error');
        return;
      }

      if (permission === 'granted') {
        showToast('Quyền thông báo đã được cấp trước đó.', 'info');
        updateNotifPermBtn();
        return;
      }

      if (permission === 'denied') {
        showToast('Bạn đã chặn thông báo cho trang này. Hãy mở Site settings của trình duyệt để cho phép lại.', 'warning');
        updateNotifPermBtn();
        return;
      }

      const perm = await Notification.requestPermission();
      updateNotifPermBtn();
      if (perm === 'granted') {
        showToast('Đã cấp quyền thông báo!', 'success');
      } else if (perm === 'denied') {
        showToast('Bạn vừa từ chối quyền thông báo.', 'warning');
      } else {
        showToast('Chưa chọn quyền thông báo.', 'info');
      }
    });

    document.getElementById('setting-notif-test')?.addEventListener('click', async () => {
      const permission = getNotifPermission();
      if (permission === 'unsupported') {
        showToast('Trình duyệt không hỗ trợ Notification API', 'error');
        return;
      }

      if (location.hostname !== 'localhost' && location.protocol !== 'https:') {
        showToast('Thông báo chỉ hoạt động trên HTTPS hoặc localhost', 'warning');
        return;
      }

      if (permission === 'default') {
        await Notification.requestPermission();
      }

      if (Notification.permission !== 'granted') {
        showToast('Chưa có quyền thông báo. Hãy bấm "Cấp quyền" trước.', 'warning');
        updateNotifPermBtn();
        return;
      }

      new Notification('TaskFlow', {
        body: 'Thông báo thử đã hoạt động trên localhost ✅'
      });
      showToast('Đã gửi thông báo thử!', 'success');
    });

    // Backup
    document.getElementById('setting-backup')?.addEventListener('click', () => {
      if (window.globalUtils?.exportBackup) {
        window.globalUtils.exportBackup();
        return;
      }

      exportBackupFallback()
        .then(() => showToast('Đã tải bản sao lưu!', 'success'))
        .catch((e) => showToast(e.message || 'Lỗi tạo backup', 'error'));
    });

    // Restore
    const restoreBtn = document.getElementById('setting-restore');
    restoreBtn?.addEventListener('click', () => document.getElementById('restore-file')?.click());

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
            mode: 'replace',
            payload: {
              version: '2.0',
              data: {
                todos: [], tags: [], notes: [], noteVersions: [],
                englishProgress: [], englishMindmaps: [], vocab: [],
                trades: [], tradingAccounts: [], habits: [], habitLogs: [], schedules: []
              }
            }
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
      return;
    }

    let fallback = document.getElementById('st-fallback-toast');
    if (!fallback) {
      fallback = document.createElement('div');
      fallback.id = 'st-fallback-toast';
      fallback.style.position = 'fixed';
      fallback.style.right = '16px';
      fallback.style.bottom = '16px';
      fallback.style.zIndex = '9999';
      fallback.style.padding = '10px 14px';
      fallback.style.borderRadius = '10px';
      fallback.style.fontSize = '13px';
      fallback.style.color = '#fff';
      fallback.style.maxWidth = '320px';
      fallback.style.boxShadow = '0 10px 24px rgba(0,0,0,.2)';
      document.body.appendChild(fallback);
    }

    const colorByType = {
      success: '#16a34a',
      error: '#dc2626',
      warning: '#d97706',
      info: '#2563eb'
    };

    fallback.style.background = colorByType[type] || colorByType.info;
    fallback.textContent = msg;
    fallback.style.display = 'block';

    clearTimeout(fallbackToastTimer);
    fallbackToastTimer = setTimeout(() => {
      fallback.style.display = 'none';
    }, 2600);
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
  async function init() {
    setNavDate();
    const settings = loadSettings();
    let appSettings;
    try {
      appSettings = await loadAppSettings();
    } catch (error) {
      appSettings = { launchOnStartup: false, windowSize: '1200x780' };
      try {
        const saved = JSON.parse(localStorage.getItem(APP_SETTINGS_KEY) || '{}');
        appSettings = { ...appSettings, ...saved };
      } catch (storageError) {
        console.error('[settings] Invalid saved application settings:', storageError);
      }
      showToast(error.message || 'Không thể tải cài đặt ứng dụng', 'error');
    }
    const mergedSettings = { ...settings, ...appSettings };

    try {
      populateForm(mergedSettings);
      const windowSize = document.getElementById('setting-window-size');
      if (windowSize) windowSize.dataset.savedValue = mergedSettings.windowSize || '1200x780';
    } catch (e) {
      console.error('[settings] populateForm failed:', e);
    }

    try {
      applySettings(mergedSettings);
    } catch (e) {
      console.error('[settings] applySettings failed:', e);
    }

    try {
      bindEvents();
    } catch (e) {
      console.error('[settings] bindEvents failed:', e);
      showToast('Lỗi khởi tạo trang cài đặt', 'error');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
