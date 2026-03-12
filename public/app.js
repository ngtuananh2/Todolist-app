const API_URL = '/api/todos';
const TAG_URL = '/api/tags';

// ==================== STATE ====================
let todos = [];
let tags = [];
let currentFilter = 'all';
let searchQuery = '';
let selectedTagIds = new Set();
let tagsDropdownOpen = false;

let currentSort = 'date-desc';
let filterTagIds = new Set();
let filterProject = '';
let undoStack = [];
let viewMode = localStorage.getItem('viewMode') || 'list'; // 'list', 'kanban' or 'calendar'
let bulkMode = false;
let selectedIds = new Set();

// ==================== DOM ELEMENTS ====================
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoDeadline = document.getElementById('todo-deadline');
const todoPriority = document.getElementById('todo-priority');
const todoDesc = document.getElementById('todo-desc');
const todoRecurrence = document.getElementById('todo-recurrence');
const todoList = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const statsText = document.getElementById('stats-text');
const btnClear = document.getElementById('btn-clear');
const filterBtns = document.querySelectorAll('.tab');
const greetingEl = document.getElementById('greeting');
const footerStats = document.getElementById('footer-stats');

const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');

const statTotal = document.querySelector('#stat-total .stat-num');
const statActive = document.querySelector('#stat-active .stat-num');
const statDone = document.querySelector('#stat-done .stat-num');

const progressLabel = document.getElementById('progress-label');
const progressPercent = document.getElementById('progress-percent');
const progressRing = document.getElementById('progress-ring');
const RING_CIRCUMFERENCE = 2 * Math.PI * 34;

const tabCount = document.getElementById('tab-count');
const navDate = document.getElementById('nav-date');

const sidebarTags = document.getElementById('sidebar-tags');
const tagNameInput = document.getElementById('tag-name-input');
const tagColorInput = document.getElementById('tag-color-input');
const btnAddTag = document.getElementById('btn-add-tag');
const formTagsSelect = document.getElementById('form-tags-select');
const formTagsDropdown = document.getElementById('form-tags-dropdown');
const formTagsPlaceholder = document.getElementById('form-tags-placeholder');

// ==================== INIT ====================
function setGreeting() {
  const h = new Date().getHours();
  let text = 'Xin chào!';
  if (h < 12) text = 'Chào buổi sáng! ☀️';
  else if (h < 18) text = 'Chào buổi chiều! 🌤️';
  else text = 'Chào buổi tối! 🌙';
  if (greetingEl) greetingEl.textContent = text;
}

function setNavDate() {
  const d = new Date();
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  if (navDate) navDate.textContent = d.toLocaleDateString('vi-VN', options);
}

setGreeting();
setNavDate();

// Auto-resize description textarea
if (todoDesc) {
  todoDesc.addEventListener('input', () => {
    todoDesc.style.height = 'auto';
    todoDesc.style.height = todoDesc.scrollHeight + 'px';
  });
}

// Theme is handled by global-utils.js

// ==================== API FUNCTIONS ====================

async function fetchTodos() {
  const url = searchQuery ? `${API_URL}?search=${encodeURIComponent(searchQuery)}` : API_URL;
  const res = await fetch(url);
  todos = await res.json();
  render();
}

async function fetchTags() {
  const res = await fetch(TAG_URL);
  tags = await res.json();
  renderSidebarTags();
  renderFormTagsDropdown();
  renderFilterTagsDropdown();
}

async function addTodo(title, deadline, priority, description, tagIds, recurrence, project) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, deadline: deadline || null, priority, description, tagIds, recurrence, project: project || '' })
  });
  if (res.ok) {
    await fetchTodos();
    loadProjects();
  }
}

async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: !todo.completed })
  });
  if (res.ok) {
    const updated = await res.json();
    Object.assign(todo, updated);
    render();
    // If recurring, a new one was created — refresh
    if (updated.recurrence && updated.recurrence !== 'none' && updated.completed) {
      await fetchTodos();
    }
  }
}

async function updateTodo(id, data) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (res.ok) {
    await fetchTodos();
  }
}

async function deleteTodo(id) {
  const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  if (res.ok) {
    const result = await res.json();
    todos = todos.filter(t => t.id !== id);
    render();
    // Push to undo stack
    if (result.todo) {
      showUndo(result.todo);
    }
  }
}

async function clearCompleted() {
  const res = await fetch(API_URL, { method: 'DELETE' });
  if (res.ok) {
    todos = todos.filter(t => !t.completed);
    render();
  }
}

// ---- Subtask API ----
async function addSubtask(todoId, title) {
  const res = await fetch(`${API_URL}/${todoId}/subtasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (res.ok) await fetchTodos();
}

async function toggleSubtask(subtaskId, completed) {
  await fetch(`/api/subtasks/${subtaskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed })
  });
  await fetchTodos();
}

async function deleteSubtask(subtaskId) {
  await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
  await fetchTodos();
}

// ---- Tag API ----
async function createTag(name, color) {
  const res = await fetch(TAG_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color })
  });
  if (res.ok) await fetchTags();
}

async function deleteTag(tagId) {
  await fetch(`${TAG_URL}/${tagId}`, { method: 'DELETE' });
  await fetchTags();
  await fetchTodos();
}

// ==================== UNDO ====================
let undoTimer = null;

function showUndo(todoData) {
  undoStack.push(todoData);
  const toast = document.getElementById('undo-toast');
  if (toast) {
    toast.style.display = 'flex';
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => {
      toast.style.display = 'none';
      undoStack = [];
    }, 8000);
  }
}

