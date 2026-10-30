// ==================== SECOND BRAIN — Frontend ====================

const API = '/api/notes';
let allNotes = [];
let currentView = 'grid'; // grid | list
let editingNoteId = null;
let selectedType = 'note';
let selectedColor = '';
let viewingNote = null;
let pinnedOnly = false;
let showArchived = false;
let draggedNoteId = null;
let draggedNoteCard = null;

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDate();
  loadNotes();
  loadCategories();
  loadTags();
  loadStats();
  bindEvents();
  setupMarkdownEditor();
});

// Theme is handled by global-utils.js, with a fallback for reliability
function initTheme() {
  if (window.globalUtils?.initTheme) {
    window.globalUtils.initTheme();
    return;
  }

  const savedTheme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.body?.setAttribute('data-theme', savedTheme);
  document.documentElement.style.colorScheme = savedTheme;
}

function toggleTheme() {
  if (window.globalUtils?.toggleTheme) {
    window.globalUtils.toggleTheme();
    return;
  }

  const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nextTheme);
  document.body?.setAttribute('data-theme', nextTheme);
  localStorage.setItem('theme', nextTheme);
  document.documentElement.style.colorScheme = nextTheme;
}

function initDate() {
  const el = document.getElementById('nav-date');
  if (el) {
    const d = new Date();
    const opts = { weekday: 'long', day: 'numeric', month: 'long' };
    el.textContent = d.toLocaleDateString('vi-VN', opts);
  }
}

// ==================== API ====================
const _toast = (msg, type) => window.globalUtils?.guToast?.(msg, type);

async function fetchNotes(params = {}) {
  try {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API}?${qs}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Không thể tải tài liệu (HTTP ${res.status})`);
    if (!Array.isArray(data)) throw new Error('Dữ liệu tài liệu trả về không hợp lệ');
    return data;
  } catch (e) { _toast('Lỗi tải ghi chú', 'error'); console.error(e); return []; }
}

async function fetchNoteById(id) {
  try {
    const res = await fetch(`${API}/${id}`);
    return await res.json();
  } catch (e) { _toast('Lỗi tải ghi chú', 'error'); console.error(e); return null; }
}

async function fetchCategories() {
  try {
    const res = await fetch(`${API}/categories`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Không thể tải danh mục (HTTP ${res.status})`);
    return Array.isArray(data) ? data : [];
  } catch (e) { _toast('Lỗi tải danh mục', 'error'); console.error(e); return []; }
}

async function fetchTags() {
  try {
    const res = await fetch(`${API}/tags`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Không thể tải nhãn (HTTP ${res.status})`);
    return Array.isArray(data) ? data : [];
  } catch (e) { _toast('Lỗi tải tags', 'error'); console.error(e); return []; }
}

async function fetchStats() {
  try {
    const res = await fetch(`${API}/stats`);
    return await res.json();
  } catch (e) { _toast('Lỗi tải thống kê', 'error'); console.error(e); return {}; }
}

async function createNote(data) {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    _toast('Đã tạo ghi chú', 'success');
    return await res.json();
  } catch (e) { _toast('Lỗi tạo ghi chú', 'error'); console.error(e); }
}

async function updateNoteAPI(id, data) {
  try {
    const res = await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    _toast('Đã cập nhật', 'success');
    return await res.json();
  } catch (e) { _toast('Lỗi cập nhật', 'error'); console.error(e); }
}

async function reorderNotesAPI(orderedIds) {
  const res = await fetch(`${API}/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds })
  });
  if (!res.ok) {
    const result = await res.json().catch(() => ({}));
    throw new Error(result.error || `Không thể lưu thứ tự (HTTP ${res.status})`);
  }
}

async function togglePinAPI(id) {
  try {
    const res = await fetch(`${API}/${id}/pin`, { method: 'PATCH' });
    return await res.json();
  } catch (e) { _toast('Lỗi ghim', 'error'); console.error(e); }
}

async function deleteNoteAPI(id) {
  try {
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    _toast('Đã xóa ghi chú', 'success');
  } catch (e) { _toast('Lỗi xóa', 'error'); console.error(e); }
}

async function archiveNoteAPI(id) {
  try {
    const res = await fetch(`${API}/${id}/archive`, { method: 'PATCH' });
    return await res.json();
  } catch (e) { _toast('Lỗi lưu trữ', 'error'); console.error(e); }
}

async function unarchiveNoteAPI(id) {
  try {
    const res = await fetch(`${API}/${id}/unarchive`, { method: 'PATCH' });
    return await res.json();
  } catch (e) { _toast('Lỗi khôi phục', 'error'); console.error(e); }
}

// ==================== DATA LOADING ====================
async function loadNotes() {
  const params = {};
  const search = document.getElementById('sb-search-input').value;
  const type = document.getElementById('sb-filter-type').value;
  const category = document.getElementById('sb-filter-category').value;
  const tag = document.getElementById('sb-filter-tag')?.value || '';
  if (search) params.search = search;
  if (type !== 'all') params.type = type;
  if (category) params.category = category;
  if (tag) params.tag = tag;
  if (pinnedOnly) params.pinned = 'true';
  if (showArchived) params.archived = 'true';

  allNotes = await fetchNotes(params);
  const resultsCount = document.getElementById('sb-results-count');
  if (resultsCount) resultsCount.textContent = `${allNotes.length} mục`;
  const clearSearch = document.getElementById('sb-search-clear');
  if (clearSearch) clearSearch.hidden = !search.trim();
  renderNotes();
}

async function loadCategories() {
  const cats = await fetchCategories();
  const select = document.getElementById('sb-filter-category');
  const datalist = document.getElementById('category-list');
  const selectedCategory = select.value;
  select.replaceChildren(new Option('Tất cả danh mục', ''));
  cats.forEach(c => {
    select.add(new Option(c, c));
  });
  select.value = cats.includes(selectedCategory) ? selectedCategory : '';
  if (datalist) {
    datalist.replaceChildren();
    cats.forEach(c => {
      const option = document.createElement('option');
      option.value = c;
      datalist.appendChild(option);
    });
  }
}

async function loadTags() {
  const tags = await fetchTags();
  const select = document.getElementById('sb-filter-tag');
  if (!select) return;
  select.innerHTML = '<option value="">Tất cả tags</option>';
  tags.forEach(t => {
    select.innerHTML += `<option value="${escapeHtml(t)}">#${escapeHtml(t)}</option>`;
  });
}

async function loadStats() {
  const stats = await fetchStats();
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-notes').textContent = stats.notes;
  document.getElementById('stat-links').textContent = stats.links;
  document.getElementById('stat-images').textContent = stats.images;
  document.getElementById('stat-pinned').textContent = stats.pinned;
}

