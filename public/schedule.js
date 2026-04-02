// ==================== SCHEDULE.JS — Multi-day & Weekly ====================
(function() {
  'use strict';

  const TASKS_KEY = 'schedule_tasks';
  const SCHEDULE_KEY = 'schedule_data';
  const REMINDER_KEY = 'taskflow_smart_reminders';
  const SETTINGS_KEY = 'taskflow_settings';
  const SCHEDULE_CHECK_KEY = 'dashboard_schedule_checks';
  let tasks = [];
  let scheduleData = null;
  let currentMode = 'single';  // single | multi | weekly
  let selectedMultiDay = 0;     // index for multi-day nav
  let weeklyEditState = null;   // { day: 'Thứ 2', index: 0 } when editing
  let weeklySelection = new Set();
  let weeklyItemSeed = 0;
  let reminderState = loadReminderState();
  let reminderTimer = null;
  const WEEK_DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  const RECURRING_DAY_MAP = {
    daily: WEEK_DAYS,
    weekday: WEEK_DAYS.slice(0, 5),
    weekend: WEEK_DAYS.slice(5)
  };
  const DAY_NUMBER_MAP = {
    '2': 'Thứ 2',
    '3': 'Thứ 3',
    '4': 'Thứ 4',
    '5': 'Thứ 5',
    '6': 'Thứ 6',
    '7': 'Thứ 7',
    '8': 'Chủ nhật',
    'cn': 'Chủ nhật',
    'chunhat': 'Chủ nhật'
  };
  const DAY_LABEL_TO_NUMBER = {
    'Thứ 2': '2',
    'Thứ 3': '3',
    'Thứ 4': '4',
    'Thứ 5': '5',
    'Thứ 6': '6',
    'Thứ 7': '7',
    'Chủ nhật': 'CN'
  };

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupDate();
    setDefaultStartDate();
    setupRecurringDayPicker();
    initWeeklyEditor();
    loadTasks();
    loadSavedSchedule();
    renderTasks();
    // Restore mode UI to match saved schedule
    if (scheduleData && scheduleData._mode && scheduleData._mode !== 'single') {
      switchMode(scheduleData._mode);
    }
    if (scheduleData) restoreView(scheduleData);
    initScheduleReminders();
  }

  function initWeeklyEditor() {
    const dayEl = document.getElementById('sch-weekly-day');
    const timeEl = document.getElementById('sch-weekly-time');
    const iconEl = document.getElementById('sch-weekly-icon');
    const titleEl = document.getElementById('sch-weekly-title');
    const templateEl = document.getElementById('sch-weekly-template');
    const habitLinkEl = document.getElementById('sch-weekly-habit-link');
    if (dayEl) dayEl.value = 'Thứ 2';
    if (timeEl && !timeEl.value) timeEl.value = '08:00';
    if (iconEl && !iconEl.value) iconEl.value = '📌';

    const dayInputs = document.querySelectorAll('#sch-weekly-days input[type="checkbox"]');
    dayInputs.forEach(input => {
      input.addEventListener('change', () => {
        if (input.checked && dayEl) dayEl.value = input.value;
      });
    });

    if (dayEl) {
      dayEl.addEventListener('change', () => {
        if (weeklyEditState) setSelectedWeeklyDays([dayEl.value]);
      });
    }

    if (titleEl) {
      titleEl.addEventListener('input', () => {
        if (templateEl && titleEl.value.trim()) templateEl.value = '';
      });
    }

    if (habitLinkEl) loadWeeklyHabitOptions();

    renderWeeklySelectionInfo();
  }

  async function loadWeeklyHabitOptions() {
    const linkEl = document.getElementById('sch-weekly-habit-link');
    if (!linkEl) return;
    try {
      const res = await fetch('/api/habits');
      const habits = await res.json();
      const currentValue = linkEl.value || '';
      const opts = ['<option value="">🔗 Không liên kết habit</option>'];
      (habits || []).forEach(h => {
        const icon = h.icon || '✅';
        const name = escapeHtml(h.name || 'Habit');
        opts.push(`<option value="${escapeHtml(h.id)}">${icon} ${name}</option>`);
      });
      linkEl.innerHTML = opts.join('');
      linkEl.value = currentValue;
    } catch (err) {
      console.error('Load habit options failed:', err);
    }
  }

  function getSelectedWeeklyDays() {
    const checked = document.querySelectorAll('#sch-weekly-days input[type="checkbox"]:checked');
    return WEEK_DAYS.filter(day => Array.from(checked).some(node => node.value === day));
  }

  function setSelectedWeeklyDays(days = []) {
    const selected = new Set(days);
    document.querySelectorAll('#sch-weekly-days input[type="checkbox"]').forEach(input => {
      input.checked = selected.has(input.value);
    });
  }

  function getWeeklyItemIcon(item, fallbackIcon) {
    const icon = String(item?.icon || '').trim();
    return icon || fallbackIcon;
  }

  function ensureWeeklyItemId(item) {
    if (!item || typeof item !== 'object') return '';
    if (!item._wid) {
      weeklyItemSeed += 1;
      item._wid = `wk_${Date.now().toString(36)}_${weeklyItemSeed.toString(36)}`;
    }
    return item._wid;
  }

  function getAllWeeklyItemIds() {
    if (!scheduleData?.weekly) return new Set();
    const ids = new Set();
    getWeeklyDayNames().forEach(day => {
      const arr = scheduleData.weekly[day] || [];
      arr.forEach(item => {
        const id = ensureWeeklyItemId(item);
        if (id) ids.add(id);
      });
    });
    return ids;
  }

  function syncWeeklySelection() {
    const validIds = getAllWeeklyItemIds();
    weeklySelection = new Set(Array.from(weeklySelection).filter(id => validIds.has(id)));
  }

  function renderWeeklySelectionInfo() {
    const infoEl = document.getElementById('sch-weekly-selection-info');
    const applyBtn = document.getElementById('sch-weekly-apply-selected');
    const clearBtn = document.getElementById('sch-weekly-clear-selection');
    const deleteBtn = document.getElementById('sch-weekly-delete-selected');
    const count = weeklySelection.size;
    if (infoEl) infoEl.textContent = count > 0 ? `Đang chọn ${count} hoạt động` : 'Chưa chọn mục nào';
    if (applyBtn) applyBtn.disabled = count === 0;
    if (clearBtn) clearBtn.disabled = count === 0;
    if (deleteBtn) deleteBtn.disabled = count === 0;
  }

  window.applyWeeklyTemplate = function() {
    const templateEl = document.getElementById('sch-weekly-template');
    const titleEl = document.getElementById('sch-weekly-title');
    const iconEl = document.getElementById('sch-weekly-icon');
    const typeEl = document.getElementById('sch-weekly-type');
    if (!templateEl || !titleEl) return;

    const value = templateEl.value;
    if (!value) return;

    const presets = {
      'Học tiếng Anh': { icon: '📘', type: 'task' },
      'Code dự án': { icon: '💻', type: 'task' },
      'Học trading': { icon: '📈', type: 'task' },
      'Đọc sách': { icon: '📚', type: 'task' },
      'Tập thể dục': { icon: '🏃', type: 'exercise' },
      'Ăn uống': { icon: '🍽️', type: 'meal' },
      'Nghỉ ngơi': { icon: '☕', type: 'break' }
    };

    titleEl.value = value;
    if (presets[value]?.icon && iconEl) iconEl.value = presets[value].icon;
    if (presets[value]?.type && typeEl) typeEl.value = presets[value].type;
  };

  function setupDate() {
    const el = document.getElementById('nav-date');
    if (el) {
      const d = new Date();
      el.textContent = d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
    }
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

  function saveReminderState() {
    localStorage.setItem(REMINDER_KEY, JSON.stringify(reminderState));
  }

  function getAppSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function todayDateString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getTodayWeekdayLabel() {
    const jsDay = new Date().getDay();
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return dayNames[jsDay];
  }

  function getTodayWeeklyItems() {
    if (!scheduleData?.weekly) return [];
    const day = getTodayWeekdayLabel();
    const items = scheduleData.weekly[day] || [];
    return items.map((item, idx) => ({ ...item, __day: day, __idx: idx }));
  }

  function buildReminderEventId(item) {
    return `${todayDateString()}|${item.__day}|${item.time || ''}|${item.title || ''}`;
  }

  function saveScheduleCheck(item) {
    const id = encodeURIComponent(`${item.__day}|${item.time || ''}|${item.title || ''}|${item.__idx}`);
    let checks = {};
    try { checks = JSON.parse(localStorage.getItem(SCHEDULE_CHECK_KEY) || '{}'); } catch { checks = {}; }
    checks[id] = true;
    localStorage.setItem(SCHEDULE_CHECK_KEY, JSON.stringify(checks));
  }

  async function syncScheduleItemToHabit(item) {
    if (!item?.linkedHabitId) return;
    const today = todayDateString();
    try {
      const logsRes = await fetch(`/api/habits/logs?start=${today}&end=${today}`);
      const logs = await logsRes.json();
      const done = Array.isArray(logs[item.linkedHabitId]) && logs[item.linkedHabitId].includes(today);
      if (done) return;

      await fetch(`/api/habits/${item.linkedHabitId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today })
      });
    } catch (err) {
      console.error('Schedule reminder habit sync failed:', err);
    }
  }

  function showScheduleReminderToast(item, eventId) {
    const old = document.getElementById('sch-reminder-toast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.id = 'sch-reminder-toast';
    toast.className = 'sch-reminder-toast';
    toast.innerHTML = `
      <div class="sch-reminder-title">🔔 Đến giờ: ${escapeHtml(item.title || 'Hoạt động')}</div>
      <div class="sch-reminder-msg">${escapeHtml(item.time || '--:--')} • ${escapeHtml(item.__day || '')}</div>
      <div class="sch-reminder-actions">
        <button class="sch-btn sch-btn-secondary" data-sz="10">Hoãn 10p</button>
        <button class="sch-btn sch-btn-secondary" data-sz="30">Hoãn 30p</button>
        <button class="sch-btn sch-btn-secondary" data-sz="60">Hoãn 60p</button>
        <button class="sch-btn sch-btn-primary" id="sch-reminder-done">Đã làm</button>
      </div>
    `;

    toast.addEventListener('click', async (e) => {
      const snoozeBtn = e.target.closest('[data-sz]');
      if (snoozeBtn) {
        const mins = Number(snoozeBtn.dataset.sz || 10);
        reminderState.snoozed[eventId] = Date.now() + mins * 60 * 1000;
        delete reminderState.fired[eventId];
        saveReminderState();
        toast.remove();
        return;
      }

      if (e.target.id === 'sch-reminder-done') {
        saveScheduleCheck(item);
        await syncScheduleItemToHabit(item);
        reminderState.fired[eventId] = todayDateString();
        delete reminderState.snoozed[eventId];
        saveReminderState();
        toast.remove();
        showScheduleNotification('✅ Đã đánh dấu hoàn thành từ nhắc việc');
      }
    });

    document.body.appendChild(toast);
  }

  async function maybeBrowserNotify(item) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if (Notification.permission === 'granted') {
      new Notification(`Đến giờ: ${item.title || 'Hoạt động'}`, {
        body: `${item.time || '--:--'} • ${item.__day || ''}`
      });
    }
  }

  async function checkScheduleReminders() {
    const settings = getAppSettings();
    if (settings.notifSchedule === false) return;
    if (!reminderState.enabled) return;

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const today = todayDateString();
    const items = getTodayWeeklyItems();

    for (const item of items) {
      const dueMinutes = toMinutes(item.time);
      if (dueMinutes === null) continue;
      const eventId = buildReminderEventId(item);
      const snoozedUntil = reminderState.snoozed[eventId] || 0;
      if (snoozedUntil > Date.now()) continue;
      if (reminderState.fired[eventId] === today) continue;

      const lag = nowMinutes - dueMinutes;
      if (lag >= 0 && lag <= 15) {
        reminderState.fired[eventId] = today;
        saveReminderState();
        showScheduleReminderToast(item, eventId);
        maybeBrowserNotify(item);
      }
    }
  }

  function initScheduleReminders() {
    const settings = getAppSettings();
    if (settings.notifSchedule === true && !reminderState.enabled) {
      reminderState.enabled = true;
      saveReminderState();
    }

    if (reminderTimer) clearInterval(reminderTimer);
    reminderTimer = setInterval(checkScheduleReminders, 30000);
    checkScheduleReminders();
  }

  function setDefaultStartDate() {
    const el = document.getElementById('sch-start-date');
    if (el && !el.value) {
      const d = new Date();
      el.value = d.toISOString().split('T')[0];
    }
  }

  function normalizeTaskDays(days) {
    if (!Array.isArray(days)) return [];
    const set = new Set();
    days.forEach(d => {
      const value = String(d || '').trim();
      if (WEEK_DAYS.includes(value)) set.add(value);
    });
    return WEEK_DAYS.filter(d => set.has(d));
  }

  function getSelectedTaskDays() {
    const nodes = document.querySelectorAll('#sch-task-days input[type="checkbox"]:checked');
    return normalizeTaskDays(Array.from(nodes).map(n => n.value));
  }

  function parseDaysTextInput(input) {
    const text = String(input || '').toLowerCase();
    if (!text.trim()) return [];

    const normalized = text
      .replace(/chủ\s*nhật|chu\s*nhat/g, 'cn')
      .replace(/thứ\s*/g, 't')
      .replace(/,/g, ' ');

    const tokens = normalized.match(/cn|t\s*[2-7]|[2-8]/g) || [];
    const days = tokens.map(token => {
      const cleaned = token.replace(/\s+/g, '').toLowerCase();
      if (cleaned.startsWith('t') && cleaned.length === 2) {
        return DAY_NUMBER_MAP[cleaned.slice(1)] || '';
      }
      return DAY_NUMBER_MAP[cleaned] || '';
    });

    return normalizeTaskDays(days);
  }

  function formatDaysToText(days = []) {
    const labels = normalizeTaskDays(days).map(day => DAY_LABEL_TO_NUMBER[day] || day);
    return labels.join(' ');
  }

  function setSelectedTaskDays(days = []) {
    const normalizedDays = normalizeTaskDays(days);
    const selected = new Set(normalizedDays);
    document.querySelectorAll('#sch-task-days input[type="checkbox"]').forEach(input => {
      input.checked = selected.has(input.value);
    });
    const textInput = document.getElementById('sch-task-days-text');
    if (textInput) textInput.value = formatDaysToText(normalizedDays);
  }

  function setupRecurringDayPicker() {
    const recurringEl = document.getElementById('sch-task-recurring');
    const daysTextEl = document.getElementById('sch-task-days-text');
    if (!recurringEl) return;

    document.querySelectorAll('#sch-task-days input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', () => {
        if (daysTextEl) daysTextEl.value = formatDaysToText(getSelectedTaskDays());
      });
    });

    if (daysTextEl) {
      daysTextEl.addEventListener('change', function() {
        const parsedDays = parseDaysTextInput(this.value);
        setSelectedTaskDays(parsedDays);
      });
      daysTextEl.addEventListener('blur', function() {
        const parsedDays = parseDaysTextInput(this.value);
        setSelectedTaskDays(parsedDays);
      });
    }

    recurringEl.addEventListener('change', function() {
      const presetDays = RECURRING_DAY_MAP[this.value];
      if (presetDays) setSelectedTaskDays(presetDays);
    });
  }

  // ===== MODE SWITCHING =====
  window.switchMode = function(mode) {
    currentMode = mode;
    document.querySelectorAll('.sch-mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));

    const showDay = mode !== 'single';
    document.getElementById('sch-day-row').style.display = showDay ? '' : 'none';
    document.getElementById('sch-multi-opts').style.display = mode === 'multi' ? '' : 'none';

    document.getElementById('sch-view-single').style.display = mode === 'single' ? '' : 'none';
    document.getElementById('sch-view-multi').style.display = mode === 'multi' ? '' : 'none';
    document.getElementById('sch-view-weekly').style.display = mode === 'weekly' ? '' : 'none';

    // Update AI button text
    const btn = document.getElementById('btn-ai-schedule');
    if (btn) {
      const labels = { single: '🤖 AI Lên lịch 1 ngày', multi: '🤖 AI Lên lịch nhiều ngày', weekly: '🤖 AI Tạo thời khóa biểu tuần' };
      btn.innerHTML = labels[mode];
    }

    // Restore existing view if data matches mode
    if (scheduleData && scheduleData._mode === mode) restoreView(scheduleData);
  };

  function restoreView(data) {
    if (!data) return;
    if (data._mode === 'weekly' && data.weekly) renderWeeklyTimetable(data);
    else if (data._mode === 'multi' && data.days) renderMultiDay(data);
    else if (data.schedule) renderSingleDay(data);
    showTipsSummary(data);
  }

  // ===== TASK MANAGEMENT =====
  function loadTasks() {
    try { tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]'); } catch { tasks = []; }
  }

  function saveTasks() { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); }

  function loadSavedSchedule() {
    try {
      const saved = localStorage.getItem(SCHEDULE_KEY);
      if (saved) {
        scheduleData = JSON.parse(saved);
        if (scheduleData._mode) currentMode = scheduleData._mode;
      }
    } catch { scheduleData = null; }
  }

  window.addScheduleTask = function() {
    const title = document.getElementById('sch-task-title')?.value?.trim();
    const duration = parseInt(document.getElementById('sch-task-duration')?.value) || 30;
    const priority = document.getElementById('sch-task-priority')?.value || '';
    const deadline = document.getElementById('sch-task-deadline')?.value?.trim() || '';
    const fixedStart = document.getElementById('sch-task-fixed-start')?.value || '';
    const fixedEnd = document.getElementById('sch-task-fixed-end')?.value || '';
    const timeNote = document.getElementById('sch-task-time-note')?.value?.trim() || '';
    const textDays = parseDaysTextInput(document.getElementById('sch-task-days-text')?.value || '');
    const selectedDays = normalizeTaskDays([...getSelectedTaskDays(), ...textDays]);
    const day = selectedDays[0] || '';
    const recurring = document.getElementById('sch-task-recurring')?.value || '';

    if (!title) return alert('Vui lòng nhập tên công việc!');
    if ((fixedStart && !fixedEnd) || (!fixedStart && fixedEnd)) {
      return alert('Vui lòng chọn đầy đủ giờ bắt đầu và kết thúc cho khung giờ cố định!');
    }
    if (fixedStart && fixedEnd && fixedStart >= fixedEnd) {
      return alert('Khung giờ không hợp lệ: giờ kết thúc phải sau giờ bắt đầu.');
    }

    tasks.push({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      title, duration, priority, deadline, fixedStart, fixedEnd, timeNote, day, days: selectedDays, recurring
    });
    saveTasks();
    renderTasks();

    document.getElementById('sch-task-title').value = '';
    if (document.getElementById('sch-task-fixed-start')) document.getElementById('sch-task-fixed-start').value = '';
    if (document.getElementById('sch-task-fixed-end')) document.getElementById('sch-task-fixed-end').value = '';
    if (document.getElementById('sch-task-time-note')) document.getElementById('sch-task-time-note').value = '';
    setSelectedTaskDays([]);
    const recurringEl = document.getElementById('sch-task-recurring');
    if (recurringEl) recurringEl.value = '';
    document.getElementById('sch-task-title').focus();
  };

  document.getElementById('sch-task-title')?.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); addScheduleTask(); }
  });

  window.removeScheduleTask = function(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
  };

  function renderTasks() {
    const container = document.getElementById('sch-task-list');
    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = '<div class="sch-task-empty">Chưa có công việc nào</div>';
      return;
    }

    const priorityLabels = { high: '🔴', medium: '🟡', low: '🟢' };
    const recurringLabels = { daily: '🔁 Hàng ngày', weekday: '🔁 T2-T6', weekend: '🔁 Cuối tuần' };

    container.innerHTML = tasks.map(t => {
      const badges = [];
      const taskDays = normalizeTaskDays(t.days && t.days.length ? t.days : (t.day ? [t.day] : []));
      const fixedRange = (t.fixedStart && t.fixedEnd)
        ? `${t.fixedStart}-${t.fixedEnd}`
        : (t.fixedTime ? t.fixedTime : '');
      if (taskDays.length > 0) {
        badges.push(...taskDays.map(day => `<span class="sch-badge sch-badge-day">${escapeHtml(day)}</span>`));
      }
      if (t.recurring) badges.push(`<span class="sch-badge sch-badge-rec">${recurringLabels[t.recurring] || t.recurring}</span>`);

      return `
        <div class="sch-task-item">
          <div class="sch-task-info">
            <span class="sch-task-name">${t.priority ? priorityLabels[t.priority] + ' ' : ''}${escapeHtml(t.title)}</span>
            <span class="sch-task-meta">
              ${t.duration} phút${t.deadline ? ' | Hạn: ' + escapeHtml(t.deadline) : ''}
              ${fixedRange ? ' | Khung giờ cố định: ' + escapeHtml(fixedRange) : ''}
              ${t.timeNote ? ' | Ghi chú: ' + escapeHtml(t.timeNote) : ''}
              ${badges.length ? '<br>' + badges.join(' ') : ''}
            </span>
          </div>
          <button class="sch-task-remove" onclick="removeScheduleTask('${t.id}')" title="Xóa">✕</button>
        </div>`;
    }).join('');
  }

  // ===== AI SCHEDULE GENERATION =====
  function toMinutes(timeStr) {
    if (!timeStr || !/^\d{1,2}:\d{2}$/.test(String(timeStr))) return null;
    const [h, m] = String(timeStr).split(':').map(Number);
    return h * 60 + m;
  }

  function toHHMM(minutes) {
    const safe = Math.max(0, Math.min(23 * 60 + 59, minutes));
    const h = Math.floor(safe / 60);
    const m = safe % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function normalizeDayWindow(wakeInput, sleepInput) {
    let wake = toMinutes(wakeInput) ?? (7 * 60);
    let sleep = toMinutes(sleepInput) ?? (23 * 60);
    let overnight = false;
    if (sleep <= wake) {
      overnight = true;
      sleep += 1440;
    }
    if (sleep - wake < 120) {
      sleep = wake + 8 * 60;
    }
    return { wake, sleep, overnight };
  }

  function normalizeTextVN(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function applyNightNoteLocal(result, prefs) {
    const note = normalizeTextVN(prefs?.aiNote || '');
    if (!note) return;
    const wantsNight = /buoi\s*dem|gio\s*dem|ban\s*dem|dem|toi/.test(note);
    if (!wantsNight) return;

    const targets = [];
    if (/tieng\s*anh|english/.test(note)) targets.push('tieng anh', 'english');
    if (/code|lap\s*trinh|programming/.test(note)) targets.push('code', 'lap trinh', 'programming');
    if (targets.length === 0) return;

    const moveItems = (items) => {
      if (!Array.isArray(items)) return;
      let cursor = 19 * 60;
      items.forEach(item => {
        const title = normalizeTextVN(item?.title || '');
        if (!targets.some(k => title.includes(k))) return;
        item.time = toHHMM(cursor);
        const currentStart = toMinutes(item.time) || cursor;
        const end = toMinutes(item.endTime);
        const duration = end && end > currentStart ? Math.max(30, Math.min(180, end - currentStart)) : 60;
        item.endTime = toHHMM(Math.min(23 * 60, cursor + duration));
        cursor = Math.min(22 * 60 + 30, cursor + duration + 15);
      });
      items.sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    };

    if (result._mode === 'weekly' && result.weekly) {
      Object.values(result.weekly).forEach(moveItems);
    } else if (result._mode === 'multi' && Array.isArray(result.days)) {
      result.days.forEach(d => moveItems(d.schedule));
    } else {
      moveItems(result.schedule);
    }

    if (!Array.isArray(result.tips)) result.tips = [];
    result.tips.unshift('Đã ưu tiên xếp các việc tiếng Anh/code vào buổi đêm theo ghi chú của bạn.');
  }

  function buildLocalFallbackSchedule(prefs, opts, error) {
    const dayWindow = normalizeDayWindow(prefs.wakeUp || '07:00', prefs.sleep || '23:00');
    const wake = dayWindow.wake;
    const sleep = dayWindow.sleep;
    const rest = Number(prefs.breakDuration) || 15;
    const mode = opts.mode || 'single';

    const sortedTasks = [...tasks].sort((a, b) => {
      const score = p => (p === 'high' ? 3 : p === 'medium' ? 2 : p === 'low' ? 1 : 0);
      return score(b.priority) - score(a.priority);
    });

    const tips = ['AI đang bận hoặc mất kết nối, đã tạo lịch dự phòng trực tiếp trên trình duyệt.'];
    if (error?.message) tips.push('Bạn có thể bấm lại sau ít phút để nhận lịch AI chi tiết hơn.');

    if (mode === 'weekly') {
      const weekly = Object.fromEntries(WEEK_DAYS.map(d => [d, []]));
      const cursors = Object.fromEntries(WEEK_DAYS.map(d => [d, wake]));
      sortedTasks.forEach((task, i) => {
        const taskDays = normalizeTaskDays(task.days && task.days.length ? task.days : (task.day ? [task.day] : []));
        const assignedDays = taskDays.length > 0 ? taskDays : [WEEK_DAYS[i % 7]];
        assignedDays.forEach(day => {
          const key = WEEK_DAYS.includes(day) ? day : WEEK_DAYS[i % 7];
          const start = cursors[key];
          const end = Math.min(sleep, start + (Number(task.duration) || 30));
          if (end <= start) return;
          weekly[key].push({ time: toHHMM(start), endTime: toHHMM(end), title: task.title, type: 'task', note: task.timeNote || 'Lịch dự phòng' });
          cursors[key] = Math.min(sleep, end + rest);
        });
      });

      const result = { weekly, tips, summary: 'Đã tạo thời khóa biểu dự phòng (client fallback).', _mode: 'weekly' };
      applyNightNoteLocal(result, prefs);
      return result;
    }

    if (mode === 'multi' && (Number(opts.days) || 1) > 1) {
      const totalDays = Math.min(7, Math.max(2, Number(opts.days) || 3));
      const startDate = opts.startDate ? new Date(opts.startDate) : new Date();
      const days = [];
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        days.push({ date: d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }), schedule: [], _cursor: wake });
      }
      sortedTasks.forEach((task, i) => {
        const bucket = days[i % totalDays];
        const start = bucket._cursor;
        const end = Math.min(sleep, start + (Number(task.duration) || 30));
        if (end <= start) return;
        bucket.schedule.push({ time: toHHMM(start), endTime: toHHMM(end), title: task.title, type: 'task', note: task.timeNote || 'Lịch dự phòng' });
        bucket._cursor = Math.min(sleep, end + rest);
      });
      days.forEach(d => delete d._cursor);

      const result = { days, tips, summary: 'Đã tạo lịch nhiều ngày dự phòng (client fallback).', _mode: 'multi' };
      applyNightNoteLocal(result, prefs);
      return result;
    }

    let cursor = wake;
    const schedule = [];
    sortedTasks.forEach(task => {
      const start = cursor;
      const end = Math.min(sleep, start + (Number(task.duration) || 30));
      if (end <= start) return;
      schedule.push({ time: toHHMM(start), endTime: toHHMM(end), title: task.title, type: 'task', note: task.timeNote || 'Lịch dự phòng' });
      cursor = Math.min(sleep, end + rest);
    });

    const result = { schedule, tips, summary: 'Đã tạo lịch trong ngày dự phòng (client fallback).', _mode: 'single' };
    applyNightNoteLocal(result, prefs);
    return result;
  }

  window.generateAISchedule = async function() {
    if (tasks.length === 0) return alert('Vui lòng thêm ít nhất 1 công việc!');

    const btn = document.getElementById('btn-ai-schedule');
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ AI đang lên lịch...'; }

    const preferences = {
      wakeUp: document.getElementById('sch-pref-wake')?.value || '7:00',
      sleep: document.getElementById('sch-pref-sleep')?.value || '23:00',
      breakDuration: parseInt(document.getElementById('sch-pref-break')?.value) || 15,
      focusHours: document.getElementById('sch-pref-focus')?.value || '8:00-12:00',
      style: document.getElementById('sch-pref-style')?.value || 'balanced',
      aiNote: document.getElementById('sch-pref-ai-note')?.value?.trim() || ''
    };

    normalizeDayWindow(preferences.wakeUp, preferences.sleep);

    const options = { mode: currentMode };
    if (currentMode === 'multi') {
      options.days = parseInt(document.getElementById('sch-days-count')?.value) || 3;
      options.startDate = document.getElementById('sch-start-date')?.value || '';
    }

    try {
      const res = await fetch('/api/ai/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, preferences, options })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      data._mode = currentMode;
      scheduleData = data;
      localStorage.setItem(SCHEDULE_KEY, JSON.stringify(data));

      restoreView(data);
    } catch(e) {
      const fallback = buildLocalFallbackSchedule(preferences, options, e);
      scheduleData = fallback;
      localStorage.setItem(SCHEDULE_KEY, JSON.stringify(fallback));
      restoreView(fallback);
      showScheduleNotification('⚠️ AI tạm thời lỗi, đã tạo lịch dự phòng trên thiết bị của bạn.');
    }

    if (btn) {
      btn.disabled = false;
      const labels = { single: '🤖 AI Lên lịch 1 ngày', multi: '🤖 AI Lên lịch nhiều ngày', weekly: '🤖 AI Tạo thời khóa biểu tuần' };
      btn.innerHTML = labels[currentMode];
    }
  };

  // ===== SINGLE DAY RENDER =====
  function renderSingleDay(data) {
    const container = document.getElementById('sch-timeline');
    if (!container || !data.schedule || data.schedule.length === 0) {
      container.innerHTML = '<div class="sch-timeline-empty"><div class="sch-empty-icon">❌</div><p>Không tạo được lịch trình</p></div>';
      return;
    }
    container.innerHTML = buildTimelineItems(data.schedule, 'single');
  }

  // ===== MULTI-DAY RENDER =====
  function renderMultiDay(data) {
    if (!data.days || data.days.length === 0) return;

    // Build day navigation tabs
    const nav = document.getElementById('sch-day-nav');
    nav.innerHTML = data.days.map((d, i) => `
      <button class="sch-day-tab ${i === selectedMultiDay ? 'active' : ''}" onclick="selectMultiDay(${i})">${escapeHtml(d.date)}</button>
    `).join('');

    // Render selected day's schedule
    const container = document.getElementById('sch-timeline-multi');
    const dayData = data.days[selectedMultiDay];
    if (!dayData || !dayData.schedule || dayData.schedule.length === 0) {
      container.innerHTML = '<div class="sch-timeline-empty"><div class="sch-empty-icon">📭</div><p>Không có lịch cho ngày này</p></div>';
      return;
    }
    container.innerHTML = `<h4 class="sch-day-title">📌 ${escapeHtml(dayData.date)}</h4>` + buildTimelineItems(dayData.schedule, 'multi');
  }

  window.selectMultiDay = function(index) {
    selectedMultiDay = index;
    if (scheduleData) renderMultiDay(scheduleData);
  };

  // ===== HELPERS: resolveType =====
  function resolveType(type) {
    if (!type) return 'task';
    // Handle compound types like "task|free" → take first
    return type.split('|')[0].trim();
  }

  // ===== WEEKLY TIMETABLE RENDER =====
  function renderWeeklyTimetable(data) {
    ensureWeeklyScheduleData();
    syncWeeklySelection();
    const container = document.getElementById('sch-weekly-grid');
    if (!data.weekly) {
      container.innerHTML = '<div class="sch-timeline-empty"><div class="sch-empty-icon">❌</div><p>Không tạo được thời khóa biểu</p></div>';
      renderWeeklySelectionInfo();
      return;
    }

    const dayNames = getWeeklyDayNames();
    const dayShort = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const typeIcons = { task: '📋', break: '☕', meal: '🍽️', exercise: '🏃', free: '🎮' };
    const typeClasses = { task: 'wk-task', break: 'wk-break', meal: 'wk-meal', exercise: 'wk-exercise', free: 'wk-free' };

    const slotKeys = [];
    const slotSet = new Set();
    dayNames.forEach(day => {
      (data.weekly[day] || []).forEach(item => {
        const slotKey = getWeeklySlotKey(item);
        if (!slotSet.has(slotKey)) {
          slotSet.add(slotKey);
          slotKeys.push(slotKey);
        }
      });
    });
    slotKeys.sort(compareWeeklySlotKeys);

    // ===== Time-slot grid layout (desktop) =====
    let html = '<div class="wk-time-grid">';
    html += '<div class="wk-grid-row wk-grid-header">';
    html += '<div class="wk-grid-time-head">Khung giờ</div>';
    dayNames.forEach((day, i) => {
      const isWeekend = i >= 5;
      html += `<div class="wk-grid-day-head ${isWeekend ? 'wk-col-header-weekend' : ''}">${dayShort[i]}<span class="wk-col-day-full">${day}</span></div>`;
    });
    html += '</div>';

    if (slotKeys.length === 0) {
      html += '<div class="wk-grid-empty">Chưa có hoạt động nào trong thời khóa biểu tuần</div>';
    } else {
      slotKeys.forEach(slotKey => {
        const slot = parseWeeklySlotKey(slotKey);
        const slotLabel = slot.endTime ? `${slot.time} - ${slot.endTime}` : slot.time;
        html += '<div class="wk-grid-row">';
        html += `<div class="wk-grid-time-cell">${escapeHtml(slotLabel)}</div>`;

        dayNames.forEach((day, i) => {
          const dayEncoded = encodeURIComponent(day);
          const slotTimeEncoded = encodeURIComponent(slot.time || '');
          const slotEndEncoded = encodeURIComponent(slot.endTime || '');
          const isWeekend = i >= 5;
          const dayItems = (data.weekly[day] || []).map((item, idx) => ({ item, idx }));
          const slotItems = dayItems.filter(({ item }) => getWeeklySlotKey(item) === slotKey);

          html += `<div class="wk-grid-cell ${isWeekend ? 'wk-grid-cell-weekend' : ''}" ondragover="onWeeklyDragOver(event)" ondrop="onWeeklyDrop(event, '${dayEncoded}', '${slotTimeEncoded}', '${slotEndEncoded}')">`;
          if (slotItems.length === 0) {
            html += '<div class="wk-grid-cell-empty">+</div>';
          } else {
            slotItems.forEach(({ item, idx }) => {
              const t = resolveType(item.type);
              const cls = typeClasses[t] || 'wk-task';
              const icon = getWeeklyItemIcon(item, typeIcons[t] || '📌');
              const itemId = ensureWeeklyItemId(item);
              const selectedCls = weeklySelection.has(itemId) ? 'is-selected' : '';
              html += `<div class="wk-col-item ${cls} ${selectedCls}" draggable="true" ondragstart="onWeeklyDragStart(event, '${dayEncoded}', ${idx})">
                <label class="wk-select-toggle" title="Chọn để sửa hàng loạt" onmousedown="event.stopPropagation()" onclick="event.stopPropagation()">
                  <input type="checkbox" ${weeklySelection.has(itemId) ? 'checked' : ''} onchange="toggleWeeklySelection('${dayEncoded}', ${idx}, this.checked)">
                  <span>✓</span>
                </label>
                <div class="wk-item-actions">
                  <button type="button" class="wk-item-btn" title="Sửa" onclick="editWeeklyItem('${dayEncoded}', ${idx})">✏️</button>
                  <button type="button" class="wk-item-btn wk-item-btn-del" title="Xóa" onclick="deleteWeeklyItem('${dayEncoded}', ${idx})">✕</button>
                </div>
                <div class="wk-col-item-title">${icon} ${escapeHtml(item.title)}</div>
                ${item.note ? `<div class="wk-col-item-note">${escapeHtml(item.note)}</div>` : ''}
              </div>`;
            });
          }
          html += '</div>';
        });

        html += '</div>';
      });
    }
    html += '</div>';

    // ===== Card-based view (mobile) =====
    html += '<div class="wk-cards">';
    dayNames.forEach((day, i) => {
      const items = data.weekly[day] || [];
      if (items.length === 0) return;
      const isWeekend = i >= 5;
      html += `<div class="wk-card ${isWeekend ? 'wk-card-weekend' : ''}">
        <div class="wk-card-header">${dayShort[i]} — ${day}</div>
        <div class="wk-card-body">`;
      items.forEach((item, idx) => {
        const t = resolveType(item.type);
        const cls = typeClasses[t] || 'wk-task';
        const icon = getWeeklyItemIcon(item, typeIcons[t] || '📌');
        const dayEncoded = encodeURIComponent(day);
        const itemId = ensureWeeklyItemId(item);
        const selectedCls = weeklySelection.has(itemId) ? 'is-selected' : '';
        html += `<div class="wk-card-item ${cls} ${selectedCls}" draggable="true" ondragstart="onWeeklyDragStart(event, '${dayEncoded}', ${idx})">
          <label class="wk-select-toggle" title="Chọn để sửa hàng loạt" onmousedown="event.stopPropagation()" onclick="event.stopPropagation()">
            <input type="checkbox" ${weeklySelection.has(itemId) ? 'checked' : ''} onchange="toggleWeeklySelection('${dayEncoded}', ${idx}, this.checked)">
            <span>✓</span>
          </label>
          <div class="wk-item-actions wk-item-actions-mobile">
            <button type="button" class="wk-item-btn" title="Sửa" onclick="editWeeklyItem('${dayEncoded}', ${idx})">✏️</button>
            <button type="button" class="wk-item-btn wk-item-btn-del" title="Xóa" onclick="deleteWeeklyItem('${dayEncoded}', ${idx})">✕</button>
          </div>
          <span class="wk-card-time">${item.time}${item.endTime ? '-' + item.endTime : ''}</span>
          <span class="wk-card-title">${icon} ${escapeHtml(item.title)}</span>
        </div>`;
      });
      html += '</div></div>';
    });
    html += '</div>';

    container.innerHTML = html;
    renderWeeklySelectionInfo();
  }

  function getWeeklySlotKey(item) {
    const time = String(item?.time || '').trim();
    const endTime = String(item?.endTime || '').trim();
    return `${time}|${endTime}`;
  }

  function parseWeeklySlotKey(slotKey) {
    const [time = '', endTime = ''] = String(slotKey || '').split('|');
    return { time, endTime };
  }

  function compareWeeklySlotKeys(a, b) {
    const sa = parseWeeklySlotKey(a);
    const sb = parseWeeklySlotKey(b);
    const ta = toMinutes(sa.time) ?? 0;
    const tb = toMinutes(sb.time) ?? 0;
    if (ta !== tb) return ta - tb;
    const ea = toMinutes(sa.endTime) ?? ta;
    const eb = toMinutes(sb.endTime) ?? tb;
    return ea - eb;
  }

  window.onWeeklyDragStart = function(event, dayEncoded, index) {
    if (!scheduleData?.weekly) return;
    const day = decodeURIComponent(dayEncoded);
    const arr = scheduleData.weekly[day];
    if (!arr || !arr[index]) return;
    const payload = JSON.stringify({ day, index });
    event.dataTransfer.setData('text/plain', payload);
    event.dataTransfer.effectAllowed = 'move';
  };

  window.onWeeklyDragOver = function(event) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  };

  window.onWeeklyDrop = function(event, targetDayEncoded, targetTimeEncoded, targetEndEncoded) {
    event.preventDefault();
    if (!scheduleData?.weekly) return;

    let payload;
    try {
      payload = JSON.parse(event.dataTransfer.getData('text/plain') || '{}');
    } catch {
      return;
    }

    const sourceDay = payload?.day;
    const sourceIndex = Number(payload?.index);
    const targetDay = decodeURIComponent(targetDayEncoded || '');
    const targetTime = decodeURIComponent(targetTimeEncoded || '');
    const targetEndTime = decodeURIComponent(targetEndEncoded || '');

    if (!sourceDay || !Number.isInteger(sourceIndex) || !targetDay || !targetTime) return;
    if (!scheduleData.weekly[sourceDay] || !scheduleData.weekly[targetDay]) return;

    const sourceArr = scheduleData.weekly[sourceDay];
    const movingItem = sourceArr[sourceIndex];
    if (!movingItem) return;

    const sameSlot = sourceDay === targetDay && (movingItem.time || '') === targetTime && (movingItem.endTime || '') === targetEndTime;
    if (sameSlot) return;

    sourceArr.splice(sourceIndex, 1);
    const targetArr = scheduleData.weekly[targetDay];
    targetArr.push({ ...movingItem, time: targetTime, endTime: targetEndTime || '' });

    sourceArr.sort((x, y) => (x.time || '').localeCompare(y.time || ''));
    targetArr.sort((x, y) => (x.time || '').localeCompare(y.time || ''));

    if (weeklyEditState && weeklyEditState.day === sourceDay && weeklyEditState.index === sourceIndex) {
      clearWeeklyEditor();
    }
    persistAndRefreshWeekly();
  };

  function getWeeklyItemByLocation(day, index) {
    if (!scheduleData?.weekly?.[day]) return null;
    return scheduleData.weekly[day][index] || null;
  }

  window.toggleWeeklySelection = function(dayEncoded, index, checked) {
    const day = decodeURIComponent(dayEncoded || '');
    const item = getWeeklyItemByLocation(day, index);
    if (!item) return;
    const id = ensureWeeklyItemId(item);
    if (!id) return;
    if (checked) weeklySelection.add(id);
    else weeklySelection.delete(id);
    renderWeeklySelectionInfo();
  };

  window.clearWeeklySelection = function() {
    weeklySelection.clear();
    if (scheduleData?._mode === 'weekly') renderWeeklyTimetable(scheduleData);
    else renderWeeklySelectionInfo();
  };

  function getSelectedWeeklyItems() {
    if (!scheduleData?.weekly) return [];
    const selected = [];
    getWeeklyDayNames().forEach(day => {
      const arr = scheduleData.weekly[day] || [];
      arr.forEach((item, index) => {
        const id = ensureWeeklyItemId(item);
        if (id && weeklySelection.has(id)) selected.push({ day, index, item });
      });
    });
    return selected;
  }

  window.applyBulkWeeklyEdit = function() {
    if (!scheduleData?.weekly) return;
    const selectedItems = getSelectedWeeklyItems();
    if (selectedItems.length === 0) return alert('Vui lòng chọn ít nhất 1 hoạt động để chỉnh sửa.');

    const titleRaw = document.getElementById('sch-weekly-title')?.value || '';
    const timeRaw = document.getElementById('sch-weekly-time')?.value || '';
    const endRaw = document.getElementById('sch-weekly-end')?.value || '';
    const typeRaw = document.getElementById('sch-weekly-type')?.value || 'task';
    const noteRaw = document.getElementById('sch-weekly-note')?.value || '';
    const iconRaw = document.getElementById('sch-weekly-icon')?.value || '📌';
    const habitLinkEl = document.getElementById('sch-weekly-habit-link');

    const title = titleRaw.trim();
    const time = normalizeTimeInput(timeRaw);
    const endTime = normalizeTimeInput(endRaw);
    const type = resolveType(typeRaw).toLowerCase();
    const note = noteRaw.trim();
    const icon = String(iconRaw || '').trim() || '📌';
    const linkedHabitId = habitLinkEl?.value || '';
    const linkedHabitName = habitLinkEl?.selectedOptions?.[0]?.textContent?.replace(/^\S+\s/, '')?.trim() || '';
    const validTypes = new Set(['task', 'break', 'meal', 'exercise', 'free']);

    if (!title) return alert('Vui lòng nhập tên hoạt động để cập nhật hàng loạt.');
    if (!/^\d{2}:\d{2}$/.test(time)) return alert('Giờ bắt đầu không hợp lệ. Ví dụ: 08:30');
    if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) return alert('Giờ kết thúc không hợp lệ. Ví dụ: 10:00');
    if (endTime) {
      const startMinutes = toMinutes(time);
      const endMinutes = toMinutes(endTime);
      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        return alert('Giờ kết thúc phải sau giờ bắt đầu.');
      }
    }
    if (!validTypes.has(type)) return alert('Loại hoạt động không hợp lệ.');

    selectedItems.forEach(({ item }) => {
      item.title = title;
      item.time = time;
      item.endTime = endTime;
      item.type = type;
      item.note = note;
      item.icon = icon;
      item.linkedHabitId = linkedHabitId;
      item.linkedHabitName = linkedHabitId ? linkedHabitName : '';
      ensureWeeklyItemId(item);
    });

    getWeeklyDayNames().forEach(day => {
      const arr = scheduleData.weekly[day] || [];
      arr.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    });

    persistAndRefreshWeekly();
  };

  window.deleteSelectedWeeklyItems = function() {
    if (!scheduleData?.weekly) return;
    const selectedIds = new Set(weeklySelection);
    if (selectedIds.size === 0) return alert('Vui lòng chọn ít nhất 1 hoạt động để xóa.');

    if (!confirm(`Xóa ${selectedIds.size} hoạt động đã chọn?`)) return;

    getWeeklyDayNames().forEach(day => {
      const arr = scheduleData.weekly[day] || [];
      scheduleData.weekly[day] = arr.filter(item => !selectedIds.has(ensureWeeklyItemId(item)));
    });

    weeklySelection.clear();
    if (weeklyEditState) clearWeeklyEditor();
    persistAndRefreshWeekly();
  };

  function normalizeTimeInput(input) {
    if (!input) return '';
    const t = String(input).trim();
    if (!/^\d{1,2}:\d{2}$/.test(t)) return t;
    const [h, m] = t.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }

  function getWeeklyDayNames() {
    return ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  }

  function ensureWeeklyScheduleData() {
    if (!scheduleData || typeof scheduleData !== 'object') {
      scheduleData = { _mode: 'weekly', weekly: {} };
    }
    scheduleData._mode = 'weekly';
    if (!scheduleData.weekly || typeof scheduleData.weekly !== 'object') {
      scheduleData.weekly = {};
    }
    getWeeklyDayNames().forEach(day => {
      if (!Array.isArray(scheduleData.weekly[day])) scheduleData.weekly[day] = [];
      scheduleData.weekly[day].forEach(item => ensureWeeklyItemId(item));
    });
    syncWeeklySelection();
  }

  function setWeeklyEditorMode(isEditing, day) {
    const titleEl = document.getElementById('sch-weekly-editor-title');
    const saveEl = document.getElementById('sch-weekly-save');
    if (titleEl) titleEl.textContent = isEditing ? `✏️ Chỉnh sửa hoạt động (${day})` : '✍️ Nhập thủ công thời khóa biểu';
    if (saveEl) saveEl.textContent = isEditing ? '💾 Cập nhật hoạt động' : '+ Thêm vào thời khóa biểu';
  }

  function fillWeeklyEditorForEdit(day, index) {
    if (!scheduleData?.weekly?.[day] || !scheduleData.weekly[day][index]) return;
    const item = scheduleData.weekly[day][index];

    const dayEl = document.getElementById('sch-weekly-day');
    const timeEl = document.getElementById('sch-weekly-time');
    const endEl = document.getElementById('sch-weekly-end');
    const titleEl = document.getElementById('sch-weekly-title');
    const typeEl = document.getElementById('sch-weekly-type');
    const noteEl = document.getElementById('sch-weekly-note');
    const iconEl = document.getElementById('sch-weekly-icon');
    const templateEl = document.getElementById('sch-weekly-template');
    const habitLinkEl = document.getElementById('sch-weekly-habit-link');

    if (dayEl) dayEl.value = day;
    setSelectedWeeklyDays([day]);
    if (timeEl) timeEl.value = item.time || '08:00';
    if (endEl) endEl.value = item.endTime || '';
    if (titleEl) titleEl.value = item.title || '';
    if (typeEl) typeEl.value = resolveType(item.type) || 'task';
    if (noteEl) noteEl.value = item.note || '';
    if (iconEl) iconEl.value = item.icon || '📌';
    if (templateEl) templateEl.value = '';
    if (habitLinkEl) habitLinkEl.value = item.linkedHabitId || '';

    weeklyEditState = { day, index };
    setWeeklyEditorMode(true, day);
    titleEl?.focus();
  }

  window.clearWeeklyEditor = function() {
    weeklyEditState = null;

    const dayEl = document.getElementById('sch-weekly-day');
    const timeEl = document.getElementById('sch-weekly-time');
    const endEl = document.getElementById('sch-weekly-end');
    const titleEl = document.getElementById('sch-weekly-title');
    const typeEl = document.getElementById('sch-weekly-type');
    const noteEl = document.getElementById('sch-weekly-note');
    const iconEl = document.getElementById('sch-weekly-icon');
    const templateEl = document.getElementById('sch-weekly-template');
    const habitLinkEl = document.getElementById('sch-weekly-habit-link');

    if (dayEl) dayEl.value = 'Thứ 2';
    setSelectedWeeklyDays([]);
    if (timeEl) timeEl.value = '08:00';
    if (endEl) endEl.value = '';
    if (titleEl) titleEl.value = '';
    if (typeEl) typeEl.value = 'task';
    if (noteEl) noteEl.value = '';
    if (iconEl) iconEl.value = '📌';
    if (templateEl) templateEl.value = '';
    if (habitLinkEl) habitLinkEl.value = '';

    setWeeklyEditorMode(false);
  };

  window.saveWeeklyEntry = function() {
    const day = document.getElementById('sch-weekly-day')?.value || '';
    const selectedDays = getSelectedWeeklyDays();
    const titleRaw = document.getElementById('sch-weekly-title')?.value || '';
    const timeRaw = document.getElementById('sch-weekly-time')?.value || '';
    const endRaw = document.getElementById('sch-weekly-end')?.value || '';
    const typeRaw = document.getElementById('sch-weekly-type')?.value || 'task';
    const noteRaw = document.getElementById('sch-weekly-note')?.value || '';
    const iconRaw = document.getElementById('sch-weekly-icon')?.value || '📌';
    const habitLinkEl = document.getElementById('sch-weekly-habit-link');

    const title = titleRaw.trim();
    const time = normalizeTimeInput(timeRaw);
    const endTime = normalizeTimeInput(endRaw);
    const type = resolveType(typeRaw).toLowerCase();
    const note = noteRaw.trim();
    const icon = String(iconRaw || '').trim() || '📌';
    const linkedHabitId = habitLinkEl?.value || '';
    const linkedHabitName = habitLinkEl?.selectedOptions?.[0]?.textContent?.replace(/^\S+\s/, '')?.trim() || '';
    const targetDays = selectedDays.length > 0 ? selectedDays : [day];

    const validTypes = new Set(['task', 'break', 'meal', 'exercise', 'free']);
    if (targetDays.some(d => !getWeeklyDayNames().includes(d))) return alert('Ngày trong tuần không hợp lệ.');
    if (!title) return alert('Vui lòng nhập tên hoạt động.');
    if (!/^\d{2}:\d{2}$/.test(time)) return alert('Giờ bắt đầu không hợp lệ. Ví dụ: 08:30');
    if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) return alert('Giờ kết thúc không hợp lệ. Ví dụ: 10:00');
    if (endTime) {
      const startMinutes = toMinutes(time);
      const endMinutes = toMinutes(endTime);
      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        return alert('Giờ kết thúc phải sau giờ bắt đầu.');
      }
    }
    if (!validTypes.has(type)) return alert('Loại hoạt động không hợp lệ.');

    ensureWeeklyScheduleData();
    const nextItem = {
      title,
      time,
      endTime,
      type,
      note,
      icon,
      linkedHabitId,
      linkedHabitName: linkedHabitId ? linkedHabitName : ''
    };

    if (
      weeklyEditState &&
      weeklyEditState.day === day &&
      Number.isInteger(weeklyEditState.index) &&
      scheduleData.weekly[day][weeklyEditState.index]
    ) {
      const arr = scheduleData.weekly[day];
      arr[weeklyEditState.index] = { ...arr[weeklyEditState.index], ...nextItem };
      arr.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

      const extraDays = targetDays.filter(d => d !== day);
      extraDays.forEach(targetDay => {
        const targetArr = scheduleData.weekly[targetDay];
        const clonedItem = { ...nextItem };
        ensureWeeklyItemId(clonedItem);
        targetArr.push(clonedItem);
        targetArr.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      });
    } else {
      targetDays.forEach(targetDay => {
        const arr = scheduleData.weekly[targetDay];
        const clonedItem = { ...nextItem };
        ensureWeeklyItemId(clonedItem);
        arr.push(clonedItem);
        arr.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      });
    }

    persistAndRefreshWeekly();
    clearWeeklyEditor();
  };

  function persistAndRefreshWeekly() {
    if (!scheduleData) return;
    scheduleData._mode = 'weekly';
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(scheduleData));
    renderWeeklyTimetable(scheduleData);
    showTipsSummary(scheduleData);
  }

  window.editWeeklyItem = function(dayEncoded, index) {
    if (!scheduleData?.weekly) return;
    const day = decodeURIComponent(dayEncoded);
    const arr = scheduleData.weekly[day];
    if (!arr || !arr[index]) return;
    fillWeeklyEditorForEdit(day, index);
  };

  window.deleteWeeklyItem = function(dayEncoded, index) {
    if (!scheduleData?.weekly) return;
    const day = decodeURIComponent(dayEncoded);
    const arr = scheduleData.weekly[day];
    if (!arr || !arr[index]) return;
    if (!confirm(`Xóa hoạt động "${arr[index].title}" khỏi ${day}?`)) return;
    const removedId = ensureWeeklyItemId(arr[index]);
    arr.splice(index, 1);
    if (removedId) weeklySelection.delete(removedId);
    if (weeklyEditState && weeklyEditState.day === day && weeklyEditState.index === index) {
      clearWeeklyEditor();
    }
    persistAndRefreshWeekly();
  };

  // ===== BUILD TIMELINE ITEMS (reusable) =====
  function buildTimelineItems(schedule, context) {
    const typeIcons = { task: '📋', break: '☕', meal: '🍽️', exercise: '🏃', free: '🎮' };
    const typeColors = { task: '#3b82f6', break: '#10b981', meal: '#f59e0b', exercise: '#8b5cf6', free: '#06b6d4' };

    return schedule.map((item, i) => {
      const t = resolveType(item.type);
      return `
      <div class="sch-tl-item" style="--tl-color: ${typeColors[t] || '#94a3b8'}">
        <div class="sch-tl-time">
          <span class="sch-tl-start">${item.time}</span>
          ${item.endTime ? `<span class="sch-tl-end">${item.endTime}</span>` : ''}
        </div>
        <div class="sch-tl-dot"></div>
        <div class="sch-tl-content">
          <div class="sch-tl-title">${typeIcons[t] || '📌'} ${escapeHtml(item.title)}</div>
          ${item.note ? `<div class="sch-tl-note">${escapeHtml(item.note)}</div>` : ''}
        </div>
        <label class="sch-tl-check">
          <input type="checkbox" onchange="toggleScheduleItem('${context}', ${i})" ${item.done ? 'checked' : ''}>
          <span class="sch-tl-checkmark"></span>
        </label>
      </div>
    `;
    }).join('');
  }

  // ===== TIPS & SUMMARY =====
  function showTipsSummary(data) {
    if (data.tips && data.tips.length > 0) {
      document.getElementById('sch-tips').style.display = '';
      document.getElementById('sch-tips-list').innerHTML = data.tips.map(t => `<li>${escapeHtml(t)}</li>`).join('');
    } else {
      document.getElementById('sch-tips').style.display = 'none';
    }
    if (data.summary) {
      const el = document.getElementById('sch-summary');
      el.style.display = '';
      el.innerHTML = `<div class="sch-summary-text">📊 ${escapeHtml(data.summary)}</div>`;
    } else {
      document.getElementById('sch-summary').style.display = 'none';
    }
  }

  window.toggleScheduleItem = function(context, index) {
    if (!scheduleData) return;
    if (context === 'multi' && scheduleData.days) {
      const day = scheduleData.days[selectedMultiDay];
      if (day && day.schedule[index]) day.schedule[index].done = !day.schedule[index].done;
    } else if (scheduleData.schedule && scheduleData.schedule[index]) {
      scheduleData.schedule[index].done = !scheduleData.schedule[index].done;
    }
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(scheduleData));
  };

  // ===== CLEAR & EXPORT =====
  window.clearSchedule = function() {
    if (!confirm('Xóa toàn bộ lịch trình và danh sách công việc?')) return;
    tasks = [];
    scheduleData = null;
    weeklyEditState = null;
    weeklySelection.clear();
    localStorage.removeItem(TASKS_KEY);
    localStorage.removeItem(SCHEDULE_KEY);
    renderTasks();
    document.getElementById('sch-timeline').innerHTML = '<div class="sch-timeline-empty"><div class="sch-empty-icon">📅</div><p>Thêm công việc và nhấn "AI Lên lịch" để tạo lịch trình</p></div>';
    document.getElementById('sch-timeline-multi').innerHTML = '<div class="sch-timeline-empty"><div class="sch-empty-icon">📆</div><p>Thêm công việc và nhấn "AI Lên lịch" để tạo lịch nhiều ngày</p></div>';
    document.getElementById('sch-weekly-grid').innerHTML = '<div class="sch-timeline-empty"><div class="sch-empty-icon">🗓️</div><p>Thêm công việc và nhấn "AI Lên lịch" để tạo thời khóa biểu tuần</p></div>';
    document.getElementById('sch-day-nav').innerHTML = '';
    document.getElementById('sch-tips').style.display = 'none';
    document.getElementById('sch-summary').style.display = 'none';
    clearWeeklyEditor();
    renderWeeklySelectionInfo();
  };

  window.exportSchedule = function() {
    if (!scheduleData) return alert('Chưa có lịch trình để xuất!');
    let text = '';
    const sep = '='.repeat(50);

    if (scheduleData._mode === 'weekly' && scheduleData.weekly) {
      text = `🗓️ THỜI KHÓA BIỂU TUẦN\n${sep}\n\n`;
      const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
      dayNames.forEach(day => {
        const items = scheduleData.weekly[day];
        if (!items || items.length === 0) return;
        text += `\n📌 ${day}\n${'-'.repeat(30)}\n`;
        items.forEach(item => {
          text += `  ${item.time}${item.endTime ? '-' + item.endTime : ''} | ${item.title}${item.note ? ' (' + item.note + ')' : ''}\n`;
        });
      });
    } else if (scheduleData._mode === 'multi' && scheduleData.days) {
      text = `📆 LỊCH TRÌNH NHIỀU NGÀY\n${sep}\n`;
      scheduleData.days.forEach(day => {
        text += `\n📌 ${day.date}\n${'-'.repeat(30)}\n`;
        (day.schedule || []).forEach(item => {
          const check = item.done ? '✅' : '⬜';
          text += `  ${check} ${item.time}${item.endTime ? '-' + item.endTime : ''} | ${item.title}${item.note ? ' (' + item.note + ')' : ''}\n`;
        });
      });
    } else if (scheduleData.schedule) {
      text = `📅 LỊCH TRÌNH - ${new Date().toLocaleDateString('vi-VN')}\n${sep}\n\n`;
      scheduleData.schedule.forEach(item => {
        const check = item.done ? '✅' : '⬜';
        text += `${check} ${item.time}${item.endTime ? ' - ' + item.endTime : ''} | ${item.title}`;
        if (item.note) text += ` (${item.note})`;
        text += '\n';
      });
    }

    if (scheduleData.tips) text += `\n💡 MẸO:\n${scheduleData.tips.map(t => '- ' + t).join('\n')}`;
    if (scheduleData.summary) text += `\n\n📊 ${scheduleData.summary}`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `schedule-${currentMode}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  // ===== HELPERS =====
  function escapeHtml(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ===== AI CHAT INTEGRATION =====

  /**
   * Provide current schedule context for AI chat
   */
  window.getScheduleContext = function() {
    const parts = [];
    parts.push(`Mode: ${currentMode}`);

    // Current tasks list
    if (tasks.length > 0) {
      parts.push('DANH SÁCH CÔNG VIỆC (tasks):');
      tasks.forEach((t, i) => {
        const taskDays = normalizeTaskDays(t.days && t.days.length ? t.days : (t.day ? [t.day] : []));
        const fixedRange = (t.fixedStart && t.fixedEnd)
          ? `${t.fixedStart}-${t.fixedEnd}`
          : (t.fixedTime ? t.fixedTime : '');
        let line = `  ${i}. "${t.title}" — ${t.duration} phút`;
        if (t.priority) line += `, ưu tiên: ${t.priority}`;
        if (t.deadline) line += `, hạn: ${t.deadline}`;
        if (fixedRange) line += `, khung giờ cố định: ${fixedRange}`;
        if (t.timeNote) line += `, ghi chú giờ: ${t.timeNote}`;
        if (taskDays.length > 0) line += `, ngày trong tuần: ${taskDays.join(', ')}`;
        if (t.recurring) line += `, lặp: ${t.recurring}`;
        parts.push(line);
      });
    } else {
      parts.push('DANH SÁCH CÔNG VIỆC: (trống)');
    }

    // Current schedule data
    if (scheduleData) {
      if (currentMode === 'single' && scheduleData.schedule) {
        parts.push('LỊCH TRÌNH HIỆN TẠI (single day):');
        scheduleData.schedule.forEach((item, i) => {
          const done = item.done ? ' ✅' : '';
          parts.push(`  ${i}. ${item.time}${item.endTime ? '-' + item.endTime : ''} | ${item.title} [${item.type || 'task'}]${item.note ? ' (' + item.note + ')' : ''}${done}`);
        });
      } else if (currentMode === 'multi' && scheduleData.days) {
        parts.push('LỊCH TRÌNH NHIỀU NGÀY:');
        scheduleData.days.forEach(day => {
          parts.push(`  📅 ${day.date}:`);
          (day.schedule || []).forEach((item, i) => {
            const done = item.done ? ' ✅' : '';
            parts.push(`    ${i}. ${item.time}${item.endTime ? '-' + item.endTime : ''} | ${item.title} [${item.type || 'task'}]${done}`);
          });
        });
      } else if (currentMode === 'weekly' && scheduleData.weekly) {
        parts.push('THỜI KHÓA BIỂU TUẦN:');
        const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
        dayNames.forEach(day => {
          const items = scheduleData.weekly[day];
          if (items && items.length > 0) {
            parts.push(`  📅 ${day}:`);
            items.forEach((item, i) => {
              parts.push(`    ${i}. ${item.time}${item.endTime ? '-' + item.endTime : ''} | ${item.title} [${item.type || 'task'}]`);
            });
          }
        });
      }

      if (scheduleData.summary) parts.push('Tóm tắt: ' + scheduleData.summary);
    } else {
      parts.push('LỊCH TRÌNH: (chưa tạo — chưa nhấn "AI Lên lịch")');
    }

    // Preferences
    const wake = document.getElementById('sch-pref-wake')?.value || '07:00';
    const sleep = document.getElementById('sch-pref-sleep')?.value || '23:00';
    const focus = document.getElementById('sch-pref-focus')?.value || '8:00-12:00';
    const aiNote = document.getElementById('sch-pref-ai-note')?.value?.trim() || '';
    parts.push(`Tùy chỉnh: thức ${wake}, ngủ ${sleep}, giờ tập trung ${focus}`);
    if (aiNote) parts.push(`Ghi chú cho AI: ${aiNote}`);

    return parts.join('\n');
  };

  /**
   * Handle AI chat actions for schedule modifications
   */
  window.handleScheduleAIActions = function(actions) {
    if (!Array.isArray(actions)) return;

    let changed = false;
    const log = [];

    actions.forEach(action => {
      try {
      switch (action.type) {

        case 'schedule_add_task': {
          // Add task to the input task list
          const fixedStart = action.fixedStart || '';
          const fixedEnd = action.fixedEnd || '';
          const fixedTime = action.fixedTime || '';
          const fallbackStart = !fixedStart && fixedTime ? String(fixedTime).split('-')[0].trim() : '';
          const fallbackEnd = !fixedEnd && fixedTime && String(fixedTime).includes('-') ? String(fixedTime).split('-')[1].trim() : '';
          const actionDays = normalizeTaskDays(
            Array.isArray(action.days)
              ? action.days
              : (action.day ? [action.day] : RECURRING_DAY_MAP[action.recurring] || [])
          );
          const newTask = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
            title: action.title || 'Công việc mới',
            duration: action.duration || 30,
            priority: action.priority || '',
            deadline: action.deadline || '',
            fixedStart: fixedStart || fallbackStart,
            fixedEnd: fixedEnd || fallbackEnd,
            timeNote: action.timeNote || '',
            day: actionDays[0] || '',
            days: actionDays,
            recurring: action.recurring || ''
          };
          tasks.push(newTask);
          saveTasks();
          renderTasks();
          log.push('➕ Thêm công việc: ' + newTask.title);
          changed = true;
          break;
        }

        case 'schedule_remove_task': {
          // Remove task from input list by title match
          const title = (action.title || '').toLowerCase();
          const idx = tasks.findIndex(t => t.title.toLowerCase().includes(title));
          if (idx !== -1) {
            const removed = tasks[idx].title;
            tasks.splice(idx, 1);
            saveTasks();
            renderTasks();
            log.push('🗑️ Xoá công việc: ' + removed);
            changed = true;
          }
          break;
        }

        case 'schedule_insert': {
          // Insert item directly into current schedule
          if (!scheduleData) break;
          const newItem = {
            time: action.time || '12:00',
            endTime: action.endTime || '',
            title: action.title || 'Hoạt động mới',
            type: action.type_item || 'task',
            note: action.note || ''
          };

          if (currentMode === 'weekly' && scheduleData.weekly) {
            const dayKey = action.day || 'Thứ 2';
            if (!scheduleData.weekly[dayKey]) scheduleData.weekly[dayKey] = [];
            scheduleData.weekly[dayKey].push(newItem);
            scheduleData.weekly[dayKey].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
            renderWeeklyTimetable(scheduleData);
          } else if (currentMode === 'single' && scheduleData.schedule) {
            scheduleData.schedule.push(newItem);
            scheduleData.schedule.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
            renderSingleDay(scheduleData);
          } else if (currentMode === 'multi' && scheduleData.days) {
            const day = scheduleData.days[selectedMultiDay];
            if (day) {
              if (!day.schedule) day.schedule = [];
              day.schedule.push(newItem);
              day.schedule.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
              renderMultiDay(scheduleData);
            }
          }
          localStorage.setItem(SCHEDULE_KEY, JSON.stringify(scheduleData));
          log.push('📌 Chèn: ' + newItem.title + ' lúc ' + newItem.time);
          changed = true;
          break;
        }

        case 'schedule_edit': {
          // Edit item in current schedule by index
          if (!scheduleData) break;
          let targetArr = null;
          if (currentMode === 'weekly' && scheduleData.weekly) {
            const dayKey = action.day || 'Thứ 2';
            targetArr = scheduleData.weekly[dayKey];
          } else if (currentMode === 'single' && scheduleData.schedule) {
            targetArr = scheduleData.schedule;
          } else if (currentMode === 'multi' && scheduleData.days) {
            const day = scheduleData.days[selectedMultiDay];
            if (day) targetArr = day.schedule;
          }
          if (targetArr && action.index != null && targetArr[action.index]) {
            const changes = action.changes || {};
            Object.keys(changes).forEach(key => {
              targetArr[action.index][key] = changes[key];
            });
            targetArr.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
            localStorage.setItem(SCHEDULE_KEY, JSON.stringify(scheduleData));
            restoreView(scheduleData);
            log.push('✏️ Sửa mục #' + action.index);
            changed = true;
          }
          break;
        }

        case 'schedule_delete': {
          // Delete item from schedule by index
          if (!scheduleData) break;
          let arr = null;
          if (currentMode === 'weekly' && scheduleData.weekly) {
            const dayKey = action.day || 'Thứ 2';
            arr = scheduleData.weekly[dayKey];
          } else if (currentMode === 'single' && scheduleData.schedule) {
            arr = scheduleData.schedule;
          } else if (currentMode === 'multi' && scheduleData.days) {
            const day = scheduleData.days[selectedMultiDay];
            if (day) arr = day.schedule;
          }
          if (arr && action.index != null && arr[action.index]) {
            const delTitle = arr[action.index].title;
            arr.splice(action.index, 1);
            localStorage.setItem(SCHEDULE_KEY, JSON.stringify(scheduleData));
            restoreView(scheduleData);
            log.push('❌ Xoá: ' + delTitle);
            changed = true;
          }
          break;
        }

        case 'schedule_swap': {
          // Swap two items in schedule
          if (!scheduleData) break;
          let swapArr = null;
          if (currentMode === 'weekly' && scheduleData.weekly) {
            const dayKey = action.day || 'Thứ 2';
            swapArr = scheduleData.weekly[dayKey];
          } else if (currentMode === 'single' && scheduleData.schedule) {
            swapArr = scheduleData.schedule;
          } else if (currentMode === 'multi' && scheduleData.days) {
            const day = scheduleData.days[selectedMultiDay];
            if (day) swapArr = day.schedule;
          }
          if (swapArr && action.index1 != null && action.index2 != null &&
              swapArr[action.index1] && swapArr[action.index2]) {
            const temp = { ...swapArr[action.index1] };
            // Swap time but keep other content
            const time1 = swapArr[action.index1].time;
            const end1 = swapArr[action.index1].endTime;
            swapArr[action.index1] = { ...swapArr[action.index2], time: time1, endTime: end1 };
            swapArr[action.index2] = { ...temp, time: swapArr[action.index2].time, endTime: swapArr[action.index2].endTime };
            localStorage.setItem(SCHEDULE_KEY, JSON.stringify(scheduleData));
            restoreView(scheduleData);
            log.push('🔀 Hoán đổi mục #' + action.index1 + ' ↔ #' + action.index2);
            changed = true;
          }
          break;
        }

        case 'schedule_regenerate': {
          // Trigger a full regeneration
          generateAISchedule();
          log.push('🔄 Tạo lại lịch trình');
          changed = true;
          break;
        }
      }
      } catch(e) {
        console.error('Schedule AI action error:', e, action);
      }
    });

    if (changed) {
      showTipsSummary(scheduleData || {});
      // Show notification
      showScheduleNotification(log.length > 0 ? log.join(', ') : '✅ Đã cập nhật lịch trình');
    }
  };

  function showScheduleNotification(msg) {
    const existing = document.querySelector('.sch-notif');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'sch-notif';
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

})();