document.getElementById('undo-btn')?.addEventListener('click', async () => {
  if (undoStack.length === 0) return;
  const todoData = undoStack.pop();
  const res = await fetch(`${API_URL}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(todoData)
  });
  if (res.ok) await fetchTodos();
  const toast = document.getElementById('undo-toast');
  if (toast && undoStack.length === 0) toast.style.display = 'none';
  clearTimeout(undoTimer);
});

// ==================== DRAG & DROP ====================
let draggedId = null;

function handleDragStart(e) {
  draggedId = e.target.closest('.todo-item')?.dataset.id;
  e.target.closest('.todo-item')?.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  e.target.closest('.todo-item')?.classList.remove('dragging');
  document.querySelectorAll('.todo-item').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const item = e.target.closest('.todo-item');
  if (item && item.dataset.id !== draggedId) {
    document.querySelectorAll('.todo-item').forEach(el => el.classList.remove('drag-over'));
    item.classList.add('drag-over');
  }
}

async function handleDrop(e) {
  e.preventDefault();
  const targetItem = e.target.closest('.todo-item');
  if (!targetItem || !draggedId) return;
  const targetId = targetItem.dataset.id;
  if (draggedId === targetId) return;

  // Reorder in local array
  const items = document.querySelectorAll('.todo-item');
  const orderedIds = Array.from(items).map(el => el.dataset.id);
  const fromIdx = orderedIds.indexOf(draggedId);
  const toIdx = orderedIds.indexOf(targetId);
  if (fromIdx === -1 || toIdx === -1) return;

  orderedIds.splice(fromIdx, 1);
  orderedIds.splice(toIdx, 0, draggedId);

  // Send to server
  await fetch(`${API_URL}/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds })
  });
  await fetchTodos();
}

// ==================== RENDER ====================

function getFilteredTodos() {
  let filtered = todos;
  switch (currentFilter) {
    case 'active': filtered = filtered.filter(t => !t.completed); break;
    case 'completed': filtered = filtered.filter(t => t.completed); break;
  }
  // Filter by tags
  if (filterTagIds.size > 0) {
    filtered = filtered.filter(t => t.tags && t.tags.some(tag => filterTagIds.has(tag.id)));
  }
  // Filter by project
  if (filterProject) {
    filtered = filtered.filter(t => t.project === filterProject);
  }
  return applySorting(filtered);
}