// ==================== RENDER ====================
function renderNotes() {
  const container = document.getElementById('sb-notes');
  const empty = document.getElementById('sb-empty');

  if (allNotes.length === 0) {
    container.style.display = 'none';
    empty.style.display = 'flex';
    const filtered = hasActiveNoteFilters();
    empty.querySelector('h3').textContent = filtered ? 'Không tìm thấy mục phù hợp' : 'Second Brain trống';
    empty.querySelector('p').textContent = filtered
      ? 'Thử đổi từ khóa hoặc xóa bộ lọc để xem các mục khác.'
      : 'Thêm ghi chú, link hoặc hình ảnh để bắt đầu xây dựng kho kiến thức của bạn';
    document.getElementById('btn-add-note-empty').style.display = filtered ? 'none' : '';
    document.getElementById('sb-empty-clear-filters').style.display = filtered ? '' : 'none';
    return;
  }

  container.style.display = '';
  empty.style.display = 'none';
  document.getElementById('btn-add-note-empty').style.display = '';

  const reorderEnabled = isNoteReorderEnabled();
  container.innerHTML = allNotes.map(note => renderNoteCard(note)).join('');
  const reorderHint = document.getElementById('sb-reorder-hint');
  container.classList.toggle('sb-reorder-disabled', !reorderEnabled);
  container.querySelectorAll('.sb-card-drag-handle').forEach(handle => {
    handle.disabled = !reorderEnabled;
    handle.draggable = reorderEnabled;
    handle.title = reorderEnabled ? 'Kéo để sắp xếp' : 'Xóa bộ lọc để sắp xếp';
  });
  if (reorderHint) {
    reorderHint.textContent = reorderEnabled
      ? 'Kéo biểu tượng ⠿ trên thẻ để sắp xếp lại các mục.'
      : 'Xóa tìm kiếm và bộ lọc để kéo thả sắp xếp toàn bộ mục.';
  }

  // Bind card clicks
  container.querySelectorAll('.sb-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.sb-card-pin') || e.target.closest('.sb-card-menu-btn') || e.target.closest('.sb-card-drag-handle')) return;
      const id = card.dataset.id;
      openViewModal(id);
    });
  });

  container.querySelectorAll('.sb-card-drag-handle').forEach(handle => {
    handle.addEventListener('dragstart', (e) => {
      if (!reorderEnabled) {
        e.preventDefault();
        return;
      }
      const card = handle.closest('.sb-card');
      draggedNoteCard = card;
      draggedNoteId = card.dataset.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedNoteId);
      card.classList.add('sb-card-dragging');
    });
  });

  container.querySelectorAll('.sb-card').forEach(card => {
    card.addEventListener('dragover', (e) => {
      if (!draggedNoteCard || card.dataset.pinned !== draggedNoteCard.dataset.pinned) return;
      e.preventDefault();
      const bounds = card.getBoundingClientRect();
      const draggedBounds = draggedNoteCard.getBoundingClientRect();
      const sameGridRow = currentView === 'grid' && Math.abs(bounds.top - draggedBounds.top) < 10;
      const insertBefore = sameGridRow
        ? e.clientX < bounds.left + bounds.width / 2
        : e.clientY < bounds.top + bounds.height / 2;
      card.classList.toggle('sb-card-drop-before', insertBefore);
      card.classList.toggle('sb-card-drop-after', !insertBefore);
    });
    card.addEventListener('dragleave', () => {
      card.classList.remove('sb-card-drop-before', 'sb-card-drop-after');
    });
    card.addEventListener('drop', async (e) => {
      const draggedCard = draggedNoteCard;
      if (!draggedCard || draggedCard === card || draggedCard.dataset.pinned !== card.dataset.pinned || !isNoteReorderEnabled()) return;
      e.preventDefault();
      const insertBefore = card.classList.contains('sb-card-drop-before');
      container.insertBefore(draggedCard, insertBefore ? card : card.nextSibling);
      container.querySelectorAll('.sb-card').forEach(item => item.classList.remove('sb-card-drop-before', 'sb-card-drop-after', 'sb-card-dragging'));
      draggedNoteId = null;
      draggedNoteCard = null;

      try {
        await reorderNotesAPI(Array.from(container.querySelectorAll('.sb-card'), item => item.dataset.id));
        allNotes = Array.from(container.querySelectorAll('.sb-card'), item => allNotes.find(note => note.id === item.dataset.id));
        _toast('Đã lưu thứ tự ghi chú', 'success');
      } catch (error) {
        _toast(error.message, 'error');
        await loadNotes();
      }
    });
  });

  container.addEventListener('dragend', () => {
    draggedNoteId = null;
    draggedNoteCard = null;
    container.querySelectorAll('.sb-card').forEach(card => card.classList.remove('sb-card-drop-before', 'sb-card-drop-after', 'sb-card-dragging'));
  }, { once: true });

  // Bind pin buttons
  container.querySelectorAll('.sb-card-pin').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.closest('.sb-card').dataset.id;
      await togglePinAPI(id);
      loadNotes();
      loadStats();
    });
  });
}

function isNoteReorderEnabled() {
  return !showArchived
    && !pinnedOnly
    && !document.getElementById('sb-search-input').value.trim()
    && document.getElementById('sb-filter-type').value === 'all'
    && !document.getElementById('sb-filter-category').value
    && !document.getElementById('sb-filter-tag')?.value;
}

function hasActiveNoteFilters() {
  return Boolean(
    document.getElementById('sb-search-input').value.trim()
    || document.getElementById('sb-filter-type').value !== 'all'
    || document.getElementById('sb-filter-category').value
    || document.getElementById('sb-filter-tag')?.value
    || pinnedOnly
    || showArchived
  );
}

async function clearNoteFilters() {
  document.getElementById('sb-search-input').value = '';
  document.getElementById('sb-filter-type').value = 'all';
  document.getElementById('sb-filter-category').value = '';
  if (document.getElementById('sb-filter-tag')) document.getElementById('sb-filter-tag').value = '';
  pinnedOnly = false;
  showArchived = false;
  document.getElementById('sb-toggle-pinned').textContent = '📌 Ghim: Tắt';
  document.getElementById('sb-toggle-archived').textContent = '🗄️ Archive: Tắt';
  await loadNotes();
}

