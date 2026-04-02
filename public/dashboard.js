(function() {
  'use strict';
  const $ = id => document.getElementById(id);
  const SCHEDULE_CHECK_KEY = 'dashboard_schedule_checks';
  const REMINDER_KEY = 'taskflow_smart_reminders';
  const SETTINGS_KEY = 'taskflow_settings';
  let data = null;
  let scheduleChecks = loadScheduleChecks();
  let currentScheduleWidgetData = null;
  let habitSyncCache = { habits: null, logsByHabit: null, date: null };
  let reminderState = loadReminderState();
  let reminderTimer = null;
  let aiCoachState = { lastAt: 0, fingerprint: '', payload: null };

  function loadScheduleChecks() {
    try {
      return JSON.parse(localStorage.getItem(SCHEDULE_CHECK_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function saveScheduleChecks() {
    localStorage.setItem(SCHEDULE_CHECK_KEY, JSON.stringify(scheduleChecks));
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

  function normalizeLinkText(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async function ensureHabitSyncCache() {
    const today = todayDateString();
    if (habitSyncCache.habits && habitSyncCache.logsByHabit && habitSyncCache.date === today) {
      return habitSyncCache;
    }

    const [habitsRes, logsRes] = await Promise.all([
      fetch('/api/habits'),
      fetch(`/api/habits/logs?start=${today}&end=${today}`)
    ]);
    const habits = await habitsRes.json();
    const logsByHabit = await logsRes.json();
    habitSyncCache = { habits, logsByHabit, date: today };
    return habitSyncCache;
  }

  function resolveLinkedHabitByTitle(title, habits) {
    const normalizedTitle = normalizeLinkText(title);
    if (!normalizedTitle) return null;

    const scored = habits.map(h => {
      const habitName = normalizeLinkText(h.name);
      let score = 0;
      if (!habitName) return { habit: h, score };
      if (habitName === normalizedTitle) score = 100;
      else if (habitName.includes(normalizedTitle) || normalizedTitle.includes(habitName)) score = 70;
      else {
        const titleWords = new Set(normalizedTitle.split(' '));
        const habitWords = habitName.split(' ');
        const overlap = habitWords.filter(w => titleWords.has(w)).length;
        if (overlap > 0) score = overlap * 10;
      }
      return { habit: h, score };
    }).filter(x => x.score > 0);

    scored.sort((a, b) => b.score - a.score);
    return scored.length ? scored[0].habit : null;
  }

  async function syncScheduleCheckedToHabit(item) {
    try {
      if (!item || !item.title) return;
      const cache = await ensureHabitSyncCache();
      const linkedHabit = item.linkedHabitId
        ? (cache.habits || []).find(h => h.id === item.linkedHabitId)
        : resolveLinkedHabitByTitle(item.title, cache.habits || []);
      if (!linkedHabit) return;

      const today = cache.date;
      const doneDates = new Set(cache.logsByHabit?.[linkedHabit.id] || []);
      if (doneDates.has(today)) return;

      await fetch(`/api/habits/${linkedHabit.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today })
      });

      if (!cache.logsByHabit[linkedHabit.id]) cache.logsByHabit[linkedHabit.id] = [];
      if (!cache.logsByHabit[linkedHabit.id].includes(today)) cache.logsByHabit[linkedHabit.id].push(today);
      loadDashboard();
    } catch (err) {
      console.error('Schedule->Habit sync error:', err);
    }
  }

  // Theme is handled by global-utils.js

  // ─── Date ───
  const nd = $('nav-date');
  if (nd) nd.textContent = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });

  // ─── Load Dashboard Data ───
  async function loadDashboard() {
    try {
      const res = await fetch('/api/dashboard');
      data = await res.json();
      renderKPIs(data);
      renderTodoProgress(data.todos);
      renderHabitToday(data.habits);
      renderTrading(data.trades);
      renderEnglish(data.english, data.vocab);
      renderAICoach();
    } catch (e) { console.error('Dashboard load error:', e); }
  }

  function renderKPIs(d) {
    $('kpi-todo').textContent = d.todos.total;
    $('kpi-todo-sub').textContent = `${d.todos.done} hoàn thành · ${d.todos.overdue} quá hạn`;
    $('kpi-habit').textContent = d.habits.total;
    $('kpi-habit-sub').textContent = `${d.habits.todayDone}/${d.habits.todayTotal} hôm nay`;
    $('kpi-brain').textContent = d.notes.total;
    $('kpi-brain-sub').textContent = `${d.notes.pinned} ghim · ${d.notes.byType.link} link`;
    $('kpi-english').textContent = d.vocab.total;
    $('kpi-english-sub').textContent = `${d.vocab.mastered} đã thuộc`;
    $('kpi-trading').textContent = d.trades.total;
    $('kpi-trading-sub').textContent = `${d.trades.open} đang mở · WR ${d.trades.winRate}%`;
  }

  function renderTodoProgress(t) {
    const pct = t.completionRate || 0;
    const circ = 2 * Math.PI * 50;
    const ring = $('todo-ring');
    ring.style.strokeDasharray = circ;
    ring.style.strokeDashoffset = circ - (circ * pct / 100);
    $('todo-ring-text').textContent = pct + '%';
    $('todo-mini-stats').innerHTML = `
      <div class="db-mini-stat"><span class="num">${t.active}</span><span class="label">Đang làm</span></div>
      <div class="db-mini-stat"><span class="num">${t.done}</span><span class="label">Xong</span></div>
      <div class="db-mini-stat"><span class="num">${t.overdue}</span><span class="label">Quá hạn</span></div>
      <div class="db-mini-stat"><span class="num">${t.highPriority}</span><span class="label">Ưu tiên cao</span></div>`;
  }

  function renderHabitToday(h) {
    const pct = h.todayTotal ? Math.round(h.todayDone / h.todayTotal * 100) : 0;
    const circ = 2 * Math.PI * 50;
    const ring = $('habit-ring');
    ring.style.strokeDasharray = circ;
    ring.style.strokeDashoffset = circ - (circ * pct / 100);
    $('habit-ring-text').textContent = `${h.todayDone}/${h.todayTotal}`;
    $('habit-mini-stats').innerHTML = `
      <div class="db-mini-stat"><span class="num">${h.longestStreak}</span><span class="label">Streak dài nhất</span></div>
      <div class="db-mini-stat"><span class="num">${h.totalLogs}</span><span class="label">Tổng check-in</span></div>`;
  }

  function renderTrading(t) {
    const el = $('db-big-pnl');
    const pnl = t.totalPnl || 0;
    el.textContent = (pnl >= 0 ? '+' : '') + '$' + Math.abs(pnl).toFixed(2);
    el.className = 'db-big-pnl ' + (pnl >= 0 ? 'positive' : 'negative');
    $('trading-mini-stats').innerHTML = `
      <div class="db-mini-stat"><span class="num">${t.total}</span><span class="label">Tổng lệnh</span></div>
      <div class="db-mini-stat"><span class="num">${t.open}</span><span class="label">Đang mở</span></div>
      <div class="db-mini-stat"><span class="num">${t.winRate}%</span><span class="label">Win Rate</span></div>`;
  }

  function renderEnglish(eng, voc) {
    const bars = $('db-eng-bars');
    const items = [
      { label: 'Bài học', val: eng.lessonsCompleted, max: 12, color: 'var(--c-english)' },
      { label: 'Điểm TB', val: eng.avgScore, max: 100, color: '#3b82f6' },
      { label: 'Từ vựng', val: voc.total, max: Math.max(voc.total, 50), color: '#f59e0b' },
      { label: 'Đã thuộc', val: voc.mastered, max: Math.max(voc.total, 1), color: '#8b5cf6' },
    ];
    bars.innerHTML = items.map(i => {
      const h = Math.max(4, (i.val / i.max) * 70);
      return `<div class="db-eng-bar" style="height:${h}px;background:${i.color}"><span class="db-eng-bar-val">${i.val}</span><span class="db-eng-bar-label">${i.label}</span></div>`;
    }).join('');
    $('english-mini-stats').innerHTML = `
      <div class="db-mini-stat"><span class="num">${eng.lessonsCompleted}</span><span class="label">Bài đã học</span></div>
      <div class="db-mini-stat"><span class="num">${eng.avgScore}%</span><span class="label">Điểm TB</span></div>`;
  }

  // ─── Activity Timeline ───
  const MODULE_URLS = { todo: '/', brain: '/brain.html', english: '/english.html', trading: '/trading.html', habit: '/habit.html' };

  async function loadTimeline() {
    try {
      const res = await fetch('/api/dashboard/timeline?limit=25');
      const items = await res.json();
      const el = $('db-timeline');
      if (!items.length) { el.innerHTML = '<div class="db-timeline-empty">Chưa có hoạt động nào</div>'; return; }
      el.innerHTML = items.map(i => `
        <a class="db-timeline-item db-tl-link" href="${MODULE_URLS[i.module] || '/'}">
          <div class="db-tl-icon">${i.icon}</div>
          <div class="db-tl-content">
            <div class="db-tl-title">${escapeHtml(i.title)}</div>
            <div class="db-tl-meta">${timeAgo(i.date)} · <span class="db-tl-badge ${i.module}">${i.module}</span></div>
          </div>
        </a>`).join('');
    } catch (e) { console.error('Timeline error:', e); }
  }
  $('btn-refresh-timeline').onclick = loadTimeline;

  // ─── Global Search ───
  let searchTimeout;
  function openSearch() { $('gs-overlay').style.display = 'flex'; $('gs-input').value = ''; $('gs-input').focus(); $('gs-results').innerHTML = '<div class="gs-empty">Nhập từ khóa để tìm kiếm...</div>'; }
  function closeSearch() { $('gs-overlay').style.display = 'none'; }

  $('btn-search-open').onclick = openSearch;
  $('gs-overlay').onclick = e => { if (e.target === $('gs-overlay')) closeSearch(); };
  $('gs-input').oninput = () => {
    clearTimeout(searchTimeout);
    const q = $('gs-input').value.trim();
    if (!q) { $('gs-results').innerHTML = '<div class="gs-empty">Nhập từ khóa để tìm kiếm...</div>'; return; }
    searchTimeout = setTimeout(async () => {
      try {
        const res = await fetch('/api/dashboard/search?q=' + encodeURIComponent(q));
        const results = await res.json();
        if (!results.length) { $('gs-results').innerHTML = '<div class="gs-empty">Không tìm thấy kết quả</div>'; return; }
        $('gs-results').innerHTML = results.map(r => `
          <a class="gs-result-item" href="${r.url}">
            <span class="gs-result-icon">${r.icon}</span>
            <div class="gs-result-info">
              <div class="gs-result-title">${escapeHtml(r.title)}</div>
              <div class="gs-result-sub">${escapeHtml(r.sub || '')}</div>
            </div>
            <span class="gs-result-type">${r.type}</span>
          </a>`).join('');
      } catch (e) { console.error('Search error:', e); }
    }, 250);
  };

  // ─── Backup / Restore ───
  $('btn-backup').onclick = async () => {
    try {
      const res = await fetch('/api/dashboard/backup');
      const d = await res.json();
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `taskflow-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (e) { alert('Lỗi sao lưu: ' + e.message); }
  };
  $('btn-restore').onclick = () => $('restore-file').click();
  $('restore-file').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!confirm('⚠️ Khôi phục sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại. Tiếp tục?')) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await fetch('/api/dashboard/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.success) { alert('✅ Khôi phục thành công!'); loadDashboard(); loadTimeline(); }
    } catch (err) { alert('Lỗi khôi phục: ' + err.message); }
  };

  // ─── Keyboard Shortcuts ───
  function openShortcuts() { $('ks-overlay').style.display = 'flex'; }
  function closeShortcuts() { $('ks-overlay').style.display = 'none'; }
  $('ks-close').onclick = closeShortcuts;
  $('ks-overlay').onclick = e => { if (e.target === $('ks-overlay')) closeShortcuts(); };

  // Keyboard shortcuts are handled by global-utils.js

  // ─── Helpers ───
  function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function timeAgo(d) {
    const sec = Math.floor((Date.now() - new Date(d)) / 1000);
    if (sec < 60) return 'Vừa xong';
    if (sec < 3600) return Math.floor(sec / 60) + ' phút trước';
    if (sec < 86400) return Math.floor(sec / 3600) + ' giờ trước';
    if (sec < 604800) return Math.floor(sec / 86400) + ' ngày trước';
    return new Date(d).toLocaleDateString('vi-VN');
  }

  // ─── Weekly Schedule Widget ───
  function renderScheduleWidget() {
    try {
      const raw = localStorage.getItem('schedule_data');
      if (!raw) return;
      const sd = JSON.parse(raw);
      if (!sd || sd._mode !== 'weekly' || !sd.weekly) return;
      currentScheduleWidgetData = sd;

      const card = $('db-schedule-card');
      const container = $('db-schedule-week');
      const progressEl = $('db-schedule-progress');
      if (!card || !container || !progressEl) return;

      card.style.display = '';

      const dayNames = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
      const dayShort = ['T2','T3','T4','T5','T6','T7','CN'];
      const typeIcons = { task:'📋', break:'☕', meal:'🍽️', exercise:'🏃', free:'🎮' };
      const typeCls = { task:'dbs-task', break:'dbs-break', meal:'dbs-meal', exercise:'dbs-exercise', free:'dbs-free' };

      // Find current day (0=Mon … 6=Sun)
      const jsDay = new Date().getDay(); // 0=Sun
      const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
      let totalItems = 0;
      let doneItems = 0;

      function resolveT(t) { return t ? t.split('|')[0].trim().toLowerCase() : 'task'; }
      function getItemId(day, item, idx) {
        return encodeURIComponent(`${day}|${item.time || ''}|${item.title || ''}|${idx}`);
      }

      let html = '<div class="dbs-cols">';
      dayNames.forEach((day, i) => {
        const items = sd.weekly[day] || [];
        const isToday = i === todayIdx;
        const isWeekend = i >= 5;
        html += `<div class="dbs-col ${isToday ? 'dbs-col-today' : ''} ${isWeekend ? 'dbs-col-we' : ''}">`;
        html += `<div class="dbs-col-hd ${isToday ? 'dbs-hd-today' : ''}">${dayShort[i]}</div>`;
        html += '<div class="dbs-col-bd">';
        if (!items.length) {
          html += '<div class="dbs-empty">—</div>';
        } else {
          items.forEach((it, idx) => {
            const t = resolveT(it.type);
            const cls = typeCls[t] || 'dbs-task';
            const icon = typeIcons[t] || '📌';
            const itemId = getItemId(day, it, idx);
            const checked = Boolean(scheduleChecks[itemId]);
            totalItems++;
            if (checked) doneItems++;
            html += `<div class="dbs-item ${cls} ${checked ? 'checked' : ''}" title="${escapeHtml(it.title)}${it.note ? '\n' + escapeHtml(it.note) : ''}">`;
            html += `<label class="dbs-check" title="Đánh dấu đã làm">`;
            html += `<input type="checkbox" class="dbs-check-input" data-item-id="${itemId}" data-day="${encodeURIComponent(day)}" data-idx="${idx}" ${checked ? 'checked' : ''}>`;
            html += '<span class="dbs-check-box"></span>';
            html += '</label>';
            html += `<span class="dbs-time">${it.time || ''}</span>`;
            html += `<span class="dbs-title">${icon} ${escapeHtml(it.title)}</span>`;
            html += '</div>';
          });
        }
        html += '</div></div>';
      });
      html += '</div>';
      container.innerHTML = html;

      const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;
      progressEl.innerHTML = `
        <div class="db-schedule-progress-top">
          <span>Đã làm <strong>${doneItems}/${totalItems}</strong></span>
          <span>${pct}%</span>
        </div>
        <div class="db-schedule-progress-bar"><span style="width:${pct}%"></span></div>
      `;

      renderReminderStatus();
      renderAICoach();
    } catch (e) {
      console.error('Schedule widget error:', e);
    }
  }

  $('db-schedule-week')?.addEventListener('change', (e) => {
    const input = e.target.closest('.dbs-check-input');
    if (!input) return;
    const id = input.dataset.itemId;
    if (!id) return;
    if (input.checked) scheduleChecks[id] = true;
    else delete scheduleChecks[id];
    saveScheduleChecks();

    if (input.checked && currentScheduleWidgetData?.weekly) {
      const day = decodeURIComponent(input.dataset.day || '');
      const idx = parseInt(input.dataset.idx || '-1', 10);
      const item = (currentScheduleWidgetData.weekly[day] || [])[idx];
      if (item) syncScheduleCheckedToHabit(item);
    }

    renderScheduleWidget();
  });

  // ==================== GOAL SETTING ====================
  const GOALS_KEY = 'taskflow_goals';

  function getGoals() {
    try { return JSON.parse(localStorage.getItem(GOALS_KEY) || '[]'); }
    catch { return []; }
  }

  function saveGoals(goals) {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  }

  function parseMilestonesText(text) {
    const lines = String(text || '').split('\n').map(x => x.trim()).filter(Boolean);
    return lines.map(line => {
      const [rawTitle, rawTarget, rawDeadline] = line.split(':');
      const title = String(rawTitle || '').trim();
      const target = Math.max(1, parseInt(String(rawTarget || '1').trim(), 10) || 1);
      const deadline = String(rawDeadline || '').trim();
      return {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title,
        target,
        current: 0,
        done: false,
        deadline
      };
    }).filter(m => m.title);
  }

  function serializeMilestones(milestones = []) {
    return milestones.map(m => `${m.title}:${m.target || 1}${m.deadline ? `:${m.deadline}` : ''}`).join('\n');
  }

  function getGoalProgress(goal) {
    if (Array.isArray(goal.milestones) && goal.milestones.length > 0) {
      const totalPct = goal.milestones.reduce((sum, m) => {
        const pct = m.done ? 100 : Math.min(100, Math.round(((m.current || 0) / (m.target || 1)) * 100));
        return sum + pct;
      }, 0);
      const pct = Math.round(totalPct / goal.milestones.length);
      const doneCount = goal.milestones.filter(m => m.done).length;
      return {
        pct,
        currentLabel: `${doneCount}/${goal.milestones.length} milestone`,
        complete: doneCount === goal.milestones.length
      };
    }

    const current = goal.current || 0;
    const target = goal.target || 1;
    const pct = Math.min(100, Math.round((current / target) * 100));
    return {
      pct,
      currentLabel: `${current}/${target}`,
      complete: pct >= 100
    };
  }

  function getGoalBarColor(pct) {
    if (pct >= 100) return '#10b981';
    if (pct >= 60) return '#3b82f6';
    if (pct >= 30) return '#f59e0b';
    return '#ef4444';
  }

  function renderGoalMilestones(goal) {
    if (!Array.isArray(goal.milestones) || goal.milestones.length === 0) return '';
    const today = todayDateString();
    return `<div class="goal-milestones">
      ${goal.milestones.map(m => `
        <div class="goal-ms-item ${m.done ? 'done' : ''} ${m.deadline && !m.done && m.deadline < today ? 'overdue' : ''}" draggable="true" ondragstart="onMilestoneDragStart('${goal.id}', '${m.id}')" ondragover="onMilestoneDragOver(event)" ondrop="onMilestoneDrop('${goal.id}', '${m.id}')">
          <input type="checkbox" ${m.done ? 'checked' : ''} onchange="toggleMilestoneDone('${goal.id}', '${m.id}', this.checked)">
          <span class="goal-ms-title">${escapeHtml(m.title)}</span>
          <span class="goal-ms-progress">${m.current || 0}/${m.target || 1}${m.deadline ? ` • ⏰ ${escapeHtml(m.deadline)}` : ''}${m.deadline && !m.done && m.deadline < today ? ' • Quá hạn' : ''}</span>
          <span class="goal-ms-actions">
            <button class="goal-ms-btn" onclick="updateMilestoneProgress('${goal.id}', '${m.id}', 1)">＋</button>
            <button class="goal-ms-btn" onclick="updateMilestoneProgress('${goal.id}', '${m.id}', -1)">－</button>
          </span>
        </div>
      `).join('')}
    </div>`;
  }

  window.openGoalModal = function(editId) {
    $('goal-modal').style.display = 'flex';
    $('goal-modal-title').textContent = editId ? '✏️ Sửa mục tiêu' : '🎯 Thêm mục tiêu';
    $('goal-modal').dataset.editId = editId || '';
    if (editId) {
      const goal = getGoals().find(g => g.id === editId);
      if (goal) {
        $('goal-input-title').value = goal.title;
        $('goal-input-module').value = goal.module;
        $('goal-input-period').value = goal.period;
        $('goal-input-target').value = goal.target;
        $('goal-input-current').value = goal.current;
        $('goal-input-milestones').value = serializeMilestones(goal.milestones || []);
      }
    } else {
      $('goal-input-title').value = '';
      $('goal-input-module').value = 'general';
      $('goal-input-period').value = $('goal-period')?.value || 'weekly';
      $('goal-input-target').value = '';
      $('goal-input-current').value = '0';
      $('goal-input-milestones').value = '';
    }
    $('goal-input-title').focus();
  };

  window.closeGoalModal = function() {
    $('goal-modal').style.display = 'none';
  };

  window.saveGoal = function() {
    const title = $('goal-input-title')?.value?.trim();
    const module = $('goal-input-module')?.value || 'general';
    const period = $('goal-input-period')?.value || 'weekly';
    const target = parseInt($('goal-input-target')?.value, 10) || 0;
    const current = parseInt($('goal-input-current')?.value, 10) || 0;
    const milestonesText = $('goal-input-milestones')?.value || '';
    const parsedMilestones = parseMilestonesText(milestonesText);

    if (!title) return alert('Vui lòng nhập mục tiêu!');
    if (target <= 0) return alert('Giá trị mục tiêu phải > 0!');

    const goals = getGoals();
    const editId = $('goal-modal').dataset.editId;

    if (editId) {
      const idx = goals.findIndex(g => g.id === editId);
      if (idx >= 0) {
        goals[idx] = {
          ...goals[idx],
          title,
          module,
          period,
          target,
          current,
          milestones: parsedMilestones
        };
      }
    } else {
      goals.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        title,
        module,
        period,
        target,
        current,
        milestones: parsedMilestones,
        createdAt: new Date().toISOString()
      });
    }

    saveGoals(goals);
    closeGoalModal();
    renderGoals();
    renderAICoach();
  };

  window.updateGoalProgress = function(id, delta) {
    const goals = getGoals();
    const goal = goals.find(g => g.id === id);
    if (goal) {
      goal.current = Math.max(0, (goal.current || 0) + delta);
      saveGoals(goals);
      renderGoals();
      renderAICoach();
    }
  };

  window.toggleMilestoneDone = function(goalId, milestoneId, done) {
    const goals = getGoals();
    const goal = goals.find(g => g.id === goalId);
    if (!goal || !Array.isArray(goal.milestones)) return;
    const ms = goal.milestones.find(m => m.id === milestoneId);
    if (!ms) return;
    ms.done = !!done;
    if (ms.done) ms.current = ms.target || 1;
    saveGoals(goals);
    renderGoals();
    renderAICoach();
  };

  window.updateMilestoneProgress = function(goalId, milestoneId, delta) {
    const goals = getGoals();
    const goal = goals.find(g => g.id === goalId);
    if (!goal || !Array.isArray(goal.milestones)) return;
    const ms = goal.milestones.find(m => m.id === milestoneId);
    if (!ms) return;
    ms.current = Math.max(0, (ms.current || 0) + delta);
    ms.done = ms.current >= (ms.target || 1);
    saveGoals(goals);
    renderGoals();
    renderAICoach();
  };

  let draggedMilestone = null;

  window.onMilestoneDragStart = function(goalId, milestoneId) {
    draggedMilestone = { goalId, milestoneId };
  };

  window.onMilestoneDragOver = function(event) {
    event.preventDefault();
  };

  window.onMilestoneDrop = function(goalId, targetMilestoneId) {
    if (!draggedMilestone || draggedMilestone.goalId !== goalId) return;
    const goals = getGoals();
    const goal = goals.find(g => g.id === goalId);
    if (!goal || !Array.isArray(goal.milestones)) return;

    const fromIdx = goal.milestones.findIndex(m => m.id === draggedMilestone.milestoneId);
    const toIdx = goal.milestones.findIndex(m => m.id === targetMilestoneId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;

    const [moved] = goal.milestones.splice(fromIdx, 1);
    goal.milestones.splice(toIdx, 0, moved);
    saveGoals(goals);
    renderGoals();
    renderAICoach();
  };

  window.deleteGoal = function(id) {
    if (!confirm('Xóa mục tiêu này?')) return;
    const goals = getGoals().filter(g => g.id !== id);
    saveGoals(goals);
    renderGoals();
    renderAICoach();
  };

  function loadGoals() {
    $('goal-period')?.addEventListener('change', renderGoals);
    renderGoals();
  }

  function renderGoals() {
    const container = $('goal-list');
    if (!container) return;

    const period = $('goal-period')?.value || 'weekly';
    const goals = getGoals().filter(g => g.period === period);

    if (goals.length === 0) {
      container.innerHTML = '<div class="goal-empty">Chưa có mục tiêu nào cho giai đoạn này.</div>';
      return;
    }

    const moduleIcons = { general: '🌐', todo: '📝', habit: '🔥', brain: '🧠', english: '📚', trading: '📈' };
    const moduleNames = { general: 'Chung', todo: 'Công việc', habit: 'Thói quen', brain: 'Ghi chú', english: 'Tiếng Anh', trading: 'Trading' };

    container.innerHTML = goals.map(g => {
      const progress = getGoalProgress(g);
      const barColor = getGoalBarColor(progress.pct);
      const overdueCount = Array.isArray(g.milestones)
        ? g.milestones.filter(m => m.deadline && !m.done && m.deadline < todayDateString()).length
        : 0;
      return `
        <div class="goal-item ${progress.complete ? 'goal-done' : ''}">
          <div class="goal-item-top">
            <span class="goal-module-badge">${moduleIcons[g.module] || '🌐'} ${moduleNames[g.module] || g.module}</span>
            <div class="goal-item-actions">
              <button class="goal-act-btn" onclick="updateGoalProgress('${g.id}', 1)" title="+1">＋</button>
              <button class="goal-act-btn" onclick="updateGoalProgress('${g.id}', -1)" title="-1">－</button>
              <button class="goal-act-btn" onclick="openGoalModal('${g.id}')" title="Sửa">✏️</button>
              <button class="goal-act-btn goal-act-del" onclick="deleteGoal('${g.id}')" title="Xóa">🗑️</button>
            </div>
          </div>
          <div class="goal-title">${escapeHtml(g.title)}</div>
          <div class="goal-progress-wrap">
            <div class="goal-bar">
              <div class="goal-bar-fill" style="width:${progress.pct}%;background:${barColor}"></div>
            </div>
            <span class="goal-progress-text">${progress.currentLabel} (${progress.pct}%)</span>
          </div>
          ${overdueCount > 0 ? `<div class="goal-overdue-note">⚠️ ${overdueCount} milestone quá hạn</div>` : ''}
          ${renderGoalMilestones(g)}
          ${progress.complete ? '<div class="goal-complete-badge">✅ Hoàn thành!</div>' : ''}
        </div>
      `;
    }).join('');
  }

  // ==================== AI COACH ====================
  function countWeeklyScheduleStats() {
    if (!currentScheduleWidgetData?.weekly) return { total: 0, done: 0 };
    let total = 0;
    let done = 0;
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    dayNames.forEach(day => {
      const arr = currentScheduleWidgetData.weekly[day] || [];
      arr.forEach((item, idx) => {
        total += 1;
        const id = encodeURIComponent(`${day}|${item.time || ''}|${item.title || ''}|${idx}`);
        if (scheduleChecks[id]) done += 1;
      });
    });
    return { total, done };
  }

  async function fetchAICoachFromLLM(snapshot) {
    const prompt = [
      'Bạn là AI Coach năng suất cho người dùng TaskFlow.',
      'Hãy trả về JSON hợp lệ theo schema: {"summary":"...", "actions":["...","..."]}.',
      'Giới hạn: summary <= 220 ký tự, actions gồm 3-5 gợi ý cụ thể, ngắn gọn.',
      'Ngữ cảnh dữ liệu:',
      JSON.stringify(snapshot)
    ].join('\n');

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        page: 'dashboard',
        context: snapshot,
        sessionId: 'dashboard-coach'
      })
    });
    const dataRes = await res.json();
    const raw = String(dataRes?.reply || '').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI response is not JSON');
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed || typeof parsed.summary !== 'string' || !Array.isArray(parsed.actions)) {
      throw new Error('AI response schema mismatch');
    }
    return {
      summary: parsed.summary,
      actions: parsed.actions.filter(Boolean).slice(0, 5)
    };
  }

  function buildCoachFallback(snapshot) {
    const { todoPct, habitPct, schedulePct, goalPct } = snapshot;
    const summary = `Hôm nay bạn hoàn thành ${todoPct}% task, ${habitPct}% habit và ${schedulePct}% lịch tuần. Tỉ lệ goal hoàn tất hiện ở ${goalPct}%.`;
    const actions = [];
    if (habitPct < 60) actions.push('Ưu tiên 2 habit quan trọng nhất vào khung giờ đầu ngày mai để lấy đà.');
    if (todoPct < 50) actions.push('Giảm số việc ưu tiên cao xuống còn tối đa 3 việc để tránh quá tải.');
    if (schedulePct < 50) actions.push('Đánh dấu các mục đã làm trong thời khóa biểu để AI gợi ý chính xác hơn.');
    if (goalPct < 40) actions.push('Tách mỗi goal thành milestone nhỏ hơn (1-2 ngày) để tăng tốc độ hoàn thành.');
    if (actions.length === 0) actions.push('Tiến độ đang tốt, hãy giữ nhịp hiện tại và tăng nhẹ độ khó cho 1 mục tiêu tuần.');
    return { summary, actions };
  }

  async function renderAICoach(force = false) {
    const box = $('db-ai-coach');
    if (!box) return;
    if (!data) {
      box.innerHTML = '<div class="db-timeline-empty">Chưa có dữ liệu để phân tích.</div>';
      return;
    }

    const schedule = countWeeklyScheduleStats();
    const habitPct = data.habits.todayTotal ? Math.round((data.habits.todayDone / data.habits.todayTotal) * 100) : 0;
    const todoPct = data.todos.completionRate || 0;
    const goalItems = getGoals();
    const doneGoals = goalItems.filter(g => getGoalProgress(g).complete).length;
    const goalPct = goalItems.length ? Math.round((doneGoals / goalItems.length) * 100) : 0;
    const schedulePct = schedule.total ? Math.round((schedule.done / schedule.total) * 100) : 0;

    const snapshot = { todoPct, habitPct, schedulePct, goalPct, goals: goalItems.length };
    const fingerprint = JSON.stringify(snapshot);
    const now = Date.now();

    if (!force && aiCoachState.payload && aiCoachState.fingerprint === fingerprint && (now - aiCoachState.lastAt) < 180000) {
      const cached = aiCoachState.payload;
      box.innerHTML = `
        <div class="db-ai-summary">${escapeHtml(cached.summary)}</div>
        <div class="db-ai-list">${cached.actions.map(t => `<div class="db-ai-item">• ${escapeHtml(t)}</div>`).join('')}</div>
      `;
      return;
    }

    box.innerHTML = '<div class="db-timeline-empty">AI đang phân tích dữ liệu mới...</div>';

    let payload;
    try {
      payload = await fetchAICoachFromLLM(snapshot);
    } catch (err) {
      console.warn('AI Coach fallback:', err);
      payload = buildCoachFallback(snapshot);
    }

    aiCoachState = { lastAt: now, fingerprint, payload };
    box.innerHTML = `
      <div class="db-ai-summary">${escapeHtml(payload.summary)}</div>
      <div class="db-ai-list">${payload.actions.map(t => `<div class="db-ai-item">• ${escapeHtml(t)}</div>`).join('')}</div>
    `;
  }

  // ==================== SMART REMINDER ====================
  function getTodayWeekdayLabel() {
    const jsDay = new Date().getDay();
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return dayNames[jsDay];
  }

  function getTodayWeeklyItems() {
    if (!currentScheduleWidgetData?.weekly) return [];
    const day = getTodayWeekdayLabel();
    const items = currentScheduleWidgetData.weekly[day] || [];
    return items.map((item, idx) => ({ ...item, __day: day, __idx: idx }));
  }

  function buildReminderEventId(item) {
    const date = todayDateString();
    return `${date}|${item.__day}|${item.time || ''}|${item.title || ''}`;
  }

  function minutesFromHHMM(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  function markScheduleDone(item) {
    if (!item || !item.__day) return;
    const id = encodeURIComponent(`${item.__day}|${item.time || ''}|${item.title || ''}|${item.__idx}`);
    scheduleChecks[id] = true;
    saveScheduleChecks();
    renderScheduleWidget();
    syncScheduleCheckedToHabit(item);
  }

  function showReminderToast(item, eventId) {
    const old = document.getElementById('db-reminder-toast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.id = 'db-reminder-toast';
    toast.className = 'db-reminder-toast';
    toast.innerHTML = `
      <div class="db-reminder-toast-title">🔔 Đến giờ: ${escapeHtml(item.title || 'Hoạt động')}</div>
      <div class="db-reminder-toast-msg">Khung giờ ${escapeHtml(item.time || '--:--')} • ${escapeHtml(item.__day || '')}</div>
      <div class="db-reminder-toast-actions">
        <button class="db-btn-sm" data-sz="10">Hoãn 10p</button>
        <button class="db-btn-sm" data-sz="30">Hoãn 30p</button>
        <button class="db-btn-sm" data-sz="60">Hoãn 60p</button>
        <button class="db-btn-sm" id="db-reminder-done">Đã làm</button>
      </div>
    `;

    toast.addEventListener('click', (e) => {
      const snoozeBtn = e.target.closest('[data-sz]');
      if (snoozeBtn) {
        const mins = Number(snoozeBtn.dataset.sz || 10);
        reminderState.snoozed[eventId] = Date.now() + mins * 60 * 1000;
        delete reminderState.fired[eventId];
        saveReminderState();
        toast.remove();
        renderReminderStatus();
      }

      if (e.target.id === 'db-reminder-done') {
        markScheduleDone(item);
        reminderState.fired[eventId] = todayDateString();
        delete reminderState.snoozed[eventId];
        saveReminderState();
        toast.remove();
        renderReminderStatus();
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
        body: `${item.time || '--:--'} • ${item.__day || ''}`,
        icon: '/assets/icon.png'
      });
    }
  }

  async function checkSmartReminders() {
    const settings = getAppSettings();
    if (settings.notifSchedule === false) return;
    if (!reminderState.enabled) return;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const today = todayDateString();
    const items = getTodayWeeklyItems();

    for (const item of items) {
      const dueMinutes = minutesFromHHMM(item.time);
      if (dueMinutes === null) continue;
      const eventId = buildReminderEventId(item);
      const snoozedUntil = reminderState.snoozed[eventId] || 0;
      if (snoozedUntil > Date.now()) continue;
      if (reminderState.fired[eventId] === today) continue;

      const lag = nowMinutes - dueMinutes;
      if (lag >= 0 && lag <= 15) {
        reminderState.fired[eventId] = today;
        saveReminderState();
        showReminderToast(item, eventId);
        maybeBrowserNotify(item);
      }
    }
  }

  function renderReminderStatus() {
    const statusEl = $('db-reminder-status');
    const upEl = $('db-reminder-upcoming');
    const btn = $('btn-reminder-toggle');
    if (!statusEl || !upEl || !btn) return;

    const settings = getAppSettings();
    const blockedBySettings = settings.notifSchedule === false;

    if (blockedBySettings) {
      btn.textContent = 'Bật trong Cài đặt';
      statusEl.textContent = 'Nhắc việc đang bị tắt trong Cài đặt > Thông báo';
      upEl.innerHTML = '<div class="db-reminder-item">Bật Nhắc nhở deadline trong trang Cài đặt để sử dụng.</div>';
      return;
    }

    btn.textContent = reminderState.enabled ? 'Tắt nhắc việc' : 'Bật nhắc việc';
    statusEl.textContent = reminderState.enabled ? 'Nhắc việc đang bật và theo dõi lịch hôm nay' : 'Nhắc việc đang tắt';

    const todayItems = getTodayWeeklyItems()
      .filter(i => i.time)
      .sort((a, b) => String(a.time).localeCompare(String(b.time)))
      .slice(0, 5);

    if (todayItems.length === 0) {
      upEl.innerHTML = '<div class="db-reminder-item">Hôm nay chưa có mục lịch để nhắc.</div>';
      return;
    }

    upEl.innerHTML = todayItems.map(i => {
      const eventId = buildReminderEventId(i);
      const snooze = reminderState.snoozed[eventId];
      const extra = snooze && snooze > Date.now() ? ` • đang hoãn đến ${new Date(snooze).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : '';
      return `<div class="db-reminder-item"><strong>${escapeHtml(i.time)}</strong> • ${escapeHtml(i.title || '')}${extra}</div>`;
    }).join('');
  }

  function initSmartReminders() {
    const btn = $('btn-reminder-toggle');
    if (!btn) return;

    const settings = getAppSettings();
    if (settings.notifSchedule === true && !reminderState.enabled) {
      reminderState.enabled = true;
      saveReminderState();
    }

    btn.addEventListener('click', async () => {
      reminderState.enabled = !reminderState.enabled;
      saveReminderState();
      if (reminderState.enabled && 'Notification' in window && Notification.permission === 'default') {
        try { await Notification.requestPermission(); } catch { /* ignore */ }
      }
      renderReminderStatus();
    });

    if (reminderTimer) clearInterval(reminderTimer);
    reminderTimer = setInterval(checkSmartReminders, 30 * 1000);
    checkSmartReminders();
    renderReminderStatus();
  }

  // ─── Init ───
  $('btn-ai-coach-refresh')?.addEventListener('click', () => renderAICoach(true));
  loadDashboard();
  loadTimeline();
  loadGoals();
  renderScheduleWidget();
  initSmartReminders();
})();