function applySorting(list) {
  switch (currentSort) {
    case 'date-asc': return [...list].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    case 'name-asc': return [...list].sort((a, b) => a.title.localeCompare(b.title, 'vi'));
    case 'name-desc': return [...list].sort((a, b) => b.title.localeCompare(a.title, 'vi'));
    case 'deadline': return [...list].sort((a, b) => {
      if (!a.deadline) return 1; if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });
    case 'priority': return [...list].sort((a, b) => {
      const po = { high: 0, medium: 1, low: 2, none: 3 };
      return (po[a.priority] ?? 3) - (po[b.priority] ?? 3);
    });
    case 'date-desc':
    default: return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

function render() {
  const filtered = getFilteredTodos();
  const completedCount = todos.filter(t => t.completed).length;
  const activeCount = todos.length - completedCount;
  const total = todos.length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  if (statTotal) statTotal.textContent = total;
  if (statActive) statActive.textContent = activeCount;
  if (statDone) statDone.textContent = completedCount;

  if (progressRing) {
    const offset = RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE;
    progressRing.style.strokeDasharray = RING_CIRCUMFERENCE;
    progressRing.style.strokeDashoffset = offset;
  }
  if (progressPercent) progressPercent.textContent = `${pct}%`;
  if (progressLabel) progressLabel.textContent = `${completedCount} / ${total} hoàn thành`;

  if (tabCount) tabCount.textContent = filtered.length > 0 ? `${filtered.length} việc` : '';

  if (total > 0) {
    footerStats.style.display = '';
    statsText.textContent = `${total} tổng · ${activeCount} đang làm · ${completedCount} đã xong`;
  } else {
    footerStats.style.display = 'none';
  }

  btnClear.style.display = completedCount > 0 ? 'flex' : 'none';

  // Kanban view
  if (viewMode === 'kanban') {
    if (total === 0) { todoList.innerHTML = ''; emptyState.classList.add('show'); return; }
    renderKanban();
    return;
  }

  // Calendar view
  if (viewMode === 'calendar') {
    renderCalendar();
    return;
  }

  if (filtered.length === 0) {
    todoList.innerHTML = '';
    emptyState.classList.add('show');
    return;
  }

  emptyState.classList.remove('show');

  const groups = groupByDate(filtered);
  let html = '';

  groups.forEach(group => {
    html += `
      <div class="day-group">
        <div class="day-header">
          <span class="day-label">${group.label}</span>
          <span class="day-count">${group.todos.length} việc</span>
        </div>
        <ul class="day-list">
          ${group.todos.map(todo => renderTodoItem(todo)).join('')}
        </ul>
      </div>
    `;
  });

  todoList.innerHTML = html;
}

function renderTodoItem(todo) {
  const metaHtml = buildMetaHtml(todo);
  const priorityClass = todo.priority && todo.priority !== 'none' ? `priority-${todo.priority}` : '';
  const tagsHtml = todo.tags && todo.tags.length > 0
    ? `<div class="todo-tags">${todo.tags.map(t => `<span class="tag-pill" style="--tag-clr:${t.color}">${escapeHtml(t.name)}</span>`).join('')}</div>`
    : '';
  const descHtml = todo.description
    ? `<p class="todo-desc-text">${escapeHtml(todo.description)}</p>`
    : '';
  const subtasksHtml = renderSubtasks(todo);
  const recurHtml = todo.recurrence && todo.recurrence !== 'none'
    ? `<span class="recurrence-badge" title="Lặp lại ${todo.recurrence === 'daily' ? 'hàng ngày' : todo.recurrence === 'weekly' ? 'hàng tuần' : 'hàng tháng'}">🔄</span>`
    : '';
  const projectHtml = todo.project
    ? `<span class="project-badge" title="Dự án: ${escapeHtml(todo.project)}">📁 ${escapeHtml(todo.project)}</span>`
    : '';

  return `
    <li class="todo-item ${todo.completed ? 'completed' : ''} ${priorityClass}" data-id="${todo.id}"
        draggable="true" ondragstart="handleDragStart(event)" ondragend="handleDragEnd(event)" ondragover="handleDragOver(event)" ondrop="handleDrop(event)">
      <div class="todo-drag-handle" title="Kéo để sắp xếp">⠿</div>
      ${bulkMode ? `<input type="checkbox" class="bulk-check" ${selectedIds.has(todo.id) ? 'checked' : ''} onchange="toggleBulkSelect('${todo.id}', this.checked)">` : ''}
      <div class="todo-checkbox" onclick="toggleTodo('${todo.id}')"></div>
      <div class="todo-body">
        <div class="todo-title-row">
          ${priorityClass ? `<span class="priority-dot priority-dot-${todo.priority}" title="${getPriorityLabel(todo.priority)}"></span>` : ''}
          <span class="todo-title">${escapeHtml(todo.title)}</span>
          ${recurHtml}
          ${projectHtml}
        </div>
        ${descHtml}
        ${tagsHtml}
        ${metaHtml ? `<div class="todo-meta">${metaHtml}</div>` : ''}
        ${subtasksHtml}
      </div>
      <div class="todo-actions">
        <button class="btn-action btn-edit" onclick="startEdit('${todo.id}')" title="Sửa">✏️</button>
        <button class="btn-action btn-delete" onclick="deleteTodo('${todo.id}')" title="Xóa">✕</button>
      </div>
    </li>
  `;
}

function renderSubtasks(todo) {
  if (!todo.subtasks) return '';
  const done = todo.subtasks.filter(s => s.completed).length;
  const total = todo.subtasks.length;

  let html = `<div class="subtasks-section">`;

  if (total > 0) {
    html += `<div class="subtasks-progress-bar"><div class="subtasks-progress-fill" style="width:${total > 0 ? (done/total*100) : 0}%"></div></div>`;
    html += `<ul class="subtasks-list">`;
    todo.subtasks.forEach(sub => {
      html += `
        <li class="subtask-item ${sub.completed ? 'subtask-done' : ''}">
          <label class="subtask-check">
            <input type="checkbox" ${sub.completed ? 'checked' : ''} onchange="toggleSubtask('${sub.id}', this.checked)">
            <span class="subtask-title">${escapeHtml(sub.title)}</span>
          </label>
          <button class="subtask-delete" onclick="deleteSubtask('${sub.id}')" title="Xóa">&times;</button>
        </li>`;
    });
    html += `</ul>`;
  }

  html += `
    <div class="subtask-add-row">
      <input type="text" class="subtask-add-input" placeholder="Thêm việc con..." maxlength="100" 
        onkeydown="if(event.key==='Enter'){event.preventDefault();handleAddSubtask('${todo.id}',this)}">
      <button class="subtask-add-btn" onclick="handleAddSubtask('${todo.id}', this.previousElementSibling)">+</button>
    </div>
  </div>`;

  return html;
}

function handleAddSubtask(todoId, input) {
  const title = input.value.trim();
  if (title) {
    addSubtask(todoId, title);
    input.value = '';
  }
}

function groupByDate(todosArr) {
  const map = new Map();
  todosArr.forEach(todo => {
    const dateKey = todo.createdAt ? new Date(todo.createdAt).toDateString() : 'unknown';
    if (!map.has(dateKey)) map.set(dateKey, []);
    map.get(dateKey).push(todo);
  });

  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const groups = [];
  map.forEach((items, key) => {
    let label;
    if (key === today.toDateString()) label = 'Hôm nay';
    else if (key === yesterday.toDateString()) label = 'Hôm qua';
    else if (key === 'unknown') label = 'Không rõ ngày';
    else {
      const d = new Date(key);
      label = d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    groups.push({ label, todos: items });
  });

  return groups;
}

// ==================== KANBAN VIEW ====================
function renderKanban() {
  const filtered = getFilteredTodos();
  const columns = {
    todo:    { label: '📋 Chưa làm',  items: [], color: '#3b82f6' },
    doing:   { label: '🔨 Đang làm',  items: [], color: '#f59e0b' },
    done:    { label: '✅ Hoàn thành', items: [], color: '#10b981' }
  };

  filtered.forEach(t => {
    if (t.completed) columns.done.items.push(t);
    else if (t.priority === 'high' || t.priority === 'medium') columns.doing.items.push(t);
    else columns.todo.items.push(t);
  });

  let html = '<div class="kanban-board">';
  for (const [key, col] of Object.entries(columns)) {
    html += `<div class="kanban-col" data-col="${key}">
      <div class="kanban-col-header" style="border-bottom-color:${col.color}">
        <span class="kanban-col-title">${col.label}</span>
        <span class="kanban-col-count">${col.items.length}</span>
      </div>
      <div class="kanban-col-body" ondragover="event.preventDefault()" ondrop="handleKanbanDrop(event,'${key}')">
        ${col.items.length === 0 ? '<div class="kanban-empty">Kéo thả task vào đây</div>' : ''}
        ${col.items.map(t => renderKanbanCard(t)).join('')}
      </div>
    </div>`;
  }
  html += '</div>';
  todoList.innerHTML = html;
  emptyState.classList.remove('show');
}

function renderKanbanCard(todo) {
  const prioClass = todo.priority && todo.priority !== 'none' ? `kanban-prio-${todo.priority}` : '';
  const tagsHtml = todo.tags?.length ? todo.tags.map(t =>
    `<span class="kanban-tag" style="--tag-clr:${t.color}">${escapeHtml(t.name)}</span>`).join('') : '';
  const deadHtml = todo.deadline ? `<span class="kanban-deadline ${getDeadlineStatus(todo.deadline)}">${formatDateTime(todo.deadline)}</span>` : '';
  const subCount = todo.subtasks?.length ? `<span class="kanban-subtask-count">📎 ${todo.subtasks.filter(s=>s.completed).length}/${todo.subtasks.length}</span>` : '';
  return `
    <div class="kanban-card ${prioClass} ${todo.completed ? 'kanban-done' : ''}" draggable="true" data-id="${todo.id}"
         ondragstart="event.dataTransfer.setData('text/plain','${todo.id}')">
      <div class="kanban-card-header">
        <div class="todo-checkbox" onclick="toggleTodo('${todo.id}')"></div>
        <span class="kanban-card-title">${escapeHtml(todo.title)}</span>
      </div>
      ${todo.description ? `<p class="kanban-card-desc">${escapeHtml(todo.description).substring(0, 80)}</p>` : ''}
      <div class="kanban-card-footer">
        ${tagsHtml}${deadHtml}${subCount}
      </div>
    </div>`;
}

async function handleKanbanDrop(e, column) {
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  if (!id) return;
  const updates = {};
  if (column === 'done') updates.completed = true;
  else if (column === 'doing') { updates.completed = false; updates.priority = 'medium'; }
  else { updates.completed = false; updates.priority = 'none'; }
  await updateTodo(id, updates);
}

// ==================== CALENDAR VIEW ====================
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();

function renderCalendar() {
  emptyState.classList.remove('show');
  const filtered = getFilteredTodos();

  // Map todos by date string YYYY-MM-DD
  const todosByDate = {};
  filtered.forEach(t => {
    if (t.deadline) {
      const dayKey = t.deadline.substring(0, 10);
      if (!todosByDate[dayKey]) todosByDate[dayKey] = [];
      todosByDate[dayKey].push(t);
    }
  });
  const noDate = filtered.filter(t => !t.deadline);

  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const todayStr = new Date().toISOString().substring(0, 10);
  const monthNames = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

  let html = `<div class="cal-view">
    <div class="cal-header">
      <button class="cal-nav" onclick="calendarMonth--;if(calendarMonth<0){calendarMonth=11;calendarYear--;}render()">‹</button>
      <span class="cal-title">${monthNames[calendarMonth]} ${calendarYear}</span>
      <button class="cal-nav" onclick="calendarMonth++;if(calendarMonth>11){calendarMonth=0;calendarYear++;}render()">›</button>
    </div>
    <div class="cal-grid">
      <div class="cal-dow">CN</div><div class="cal-dow">T2</div><div class="cal-dow">T3</div><div class="cal-dow">T4</div><div class="cal-dow">T5</div><div class="cal-dow">T6</div><div class="cal-dow">T7</div>`;

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-cell cal-empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const dayTodos = todosByDate[dateStr] || [];
    const dots = dayTodos.slice(0, 3).map(t => {
      const color = t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : t.priority === 'low' ? '#3b82f6' : '#94a3b8';
      return `<span class="cal-dot" style="background:${color}" title="${escapeHtml(t.title)}"></span>`;
    }).join('');
    html += `<div class="cal-cell ${isToday ? 'cal-today' : ''} ${dayTodos.length > 0 ? 'cal-has-todos' : ''}">
      <span class="cal-day-num">${d}</span>
      ${dayTodos.length > 0 ? `<div class="cal-dots">${dots}${dayTodos.length > 3 ? `<span class="cal-more">+${dayTodos.length - 3}</span>` : ''}</div>` : ''}
      ${dayTodos.length > 0 ? `<div class="cal-tooltip">${dayTodos.map(t => `<div class="cal-tip-item ${t.completed ? 'cal-tip-done' : ''}"><span class="cal-tip-dot" style="background:${t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#3b82f6'}"></span>${escapeHtml(t.title)}</div>`).join('')}</div>` : ''}
    </div>`;
  }

  html += '</div>';

  // No-date todos
  if (noDate.length > 0) {
    html += `<div class="cal-nodate"><div class="cal-nodate-title">📌 Chưa đặt hạn (${noDate.length})</div>
      <div class="cal-nodate-list">${noDate.map(t => `<span class="cal-nodate-item ${t.completed ? 'completed' : ''}" onclick="startEdit('${t.id}')">${escapeHtml(t.title)}</span>`).join('')}</div></div>`;
  }

  html += '</div>';
  todoList.innerHTML = html;
}

function toggleView() {
  const modes = ['list', 'kanban', 'calendar'];
  const idx = modes.indexOf(viewMode);
  viewMode = modes[(idx + 1) % modes.length];
  localStorage.setItem('viewMode', viewMode);
  updateViewToggle();
  render();
}

function updateViewToggle() {
  const btn = document.getElementById('btn-view-toggle');
  if (btn) {
    const icons = {
      list: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="6" height="18" rx="1"/><rect x="9" y="3" width="6" height="11" rx="1"/><rect x="16" y="3" width="6" height="14" rx="1"/></svg><span>Kanban</span>',
      kanban: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="10" x2="9" y2="20"/><line x1="15" y1="10" x2="15" y2="20"/></svg><span>L\u1ecbch</span>',
      calendar: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg><span>Danh s\u00e1ch</span>'
    };
    btn.innerHTML = icons[viewMode] || icons.list;
    const titles = { list: 'Chuy\u1ec3n sang Kanban', kanban: 'Chuy\u1ec3n sang L\u1ecbch', calendar: 'Chuy\u1ec3n sang Danh s\u00e1ch' };
    btn.title = titles[viewMode] || '';
  }
}

// ==================== HELPERS ====================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getPriorityLabel(p) {
  const m = { high: 'Ưu tiên cao', medium: 'Ưu tiên TB', low: 'Ưu tiên thấp' };
  return m[p] || '';
}

function formatDateTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${h}:${m}`;
}

function getDeadlineStatus(deadline) {
  if (!deadline) return '';
  const diff = new Date(deadline) - new Date();
  if (diff < 0) return 'overdue';
  if (diff < 24 * 60 * 60 * 1000) return 'soon';
  return '';
}

function getRelativeTime(deadline) {
  if (!deadline) return '';
  const diff = new Date(deadline) - new Date();
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60000);
  const hours = Math.floor(abs / 3600000);
  const days = Math.floor(abs / 86400000);

  if (diff < 0) {
    if (mins < 60) return `Quá hạn ${mins} phút`;
    if (hours < 24) return `Quá hạn ${hours} giờ`;
    return `Quá hạn ${days} ngày`;
  } else {
    if (mins < 60) return `Còn ${mins} phút`;
    if (hours < 24) return `Còn ${hours} giờ`;
    return `Còn ${days} ngày`;
  }
}

function buildMetaHtml(todo) {
  let parts = [];

  if (todo.createdAt) {
    const d = new Date(todo.createdAt);
    const time = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    parts.push(`<span class="todo-meta-item meta-created"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Tạo lúc ${time}</span>`);
  }

  if (todo.deadline) {
    const status = todo.completed ? '' : getDeadlineStatus(todo.deadline);
    const relative = todo.completed ? '' : ` · ${getRelativeTime(todo.deadline)}`;
    parts.push(`<span class="todo-meta-item meta-deadline ${status}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${formatDateTime(todo.deadline)}${relative}</span>`);
  }

  if (todo.completed && todo.completedAt) {
    parts.push(`<span class="todo-meta-item meta-completed-at"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Xong lúc ${formatDateTime(todo.completedAt)}</span>`);
  }

  return parts.join('');
}