function renderNoteCard(note) {
  const typeIcons = {
    note: '📝',
    link: '🔗',
    image: '🖼️'
  };
  const colorStyle = note.color ? `background-color: ${note.color};` : '';
  const darkColorStyle = note.color ? `background-color: ${adjustColorForDark(note.color)};` : '';
  const pinnedClass = note.pinned ? 'sb-card-pinned' : '';
  const dateStr = formatDate(note.updatedAt || note.createdAt);

  let preview = '';
  if (note.type === 'link' && note.url) {
    const domain = getDomain(note.url);
    preview = `
      <div class="sb-card-link-preview">
        <img class="sb-card-favicon" src="${note.favicon || ''}" onerror="this.style.display='none'" alt="">
        <span class="sb-card-domain">${domain}</span>
      </div>`;
  } else if (note.type === 'image' && note.url) {
    preview = `<div class="sb-card-image-preview"><img src="${note.url}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2399%22 stroke-width=%222%22><rect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22/><circle cx=%228.5%22 cy=%228.5%22 r=%221.5%22/><polyline points=%2221 15 16 10 5 21%22/></svg>'" alt=""></div>`;
  } else if (note.content) {
    const truncated = note.content.length > 120 ? note.content.substring(0, 120) + '...' : note.content;
    preview = `<p class="sb-card-content">${escapeHtml(truncated)}</p>`;
  }

  const tagsHtml = (note.tags || []).map(t =>
    `<span class="sb-card-tag">${escapeHtml(t)}</span>`
  ).join('');

  return `
    <div class="sb-card ${pinnedClass}" data-id="${note.id}" data-pinned="${Boolean(note.pinned)}" style="${colorStyle}" data-dark-color="${darkColorStyle}">
      <div class="sb-card-top">
        <button class="sb-card-drag-handle" type="button" draggable="true" title="Kéo để sắp xếp" aria-label="Kéo để sắp xếp">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="5" cy="3" r="1.3"/><circle cx="11" cy="3" r="1.3"/><circle cx="5" cy="8" r="1.3"/><circle cx="11" cy="8" r="1.3"/><circle cx="5" cy="13" r="1.3"/><circle cx="11" cy="13" r="1.3"/></svg>
        </button>
        <span class="sb-card-type">${typeIcons[note.type] || '📝'}</span>
        <button class="sb-card-pin" title="${note.pinned ? 'Bỏ ghim' : 'Ghim'}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${note.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76z"/></svg>
        </button>
      </div>
      <h4 class="sb-card-title">${escapeHtml(note.title)}</h4>
      ${preview}
      <div class="sb-card-footer">
        <div class="sb-card-tags">${tagsHtml}</div>
        <div class="sb-card-meta">
          ${note.category ? `<span class="sb-card-category">${escapeHtml(note.category)}</span>` : ''}
          <span class="sb-card-date">${dateStr}</span>
        </div>
      </div>
    </div>`;
}

// ==================== VIEW MODAL ====================
function openViewModal(id) {
  viewingNote = allNotes.find(n => n.id === id);
  if (!viewingNote) return;

  const modal = document.getElementById('modal-view');
  document.getElementById('modal-view-title').textContent = viewingNote.title;

  // Pin button state
  const pinBtn = document.getElementById('modal-view-pin');
  pinBtn.classList.toggle('active', viewingNote.pinned);

  const body = document.getElementById('modal-view-body');
  let content = '';

  // Type badge
  const typeLabels = { note: '📝 Ghi chú', link: '🔗 Link', image: '🖼️ Hình ảnh' };
  content += `<div class="sb-view-type">${typeLabels[viewingNote.type] || '📝 Ghi chú'}</div>`;

  // URL
  if (viewingNote.url) {
    if (viewingNote.type === 'image') {
      content += `<div class="sb-view-image"><img src="${escapeHtml(viewingNote.url)}" alt="${escapeHtml(viewingNote.title)}"></div>`;
    }
    content += `<div class="sb-view-url"><a href="${escapeHtml(viewingNote.url)}" target="_blank" rel="noopener">${escapeHtml(viewingNote.url)}</a></div>`;
  }

  // Content — render as Markdown
  if (viewingNote.content) {
    content += `<div class="sb-view-content md-rendered">${renderMarkdown(viewingNote.content)}</div>`;
  }

  // Category & Tags
  if (viewingNote.category || (viewingNote.tags && viewingNote.tags.length > 0)) {
    content += '<div class="sb-view-meta">';
    if (viewingNote.category) {
      content += `<span class="sb-view-category">📁 ${escapeHtml(viewingNote.category)}</span>`;
    }
    if (viewingNote.tags && viewingNote.tags.length > 0) {
      content += '<div class="sb-view-tags">';
      viewingNote.tags.forEach(t => {
        content += `<span class="sb-view-tag">#${escapeHtml(t)}</span>`;
      });
      content += '</div>';
    }
    content += '</div>';
  }

  // Dates
  content += `<div class="sb-view-dates">
    <span>Tạo: ${formatDate(viewingNote.createdAt)}</span>
    <span>Cập nhật: ${formatDate(viewingNote.updatedAt)}</span>
  </div>`;

  // Archive actions
  content += `<div class="sb-view-archive">
    <button class="sb-btn sb-btn-ghost" data-action="toggle-archive" type="button">
      ${viewingNote.archived ? '↩️ Khôi phục khỏi Archive' : '🗄️ Lưu vào Archive'}
    </button>
  </div>`;

  // Backlinks placeholder
  content += `<div id="view-backlinks" class="sb-backlinks"><span class="sb-backlinks-loading">\u0110ang t\u1ea3i backlinks...</span></div>`;

  body.innerHTML = content;
  modal.style.display = 'flex';

  // Load backlinks async
  loadBacklinks(id);
}

function closeViewModal() {
  document.getElementById('modal-view').style.display = 'none';
  viewingNote = null;
}

// ==================== ADD/EDIT MODAL ====================
function openNoteModal(note = null) {
  editingNoteId = note ? note.id : null;
  document.getElementById('modal-note-title').textContent = note ? 'Chỉnh sửa' : 'Thêm ghi chú mới';

  // Reset form
  selectedType = note ? note.type : 'note';
  selectedColor = note ? (note.color || '') : '';
  document.getElementById('note-input-title').value = note ? note.title : '';
  document.getElementById('note-input-url').value = note ? (note.url || '') : '';
  document.getElementById('note-input-content').value = note ? (note.content || '') : '';
  document.getElementById('note-input-category').value = note ? (note.category || '') : '';
  document.getElementById('note-input-tags').value = note ? (note.tags || []).join(', ') : '';

  // Type tabs
  document.querySelectorAll('.sb-type-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.type === selectedType);
  });
  updateTypeUI();

  // Color picker
  document.querySelectorAll('.sb-color-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === selectedColor);
  });

  document.getElementById('modal-note').style.display = 'flex';
  document.getElementById('note-input-title').focus();
  resetMdPreview();
}

function closeNoteModal() {
  document.getElementById('modal-note').style.display = 'none';
  editingNoteId = null;
}

function updateTypeUI() {
  const urlGroup = document.getElementById('note-url-group');
  const contentGroup = document.getElementById('note-content-group');
  const contentLabel = contentGroup.querySelector('label');
  const contentTextarea = document.getElementById('note-input-content');

  if (selectedType === 'link') {
    urlGroup.style.display = '';
    contentGroup.style.display = '';
    contentLabel.textContent = 'Mô tả';
    contentTextarea.placeholder = 'Mô tả về link này...';
  } else if (selectedType === 'image') {
    urlGroup.style.display = '';
    contentGroup.style.display = '';
    contentLabel.textContent = 'Mô tả';
    contentTextarea.placeholder = 'Mô tả về hình ảnh...';
    document.getElementById('note-input-url').placeholder = 'URL hình ảnh...';
  } else {
    urlGroup.style.display = 'none';
    contentGroup.style.display = '';
    contentLabel.textContent = 'Nội dung';
    contentTextarea.placeholder = 'Viết ghi chú...';
  }
}

