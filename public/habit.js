const API = '/api/habits';

// ==================== STATE ====================
let habits = [];
let logs = {};   // { habitId: ['2026-03-01', ...] }
let weekOffset = 0; // 0 = current week
let editingHabitId = null;

// ==================== DATES ====================
function getToday() {
  return formatDate(new Date());
}

function formatDate(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function getWeekDates(offset = 0) {
  const today = new Date();
  const start = new Date(today);
  // Go to Monday of current week
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff + (offset * 7));

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push({
      date: formatDate(d),
      dayName: d.toLocaleDateString('vi-VN', { weekday: 'short' }),
      dayNum: d.getDate(),
      month: d.getMonth() + 1,
      isToday: formatDate(d) === getToday(),
      isFuture: d > new Date()
    });
  }
  return dates;
}

function getWeekLabel(dates) {
  if (!dates.length) return '';
  const s = dates[0];
  const e = dates[dates.length - 1];
  return `${s.dayNum}/${s.month} — ${e.dayNum}/${e.month}`;
}

// Theme is handled by global-utils.js

// ==================== NAV DATE ====================
function setNavDate() {
  const d = new Date();
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const el = document.getElementById('nav-date');
  if (el) el.textContent = d.toLocaleDateString('vi-VN', options);
}
setNavDate();

// ==================== API ====================
const _toast = (msg, type) => window.globalUtils?.guToast?.(msg, type);

async function fetchHabits() {
  try {
    const res = await fetch(API);
    habits = await res.json();
  } catch (e) { _toast('Lỗi tải thói quen', 'error'); console.error(e); }
}

async function fetchLogs(dates) {
  if (!dates.length) return;
  try {
    const start = dates[0].date;
    const end = dates[dates.length - 1].date;
    const res = await fetch(`${API}/logs?start=${start}&end=${end}`);
    logs = await res.json();
  } catch (e) { _toast('Lỗi tải nhật ký', 'error'); console.error(e); }
}