// ==================== TAGS UI ====================

function renderSidebarTags() {
  if (!sidebarTags) return;
  if (tags.length === 0) {
    sidebarTags.innerHTML = '<p class="tags-empty">Chưa có nhãn nào</p>';
    return;
  }
  sidebarTags.innerHTML = tags.map(t => `
    <div class="sidebar-tag-item">
      <span class="sidebar-tag-dot" style="background:${t.color}"></span>
      <span class="sidebar-tag-name">${escapeHtml(t.name)}</span>
      <button class="sidebar-tag-del" onclick="deleteTag('${t.id}')" title="Xóa nhãn">&times;</button>
    </div>
  `).join('');
}

function renderFormTagsDropdown() {
  if (!formTagsDropdown) return;
  if (tags.length === 0) {
    formTagsDropdown.innerHTML = '<div class="form-tags-empty">Tạo nhãn trong sidebar</div>';
    return;
  }
  formTagsDropdown.innerHTML = tags.map(t => `
    <label class="form-tag-option">
      <input type="checkbox" value="${t.id}" ${selectedTagIds.has(t.id) ? 'checked' : ''} 
        onchange="handleFormTagToggle('${t.id}', this.checked)">
      <span class="form-tag-dot" style="background:${t.color}"></span>
      <span>${escapeHtml(t.name)}</span>
    </label>
  `).join('');
  updateTagsPlaceholder();
}

