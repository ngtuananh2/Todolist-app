const API_URL = '/api/todos';
const TAG_URL = '/api/tags';

// ==================== STATE ====================
let todos = [];
let tags = [];
let currentFilter = 'all';
let searchQuery = '';
let selectedTagIds = new Set();
let tagsDropdownOpen = false;
let priorityFirst = false;

// ==================== DOM ELEMENTS ====================
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoDeadline = document.getElementById('todo-deadline');
const todoPriority = document.getElementById('todo-priority');
const todoDesc = document.getElementById('todo-desc');
const todoList = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const statsText = document.getElementById('stats-text');
const btnClear = document.getElementById('btn-clear');
const filterBtns = document.querySelectorAll('.tab');
const greetingEl = document.getElementById('greeting');
const footerStats = document.getElementById('footer-stats');

// Search
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');

// Sidebar stats
const statTotal = document.querySelector('#stat-total .stat-num');
const statActive = document.querySelector('#stat-active .stat-num');
const statDone = document.querySelector('#stat-done .stat-num');

// Progress ring
const progressLabel = document.getElementById('progress-label');
const progressPercent = document.getElementById('progress-percent');
const progressRing = document.getElementById('progress-ring');
const RING_CIRCUMFERENCE = 2 * Math.PI * 34;

// Tabs
const tabCount = document.getElementById('tab-count');

// Nav date
const navDate = document.getElementById('nav-date');

// Tags
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
  if (h < 12) text = 'Chào buổi sáng!';
  else if (h < 18) text = 'Chào buổi chiều!';
  else text = 'Chào buổi tối!';
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
}

async function addTodo(title, deadline, priority, description, tagIds) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, deadline: deadline || null, priority, description, tagIds })
  });
  if (res.ok) {
    await fetchTodos();
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
    todos = todos.filter(t => t.id !== id);
    render();
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
  if (res.ok) {
    await fetchTodos();
  }
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
  if (res.ok) {
    await fetchTags();
  }
}

async function deleteTag(tagId) {
  await fetch(`${TAG_URL}/${tagId}`, { method: 'DELETE' });
  await fetchTags();
  await fetchTodos();
}

// ==================== RENDER ====================

function getFilteredTodos() {
  let filtered = todos;
  switch (currentFilter) {
    case 'active': filtered = filtered.filter(t => !t.completed); break;
    case 'completed': filtered = filtered.filter(t => t.completed); break;
  }
  return filtered;
}

function render() {
  const filtered = getFilteredTodos();
  const completedCount = todos.filter(t => t.completed).length;
  const activeCount = todos.length - completedCount;
  const total = todos.length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  // Sidebar stats
  if (statTotal) statTotal.textContent = total;
  if (statActive) statActive.textContent = activeCount;
  if (statDone) statDone.textContent = completedCount;

  // Progress ring
  if (progressRing) {
    const offset = RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE;
    progressRing.style.strokeDasharray = RING_CIRCUMFERENCE;
    progressRing.style.strokeDashoffset = offset;
  }
  if (progressPercent) progressPercent.textContent = `${pct}%`;
  if (progressLabel) progressLabel.textContent = `${completedCount} / ${total} hoàn thành`;

  // Tab count
  if (tabCount) tabCount.textContent = filtered.length > 0 ? `${filtered.length} việc` : '';

  // Footer
  if (total > 0) {
    footerStats.style.display = '';
    statsText.textContent = `${total} tổng · ${activeCount} đang làm · ${completedCount} đã xong`;
  } else {
    footerStats.style.display = 'none';
  }

  btnClear.style.display = completedCount > 0 ? 'flex' : 'none';

  // Empty state
  if (filtered.length === 0) {
    todoList.innerHTML = '';
    emptyState.classList.add('show');
    return;
  }

  emptyState.classList.remove('show');

  // Group by creation date
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

  return `
    <li class="todo-item ${todo.completed ? 'completed' : ''} ${priorityClass}" data-id="${todo.id}">
      <div class="todo-checkbox" onclick="toggleTodo(${todo.id})"></div>
      <div class="todo-body">
        <div class="todo-title-row">
          ${priorityClass ? `<span class="priority-dot priority-dot-${todo.priority}" title="${getPriorityLabel(todo.priority)}"></span>` : ''}
          <span class="todo-title">${escapeHtml(todo.title)}</span>
        </div>
        ${descHtml}
        ${tagsHtml}
        ${metaHtml ? `<div class="todo-meta">${metaHtml}</div>` : ''}
        ${subtasksHtml}
      </div>
      <div class="todo-actions">
        <button class="btn-action btn-edit" onclick="startEdit(${todo.id})" title="Sửa">✏️</button>
        <button class="btn-action btn-delete" onclick="deleteTodo(${todo.id})" title="Xóa">✕</button>
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
            <input type="checkbox" ${sub.completed ? 'checked' : ''} onchange="toggleSubtask(${sub.id}, this.checked)">
            <span class="subtask-title">${escapeHtml(sub.title)}</span>
          </label>
          <button class="subtask-delete" onclick="deleteSubtask(${sub.id})" title="Xóa">&times;</button>
        </li>`;
    });
    html += `</ul>`;
  }

  html += `
    <div class="subtask-add-row">
      <input type="text" class="subtask-add-input" placeholder="Thêm việc con..." maxlength="100" 
        onkeydown="if(event.key==='Enter'){event.preventDefault();handleAddSubtask(${todo.id},this)}">
      <button class="subtask-add-btn" onclick="handleAddSubtask(${todo.id}, this.previousElementSibling)">+</button>
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

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2, none: 3 };

function sortByPriority(list) {
  if (!priorityFirst) return list;
  return [...list].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 3;
    const pb = PRIORITY_ORDER[b.priority] ?? 3;
    return pa - pb;
  });
}

function groupByDate(todos) {
  const map = new Map();
  const sorted = [...todos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  sorted.forEach(todo => {
    const dateKey = todo.createdAt ? new Date(todo.createdAt).toDateString() : 'unknown';
    if (!map.has(dateKey)) map.set(dateKey, []);
    map.get(dateKey).push(todo);
  });

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

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
    groups.push({ label, todos: sortByPriority(items) });
  });

  return groups;
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

  // Created at
  if (todo.createdAt) {
    const d = new Date(todo.createdAt);
    const time = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    parts.push(`
      <span class="todo-meta-item meta-created">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Tạo lúc ${time}
      </span>
    `);
  }

  // Deadline
  if (todo.deadline) {
    const status = todo.completed ? '' : getDeadlineStatus(todo.deadline);
    const relative = todo.completed ? '' : ` · ${getRelativeTime(todo.deadline)}`;
    parts.push(`
      <span class="todo-meta-item meta-deadline ${status}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${formatDateTime(todo.deadline)}${relative}
      </span>
    `);
  }

  // Completed at
  if (todo.completed && todo.completedAt) {
    parts.push(`
      <span class="todo-meta-item meta-completed-at">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Xong lúc ${formatDateTime(todo.completedAt)}
      </span>
    `);
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
      <button class="sidebar-tag-del" onclick="deleteTag(${t.id})" title="Xóa nhãn">&times;</button>
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
        onchange="handleFormTagToggle(${t.id}, this.checked)">
      <span class="form-tag-dot" style="background:${t.color}"></span>
      <span>${escapeHtml(t.name)}</span>
    </label>
  `).join('');
  updateTagsPlaceholder();
}