async function saveNote() {
  const title = document.getElementById('note-input-title').value.trim();
  if (!title) {
    document.getElementById('note-input-title').focus();
    return;
  }

  const data = {
    title,
    type: selectedType,
    url: document.getElementById('note-input-url').value.trim(),
    content: document.getElementById('note-input-content').value.trim(),
    category: document.getElementById('note-input-category').value.trim(),
    tags: document.getElementById('note-input-tags').value
      .split(',').map(t => t.trim()).filter(Boolean),
    color: selectedColor
  };

  if (editingNoteId) {
    await updateNoteAPI(editingNoteId, data);
  } else {
    await createNote(data);
  }

  closeNoteModal();
  loadNotes();
  loadCategories();
  loadTags();
  loadStats();
}

// ==================== EVENTS ====================
function bindEvents() {
  // Theme
  const themeButton = document.getElementById('btn-theme');
  if (themeButton && !window.globalUtils?.toggleTheme) {
    themeButton.addEventListener('click', toggleTheme);
  }

  // Add note
  document.getElementById('btn-add-note').addEventListener('click', () => openNoteModal());
  document.getElementById('btn-add-note-empty').addEventListener('click', () => openNoteModal());
  document.getElementById('btn-note-templates')?.addEventListener('click', () => openNoteTemplates());

  // Note modal
  document.getElementById('modal-note-close').addEventListener('click', closeNoteModal);
  document.getElementById('modal-note-cancel').addEventListener('click', closeNoteModal);
  document.getElementById('modal-note-save').addEventListener('click', saveNote);

  // Type tabs
  document.querySelectorAll('.sb-type-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      selectedType = tab.dataset.type;
      document.querySelectorAll('.sb-type-tab').forEach(t => t.classList.toggle('active', t === tab));
      updateTypeUI();
    });
  });

  // Color picker
  document.querySelectorAll('.sb-color-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColor = btn.dataset.color;
      document.querySelectorAll('.sb-color-opt').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  // View modal
  document.getElementById('modal-view-close').addEventListener('click', closeViewModal);
  document.getElementById('modal-view-pin').addEventListener('click', async () => {
    if (!viewingNote) return;
    await togglePinAPI(viewingNote.id);
    closeViewModal();
    loadNotes();
    loadStats();
  });
  document.getElementById('modal-view-edit').addEventListener('click', () => {
    if (!viewingNote) return;
    const noteToEdit = viewingNote; // keep reference before closeViewModal clears it
    closeViewModal();
    // Fetch fresh note to ensure edit form is populated even if local state is stale
    (async () => {
      const fresh = await fetchNoteById(noteToEdit.id);
      if (fresh && !fresh.error) {
        // Backend may return _id instead of id in some cases
        if (!fresh.id && fresh._id) fresh.id = String(fresh._id);
        openNoteModal(fresh);
      } else {
        openNoteModal(noteToEdit);
      }
    })();
  });
  document.getElementById('modal-view-delete').addEventListener('click', async () => {
    if (!viewingNote) return;
    if (!confirm('Xóa ghi chú này vĩnh viễn?')) return;
    await deleteNoteAPI(viewingNote.id);
    closeViewModal();
    loadNotes();
    loadCategories();
    loadTags();
    loadStats();
  });

  // Archive / Unarchive (button is rendered inside view modal)
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="toggle-archive"]');
    if (!btn || !viewingNote) return;
    e.preventDefault();

    if (viewingNote.archived) {
      await unarchiveNoteAPI(viewingNote.id);
      _toast('Đã khôi phục khỏi Archive', 'success');
    } else {
      await archiveNoteAPI(viewingNote.id);
      _toast('Đã lưu vào Archive', 'success');
    }

    closeViewModal();
    await loadNotes();
    await loadCategories();
    await loadTags();
    await loadStats();
  });

  // Search
  let searchTimeout;
  document.getElementById('sb-search-input').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadNotes, 300);
    document.getElementById('sb-search-clear').hidden = !document.getElementById('sb-search-input').value.trim();
  });
  document.getElementById('sb-search-clear').addEventListener('click', () => {
    const searchInput = document.getElementById('sb-search-input');
    searchInput.value = '';
    document.getElementById('sb-search-clear').hidden = true;
    loadNotes();
    searchInput.focus();
  });
  document.getElementById('sb-empty-clear-filters').addEventListener('click', clearNoteFilters);

  // Filters
  document.getElementById('sb-filter-type').addEventListener('change', loadNotes);
  document.getElementById('sb-filter-category').addEventListener('change', loadNotes);
  document.getElementById('sb-filter-tag')?.addEventListener('change', loadNotes);

  // Pinned/Archived toggles
  document.getElementById('sb-toggle-pinned')?.addEventListener('click', async () => {
    pinnedOnly = !pinnedOnly;
    document.getElementById('sb-toggle-pinned').textContent = `📌 Ghim: ${pinnedOnly ? 'Bật' : 'Tắt'}`;
    await loadNotes();
  });

  document.getElementById('sb-toggle-archived')?.addEventListener('click', async () => {
    showArchived = !showArchived;
    document.getElementById('sb-toggle-archived').textContent = `🗄️ Archive: ${showArchived ? 'Bật' : 'Tắt'}`;
    await loadNotes();
  });

  // View toggle
  document.getElementById('btn-view-grid').addEventListener('click', () => setView('grid'));
  document.getElementById('btn-view-list').addEventListener('click', () => setView('list'));

  // Modal overlays
  document.getElementById('modal-note').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-note')) closeNoteModal();
  });
  document.getElementById('modal-view').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-view')) closeViewModal();
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    const targetTag = e.target.tagName?.toLowerCase();
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey
      && !['input', 'textarea', 'select'].includes(targetTag) && !e.target.isContentEditable) {
      e.preventDefault();
      document.getElementById('sb-search-input').focus();
      document.getElementById('sb-search-input').select();
      return;
    }
    if (e.key === 'Escape') {
      if (document.activeElement.id === 'sb-search-input' && document.getElementById('sb-search-input').value) {
        document.getElementById('sb-search-clear').click();
        return;
      }
      closeNoteModal();
      closeViewModal();
    }
  });
}

function setView(view) {
  currentView = view;
  const container = document.getElementById('sb-notes');
  container.classList.toggle('sb-grid-view', view === 'grid');
  container.classList.toggle('sb-list-view', view === 'list');
  document.getElementById('btn-view-grid').classList.toggle('active', view === 'grid');
  document.getElementById('btn-view-list').classList.toggle('active', view === 'list');
}