function renderFilterTagsDropdown() {
  const dropdown = document.getElementById('filter-tags-dropdown');
  if (!dropdown) return;
  if (tags.length === 0) {
    dropdown.innerHTML = '<div class="form-tags-empty">Chưa có nhãn</div>';
    return;
  }
  dropdown.innerHTML = tags.map(t => `
    <label class="form-tag-option">
      <input type="checkbox" value="${t.id}" ${filterTagIds.has(t.id) ? 'checked' : ''}
        onchange="handleFilterTagToggle('${t.id}', this.checked)">
      <span class="form-tag-dot" style="background:${t.color}"></span>
      <span>${escapeHtml(t.name)}</span>
    </label>
  `).join('');
}

function handleFormTagToggle(tagId, checked) {
  if (checked) selectedTagIds.add(tagId);
  else selectedTagIds.delete(tagId);
  updateTagsPlaceholder();
}

function handleFilterTagToggle(tagId, checked) {
  if (checked) filterTagIds.add(tagId);
  else filterTagIds.delete(tagId);
  const btn = document.getElementById('btn-filter-tags');
  if (btn) btn.classList.toggle('active', filterTagIds.size > 0);
  render();
}

function updateTagsPlaceholder() {
  if (!formTagsPlaceholder) return;
  if (selectedTagIds.size === 0) {
    formTagsPlaceholder.textContent = 'Chọn nhãn...';
    formTagsPlaceholder.classList.remove('has-selection');
  } else {
    const names = tags.filter(t => selectedTagIds.has(t.id)).map(t => t.name);
    formTagsPlaceholder.textContent = names.join(', ');
    formTagsPlaceholder.classList.add('has-selection');
  }
}

// ==================== EDIT MODE ====================

function startEdit(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  const li = document.querySelector(`.todo-item[data-id="${id}"]`);
  if (!li) return;

  const tagCheckboxes = tags.map(t => {
    const checked = todo.tags && todo.tags.some(tt => tt.id === t.id);
    return `<label class="edit-tag-option"><input type="checkbox" value="${t.id}" ${checked ? 'checked' : ''}><span class="form-tag-dot" style="background:${t.color}"></span>${escapeHtml(t.name)}</label>`;
  }).join('');

  li.innerHTML = `
    <div class="edit-form">
      <input class="todo-edit-input" type="text" value="${escapeHtml(todo.title)}" maxlength="200" placeholder="Tiêu đề">
      <textarea class="edit-desc" placeholder="Ghi chú..." rows="2" maxlength="1000">${escapeHtml(todo.description || '')}</textarea>
      <div class="edit-options">
        <select class="edit-priority">
          <option value="none" ${todo.priority === 'none' ? 'selected' : ''}>Không ưu tiên</option>
          <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>Thấp</option>
          <option value="medium" ${todo.priority === 'medium' ? 'selected' : ''}>Trung bình</option>
          <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>Cao</option>
        </select>
        <input type="datetime-local" class="edit-deadline" value="${todo.deadline || ''}">
        <select class="edit-recurrence">
          <option value="none" ${todo.recurrence === 'none' ? 'selected' : ''}>Không lặp</option>
          <option value="daily" ${todo.recurrence === 'daily' ? 'selected' : ''}>Hàng ngày</option>
          <option value="weekly" ${todo.recurrence === 'weekly' ? 'selected' : ''}>Hàng tuần</option>
          <option value="monthly" ${todo.recurrence === 'monthly' ? 'selected' : ''}>Hàng tháng</option>
        </select>
        <input type="text" class="edit-project project-input" value="${escapeHtml(todo.project || '')}" placeholder="Dự án..." list="project-list">
      </div>
      ${tags.length > 0 ? `<div class="edit-tags">${tagCheckboxes}</div>` : ''}
      <div class="edit-actions">
        <button class="btn-save-edit" onclick="saveEdit('${id}')">Lưu</button>
        <button class="btn-cancel-edit" onclick="render()">Hủy</button>
      </div>
    </div>
  `;

  const input = li.querySelector('.todo-edit-input');
  input.focus(); input.select();
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit(id); }
    if (e.key === 'Escape') render();
  });
}

