// ==================== SCHEDULE.JS — Multi-day & Weekly ====================
(function() {
  'use strict';

  const TASKS_KEY = 'schedule_tasks';
  const SCHEDULE_KEY = 'schedule_data';
  let tasks = [];
  let scheduleData = null;
  let currentMode = 'single';  // single | multi | weekly
  let selectedMultiDay = 0;     // index for multi-day nav

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupDate();
    setDefaultStartDate();
    loadTasks();
    loadSavedSchedule();
    renderTasks();
    // Restore mode UI to match saved schedule
    if (scheduleData && scheduleData._mode && scheduleData._mode !== 'single') {
      switchMode(scheduleData._mode);
    }
    if (scheduleData) restoreView(scheduleData);
  }

  function setupDate() {
    const el = document.getElementById('nav-date');
    if (el) {
      const d = new Date();
      el.textContent = d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
    }
  }

  function setDefaultStartDate() {
    const el = document.getElementById('sch-start-date');
    if (el && !el.value) {
      const d = new Date();
      el.value = d.toISOString().split('T')[0];
    }
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
    const day = document.getElementById('sch-task-day')?.value || '';
    const recurring = document.getElementById('sch-task-recurring')?.value || '';

    if (!title) return alert('Vui lòng nhập tên công việc!');

    tasks.push({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      title, duration, priority, deadline, day, recurring
    });
    saveTasks();
    renderTasks();

    document.getElementById('sch-task-title').value = '';
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
      if (t.day) badges.push(`<span class="sch-badge sch-badge-day">${escapeHtml(t.day)}</span>`);
      if (t.recurring) badges.push(`<span class="sch-badge sch-badge-rec">${recurringLabels[t.recurring] || t.recurring}</span>`);

      return `
        <div class="sch-task-item">
          <div class="sch-task-info">
            <span class="sch-task-name">${t.priority ? priorityLabels[t.priority] + ' ' : ''}${escapeHtml(t.title)}</span>
            <span class="sch-task-meta">
              ${t.duration} phút${t.deadline ? ' | Hạn: ' + escapeHtml(t.deadline) : ''}
              ${badges.length ? '<br>' + badges.join(' ') : ''}
            </span>
          </div>
          <button class="sch-task-remove" onclick="removeScheduleTask('${t.id}')" title="Xóa">✕</button>
        </div>`;
    }).join('');
  }

  // ===== AI SCHEDULE GENERATION =====
  window.generateAISchedule = async function() {
    if (tasks.length === 0) return alert('Vui lòng thêm ít nhất 1 công việc!');

    const btn = document.getElementById('btn-ai-schedule');
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ AI đang lên lịch...'; }

    const preferences = {
      wakeUp: document.getElementById('sch-pref-wake')?.value || '7:00',
      sleep: document.getElementById('sch-pref-sleep')?.value || '23:00',
      breakDuration: parseInt(document.getElementById('sch-pref-break')?.value) || 15,
      focusHours: document.getElementById('sch-pref-focus')?.value || '8:00-12:00',
      style: document.getElementById('sch-pref-style')?.value || 'balanced'
    };

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
      alert('Lỗi tạo lịch trình: ' + e.message);
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
    const container = document.getElementById('sch-weekly-grid');
    if (!data.weekly) {
      container.innerHTML = '<div class="sch-timeline-empty"><div class="sch-empty-icon">❌</div><p>Không tạo được thời khóa biểu</p></div>';
      return;
    }

    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    const dayShort = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const typeIcons = { task: '📋', break: '☕', meal: '🍽️', exercise: '🏃', free: '🎮' };
    const typeClasses = { task: 'wk-task', break: 'wk-break', meal: 'wk-meal', exercise: 'wk-exercise', free: 'wk-free' };

    // ===== Column-based layout (desktop) =====
    let html = '<div class="wk-columns">';
    dayNames.forEach((day, i) => {
      const items = data.weekly[day] || [];
      const isWeekend = i >= 5;
      html += `<div class="wk-col ${isWeekend ? 'wk-col-weekend' : ''}">`;
      html += `<div class="wk-col-header ${isWeekend ? 'wk-col-header-weekend' : ''}">${dayShort[i]}<span class="wk-col-day-full">${day}</span></div>`;
      html += '<div class="wk-col-body">';
      if (items.length === 0) {
        html += '<div class="wk-col-empty">—</div>';
      } else {
        items.forEach(item => {
          const t = resolveType(item.type);
          const cls = typeClasses[t] || 'wk-task';
          const icon = typeIcons[t] || '📌';
          html += `<div class="wk-col-item ${cls}">
            <div class="wk-col-item-time">${item.time}${item.endTime ? ' - ' + item.endTime : ''}</div>
            <div class="wk-col-item-title">${icon} ${escapeHtml(item.title)}</div>
            ${item.note ? `<div class="wk-col-item-note">${escapeHtml(item.note)}</div>` : ''}
          </div>`;
        });
      }
      html += '</div></div>';
    });
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
      items.forEach(item => {
        const t = resolveType(item.type);
        const cls = typeClasses[t] || 'wk-task';
        html += `<div class="wk-card-item ${cls}">
          <span class="wk-card-time">${item.time}${item.endTime ? '-' + item.endTime : ''}</span>
          <span class="wk-card-title">${typeIcons[t] || '📌'} ${escapeHtml(item.title)}</span>
        </div>`;
      });
      html += '</div></div>';
    });
    html += '</div>';

    container.innerHTML = html;
  }

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
    localStorage.removeItem(TASKS_KEY);
    localStorage.removeItem(SCHEDULE_KEY);
    renderTasks();
    document.getElementById('sch-timeline').innerHTML = '<div class="sch-timeline-empty"><div class="sch-empty-icon">📅</div><p>Thêm công việc và nhấn "AI Lên lịch" để tạo lịch trình</p></div>';
    document.getElementById('sch-timeline-multi').innerHTML = '<div class="sch-timeline-empty"><div class="sch-empty-icon">📆</div><p>Thêm công việc và nhấn "AI Lên lịch" để tạo lịch nhiều ngày</p></div>';
    document.getElementById('sch-weekly-grid').innerHTML = '<div class="sch-timeline-empty"><div class="sch-empty-icon">🗓️</div><p>Thêm công việc và nhấn "AI Lên lịch" để tạo thời khóa biểu tuần</p></div>';
    document.getElementById('sch-day-nav').innerHTML = '';
    document.getElementById('sch-tips').style.display = 'none';
    document.getElementById('sch-summary').style.display = 'none';
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
        let line = `  ${i}. "${t.title}" — ${t.duration} phút`;
        if (t.priority) line += `, ưu tiên: ${t.priority}`;
        if (t.deadline) line += `, hạn: ${t.deadline}`;
        if (t.day) line += `, ngày: ${t.day}`;
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
    parts.push(`Tùy chỉnh: thức ${wake}, ngủ ${sleep}, giờ tập trung ${focus}`);

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
          const newTask = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
            title: action.title || 'Công việc mới',
            duration: action.duration || 30,
            priority: action.priority || '',
            deadline: action.deadline || '',
            day: action.day || '',
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