async function toggleHabitLog(habitId, date) {
  try {
    const res = await fetch(`${API}/${habitId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date })
    });
    return res.json();
  } catch (e) { _toast('Lỗi cập nhật', 'error'); console.error(e); }
}

async function createHabit(data) {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    _toast('Đã tạo thói quen', 'success');
    return res.json();
  } catch (e) { _toast('Lỗi tạo thói quen', 'error'); console.error(e); }
}

async function updateHabit(id, data) {
  try {
    const res = await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    _toast('Đã cập nhật', 'success');
    return res.json();
  } catch (e) { _toast('Lỗi cập nhật', 'error'); console.error(e); }
}

async function deleteHabit(id) {
  try {
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    _toast('Đã xóa thói quen', 'success');
  } catch (e) { _toast('Lỗi xóa', 'error'); console.error(e); }
}

async function fetchStats() {
  try {
    const res = await fetch(`${API}/stats`);
    return res.json();
  } catch (e) { _toast('Lỗi tải thống kê', 'error'); console.error(e); }
}

// ==================== RENDER ====================
function render() {
  const dates = getWeekDates(weekOffset);
  const subtitle = document.getElementById('ht-subtitle');
  if (subtitle) subtitle.textContent = `Tuần ${getWeekLabel(dates)}`;

  renderTable(dates);
  renderStreaks(dates);
}

function renderTable(dates) {
  const thead = document.getElementById('ht-thead');
  const tbody = document.getElementById('ht-tbody');
  const empty = document.getElementById('ht-empty');

  if (habits.length === 0) {
    thead.innerHTML = '';
    tbody.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  // Header: Progress | Habit name | Day1 | Day2 | ... | Day7
  let headHtml = `<tr>
    <th class="ht-th-progress">Tiến độ</th>
    <th class="ht-th-habit">Thói quen</th>`;
  dates.forEach(d => {
    headHtml += `<th class="ht-th-day ${d.isToday ? 'ht-today' : ''} ${d.isFuture ? 'ht-future' : ''}">
      <span class="ht-day-name">${d.dayName}</span>
      <span class="ht-day-num">${d.dayNum}</span>
    </th>`;
  });
  headHtml += `</tr>`;
  thead.innerHTML = headHtml;

  // Rows
  let bodyHtml = '';
  habits.forEach(habit => {
    const habitLogs = logs[habit.id] || [];
    const logsSet = new Set(habitLogs);

    // Count checked in this week
    const weekDone = dates.filter(d => logsSet.has(d.date)).length;
    const weekTotal = dates.filter(d => !d.isFuture).length || 1;
    const pct = Math.round((weekDone / 7) * 100);

    bodyHtml += `<tr class="ht-row" data-id="${habit.id}" draggable="true">
      <td class="ht-td-progress">
        <div class="ht-td-progress-inner">
          <span class="ht-drag-handle" title="Kéo để sắp xếp">⋮⋮</span>
          <div class="ht-progress-bar">
            <div class="ht-progress-fill" style="width:${pct}%; background:${habit.color}"></div>
          </div>
          <span class="ht-progress-text">${weekDone}/7</span>
        </div>
      </td>
      <td class="ht-td-habit">
        <div class="ht-td-habit-inner">
          <span class="ht-habit-icon">${habit.icon}</span>
          <span class="ht-habit-name">${escapeHtml(habit.name)}</span>
          <button class="ht-habit-edit" onclick="openEditHabit('${habit.id}')" title="Sửa">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </div>
      </td>`;

    dates.forEach(d => {
      const checked = logsSet.has(d.date);
      const isFuture = d.isFuture;
      bodyHtml += `<td class="ht-td-check ${d.isToday ? 'ht-today' : ''} ${isFuture ? 'ht-future' : ''}">
        <button class="ht-check-btn ${checked ? 'checked' : ''}" 
          ${isFuture ? 'disabled' : ''}
          onclick="handleToggle('${habit.id}', '${d.date}', this)"
          style="${checked ? `background:${habit.color}; border-color:${habit.color}` : ''}">
          ${checked ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </button>
      </td>`;
    });

    bodyHtml += `</tr>`;
  });

  tbody.innerHTML = bodyHtml;
}

function renderStreaks(dates) {
  const container = document.getElementById('ht-streaks');
  if (!container || habits.length === 0) {
    if (container) container.innerHTML = '';
    return;
  }

  let html = '<div class="ht-streaks-title">🔥 Chuỗi ngày & Tổng quan tuần</div><div class="ht-streaks-grid">';

  habits.forEach(habit => {
    const habitLogs = logs[habit.id] || [];
    const logsSet = new Set(habitLogs);

    // Calculate current streak from today going back
    let streak = 0;
    const d = new Date();
    while (true) {
      const ds = formatDate(d);
      if (logsSet.has(ds)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        // Check if it's today and not yet done
        if (streak === 0 && ds === getToday()) {
          d.setDate(d.getDate() - 1);
          continue;
        }
        break;
      }
    }

    const weekDone = dates.filter(dd => logsSet.has(dd.date)).length;

    html += `
      <div class="ht-streak-card" style="--h-color: ${habit.color}">
        <div class="ht-streak-icon">${habit.icon}</div>
        <div class="ht-streak-info">
          <span class="ht-streak-name">${escapeHtml(habit.name)}</span>
          <span class="ht-streak-val">🔥 ${streak} ngày liên tiếp</span>
        </div>
        <div class="ht-streak-week">${weekDone}/7</div>
      </div>`;
  });

  html += '</div>';
  container.innerHTML = html;
}

// ==================== HANDLERS ====================

async function handleToggle(habitId, date, btn) {
  // Optimistic update
  const wasChecked = btn.classList.contains('checked');
  const habit = habits.find(h => h.id === habitId);
  const color = habit?.color || '#7c7268';

  if (wasChecked) {
    btn.classList.remove('checked');
    btn.innerHTML = '';
    btn.style.background = '';
    btn.style.borderColor = '';
  } else {
    btn.classList.add('checked');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
    btn.style.background = color;
    btn.style.borderColor = color;
  }

  const result = await toggleHabitLog(habitId, date);

  // Update logs cache
  if (!logs[habitId]) logs[habitId] = [];
  if (result.done) {
    if (!logs[habitId].includes(date)) logs[habitId].push(date);
  } else {
    logs[habitId] = logs[habitId].filter(d => d !== date);
  }

  // Re-render progress and streaks (not full table to prevent flicker)
  const dates = getWeekDates(weekOffset);
  renderStreaks(dates);
  updateRowProgress(habitId, dates);
}

function updateRowProgress(habitId, dates) {
  const row = document.querySelector(`.ht-row[data-id="${habitId}"]`);
  if (!row) return;
  const habitLogs = new Set(logs[habitId] || []);
  const weekDone = dates.filter(d => habitLogs.has(d.date)).length;
  const pct = Math.round((weekDone / 7) * 100);
  const habit = habits.find(h => h.id === habitId);

  const fill = row.querySelector('.ht-progress-fill');
  const text = row.querySelector('.ht-progress-text');
  if (fill) { fill.style.width = pct + '%'; fill.style.background = habit?.color || '#7c7268'; }
  if (text) text.textContent = `${weekDone}/7`;
}

// ==================== NAVIGATION ====================
document.getElementById('btn-prev')?.addEventListener('click', () => {
  weekOffset--;
  loadWeek();
});

document.getElementById('btn-next')?.addEventListener('click', () => {
  weekOffset++;
  loadWeek();
});

document.getElementById('btn-today')?.addEventListener('click', () => {
  weekOffset = 0;
  loadWeek();
});

async function loadWeek() {
  const dates = getWeekDates(weekOffset);
  await fetchLogs(dates);
  render();
}

// ==================== ADD HABIT MODAL ====================
const addModal = document.getElementById('add-habit-modal');
let selectedIcon = '✅';

document.getElementById('btn-add-habit')?.addEventListener('click', () => {
  addModal.style.display = 'flex';
  document.getElementById('habit-name').value = '';
  document.getElementById('habit-color').value = '#7c7268';
  selectedIcon = '✅';
  document.querySelectorAll('#icon-picker .ht-icon-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.icon === '✅');
  });
  setTimeout(() => document.getElementById('habit-name').focus(), 100);
});

document.getElementById('add-habit-close')?.addEventListener('click', () => {
  addModal.style.display = 'none';
});
addModal?.addEventListener('click', (e) => {
  if (e.target === addModal) addModal.style.display = 'none';
});

document.getElementById('icon-picker')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.ht-icon-opt');
  if (!btn) return;
  selectedIcon = btn.dataset.icon;
  document.querySelectorAll('#icon-picker .ht-icon-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
});

document.getElementById('btn-submit-habit')?.addEventListener('click', async () => {
  const name = document.getElementById('habit-name').value.trim();
  if (!name) return;
  const color = document.getElementById('habit-color').value;
  await createHabit({ name, icon: selectedIcon, color });
  addModal.style.display = 'none';
  await init();
});

document.getElementById('habit-name')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-submit-habit').click();
});

// ==================== EDIT HABIT MODAL ====================
const editModal = document.getElementById('edit-habit-modal');
let editIcon = '✅';

function openEditHabit(id) {
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  editingHabitId = id;
  editIcon = habit.icon;

  document.getElementById('edit-habit-name').value = habit.name;
  document.getElementById('edit-habit-color').value = habit.color;
  document.querySelectorAll('#edit-icon-picker .ht-icon-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.icon === habit.icon);
  });
  editModal.style.display = 'flex';
}

document.getElementById('edit-habit-close')?.addEventListener('click', () => {
  editModal.style.display = 'none';
});
editModal?.addEventListener('click', (e) => {
  if (e.target === editModal) editModal.style.display = 'none';
});

document.getElementById('edit-icon-picker')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.ht-icon-opt');
  if (!btn) return;
  editIcon = btn.dataset.icon;
  document.querySelectorAll('#edit-icon-picker .ht-icon-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
});

document.getElementById('btn-save-habit')?.addEventListener('click', async () => {
  if (!editingHabitId) return;
  const name = document.getElementById('edit-habit-name').value.trim();
  if (!name) return;
  const color = document.getElementById('edit-habit-color').value;
  await updateHabit(editingHabitId, { name, icon: editIcon, color });
  editModal.style.display = 'none';
  await init();
});

document.getElementById('btn-delete-habit')?.addEventListener('click', async () => {
  if (!editingHabitId) return;
  if (!confirm('Bạn có chắc muốn xóa thói quen này? Tất cả dữ liệu sẽ bị mất.')) return;
  await deleteHabit(editingHabitId);
  editModal.style.display = 'none';
  await init();
});

// ==================== REPORT MODAL ====================
const reportModal = document.getElementById('report-modal');

document.getElementById('btn-report')?.addEventListener('click', async () => {
  reportModal.style.display = 'flex';
  document.getElementById('report-body').innerHTML = '<div class="report-loading">Đang tải báo cáo...</div>';
  const stats = await fetchStats();
  renderReport(stats);
});

document.getElementById('report-close')?.addEventListener('click', () => {
  reportModal.style.display = 'none';
});
reportModal?.addEventListener('click', (e) => {
  if (e.target === reportModal) reportModal.style.display = 'none';
});

function renderReport(stats) {
  const body = document.getElementById('report-body');

  // Overall summary
  let html = `
    <div class="report-overview">
      <div class="report-card">
        <span class="report-num">${stats.overall.totalHabits}</span>
        <span class="report-label">Thói quen</span>
      </div>
      <div class="report-card">
        <span class="report-num">${stats.overall.overallRate}%</span>
        <span class="report-label">Tỷ lệ hoàn thành</span>
      </div>
      <div class="report-card">
        <span class="report-num">${stats.overall.totalDone}</span>
        <span class="report-label">Lượt hoàn thành</span>
      </div>
    </div>`;

  // Per-habit breakdown
  html += `<h4 class="report-section-title">Chi tiết theo thói quen</h4>
    <div class="report-habits">`;

  stats.habits.forEach(h => {
    html += `
      <div class="report-habit-row">
        <div class="report-habit-info">
          <span class="report-habit-icon">${h.icon}</span>
          <span class="report-habit-name">${escapeHtml(h.name)}</span>
        </div>
        <div class="report-habit-stats">
          <div class="report-stat">
            <span class="report-stat-val">${h.rate}%</span>
            <span class="report-stat-label">Tỷ lệ</span>
          </div>
          <div class="report-stat">
            <span class="report-stat-val">🔥${h.streak}</span>
            <span class="report-stat-label">Streak</span>
          </div>
          <div class="report-stat">
            <span class="report-stat-val">⭐${h.bestStreak}</span>
            <span class="report-stat-label">Best</span>
          </div>
          <div class="report-stat">
            <span class="report-stat-val">${h.completedDays}/30</span>
            <span class="report-stat-label">Ngày</span>
          </div>
        </div>
        <div class="report-habit-bar">
          <div class="report-habit-fill" style="width:${h.rate}%; background:${h.color}"></div>
        </div>
      </div>`;
  });
  html += `</div>`;

  // 30-day chart
  html += `<h4 class="report-section-title">Biểu đồ 30 ngày</h4>
    <div class="report-chart">`;

  const maxCount = Math.max(...stats.dailyData.map(d => d.count), 1);
  stats.dailyData.forEach((d, i) => {
    const h = (d.count / maxCount) * 60;
    const isToday = d.date === getToday();
    html += `<div class="report-chart-col ${isToday ? 'report-today' : ''}" title="${d.date}: ${d.count}/${d.total}">
      <div class="report-chart-bar" style="height:${Math.max(h, 3)}px"></div>
      ${i % 5 === 0 ? `<span class="report-chart-label">${d.date.slice(5)}</span>` : ''}
    </div>`;
  });
  html += `</div>`;

  body.innerHTML = html;
}

// ==================== HELPERS ====================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== HEATMAP ====================
async function loadHeatmap() {
  const select = document.getElementById('heatmap-habit-select');
  if (!select) return;
  select.innerHTML = '<option value="all">Tất cả thói quen</option>' +
    habits.map(h => `<option value="${h.id}">${h.icon} ${escapeHtml(h.name)}</option>`).join('');
  select.onchange = () => renderHeatmap(select.value);
  renderHeatmap('all');
}

async function renderHeatmap(habitFilter) {
  const el = document.getElementById('ht-heatmap');
  if (!el) return;

  // Get all logs for last 365 days
  const dates = [];
  const d = new Date(); d.setDate(d.getDate() - 364);
  for (let i = 0; i < 365; i++) {
    dates.push(new Date(d).toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }

  try {
    const ds = dates[0]; const de = dates[dates.length - 1];
    const res = await fetch(`/api/habits/logs?start=${ds}&end=${de}`);
    const allLogs = await res.json();

    // Count per date
    const countMap = {};
    allLogs.forEach(l => {
      if (l.done && (habitFilter === 'all' || l.habitId === habitFilter)) {
        countMap[l.date] = (countMap[l.date] || 0) + 1;
      }
    });

    const maxCount = Math.max(1, ...Object.values(countMap));
    const getLevel = c => { if (!c) return 0; const r = c / maxCount; if (r <= 0.25) return 1; if (r <= 0.5) return 2; if (r <= 0.75) return 3; return 4; };
    const colors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
    const darkColors = ['#2d333b', '#0e4429', '#006d32', '#26a641', '#39d353'];
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // Build grid (52 weeks x 7 days)
    const startDate = new Date(dates[0]);
    const startDay = startDate.getDay(); // 0=Sun
    let html = '<div class="ht-heatmap-grid">';
    // Month labels
    html += '<div class="ht-hm-months">';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let lastMonth = -1;
    for (let w = 0; w < 53; w++) {
      const wd = new Date(startDate); wd.setDate(wd.getDate() + w * 7);
      const m = wd.getMonth();
      if (m !== lastMonth) { html += `<span style="grid-column:${w + 2}">${months[m]}</span>`; lastMonth = m; }
    }
    html += '</div>';

    // Day labels
    const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
    html += '<div class="ht-hm-days">';
    dayLabels.forEach(l => { html += `<span>${l}</span>`; });
    html += '</div>';

    // Cells
    html += '<div class="ht-hm-cells">';
    const cur = new Date(startDate);
    for (let w = 0; w < 53; w++) {
      for (let day = 0; day < 7; day++) {
        const ds = cur.toISOString().split('T')[0];
        const count = countMap[ds] || 0;
        const lv = getLevel(count);
        const col = isDark ? darkColors[lv] : colors[lv];
        html += `<div class="ht-hm-cell" style="background:${col}" title="${ds}: ${count} hoàn thành"></div>`;
        cur.setDate(cur.getDate() + 1);
      }
    }
    html += '</div></div>';
    el.innerHTML = html;
  } catch (e) { console.error('Heatmap error:', e); el.innerHTML = '<p>Lỗi tải heatmap</p>'; }
}

// ==================== MILESTONES ====================
function renderMilestones() {
  const el = document.getElementById('ht-milestones');
  if (!el) return;

  const milestones = [
    { days: 3,   icon: '🌱', name: 'Bắt đầu', desc: '3 ngày liên tiếp' },
    { days: 7,   icon: '⚡', name: '1 Tuần',   desc: '7 ngày liên tiếp' },
    { days: 14,  icon: '🔥', name: '2 Tuần',   desc: '14 ngày liên tiếp' },
    { days: 21,  icon: '💪', name: '3 Tuần',   desc: '21 ngày — thói quen mới!' },
    { days: 30,  icon: '🏅', name: '1 Tháng',  desc: '30 ngày liên tiếp' },
    { days: 60,  icon: '⭐', name: '2 Tháng',  desc: '60 ngày liên tiếp' },
    { days: 100, icon: '💯', name: '100 Ngày', desc: 'Trăm ngày bền bỉ!' },
    { days: 365, icon: '👑', name: '1 Năm',    desc: 'Trọn vẹn 1 năm!' }
  ];

  // Get max streak across all habits
  let allStreaks = [];
  habits.forEach(h => {
    const hLogs = [];
    for (const [hid, dates] of Object.entries(logs)) {
      if (hid === h.id) { dates.forEach(d => hLogs.push(d)); }
    }
    hLogs.sort().reverse();
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 400; i++) {
      const ds = d.toISOString().split('T')[0];
      if (hLogs.includes(ds)) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    allStreaks.push({ habit: h, streak });
  });

  const maxStreak = Math.max(0, ...allStreaks.map(s => s.streak));

  el.innerHTML = '<div class="ht-milestone-grid">' +
    milestones.map(m => {
      const achieved = maxStreak >= m.days;
      return `<div class="ht-milestone ${achieved ? 'achieved' : 'locked'}">
        <div class="ht-ms-icon">${achieved ? m.icon : '🔒'}</div>
        <div class="ht-ms-info">
          <span class="ht-ms-name">${m.name}</span>
          <span class="ht-ms-desc">${m.desc}</span>
        </div>
        ${achieved ? '<span class="ht-ms-check">✓</span>' : `<span class="ht-ms-progress">${maxStreak}/${m.days}</span>`}
      </div>`;
    }).join('') + '</div>';
}

// ==================== DRAG-DROP REORDER ====================
function getHabitOrder() {
  try {
    const raw = localStorage.getItem('habit_order');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveHabitOrder(ids) {
  localStorage.setItem('habit_order', JSON.stringify(ids));
}

function applyHabitOrder() {
  const order = getHabitOrder();
  if (!order || !order.length) return;
  const idxMap = {};
  order.forEach((id, i) => idxMap[id] = i);
  habits.sort((a, b) => {
    const ia = idxMap[a.id ?? a._id] ?? 999;
    const ib = idxMap[b.id ?? b._id] ?? 999;
    return ia - ib;
  });
}

function initDragDrop() {
  const tbody = document.querySelector('.ht-table tbody');
  if (!tbody) return;

  let dragRow = null;

  tbody.addEventListener('dragstart', e => {
    const row = e.target.closest('tr.ht-row');
    if (!row) return;
    dragRow = row;
    row.classList.add('ht-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', row.dataset.id);
  });

  tbody.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const row = e.target.closest('tr.ht-row');
    if (!row || row === dragRow) return;

    const rect = row.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      row.classList.add('ht-drop-above');
      row.classList.remove('ht-drop-below');
    } else {
      row.classList.add('ht-drop-below');
      row.classList.remove('ht-drop-above');
    }
  });

  tbody.addEventListener('dragleave', e => {
    const row = e.target.closest('tr.ht-row');
    if (row) {
      row.classList.remove('ht-drop-above', 'ht-drop-below');
    }
  });

  tbody.addEventListener('drop', e => {
    e.preventDefault();
    const targetRow = e.target.closest('tr.ht-row');
    if (!targetRow || !dragRow || targetRow === dragRow) return;

    const rect = targetRow.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      targetRow.before(dragRow);
    } else {
      targetRow.after(dragRow);
    }

    // Save new order
    const rows = tbody.querySelectorAll('tr.ht-row');
    const newOrder = Array.from(rows).map(r => r.dataset.id);
    saveHabitOrder(newOrder);

    // Update habits array
    const idxMap = {};
    newOrder.forEach((id, i) => idxMap[id] = i);
    habits.sort((a, b) => {
      const ia = idxMap[a.id ?? a._id] ?? 999;
      const ib = idxMap[b.id ?? b._id] ?? 999;
      return ia - ib;
    });
  });

  tbody.addEventListener('dragend', () => {
    if (dragRow) dragRow.classList.remove('ht-dragging');
    dragRow = null;
    tbody.querySelectorAll('.ht-drop-above, .ht-drop-below').forEach(el => {
      el.classList.remove('ht-drop-above', 'ht-drop-below');
    });
  });
}

// ==================== INIT ====================
async function init() {
  await fetchHabits();
  applyHabitOrder();
  const dates = getWeekDates(weekOffset);
  await fetchLogs(dates);
  render();
  initDragDrop();
  loadHeatmap();
  renderMilestones();
}

init();