function saveEdit(id) {
  const li = document.querySelector(`.todo-item[data-id="${id}"]`);
  if (!li) return;

  const title = li.querySelector('.todo-edit-input')?.value.trim();
  const description = li.querySelector('.edit-desc')?.value || '';
  const priority = li.querySelector('.edit-priority')?.value || 'none';
  const deadline = li.querySelector('.edit-deadline')?.value || null;
  const recurrence = li.querySelector('.edit-recurrence')?.value || 'none';
  const project = li.querySelector('.edit-project')?.value || '';
  const tagCheckboxes = li.querySelectorAll('.edit-tag-option input:checked');
  const tagIds = Array.from(tagCheckboxes).map(cb => cb.value);

  if (title) {
    updateTodo(id, { title, description, priority, deadline, recurrence, project, tagIds });
  } else {
    render();
  }
}

// ==================== SEARCH ====================
let searchTimeout;
searchInput.addEventListener('input', () => {
  const val = searchInput.value.trim();
  searchClear.style.display = val ? 'flex' : 'none';
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = val;
    fetchTodos();
  }, 300);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.style.display = 'none';
  searchQuery = '';
  fetchTodos();
});

// ==================== SORT & FILTER ====================

// Sort dropdown
const btnSort = document.getElementById('btn-sort');
const sortDropdown = document.getElementById('sort-dropdown');

btnSort?.addEventListener('click', (e) => {
  e.stopPropagation();
  sortDropdown.classList.toggle('open');
});

sortDropdown?.addEventListener('click', (e) => {
  const opt = e.target.closest('.sort-option');
  if (!opt) return;
  currentSort = opt.dataset.sort;
  sortDropdown.querySelectorAll('.sort-option').forEach(o => o.classList.remove('active'));
  opt.classList.add('active');
  sortDropdown.classList.remove('open');
  render();
});

// Filter by tags dropdown
const btnFilterTags = document.getElementById('btn-filter-tags');
const filterTagsDropdown = document.getElementById('filter-tags-dropdown');

btnFilterTags?.addEventListener('click', (e) => {
  e.stopPropagation();
  filterTagsDropdown.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (sortDropdown && !e.target.closest('.sort-dropdown-wrap')) sortDropdown.classList.remove('open');
  if (filterTagsDropdown && !e.target.closest('.filter-tags-wrap')) filterTagsDropdown.classList.remove('open');
  if (tagsDropdownOpen && !e.target.closest('.form-tags-option')) {
    tagsDropdownOpen = false;
    formTagsDropdown?.classList.remove('open');
  }
});
filterTagsDropdown?.addEventListener('click', e => e.stopPropagation());

// ==================== EVENT LISTENERS ====================

todoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = todoInput.value.trim();
  if (title) {
    const deadline = todoDeadline.value || null;
    const priority = todoPriority.value || 'none';
    const description = todoDesc.value.trim();
    const tagIds = Array.from(selectedTagIds);
    const recurrence = todoRecurrence?.value || 'none';

    // AI auto-classify if priority is none
    if (priority === 'none') {
      try {
        const classifyRes = await fetch('/api/ai/classify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description })
        });
        if (classifyRes.ok) {
          const suggestion = await classifyRes.json();
          if (suggestion.priority && suggestion.priority !== 'none') {
            todoPriority.value = suggestion.priority;
            // Auto-select suggested tags
            if (suggestion.suggestedTags && suggestion.suggestedTags.length > 0) {
              suggestion.suggestedTags.forEach(tagName => {
                const found = tags.find(t => t.name === tagName);
                if (found) tagIds.push(found.id);
              });
            }
          }
        }
      } catch(e) {} // silent fail
    }

    const projectVal = document.getElementById('todo-project')?.value?.trim() || '';
    await addTodo(title, deadline, todoPriority.value || priority, description, tagIds, recurrence, projectVal);
    todoInput.value = '';
    todoDeadline.value = '';
    todoPriority.value = 'none';
    todoDesc.value = '';
    todoDesc.style.height = 'auto';
    if (todoRecurrence) todoRecurrence.value = 'none';
    const projInput = document.getElementById('todo-project');
    if (projInput) projInput.value = '';
    selectedTagIds.clear();
    renderFormTagsDropdown();
    todoInput.focus();
  }
});

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

btnClear.addEventListener('click', clearCompleted);



formTagsSelect?.addEventListener('click', (e) => {
  e.stopPropagation();
  tagsDropdownOpen = !tagsDropdownOpen;
  formTagsDropdown.classList.toggle('open', tagsDropdownOpen);
});

formTagsDropdown?.addEventListener('click', e => e.stopPropagation());

btnAddTag?.addEventListener('click', () => {
  const name = tagNameInput.value.trim();
  if (name) {
    createTag(name, tagColorInput.value);
    tagNameInput.value = '';
  }
});
tagNameInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); btnAddTag.click(); }
});

// ==================== EXPORT / IMPORT ====================