function handleFormTagToggle(tagId, checked) {
  if (checked) selectedTagIds.add(tagId);
  else selectedTagIds.delete(tagId);
  updateTagsPlaceholder();
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
      </div>
      ${tags.length > 0 ? `<div class="edit-tags">${tagCheckboxes}</div>` : ''}
      <div class="edit-actions">
        <button class="btn-save-edit" onclick="saveEdit(${id})">Lưu</button>
        <button class="btn-cancel-edit" onclick="render()">Hủy</button>
      </div>
    </div>
  `;

  const input = li.querySelector('.todo-edit-input');
  input.focus();
  input.select();

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
  const tagCheckboxes = li.querySelectorAll('.edit-tag-option input:checked');
  const tagIds = Array.from(tagCheckboxes).map(cb => parseInt(cb.value));

  if (title) {
    updateTodo(id, { title, description, priority, deadline, tagIds });
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

// ==================== EVENT LISTENERS ====================

// Add todo
todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = todoInput.value.trim();
  if (title) {
    const deadline = todoDeadline.value || null;
    const priority = todoPriority.value || 'none';
    const description = todoDesc.value.trim();
    const tagIds = Array.from(selectedTagIds);
    addTodo(title, deadline, priority, description, tagIds);
    todoInput.value = '';
    todoDeadline.value = '';
    todoPriority.value = 'none';
    todoDesc.value = '';
    todoDesc.style.height = 'auto';
    selectedTagIds.clear();
    renderFormTagsDropdown();
    todoInput.focus();
  }
});

// Filter buttons
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

// Clear completed
btnClear.addEventListener('click', clearCompleted);

// Sort priority toggle
const sortPriorityBtn = document.getElementById('sort-priority-btn');
sortPriorityBtn?.addEventListener('click', () => {
  priorityFirst = !priorityFirst;
  sortPriorityBtn.classList.toggle('active', priorityFirst);
  render();
});

// Tags dropdown toggle
formTagsSelect?.addEventListener('click', (e) => {
  e.stopPropagation();
  tagsDropdownOpen = !tagsDropdownOpen;
  formTagsDropdown.classList.toggle('open', tagsDropdownOpen);
});

// Close tags dropdown on outside click
document.addEventListener('click', () => {
  if (tagsDropdownOpen) {
    tagsDropdownOpen = false;
    formTagsDropdown.classList.remove('open');
  }
});
formTagsDropdown?.addEventListener('click', e => e.stopPropagation());

// Add tag
btnAddTag?.addEventListener('click', () => {
  const name = tagNameInput.value.trim();
  if (name) {
    createTag(name, tagColorInput.value);
    tagNameInput.value = '';
  }
});
tagNameInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    btnAddTag.click();
  }
});

// ==================== INITIAL LOAD ====================
async function init() {
  await fetchTags();
  await fetchTodos();
}
init();

// ==================== AI CHAT ====================
const aiFab = document.getElementById('ai-fab');
const aiPanel = document.getElementById('ai-panel');
const aiBtnClose = document.getElementById('ai-btn-close');
const aiBtnClear = document.getElementById('ai-btn-clear');
const aiMessages = document.getElementById('ai-messages');
const aiInputForm = document.getElementById('ai-input-form');
const aiInput = document.getElementById('ai-input');
const aiSendBtn = document.getElementById('ai-send-btn');
const aiSuggestions = document.getElementById('ai-suggestions');

let aiPanelOpen = false;
let aiLoading = false;

// Toggle panel
aiFab?.addEventListener('click', () => {
  aiPanelOpen = !aiPanelOpen;
  aiPanel.classList.toggle('open', aiPanelOpen);
  aiFab.classList.toggle('active', aiPanelOpen);
  if (aiPanelOpen) {
    aiInput.focus();
    scrollAIToBottom();
  }
});

aiBtnClose?.addEventListener('click', () => {
  aiPanelOpen = false;
  aiPanel.classList.remove('open');
  aiFab.classList.remove('active');
});

// Clear chat
aiBtnClear?.addEventListener('click', async () => {
  await fetch('/api/ai/chat', { method: 'DELETE' });
  // Reset to welcome message
  aiMessages.innerHTML = `
    <div class="ai-msg ai-msg-bot">
      <div class="ai-msg-avatar">🤖</div>
      <div class="ai-msg-content">
        <p>Cuộc trò chuyện đã được xóa. Hỏi tôi bất cứ điều gì!</p>
      </div>
    </div>
  `;
  aiSuggestions.style.display = '';
});

// Send message
aiInputForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = aiInput.value.trim();
  if (msg && !aiLoading) {
    sendAIMessage(msg);
    aiInput.value = '';
  }
});

// Suggestion chips
document.querySelectorAll('.ai-suggestion-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const msg = chip.dataset.msg;
    if (msg && !aiLoading) {
      sendAIMessage(msg);
      aiSuggestions.style.display = 'none';
    }
  });
});

async function sendAIMessage(message) {
  aiLoading = true;
  aiSendBtn.disabled = true;
  aiSuggestions.style.display = 'none';

  // Add user message
  appendAIMessage('user', message);

  // Add loading indicator
  const loadingEl = document.createElement('div');
  loadingEl.className = 'ai-msg ai-msg-bot ai-msg-loading';
  loadingEl.innerHTML = `
    <div class="ai-msg-avatar">🤖</div>
    <div class="ai-msg-content">
      <div class="ai-typing">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  aiMessages.appendChild(loadingEl);
  scrollAIToBottom();

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    loadingEl.remove();

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      appendAIMessage('bot', `❌ ${err.error || 'Lỗi kết nối AI. Vui lòng thử lại.'}`);
      return;
    }

    const data = await res.json();

    // Show AI reply
    appendAIMessage('bot', data.reply);

    // If AI created todos, refresh the list and show notification
    if (data.actions && data.actions.type === 'todos_created') {
      const count = data.actions.todos.length;
      appendAIMessage('system', `✅ Đã tạo ${count} công việc mới!`);
      await fetchTodos(); // Refresh todo list
    }

  } catch (err) {
    loadingEl.remove();
    appendAIMessage('bot', '❌ Không thể kết nối đến AI. Kiểm tra kết nối mạng.');
  } finally {
    aiLoading = false;
    aiSendBtn.disabled = false;
  }
}

function appendAIMessage(role, text) {
  const div = document.createElement('div');

  if (role === 'system') {
    div.className = 'ai-msg ai-msg-system';
    div.innerHTML = `<div class="ai-msg-content ai-system-msg">${text}</div>`;
  } else if (role === 'user') {
    div.className = 'ai-msg ai-msg-user';
    div.innerHTML = `
      <div class="ai-msg-content">${escapeHtml(text)}</div>
      <div class="ai-msg-avatar">👤</div>
    `;
  } else {
    div.className = 'ai-msg ai-msg-bot';
    div.innerHTML = `
      <div class="ai-msg-avatar">🤖</div>
      <div class="ai-msg-content">${formatAIResponse(text)}</div>
    `;
  }

  aiMessages.appendChild(div);
  scrollAIToBottom();
}

function formatAIResponse(text) {
  // Convert markdown-like formatting to HTML
  let html = escapeHtml(text);
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  // Lists (simple)
  html = html.replace(/^- (.+)/gm, '• $1');
  return html;
}

function scrollAIToBottom() {
  requestAnimationFrame(() => {
    aiMessages.scrollTop = aiMessages.scrollHeight;
  });
}
