(function() {
  'use strict';
  const $ = id => document.getElementById(id);

  // Date
  const nd = $('nav-date');
  if (nd) nd.textContent = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });

  const subtitle = $('today-subtitle');
  if (subtitle) {
    const d = new Date();
    subtitle.textContent = d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  async function loadToday() {
    try {
      const res = await fetch('/api/dashboard/today');
      const data = await res.json();
      renderSummary(data);
      renderOverdue(data.todos.overdue);
      renderDueToday(data.todos.dueToday);
      renderHighPriority(data.todos.highPriority);
      renderHabits(data.habits);
      renderVocab(data.vocab);
      renderTrades(data.trades);
    } catch (e) {
      console.error('Today load error:', e);
      if (window.globalUtils?.guToast) window.globalUtils.guToast('Lỗi tải dữ liệu', 'error');
    }
  }

  function renderSummary(data) {
    $('sum-overdue').textContent = data.todos.overdue.length;
    $('sum-due').textContent = data.todos.dueToday.length;
    $('sum-habits').textContent = `${data.habits.done.length}/${data.habits.total}`;
    $('sum-vocab').textContent = data.vocab.count;
    $('sum-trades').textContent = data.trades.count;
  }

  function renderTodoItem(t) {
    const priorityColors = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6', none: 'transparent' };
    const tagsHtml = (t.tags || []).map(tag => {
      const name = typeof tag === 'string' ? tag : (tag.name || '');
      const color = typeof tag === 'object' ? (tag.color || '#78716c') : '#78716c';
      return `<span class="today-tag" style="background:${color}20;color:${color}">${escapeHtml(name)}</span>`;
    }).join('');
    return `
      <div class="today-todo-item" data-id="${t.id}">
        <span class="today-todo-priority" style="background:${priorityColors[t.priority] || 'transparent'}"></span>
        <div class="today-todo-info">
          <span class="today-todo-title">${escapeHtml(t.title)}</span>
          ${t.description ? `<span class="today-todo-desc">${escapeHtml(t.description.substring(0, 80))}</span>` : ''}
          <div class="today-todo-meta">
            ${t.deadline ? `<span class="today-todo-deadline ${t._urgency === 'overdue' ? 'overdue' : ''}">${t.deadline}</span>` : ''}
            ${tagsHtml}
          </div>
        </div>
        <a href="/" class="today-goto" title="Đi tới Công việc">→</a>
      </div>`;
  }

  function renderOverdue(todos) {
    const el = $('list-overdue');
    $('count-overdue').textContent = todos.length;
    if (!todos.length) { el.innerHTML = '<div class="today-empty">Không có công việc quá hạn 🎉</div>'; return; }
    el.innerHTML = todos.map(renderTodoItem).join('');
    $('section-overdue').classList.add('has-items');
  }

  function renderDueToday(todos) {
    const el = $('list-due');
    $('count-due').textContent = todos.length;
    if (!todos.length) { el.innerHTML = '<div class="today-empty">Không có deadline hôm nay</div>'; return; }
    el.innerHTML = todos.map(renderTodoItem).join('');
  }

  function renderHighPriority(todos) {
    const el = $('list-high');
    $('count-high').textContent = todos.length;
    if (!todos.length) { el.innerHTML = '<div class="today-empty">Không có công việc ưu tiên cao</div>'; return; }
    el.innerHTML = todos.map(renderTodoItem).join('');
  }

  function renderHabits(habits) {
    const el = $('list-habits');
    const total = habits.total;
    $('count-habits').textContent = `${habits.done.length}/${total}`;
    if (!total) { el.innerHTML = '<div class="today-empty">Chưa có thói quen nào</div>'; return; }

    let html = '';
    habits.undone.forEach(h => {
      html += `<div class="today-habit-item undone">
        <span class="today-habit-icon">${h.icon || '✅'}</span>
        <span class="today-habit-name">${escapeHtml(h.name)}</span>
        <a href="/habit.html" class="today-goto" title="Đi tới Habit Tracker">→</a>
      </div>`;
    });
    habits.done.forEach(h => {
      html += `<div class="today-habit-item done">
        <span class="today-habit-icon">${h.icon || '✅'}</span>
        <span class="today-habit-name">${escapeHtml(h.name)}</span>
        <span class="today-habit-check">✓</span>
      </div>`;
    });
    el.innerHTML = html;
  }

  function renderVocab(vocab) {
    const el = $('list-vocab');
    $('count-vocab').textContent = vocab.count;
    if (!vocab.count) { el.innerHTML = '<div class="today-empty">Không có từ cần ôn tập 🎉</div>'; return; }
    el.innerHTML = vocab.due.slice(0, 15).map(v => `
      <div class="today-vocab-item">
        <div class="today-vocab-word">${escapeHtml(v.word)}</div>
        <div class="today-vocab-meaning">${escapeHtml(v.meaning)}</div>
        <a href="/english.html" class="today-goto" title="Đi tới English">→</a>
      </div>
    `).join('') + (vocab.count > 15 ? `<div class="today-more"><a href="/english.html">Xem thêm ${vocab.count - 15} từ →</a></div>` : '');
  }

  function renderTrades(trades) {
    const el = $('list-trades');
    $('count-trades').textContent = trades.count;
    if (!trades.count) { el.innerHTML = '<div class="today-empty">Không có lệnh nào đang mở</div>'; return; }
    el.innerHTML = trades.open.map(t => `
      <div class="today-trade-item">
        <span class="today-trade-type ${t.type}">${t.type.toUpperCase()}</span>
        <div class="today-trade-info">
          <span class="today-trade-symbol">${escapeHtml(t.symbol)}</span>
          <span class="today-trade-detail">Entry: $${t.entryPrice} · Qty: ${t.quantity}${t.leverage > 1 ? ` · ${t.leverage}x` : ''}</span>
        </div>
        <a href="/trading.html" class="today-goto" title="Đi tới Trading">→</a>
      </div>
    `).join('');
  }

  function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  $('btn-refresh').onclick = loadToday;
  loadToday();
})();