// ==================== HELPERS ====================
function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(str || '').replace(/[&<>"']/g, c => map[c]);
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch { return url; }
}

function adjustColorForDark(hex) {
  // Return a darker version of the color for dark theme
  if (!hex) return '';
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const darken = (v) => Math.round(v * 0.3);
    return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`;
  } catch { return hex; }
}

// ==================== MARKDOWN EDITOR ====================
let mdPreviewMode = false;

function setupMarkdownEditor() {
  // Toolbar buttons
  document.querySelectorAll('.md-btn[data-md]').forEach(btn => {
    btn.addEventListener('click', () => applyMarkdown(btn.dataset.md));
  });

  // Preview toggle
  document.getElementById('md-toggle-preview')?.addEventListener('click', toggleMdPreview);

  // AI format button
  document.getElementById('md-ai-format')?.addEventListener('click', aiFormatCurrentNoteText);

  // Keyboard shortcuts in textarea
  const textarea = document.getElementById('note-input-content');
  textarea?.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'b') { e.preventDefault(); applyMarkdown('bold'); }
    if (e.ctrlKey && e.key === 'i') { e.preventDefault(); applyMarkdown('italic'); }
    if (e.ctrlKey && e.key === 'k') { e.preventDefault(); applyMarkdown('link'); }
  });

  // Optional: detect large paste and offer AI format
  textarea?.addEventListener('paste', (e) => {
    try {
      const clipboardImageDataUrl = window.taskflowClipboard?.readImageDataUrl?.();
      if (clipboardImageDataUrl) {
        e.preventDefault();
        insertImageMarkdownIntoNote(clipboardImageDataUrl, `clipboard-image-${Date.now()}.png`);
        return;
      }

      const clipboardData = e.clipboardData;
      const imageFiles = [
        ...Array.from(clipboardData?.files || []).filter(file => file.type.startsWith('image/')),
        ...Array.from(clipboardData?.items || [])
          .filter(item => item.type && item.type.startsWith('image/'))
          .map(item => item.getAsFile && item.getAsFile())
          .filter(Boolean)
      ];

      if (imageFiles.length) {
        e.preventDefault();
        insertFilesIntoNoteContent(imageFiles);
        return;
      }

      // Fallback: attempt to read clipboard via async Clipboard API (useful in Electron)
      if (navigator.clipboard && navigator.clipboard.read) {
        try {
          const cbRead = async () => {
            const items = await navigator.clipboard.read();
            const filesFromClipboard = [];
            for (const it of items) {
              for (const type of it.types) {
                if (type.startsWith('image/')) {
                  try {
                    const blob = await it.getType(type);
                    const fname = `pasted-image-${Date.now()}.${type.split('/')[1] || 'png'}`;
                    const file = new File([blob], fname, { type: blob.type });
                    filesFromClipboard.push(file);
                  } catch (_) {}
                }
              }
            }
            if (filesFromClipboard.length) {
              e.preventDefault();
              insertFilesIntoNoteContent(filesFromClipboard);
            }
          };
          // don't await here to avoid blocking paste event handling in some browsers
          cbRead();
        } catch (_) {}
      }

      const pasteText = e.clipboardData?.getData('text/plain') || '';
      if (pasteText && pasteText.length >= 500) {
        setTimeout(() => {
          const cur = String(textarea.value || '').trim();
          if (!cur) return;
          if (confirm('Bạn vừa paste một đoạn dài. Muốn AI tự format thành Markdown (H1/H2/in đậm/list) không?')) {
            aiFormatCurrentNoteText();
          }
        }, 0);
      }
    } catch (_) {}
  });

  // Tab key for indentation
  textarea?.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
    }
  });

  // File upload
  document.getElementById('md-upload-btn')?.addEventListener('click', () => {
    document.getElementById('md-file-input')?.click();
  });
  document.getElementById('md-file-input')?.addEventListener('change', handleFileUpload);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Không thể đọc file'));
    reader.readAsDataURL(file);
  });
}

function insertTextIntoNoteContent(insert) {
  const textarea = document.getElementById('note-input-content');
  if (!textarea) return;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  textarea.value = textarea.value.substring(0, start) + insert + textarea.value.substring(end);
  const cursor = start + insert.length;
  textarea.selectionStart = textarea.selectionEnd = cursor;
  textarea.focus();
}

function insertImageMarkdownIntoNote(dataUrl, fileName) {
  if (!dataUrl) return;
  const insert = `\n![${fileName}](${dataUrl})\n`;
  insertTextIntoNoteContent(insert);
}

async function insertFilesIntoNoteContent(files) {
  if (!files || !files.length) return;
  for (const file of files) {
    const dataUrl = await readFileAsDataUrl(file);
    const insert = file.type.startsWith('image/')
      ? `\n![${file.name}](${dataUrl})\n`
      : `\n[📎 ${file.name}](${dataUrl})\n`;
    insertTextIntoNoteContent(insert);
    _toast(`Đã đính kèm: ${file.name}`, 'success');
  }
}

async function aiFormatCurrentNoteText() {
  const textarea = document.getElementById('note-input-content');
  if (!textarea) return;
  const raw = String(textarea.value || '').trim();
  if (!raw) return _toast('Chưa có nội dung để format', 'error');

  const title = String(document.getElementById('note-input-title')?.value || '').trim();
  const btn = document.getElementById('md-ai-format');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Formatting...'; }

  try {
    const res = await fetch('/api/ai/format-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, text: raw })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Không thể format');
    }

    const md = String(data.markdown || '').trim();
    if (!md) throw new Error('AI không trả về nội dung');

    textarea.value = md;
    resetMdPreview();
    _toast('Đã format xong (Markdown)', 'success');
  } catch (e) {
    _toast('Lỗi AI format: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✨ AI Format'; }
  }
}

function applyMarkdown(type) {
  const textarea = document.getElementById('note-input-content');
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end);
  let before = '', after = '', insert = '';

  switch (type) {
    case 'bold':
      before = '**'; after = '**'; insert = selected || 'bold text';
      break;
    case 'italic':
      before = '*'; after = '*'; insert = selected || 'italic text';
      break;
    case 'code':
      if (selected.includes('\n')) {
        before = '```\n'; after = '\n```'; insert = selected || 'code block';
      } else {
        before = '`'; after = '`'; insert = selected || 'code';
      }
      break;
    case 'h2':
      before = '## '; insert = selected || 'Heading 2';
      break;
    case 'h3':
      before = '### '; insert = selected || 'Heading 3';
      break;
    case 'ul':
      before = '- '; insert = selected || 'item';
      break;
    case 'ol':
      before = '1. '; insert = selected || 'item';
      break;
    case 'link':
      before = '['; after = '](url)'; insert = selected || 'link text';
      break;
    case 'quote':
      before = '> '; insert = selected || 'quote';
      break;
    case 'hr':
      before = '\n---\n'; insert = '';
      break;
  }

  const replacement = before + insert + (after || '');
  textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
  textarea.selectionStart = start + before.length;
  textarea.selectionEnd = start + before.length + insert.length;
  textarea.focus();
}

async function handleFileUpload(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  const maxSize = 2 * 1024 * 1024; // 2MB
  const validFiles = files.filter(file => {
    if (file.size > maxSize) {
      _toast(`File quá lớn: ${file.name} (tối đa 2MB)`, 'error');
      return false;
    }
    return true;
  });
  await insertFilesIntoNoteContent(validFiles);
  e.target.value = '';
}

function toggleMdPreview() {
  mdPreviewMode = !mdPreviewMode;
  const textarea = document.getElementById('note-input-content');
  const preview = document.getElementById('md-preview');
  const btn = document.getElementById('md-toggle-preview');

  if (mdPreviewMode) {
    textarea.style.display = 'none';
    preview.style.display = '';
    preview.innerHTML = renderMarkdown(textarea.value);
    btn.classList.add('active');
    btn.textContent = '✏️ Edit';
  } else {
    textarea.style.display = '';
    preview.style.display = 'none';
    btn.classList.remove('active');
    btn.textContent = '👁 Preview';
  }
}

function resetMdPreview() {
  mdPreviewMode = false;
  const textarea = document.getElementById('note-input-content');
  const preview = document.getElementById('md-preview');
  const btn = document.getElementById('md-toggle-preview');
  if (textarea) textarea.style.display = '';
  if (preview) preview.style.display = 'none';
  if (btn) { btn.classList.remove('active'); btn.textContent = '👁 Preview'; }
}

function renderMarkdown(text) {
  if (!text) return '<p class="empty-text">Không có nội dung</p>';

  let html = escapeHtml(text);

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="md-code-block"><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="md-h">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="md-h">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="md-h">$1</h1>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="md-hr">');

  // Blockquote
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="md-quote">$1</blockquote>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Images ![alt](url) 
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-image" style="max-width:100%;border-radius:8px;margin:8px 0">');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="md-link">$1</a>');

  // Wiki-links [[title]]
  html = html.replace(/\[\[([^\]]+)\]\]/g, (_, title) => {
    const target = allNotes.find(n => n.title.toLowerCase() === title.toLowerCase());
    if (target) {
      return `<a href="#" class="md-wikilink" onclick="event.preventDefault();openViewModal('${target.id}')" title="M\u1edf ghi ch\u00fa: ${escapeHtml(title)}">[[${escapeHtml(title)}]]</a>`;
    }
    return `<span class="md-wikilink-missing" title="Ghi ch\u00fa ch\u01b0a t\u1ed3n t\u1ea1i">[[${escapeHtml(title)}]]</span>`;
  });

  // Images ![alt](url) — before links
  // already escaped so handle after escaping
  
  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li class="md-li">$1</li>');
  html = html.replace(/(<li class="md-li">.*<\/li>\n?)+/g, '<ul class="md-ul">$&</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="md-ol-li">$1</li>');
  html = html.replace(/(<li class="md-ol-li">.*<\/li>\n?)+/g, '<ol class="md-ol">$&</ol>');

  // Line breaks (remaining newlines)
  html = html.replace(/\n/g, '<br>');

  // Clean up extra <br> before/after block elements
  html = html.replace(/<br>\s*(<h[1-3]|<pre|<blockquote|<ul|<ol|<hr)/g, '$1');
  html = html.replace(/(<\/h[1-3]>|<\/pre>|<\/blockquote>|<\/ul>|<\/ol>)\s*<br>/g, '$1');

  return html;
}

// ==================== TAGS MANAGEMENT ====================
async function openTagsManager() {
  try {
    const res = await fetch('/api/notes/tags');
    const tags = await res.json();
    showTagsManagerModal(tags);
  } catch { _toast('Không thể tải tags', 'error'); }
}

function showTagsManagerModal(tags) {
  let overlay = document.getElementById('tags-mgr-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tags-mgr-overlay';
    overlay.className = 'graph-overlay';
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';

  if (tags.length === 0) {
    overlay.innerHTML = `<div class="graph-modal" style="height:auto;max-height:60vh">
      <div class="graph-header"><span class="graph-title">🏷️ Quản lý Tags</span><button class="graph-close" onclick="document.getElementById('tags-mgr-overlay').style.display='none'">&times;</button></div>
      <div style="padding:20px;text-align:center;color:var(--text-secondary)">Chưa có tags nào</div>
    </div>`;
    return;
  }

  overlay.innerHTML = `<div class="graph-modal" style="height:auto;max-height:70vh">
    <div class="graph-header"><span class="graph-title">🏷️ Quản lý Tags (${tags.length})</span><button class="graph-close" onclick="document.getElementById('tags-mgr-overlay').style.display='none'">&times;</button></div>
    <div style="overflow-y:auto;padding:12px 16px;flex:1">
      ${tags.map(t => `
        <div class="tag-mgr-item" id="tag-mgr-${encodeURIComponent(t)}">
          <span class="tag-mgr-name">#${escapeHtml(t)}</span>
          <div class="tag-mgr-actions">
            <button class="sb-btn" style="font-size:.7rem;padding:3px 8px" onclick="renameTagAction('${escapeHtml(t)}')">Đổi tên</button>
            <button class="sb-btn sb-btn-danger" style="font-size:.7rem;padding:3px 8px" onclick="deleteTagAction('${escapeHtml(t)}')">Xóa</button>
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

async function renameTagAction(oldName) {
  const newName = prompt(`Đổi tên tag "${oldName}" thành:`, oldName);
  if (!newName || newName === oldName) return;
  try {
    await fetch('/api/notes/tags/rename', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName })
    });
    _toast(`Đã đổi tên: ${oldName} → ${newName}`, 'success');
    await loadNotes();
    openTagsManager();
  } catch { _toast('Lỗi đổi tên tag', 'error'); }
}

async function deleteTagAction(tagName) {
  if (!confirm(`Xóa tag "${tagName}" khỏi tất cả ghi chú?`)) return;
  try {
    await fetch(`/api/notes/tags/${encodeURIComponent(tagName)}`, { method: 'DELETE' });
    _toast(`Đã xóa tag: ${tagName}`, 'success');
    await loadNotes();
    openTagsManager();
  } catch { _toast('Lỗi xóa tag', 'error'); }
}

// ==================== CATEGORY MANAGEMENT ====================
async function openCategoriesManager() {
  try {
    const res = await fetch(`${API}/categories?includeArchived=true`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showCategoriesManagerModal(await res.json());
  } catch (error) {
    console.error('Unable to load Second Brain categories:', error);
    _toast('Không thể tải danh mục', 'error');
  }
}

function showCategoriesManagerModal(categories) {
  let overlay = document.getElementById('categories-mgr-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'categories-mgr-overlay';
    overlay.className = 'graph-overlay';
    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.closest('.graph-close')) overlay.style.display = 'none';
    });
    document.body.appendChild(overlay);
  }

  const rows = categories.length
    ? categories.map(category => `
      <div class="tag-mgr-item">
        <span class="tag-mgr-name">📁 ${escapeHtml(category)}</span>
        <div class="tag-mgr-actions">
          <button class="sb-btn" type="button" data-category-action="rename" data-category="${escapeHtml(category)}">Đổi tên</button>
          <button class="sb-btn sb-btn-danger" type="button" data-category-action="clear" data-category="${escapeHtml(category)}">Gỡ khỏi ghi chú</button>
        </div>
      </div>`).join('')
    : '<div style="padding:20px;text-align:center;color:var(--text-secondary)">Chưa có danh mục nào</div>';

  overlay.innerHTML = `<div class="graph-modal" style="height:auto;max-height:70vh">
    <div class="graph-header">
      <span class="graph-title">📁 Quản lý danh mục (${categories.length})</span>
      <button class="graph-close" type="button" aria-label="Đóng">&times;</button>
    </div>
    <div style="overflow-y:auto;padding:12px 16px;flex:1">${rows}</div>
  </div>`;
  overlay.style.display = 'flex';
  overlay.querySelectorAll('[data-category-action="rename"]').forEach(button => {
    button.addEventListener('click', () => renameCategoryAction(button.dataset.category));
  });
  overlay.querySelectorAll('[data-category-action="clear"]').forEach(button => {
    button.addEventListener('click', () => clearCategoryAction(button.dataset.category));
  });
}

async function renameCategoryAction(oldName) {
  const newName = prompt(`Đổi tên danh mục "${oldName}" thành:`, oldName)?.trim();
  if (!newName || newName === oldName) return;
  if (newName.length > 100) {
    _toast('Tên danh mục không được vượt quá 100 ký tự', 'error');
    return;
  }

  const selectedCategory = document.getElementById('sb-filter-category').value;
  try {
    const res = await fetch(`${API}/categories`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
    _toast(`Đã đổi tên danh mục thành "${newName}"`, 'success');
    await loadCategories();
    if (selectedCategory === oldName) {
      document.getElementById('sb-filter-category').value = newName;
    }
    await Promise.all([loadNotes(), loadStats()]);
    await openCategoriesManager();
  } catch (error) {
    console.error('Unable to rename Second Brain category:', error);
    _toast(error.message || 'Không thể đổi tên danh mục', 'error');
  }
}

async function clearCategoryAction(category) {
  if (!confirm(`Gỡ danh mục "${category}" khỏi tất cả ghi chú? Ghi chú sẽ không bị xóa.`)) return;
  try {
    const res = await fetch(`${API}/categories/${encodeURIComponent(category)}`, { method: 'DELETE' });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
    _toast(`Đã gỡ danh mục khỏi ${result.modified} ghi chú`, 'success');
    await loadCategories();
    await Promise.all([loadNotes(), loadStats()]);
    await openCategoriesManager();
  } catch (error) {
    console.error('Unable to clear Second Brain category:', error);
    _toast(error.message || 'Không thể gỡ danh mục', 'error');
  }
}

// ==================== VERSION HISTORY ====================
async function openNoteHistory() {
  if (!viewingNote) return;
  try {
    const res = await fetch(`/api/notes/${viewingNote.id}/history`);
    const versions = await res.json();
    if (versions.length === 0) { _toast('Chưa có lịch sử phiên bản', 'info'); return; }
    showHistoryModal(versions);
  } catch { _toast('Không thể tải lịch sử', 'error'); }
}

function showHistoryModal(versions) {
  let overlay = document.getElementById('history-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'history-overlay';
    overlay.className = 'graph-overlay';
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
  overlay.innerHTML = `<div class="graph-modal" style="height:auto;max-height:80vh">
    <div class="graph-header"><span class="graph-title">📜 Lịch sử phiên bản (${versions.length})</span><button class="graph-close" onclick="document.getElementById('history-overlay').style.display='none'">&times;</button></div>
    <div style="overflow-y:auto;padding:12px 16px;flex:1">
      ${versions.map(v => `
        <div class="history-item">
          <div class="history-item-header">
            <span class="history-date">${formatDate(v.savedAt)}</span>
            <span class="history-title">${escapeHtml(v.title)}</span>
            <button class="sb-btn" style="font-size:.7rem;padding:3px 8px" onclick="restoreNoteVersion('${viewingNote.id}','${v.id}')">Khôi phục</button>
          </div>
          <div class="history-content">${escapeHtml((v.content || '').substring(0, 200))}${(v.content || '').length > 200 ? '...' : ''}</div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

async function restoreNoteVersion(noteId, versionId) {
  if (!confirm('Khôi phục phiên bản này? Nội dung hiện tại sẽ được lưu vào lịch sử.')) return;
  try {
    await fetch(`/api/notes/${noteId}/restore/${versionId}`, { method: 'POST' });
    _toast('Đã khôi phục phiên bản', 'success');
    document.getElementById('history-overlay').style.display = 'none';
    await loadNotes();
    openViewModal(noteId);
  } catch { _toast('Lỗi khôi phục', 'error'); }
}

// ==================== BACKLINKS ====================
async function loadBacklinks(noteId) {
  const el = document.getElementById('view-backlinks');
  if (!el) return;
  try {
    const res = await fetch(`/api/notes/${noteId}/backlinks`);
    const backlinks = await res.json();
    if (backlinks.length === 0) {
      el.innerHTML = '<div class="sb-backlinks-empty">Không có backlinks</div>';
    } else {
      el.innerHTML = `<div class="sb-backlinks-title">🔗 Backlinks (${backlinks.length})</div>
        <div class="sb-backlinks-list">${backlinks.map(b =>
          `<a href="#" class="sb-backlink-item" onclick="event.preventDefault();openViewModal('${b.id}')">
            <span class="sb-backlink-type">${b.type === 'link' ? '🔗' : b.type === 'image' ? '🖼️' : '📝'}</span>
            ${escapeHtml(b.title)}
          </a>`
        ).join('')}</div>`;
    }
  } catch { el.innerHTML = ''; }
}

// ==================== GRAPH VIEW ====================
async function openGraphView() {
  try {
    const res = await fetch('/api/notes/graph');
    const { nodes, edges } = await res.json();
    if (nodes.length === 0) { _toast('Chưa có ghi chú nào', 'info'); return; }
    showGraphModal(nodes, edges);
  } catch (e) { _toast('Không thể tải graph', 'error'); }
}

function showGraphModal(nodes, edges) {
  let overlay = document.getElementById('graph-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'graph-overlay';
    overlay.className = 'graph-overlay';
    overlay.innerHTML = `<div class="graph-modal">
      <div class="graph-header"><span class="graph-title">🕸️ Knowledge Graph</span><button class="graph-close" onclick="document.getElementById('graph-overlay').style.display='none'">&times;</button></div>
      <svg id="graph-svg" class="graph-svg"></svg>
    </div>`;
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';

  const svg = document.getElementById('graph-svg');
  const W = svg.clientWidth || 700;
  const H = svg.clientHeight || 500;

  // Simple force-directed layout (pre-compute positions)
  const positions = {};
  const cols = { note: '#3b82f6', link: '#f59e0b', image: '#10b981' };
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const r = Math.min(W, H) * 0.35;
    positions[n.id] = { x: W / 2 + r * Math.cos(angle), y: H / 2 + r * Math.sin(angle) };
  });

  // Simple force iterations
  for (let iter = 0; iter < 50; iter++) {
    nodes.forEach(a => {
      nodes.forEach(b => {
        if (a.id === b.id) return;
        const pa = positions[a.id], pb = positions[b.id];
        let dx = pa.x - pb.x, dy = pa.y - pb.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const repel = 2000 / (dist * dist);
        pa.x += (dx / dist) * repel;
        pa.y += (dy / dist) * repel;
      });
    });
    edges.forEach(e => {
      const ps = positions[e.source], pt = positions[e.target];
      if (!ps || !pt) return;
      let dx = pt.x - ps.x, dy = pt.y - ps.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const attract = (dist - 120) * 0.01;
      ps.x += (dx / dist) * attract;
      ps.y += (dy / dist) * attract;
      pt.x -= (dx / dist) * attract;
      pt.y -= (dy / dist) * attract;
    });
    // Keep in bounds
    nodes.forEach(n => {
      const p = positions[n.id];
      p.x = Math.max(40, Math.min(W - 40, p.x));
      p.y = Math.max(40, Math.min(H - 40, p.y));
    });
  }

  let svgContent = '<defs><marker id="arrow" viewBox="0 0 10 10" refX="20" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"/></marker></defs>';

  edges.forEach(e => {
    const ps = positions[e.source], pt = positions[e.target];
    if (ps && pt) {
      svgContent += `<line x1="${ps.x}" y1="${ps.y}" x2="${pt.x}" y2="${pt.y}" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arrow)" opacity="0.5"/>`;
    }
  });

  nodes.forEach(n => {
    const p = positions[n.id];
    const col = cols[n.type] || '#94a3b8';
    svgContent += `<g class="graph-node" onclick="document.getElementById('graph-overlay').style.display='none';openViewModal('${n.id}')" style="cursor:pointer">
      <circle cx="${p.x}" cy="${p.y}" r="8" fill="${col}" stroke="white" stroke-width="2"/>
      <text x="${p.x}" y="${p.y + 20}" text-anchor="middle" fill="currentColor" font-size="10" class="graph-label">${escapeHtml(n.title.length > 18 ? n.title.substring(0, 16) + '…' : n.title)}</text>
    </g>`;
  });

  svg.innerHTML = svgContent;
}

// ==================== NOTE TEMPLATES ====================
const DEFAULT_NOTE_TEMPLATES = [
  { name: '📝 Meeting Notes', content: `## 📅 Meeting Notes\n\n**Ngày:** ${new Date().toLocaleDateString('vi-VN')}\n**Người tham gia:** \n**Chủ đề:** \n\n### 📌 Nội dung chính\n- \n\n### ✅ Action Items\n- [ ] \n\n### 📝 Ghi chú thêm\n` },
  { name: '📓 Daily Journal', content: `## 📓 Nhật ký ngày ${new Date().toLocaleDateString('vi-VN')}\n\n### 😊 Tâm trạng hôm nay\n\n\n### ✅ Đã làm được\n- \n\n### 📚 Đã học\n- \n\n### 💡 Suy nghĩ\n\n\n### 🎯 Mục tiêu ngày mai\n- \n` },
  { name: '📖 Book Review', content: `## 📖 Review sách\n\n**Tên sách:** \n**Tác giả:** \n**Thể loại:** \n**Đánh giá:** ⭐⭐⭐⭐⭐\n\n### 📋 Tóm tắt\n\n\n### 💡 Bài học rút ra\n1. \n2. \n3. \n\n### 📝 Trích dẫn hay\n> \n\n### 🎯 Áp dụng\n- \n` },
  { name: '🔬 Nghiên cứu', content: `## 🔬 Nghiên cứu: [Chủ đề]\n\n### 📌 Câu hỏi nghiên cứu\n\n\n### 📚 Nguồn tham khảo\n- \n\n### 📝 Ghi chú\n\n\n### 💡 Phát hiện chính\n1. \n2. \n\n### ❓ Câu hỏi mở\n- \n` },
  { name: '🎯 Project Plan', content: `## 🎯 Dự án: [Tên]\n\n### 📋 Mô tả\n\n\n### 🎯 Mục tiêu\n- \n\n### 📅 Timeline\n| Giai đoạn | Thời gian | Trạng thái |\n|-----------|-----------|------------|\n| Phase 1   |           | ⏳          |\n\n### ✅ Tasks\n- [ ] \n\n### ⚠️ Rủi ro\n- \n` },
  { name: '💻 Code Snippet', content: `## 💻 Code: [Mô tả]\n\n**Ngôn ngữ:** \n**Mục đích:** \n\n\`\`\`\n// Code ở đây\n\`\`\`\n\n### 📝 Giải thích\n\n\n### 🔗 Liên quan\n- \n` }
];

function openNoteTemplates() {
  const templates = getNoteTemplates();
  const overlay = document.createElement('div');
  overlay.className = 'note-tpl-overlay';
  overlay.innerHTML = `
    <div class="note-tpl-modal">
      <div class="note-tpl-header">
        <h3>📋 Mẫu ghi chú</h3>
        <button class="note-tpl-close" onclick="this.closest('.note-tpl-overlay').remove()">&times;</button>
      </div>
      <div class="note-tpl-list">
        ${templates.map((t, i) => `
          <div class="note-tpl-item" onclick="applyNoteTemplate(${i}); this.closest('.note-tpl-overlay').remove()">
            <div class="note-tpl-name">${escapeHtml(t.name)}</div>
            <div class="note-tpl-preview">${escapeHtml(t.content.substring(0, 80))}...</div>
          </div>
        `).join('')}
      </div>
      <div class="note-tpl-footer">
        <button class="sb-btn sb-btn-ghost" onclick="saveCurrentAsNoteTemplate(); this.closest('.note-tpl-overlay').remove()">💾 Lưu note hiện tại làm mẫu</button>
      </div>
    </div>
  `;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function getNoteTemplates() {
  try {
    const stored = localStorage.getItem('noteTemplates');
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_NOTE_TEMPLATES;
}

function applyNoteTemplate(index) {
  const templates = getNoteTemplates();
  const tpl = templates[index];
  if (!tpl) return;
  openNoteModal();
  setTimeout(() => {
    document.getElementById('note-input-content').value = tpl.content;
    document.getElementById('note-input-title').value = '';
    document.getElementById('note-input-title').focus();
  }, 100);
}

function saveCurrentAsNoteTemplate() {
  const content = document.getElementById('note-input-content')?.value?.trim();
  if (!content) return _toast('Không có nội dung để lưu mẫu', 'error');
  const name = prompt('Tên mẫu:');
  if (!name) return;
  const templates = getNoteTemplates();
  templates.push({ name, content });
  localStorage.setItem('noteTemplates', JSON.stringify(templates));
  _toast('Đã lưu mẫu "' + name + '"', 'success');
}

// ==================== AI SUMMARIZE NOTE ====================
async function aiSummarizeNote() {
  if (!viewingNote || !viewingNote.content) return _toast('Ghi chú không có nội dung', 'error');

  const btn = document.getElementById('modal-view-summarize');
  if (btn) btn.style.opacity = '0.5';

  try {
    const res = await fetch('/api/ai/summarize-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: viewingNote.title, content: viewingNote.content })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    // Show summary in a floating panel
    const existing = document.querySelector('.ai-summary-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.className = 'ai-summary-panel';
    panel.innerHTML = `
      <div class="ai-summary-header">
        <span>🤖 AI Tóm tắt</span>
        <button onclick="this.closest('.ai-summary-panel').remove()">&times;</button>
      </div>
      <div class="ai-summary-body">${data.summary.replace(/\n/g, '<br>')}</div>
    `;
    document.getElementById('modal-view-body').prepend(panel);
  } catch (e) {
    _toast('Lỗi tóm tắt: ' + e.message, 'error');
  }
  if (btn) btn.style.opacity = '1';
}