document.getElementById('btn-export')?.addEventListener('click', async () => {
  const res = await fetch(`${API_URL}/export`);
  const data = await res.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `taskflow-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click(); URL.revokeObjectURL(url);
});

document.getElementById('btn-import')?.addEventListener('click', () => {
  document.getElementById('import-file')?.click();
});

document.getElementById('import-file')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    const res = await fetch(`${API_URL}/import`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      const result = await res.json();
      alert(`Đã nhập: ${result.tags} nhãn, ${result.todos} công việc`);
      await fetchTags();
      await fetchTodos();
    }
  } catch (err) {
    alert('File không hợp lệ');
  }
  e.target.value = '';
});

// ==================== NOTIFICATION / DEADLINE REMINDER ====================

let notifInterval = null;

function initNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    startDeadlineChecker();
  } else if (Notification.permission !== 'denied') {
    const banner = document.getElementById('notif-banner');
    if (banner) banner.style.display = 'flex';
  }
}

document.getElementById('notif-allow')?.addEventListener('click', async () => {
  const perm = await Notification.requestPermission();
  document.getElementById('notif-banner').style.display = 'none';
  if (perm === 'granted') startDeadlineChecker();
});

document.getElementById('notif-dismiss')?.addEventListener('click', () => {
  document.getElementById('notif-banner').style.display = 'none';
});

function startDeadlineChecker() {
  if (notifInterval) clearInterval(notifInterval);
  checkDeadlines();
  notifInterval = setInterval(checkDeadlines, 60000); // Check every minute
}

const notifiedIds = new Set();

function checkDeadlines() {
  const now = new Date();
  todos.forEach(todo => {
    if (todo.completed || !todo.deadline || notifiedIds.has(todo.id)) return;
    const dl = new Date(todo.deadline);
    const diff = dl - now;
    // Notify if deadline is within 30 minutes
    if (diff > 0 && diff < 30 * 60 * 1000) {
      notifiedIds.add(todo.id);
      new Notification('⏰ TaskFlow - Deadline sắp đến!', {
        body: `"${todo.title}" - còn ${Math.round(diff / 60000)} phút`,
        icon: '/assets/icon.png',
        tag: todo.id
      });
    }
    // Notify if overdue (just became overdue)
    if (diff < 0 && diff > -60000) {
      notifiedIds.add(todo.id);
      new Notification('🔴 TaskFlow - Quá hạn!', {
        body: `"${todo.title}" đã quá hạn`,
        icon: '/assets/icon.png',
        tag: todo.id
      });
    }
  });
}

// ==================== DASHBOARD ====================

const dashModal = document.getElementById('dashboard-modal');

document.getElementById('btn-dashboard')?.addEventListener('click', () => {
  dashModal.style.display = 'flex';
  loadDashboard();
});

document.getElementById('dashboard-close')?.addEventListener('click', () => {
  dashModal.style.display = 'none';
});

dashModal?.addEventListener('click', (e) => {
  if (e.target === dashModal) dashModal.style.display = 'none';
});

async function loadDashboard() {
  try {
    const res = await fetch(`${API_URL}/stats`);
    const stats = await res.json();

    document.getElementById('dash-total').textContent = stats.total;
    document.getElementById('dash-active').textContent = stats.active;
    document.getElementById('dash-done').textContent = stats.completed;
    document.getElementById('dash-overdue').textContent = stats.overdue;

    // Priority bars
    const prioEl = document.getElementById('dash-priorities');
    const maxP = Math.max(stats.priorities.high, stats.priorities.medium, stats.priorities.low, stats.priorities.none, 1);
    prioEl.innerHTML = `
      <div class="prio-bar"><span class="prio-label">Cao</span><div class="prio-fill prio-high" style="width:${(stats.priorities.high/maxP)*100}%"></div><span class="prio-count">${stats.priorities.high}</span></div>
      <div class="prio-bar"><span class="prio-label">TB</span><div class="prio-fill prio-medium" style="width:${(stats.priorities.medium/maxP)*100}%"></div><span class="prio-count">${stats.priorities.medium}</span></div>
      <div class="prio-bar"><span class="prio-label">Thấp</span><div class="prio-fill prio-low" style="width:${(stats.priorities.low/maxP)*100}%"></div><span class="prio-count">${stats.priorities.low}</span></div>
      <div class="prio-bar"><span class="prio-label">Không</span><div class="prio-fill prio-none" style="width:${(stats.priorities.none/maxP)*100}%"></div><span class="prio-count">${stats.priorities.none}</span></div>
    `;

    // Daily chart
    const chartEl = document.getElementById('dash-chart');
    const maxD = Math.max(...stats.dailyStats.map(d => Math.max(d.created, d.completed)), 1);
    chartEl.innerHTML = `
      <div class="chart-legend"><span class="legend-created">■ Tạo</span><span class="legend-done">■ Xong</span></div>
      <div class="chart-bars">
        ${stats.dailyStats.map(d => `
          <div class="chart-day">
            <div class="chart-col">
              <div class="chart-bar bar-created" style="height:${(d.created/maxD)*80}px" title="Tạo: ${d.created}"></div>
              <div class="chart-bar bar-done" style="height:${(d.completed/maxD)*80}px" title="Xong: ${d.completed}"></div>
            </div>
            <span class="chart-label">${d.day}</span>
          </div>
        `).join('')}
      </div>
    `;
  } catch(e) { console.error('Dashboard error:', e); }
}

// AI Weekly Report
document.getElementById('btn-ai-report')?.addEventListener('click', async () => {
  const reportEl = document.getElementById('ai-report');
  const btn = document.getElementById('btn-ai-report');
  btn.disabled = true; btn.textContent = 'Đang tạo...';
  reportEl.innerHTML = '<div class="ai-typing"><span></span><span></span><span></span></div>';

  try {
    const res = await fetch('/api/ai/report');
    if (res.ok) {
      const data = await res.json();
      reportEl.innerHTML = formatAIResponse(data.report);
    } else {
      reportEl.innerHTML = '❌ Lỗi tạo báo cáo';
    }
  } catch(e) {
    reportEl.innerHTML = '❌ Không thể kết nối AI';
  }
  btn.disabled = false; btn.textContent = 'Tạo báo cáo';
});

// ==================== POMODORO — Delegate to global-utils.js ====================
document.getElementById('btn-pomodoro')?.addEventListener('click', () => {
  if (window.globalUtils?.togglePomodoro) window.globalUtils.togglePomodoro();
});

// ==================== PROJECTS ====================
async function loadProjects() {
  try {
    const res = await fetch(`${API_URL}/projects`);
    const projects = await res.json();
    // Update sidebar
    const container = document.getElementById('sidebar-projects');
    if (container) {
      let html = `<button class="project-filter-btn ${!filterProject ? 'active' : ''}" data-project="">Tất cả</button>`;
      projects.forEach(p => {
        html += `<button class="project-filter-btn ${filterProject === p ? 'active' : ''}" data-project="${escapeHtml(p)}">📁 ${escapeHtml(p)}</button>`;
      });
      container.innerHTML = html;
      container.querySelectorAll('.project-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          filterProject = btn.dataset.project;
          container.querySelectorAll('.project-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          render();
        });
      });
    }
    // Update datalist
    const datalist = document.getElementById('project-list');
    if (datalist) {
      datalist.innerHTML = projects.map(p => `<option value="${escapeHtml(p)}">`).join('');
    }
  } catch (e) { console.error('Load projects error:', e); }
}

// ==================== TASK TEMPLATES ====================
const DEFAULT_TEMPLATES = [
  { name: 'Review hàng tuần', title: 'Review tuần', description: 'Đánh giá tiến độ, lập kế hoạch tuần tới', priority: 'medium', recurrence: 'weekly' },
  { name: 'Daily standup', title: 'Daily standup', description: 'Cập nhật tiến độ hàng ngày', priority: 'low', recurrence: 'daily' },
  { name: 'Bug fix', title: 'Fix bug: ', description: 'Mô tả bug, bước tái hiện, giải pháp', priority: 'high', recurrence: 'none' },
  { name: 'Nghiên cứu', title: 'Nghiên cứu: ', description: 'Tìm hiểu, ghi chú kết quả', priority: 'low', recurrence: 'none' },
  { name: 'Meeting', title: 'Họp: ', description: 'Agenda, ghi chú cuộc họp', priority: 'medium', recurrence: 'none' },
  { name: 'Feature mới', title: 'Implement: ', description: 'Yêu cầu, thiết kế, implement, test', priority: 'medium', recurrence: 'none' },
];

function getTemplates() {
  try {
    const saved = localStorage.getItem('todoTemplates');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  } catch { return DEFAULT_TEMPLATES; }
}

function saveTemplates(templates) {
  localStorage.setItem('todoTemplates', JSON.stringify(templates));
}

function renderTemplatesDropdown() {
  const dd = document.getElementById('templates-dropdown');
  if (!dd) return;
  const templates = getTemplates();
  dd.innerHTML = templates.map((t, i) => `
    <div class="template-item" onclick="applyTemplate(${i})">
      <span class="template-name">${escapeHtml(t.name)}</span>
      <span class="template-meta">${t.priority !== 'none' ? t.priority : ''} ${t.recurrence !== 'none' ? '🔄' : ''}</span>
      <button class="template-del" onclick="event.stopPropagation();deleteTemplate(${i})" title="Xóa">&times;</button>
    </div>
  `).join('') + `<div class="template-item template-add" onclick="saveCurrentAsTemplate()">+ Lưu form hiện tại làm mẫu</div>`;
}

function applyTemplate(index) {
  const templates = getTemplates();
  const t = templates[index];
  if (!t) return;
  if (todoInput) todoInput.value = t.title || '';
  if (todoDesc) todoDesc.value = t.description || '';
  if (todoPriority) todoPriority.value = t.priority || 'none';
  if (todoRecurrence) todoRecurrence.value = t.recurrence || 'none';
  const projInput = document.getElementById('todo-project');
  if (projInput && t.project) projInput.value = t.project;
  document.getElementById('templates-dropdown').style.display = 'none';
  todoInput.focus();
  window.globalUtils?.guToast?.('Đã áp dụng mẫu', 'success');
}

function deleteTemplate(index) {
  const templates = getTemplates();
  templates.splice(index, 1);
  saveTemplates(templates);
  renderTemplatesDropdown();
}

function saveCurrentAsTemplate() {
  const name = prompt('Tên mẫu:');
  if (!name) return;
  const templates = getTemplates();
  templates.push({
    name,
    title: todoInput?.value || '',
    description: todoDesc?.value || '',
    priority: todoPriority?.value || 'none',
    recurrence: todoRecurrence?.value || 'none',
    project: document.getElementById('todo-project')?.value || ''
  });
  saveTemplates(templates);
  renderTemplatesDropdown();
  window.globalUtils?.guToast?.('Đã lưu mẫu', 'success');
}

document.getElementById('btn-templates')?.addEventListener('click', () => {
  const dd = document.getElementById('templates-dropdown');
  if (!dd) return;
  const isVisible = dd.style.display !== 'none';
  dd.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) renderTemplatesDropdown();
});

// ==================== BULK MODE ====================
function enterBulkMode() {
  bulkMode = true;
  selectedIds.clear();
  document.getElementById('bulk-bar').style.display = 'flex';
  document.getElementById('bulk-select-all').checked = false;
  updateBulkCount();
  render();
}
function exitBulkMode() {
  bulkMode = false;
  selectedIds.clear();
  document.getElementById('bulk-bar').style.display = 'none';
  render();
}
function toggleBulkSelect(id, checked) {
  if (checked) selectedIds.add(id); else selectedIds.delete(id);
  updateBulkCount();
  const allCb = document.getElementById('bulk-select-all');
  const filtered = getFilteredTodos();
  if (allCb) allCb.checked = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id));
}
function toggleSelectAll(checked) {
  const filtered = getFilteredTodos();
  if (checked) filtered.forEach(t => selectedIds.add(t.id)); else selectedIds.clear();
  updateBulkCount();
  render();
}
function updateBulkCount() {
  const el = document.getElementById('bulk-count');
  if (el) el.textContent = `${selectedIds.size} đã chọn`;
}
async function bulkComplete() {
  if (selectedIds.size === 0) return;
  try {
    await fetch(`${API_URL}/bulk/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selectedIds] }) });
    window.globalUtils?.guToast?.(`Đã hoàn thành ${selectedIds.size} việc`, 'success');
    exitBulkMode();
    await fetchTodos();
  } catch (e) { window.globalUtils?.guToast?.('Lỗi thao tác hàng loạt', 'error'); }
}
async function bulkDelete() {
  if (selectedIds.size === 0) return;
  if (!confirm(`Xóa ${selectedIds.size} công việc?`)) return;
  try {
    await fetch(`${API_URL}/bulk/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selectedIds] }) });
    window.globalUtils?.guToast?.(`Đã xóa ${selectedIds.size} việc`, 'success');
    exitBulkMode();
    await fetchTodos();
  } catch (e) { window.globalUtils?.guToast?.('Lỗi xóa hàng loạt', 'error'); }
}
async function bulkMoveProject() {
  if (selectedIds.size === 0) return;
  const project = prompt('Nhập tên dự án (để trống = gỡ dự án):');
  if (project === null) return;
  try {
    await fetch(`${API_URL}/bulk/move`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selectedIds], project }) });
    window.globalUtils?.guToast?.(`Đã chuyển ${selectedIds.size} việc`, 'success');
    exitBulkMode();
    await fetchTodos();
    loadProjects();
  } catch (e) { window.globalUtils?.guToast?.('Lỗi chuyển dự án', 'error'); }
}

// ==================== INITIAL LOAD ====================
async function init() {
  await fetchTags();
  await fetchTodos();
  loadProjects();
  initNotifications();
  updateViewToggle();
}
init();
