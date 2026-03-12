(function() {
  'use strict';
  const $ = id => document.getElementById(id);
  let data = null;

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

      const card = $('db-schedule-card');
      const container = $('db-schedule-week');
      if (!card || !container) return;

      card.style.display = '';

      const dayNames = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
      const dayShort = ['T2','T3','T4','T5','T6','T7','CN'];
      const typeIcons = { task:'📋', break:'☕', meal:'🍽️', exercise:'🏃', free:'🎮' };
      const typeCls = { task:'dbs-task', break:'dbs-break', meal:'dbs-meal', exercise:'dbs-exercise', free:'dbs-free' };

      // Find current day (0=Mon … 6=Sun)
      const jsDay = new Date().getDay(); // 0=Sun
      const todayIdx = jsDay === 0 ? 6 : jsDay - 1;

      function resolveT(t) { return t ? t.split('|')[0].trim().toLowerCase() : 'task'; }

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
          items.forEach(it => {
            const t = resolveT(it.type);
            const cls = typeCls[t] || 'dbs-task';
            const icon = typeIcons[t] || '📌';
            html += `<div class="dbs-item ${cls}" title="${escapeHtml(it.title)}${it.note ? '\n' + escapeHtml(it.note) : ''}">`;
            html += `<span class="dbs-time">${it.time || ''}</span>`;
            html += `<span class="dbs-title">${icon} ${escapeHtml(it.title)}</span>`;
            html += '</div>';
          });
        }
        html += '</div></div>';
      });
      html += '</div>';
      container.innerHTML = html;
    } catch (e) {
      console.error('Schedule widget error:', e);
    }
  }

  // ─── Init ───
  loadDashboard();
  loadTimeline();
  loadGoals();
  renderScheduleWidget();

  // ==================== GOAL SETTING ====================
  const GOALS_KEY = 'taskflow_goals';

  function getGoals() {
    try { return JSON.parse(localStorage.getItem(GOALS_KEY) || '[]'); }
    catch { return []; }
  }
  function saveGoals(goals) {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
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
      }
    } else {
      $('goal-input-title').value = '';
      $('goal-input-module').value = 'general';
      $('goal-input-period').value = $('goal-period')?.value || 'weekly';
      $('goal-input-target').value = '';
      $('goal-input-current').value = '0';
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
    const target = parseInt($('goal-input-target')?.value) || 0;
    const current = parseInt($('goal-input-current')?.value) || 0;

    if (!title) return alert('Vui lòng nhập mục tiêu!');
    if (target <= 0) return alert('Giá trị mục tiêu phải > 0!');

    const goals = getGoals();
    const editId = $('goal-modal').dataset.editId;

    if (editId) {
      const idx = goals.findIndex(g => g.id === editId);
      if (idx >= 0) {
        goals[idx] = { ...goals[idx], title, module, period, target, current };
      }
    } else {
      goals.push({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        title, module, period, target, current,
        createdAt: new Date().toISOString()
      });
    }

    saveGoals(goals);
    closeGoalModal();
    renderGoals();
  };

  window.updateGoalProgress = function(id, delta) {
    const goals = getGoals();
    const goal = goals.find(g => g.id === id);
    if (goal) {
      goal.current = Math.max(0, goal.current + delta);
      saveGoals(goals);
      renderGoals();
    }
  };

  window.deleteGoal = function(id) {
    if (!confirm('Xóa mục tiêu này?')) return;
    const goals = getGoals().filter(g => g.id !== id);
    saveGoals(goals);
    renderGoals();
  };

  function loadGoals() {
    // Setup period filter
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
      const pct = Math.min(100, Math.round((g.current / g.target) * 100));
      const isComplete = pct >= 100;
      const barColor = isComplete ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 30 ? '#f59e0b' : '#ef4444';

      return `
        <div class="goal-item ${isComplete ? 'goal-done' : ''}">
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
              <div class="goal-bar-fill" style="width:${pct}%;background:${barColor}"></div>
            </div>
            <span class="goal-progress-text">${g.current}/${g.target} (${pct}%)</span>
          </div>
          ${isComplete ? '<div class="goal-complete-badge">✅ Hoàn thành!</div>' : ''}
        </div>
      `;
    }).join('');
  }
})();
