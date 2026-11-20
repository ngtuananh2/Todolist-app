(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const today = getLocalDate();
  let selectedMonth = today.slice(0, 7);
  let selectedWishlistFilter = 'all';
  let entries = { weights: [], memories: [], wishlist: [] };
  let editingMemoryId = null;
  let editingWishlistId = null;

  function getLocalDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function escapeHtml(value) {
    const element = document.createElement('span');
    element.textContent = String(value ?? '');
    return element.innerHTML.replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }

  function formatDate(value, options = { day: 'numeric', month: 'short' }) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN', options);
  }

  function formatWeight(value) {
    return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(value);
  }

  function monthDate(month) {
    const [year, monthNumber] = month.split('-').map(Number);
    return new Date(year, monthNumber - 1, 1);
  }

  function dateForSelectedMonth() {
    return today.startsWith(selectedMonth) ? today : `${selectedMonth}-01`;
  }

  function announce(message, type = 'success') {
    window.globalUtils?.guToast?.(message, type);
  }

  async function request(url, method = 'GET', body) {
    const options = { method, headers: {} };
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Yêu cầu thất bại (HTTP ${response.status})`);
    return result;
  }

  function setMonthLabel() {
    const month = monthDate(selectedMonth);
    $('journal-month-label').textContent = month.toLocaleDateString('vi-VN', {
      month: 'long',
      year: 'numeric'
    });
    $('journal-month').value = selectedMonth;
  }

  async function loadEntries() {
    setMonthLabel();
    try {
      entries = await request(`/api/journal?month=${encodeURIComponent(selectedMonth)}`);
      renderWeights();
      renderMemories();
      renderWishlist();
    } catch (error) {
      console.error('[journal] Cannot load entries:', error);
      announce(error.message || 'Không thể tải nhật ký', 'error');
    }
  }

  function renderWeightChart(weights) {
    const wrap = $('weight-chart-wrap');
    const svg = $('weight-chart');
    const empty = $('weight-chart-empty');
    svg.replaceChildren();
    wrap.classList.toggle('has-data', weights.length > 0);
    empty.textContent = 'Ghi lại vài lần cân để thấy nhịp thay đổi.';
    if (!weights.length) return;

    const width = 560;
    const height = 150;
    const inset = { top: 16, right: 12, bottom: 20, left: 12 };
    const values = weights.map(item => Number(item.weight));
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const spread = maximum - minimum || 1;
    const points = values.map((value, index) => {
      const x = weights.length === 1
        ? width / 2
        : inset.left + index / (weights.length - 1) * (width - inset.left - inset.right);
      const y = inset.top + (maximum - value + spread * .12) / (spread * 1.24) * (height - inset.top - inset.bottom);
      return { x, y };
    });

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', points.map(point => `${point.x},${point.y}`).join(' '));
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', 'var(--accent)');
    line.setAttribute('stroke-width', '3');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke-linejoin', 'round');
    svg.append(line);

    points.forEach((point, index) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(point.x));
      circle.setAttribute('cy', String(point.y));
      circle.setAttribute('r', index === points.length - 1 ? '5' : '3.2');
      circle.setAttribute('fill', 'var(--surface)');
      circle.setAttribute('stroke', 'var(--accent)');
      circle.setAttribute('stroke-width', index === points.length - 1 ? '3' : '2');
      svg.append(circle);
    });
  }

  function renderWeights() {
    const weights = entries.weights;
    const latest = weights[weights.length - 1];
    $('weight-latest').textContent = latest ? formatWeight(latest.weight) : '—';
    $('weight-count').textContent = weights.length
      ? `${weights.length} lần ghi cân trong tháng`
      : 'Chưa có lần cân nào trong tháng';

    if (weights.length > 1) {
      const change = Number(latest.weight) - Number(weights[0].weight);
      const sign = change > 0 ? '+' : '';
      $('weight-delta').textContent = `${sign}${formatWeight(change)} kg từ đầu tháng`;
    } else {
      $('weight-delta').textContent = weights.length ? 'Cần thêm lần cân để so sánh' : '—';
    }
    renderWeightChart(weights);

    $('weight-list-count').textContent = String(weights.length);
    const list = $('weight-list');
    if (!weights.length) {
      list.innerHTML = '<div class="journal-empty-state">Chưa có dữ liệu cân nặng trong tháng này.</div>';
      return;
    }

    list.innerHTML = [...weights].reverse().map(item => `
      <article class="weight-row">
        <div class="weight-row-date">
          <span class="weight-row-mark" aria-hidden="true">◉</span>
          <div class="weight-row-copy">
            <strong>${escapeHtml(formatDate(item.date, { weekday: 'short', day: 'numeric', month: 'long' }))}</strong>
            ${item.content ? `<small>${escapeHtml(item.content)}</small>` : ''}
          </div>
        </div>
        <div class="weight-row-date">
          <strong class="weight-row-value">${escapeHtml(formatWeight(item.weight))} kg</strong>
          <div class="journal-item-actions">
            <button type="button" class="journal-text-action" data-edit-weight="${escapeHtml(item.id)}">Sửa</button>
            <button type="button" class="journal-text-action danger" data-delete-entry="${escapeHtml(item.id)}" aria-label="Xóa lần cân ngày ${escapeHtml(item.date)}">Xóa</button>
          </div>
        </div>
      </article>
    `).join('');
  }

  function renderMemories() {
    const list = $('memory-list');
    $('memory-list-count').textContent = String(entries.memories.length);
    if (!entries.memories.length) {
      list.innerHTML = '<div class="journal-empty-state">Tháng này vẫn còn chỗ cho những điều đáng nhớ.</div>';
      return;
    }

    list.innerHTML = entries.memories.map(item => `
      <article class="memory-item">
        <div class="memory-item-top">
          <span class="memory-date">${escapeHtml(formatDate(item.date, { weekday: 'long', day: 'numeric', month: 'long' }))}</span>
          <div class="journal-item-actions">
            <button type="button" class="journal-text-action" data-edit-memory="${escapeHtml(item.id)}">Sửa</button>
            <button type="button" class="journal-text-action danger" data-delete-entry="${escapeHtml(item.id)}">Xóa</button>
          </div>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        ${item.content ? `<p>${escapeHtml(item.content)}</p>` : ''}
      </article>
    `).join('');
  }

  const wishlistStatusLabels = {
    want: 'Đang muốn',
    'in-progress': 'Đang thực hiện',
    done: 'Đã hoàn thành'
  };

  function renderWishlist() {
    const filtered = selectedWishlistFilter === 'all'
      ? entries.wishlist
      : entries.wishlist.filter(item => item.status === selectedWishlistFilter);
    $('wishlist-list-count').textContent = String(entries.wishlist.length);
    const list = $('wishlist-list');
    if (!filtered.length) {
      list.innerHTML = `<div class="journal-card journal-empty-state">${entries.wishlist.length
        ? 'Không có mục nào trong nhóm này.'
        : 'Thêm điều bạn muốn trải nghiệm, học hỏi hoặc sở hữu.'}</div>`;
      return;
    }

    list.innerHTML = filtered.map(item => `
      <article class="wishlist-item ${item.status === 'done' ? 'is-done' : ''}">
        <div class="wishlist-item-top">
          ${item.category ? `<span class="wishlist-category">${escapeHtml(item.category)}</span>` : '<span></span>'}
          <select class="wishlist-status" data-wishlist-status="${escapeHtml(item.id)}" aria-label="Trạng thái ${escapeHtml(item.title)}">
            ${Object.entries(wishlistStatusLabels).map(([value, label]) => `
              <option value="${value}" ${item.status === value ? 'selected' : ''}>${label}</option>
            `).join('')}
          </select>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        ${item.content ? `<p>${escapeHtml(item.content)}</p>` : ''}
        <div class="journal-item-actions">
          <button type="button" class="journal-text-action" data-edit-wishlist="${escapeHtml(item.id)}">Sửa</button>
          <button type="button" class="journal-text-action danger" data-delete-entry="${escapeHtml(item.id)}">Xóa</button>
        </div>
      </article>
    `).join('');
  }

  function changeTab(tabName) {
    document.querySelectorAll('.journal-tab').forEach(tab => {
      const selected = tab.dataset.tab === tabName;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll('.journal-panel').forEach(panel => {
      panel.hidden = panel.dataset.panel !== tabName;
    });
  }

  function resetWeightForm() {
    $('weight-form').reset();
    $('weight-date').value = dateForSelectedMonth();
  }

  function fillWeightForDate() {
    const entry = entries.weights.find(item => item.date === $('weight-date').value);
    $('weight-value').value = entry ? entry.weight : '';
    $('weight-note').value = entry ? entry.content : '';
  }

  function resetMemoryForm() {
    $('memory-form').reset();
    editingMemoryId = null;
    $('memory-form').dataset.editingId = '';
    $('memory-date').value = dateForSelectedMonth();
    $('memory-form-eyebrow').textContent = 'GIỮ LẠI ĐIỀU ĐÁNG NHỚ';
    $('memory-form-title').textContent = 'Một điều của tháng này';
    $('memory-save').textContent = 'Lưu kỷ niệm';
    $('memory-cancel').hidden = true;
  }

  function resetWishlistForm() {
    $('wishlist-form').reset();
    editingWishlistId = null;
    $('wishlist-form').dataset.editingId = '';
    $('wishlist-form-eyebrow').textContent = 'ĐIỀU BẠN MUỐN LÀM, CÓ THỂ LÀM ĐƯỢC';
    $('wishlist-form-title').textContent = 'Thêm vào wishlist';
    $('wishlist-save').textContent = 'Thêm mong muốn';
    $('wishlist-cancel').hidden = true;
  }

  function setSubmitting(button, isSubmitting, idleText) {
    button.disabled = isSubmitting;
    button.textContent = isSubmitting ? 'Đang lưu…' : idleText;
  }

  async function submitWeight(event) {
    event.preventDefault();
    const button = $('weight-save');
    setSubmitting(button, true, 'Lưu lần cân');
    try {
      await request('/api/journal', 'POST', {
        type: 'weight',
        date: $('weight-date').value,
        weight: Number($('weight-value').value),
        content: $('weight-note').value
      });
      selectedMonth = $('weight-date').value.slice(0, 7);
      announce('Đã lưu cân nặng');
      resetWeightForm();
      await loadEntries();
    } catch (error) {
      console.error('[journal] Cannot save weight:', error);
      announce(error.message || 'Không thể lưu cân nặng', 'error');
    } finally {
      setSubmitting(button, false, 'Lưu lần cân');
    }
  }

  async function submitMemory(event) {
    event.preventDefault();
    const button = $('memory-save');
    const editing = Boolean(editingMemoryId);
    const id = editingMemoryId;
    const body = {
      type: 'memory',
      date: $('memory-date').value,
      title: $('memory-title').value,
      content: $('memory-content').value
    };
    setSubmitting(button, true, editing ? 'Cập nhật kỷ niệm' : 'Lưu kỷ niệm');
    try {
      await request(editing ? `/api/journal/${encodeURIComponent(id)}` : '/api/journal', editing ? 'PUT' : 'POST', body);
      selectedMonth = body.date.slice(0, 7);
      announce(editing ? 'Đã cập nhật kỷ niệm' : 'Đã lưu kỷ niệm');
      resetMemoryForm();
      await loadEntries();
    } catch (error) {
      console.error('[journal] Cannot save memory:', error);
      announce(error.message || 'Không thể lưu kỷ niệm', 'error');
    } finally {
      setSubmitting(button, false, editingMemoryId ? 'Cập nhật kỷ niệm' : 'Lưu kỷ niệm');
    }
  }

  async function submitWishlist(event) {
    event.preventDefault();
    const button = $('wishlist-save');
    const editing = Boolean(editingWishlistId);
    const id = editingWishlistId;
    const existing = entries.wishlist.find(item => item.id === id);
    const body = {
      type: 'wishlist',
      title: $('wishlist-title').value,
      category: $('wishlist-category').value,
      content: $('wishlist-content').value,
      status: existing?.status || 'want'
    };
    const idleText = editing ? 'Cập nhật mong muốn' : 'Thêm mong muốn';
    setSubmitting(button, true, idleText);
    try {
      await request(editing ? `/api/journal/${encodeURIComponent(id)}` : '/api/journal', editing ? 'PUT' : 'POST', body);
      if (!editing) setWishlistFilter('all');
      announce(editing ? 'Đã cập nhật wishlist' : 'Đã thêm vào wishlist');
      resetWishlistForm();
      await loadEntries();
    } catch (error) {
      console.error('[journal] Cannot save wishlist entry:', error);
      announce(error.message || 'Không thể lưu wishlist', 'error');
    } finally {
      setSubmitting(button, false, editingWishlistId ? 'Cập nhật mong muốn' : 'Thêm mong muốn');
    }
  }

  async function deleteEntry(id) {
    if (!window.confirm('Xóa ghi chép này? Hành động này không thể hoàn tác.')) return;
    try {
      await request(`/api/journal/${encodeURIComponent(id)}`, 'DELETE');
      if (id === editingMemoryId) resetMemoryForm();
      if (id === editingWishlistId) resetWishlistForm();
      announce('Đã xóa ghi chép');
      await loadEntries();
    } catch (error) {
      console.error('[journal] Cannot delete entry:', error);
      announce(error.message || 'Không thể xóa ghi chép', 'error');
    }
  }

  function editWeight(id) {
    const entry = entries.weights.find(item => item.id === id);
    if (!entry) return;
    $('weight-date').value = entry.date;
    $('weight-value').value = entry.weight;
    $('weight-note').value = entry.content || '';
    $('weight-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('weight-value').focus({ preventScroll: true });
  }

  function editMemory(id) {
    const entry = entries.memories.find(item => item.id === id);
    if (!entry) return;
    editingMemoryId = id;
    $('memory-form').dataset.editingId = id;
    $('memory-date').value = entry.date;
    $('memory-title').value = entry.title;
    $('memory-content').value = entry.content || '';
    $('memory-form-eyebrow').textContent = 'ĐANG CHỈNH SỬA';
    $('memory-form-title').textContent = 'Cập nhật kỷ niệm';
    $('memory-save').textContent = 'Cập nhật kỷ niệm';
    $('memory-cancel').hidden = false;
    $('memory-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function editWishlist(id) {
    const entry = entries.wishlist.find(item => item.id === id);
    if (!entry) return;
    editingWishlistId = id;
    $('wishlist-form').dataset.editingId = id;
    $('wishlist-title').value = entry.title;
    $('wishlist-category').value = entry.category || '';
    $('wishlist-content').value = entry.content || '';
    $('wishlist-form-eyebrow').textContent = 'ĐANG CHỈNH SỬA';
    $('wishlist-form-title').textContent = 'Cập nhật mong muốn';
    $('wishlist-save').textContent = 'Cập nhật mong muốn';
    $('wishlist-cancel').hidden = false;
    $('wishlist-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function updateWishlistStatus(id, status) {
    const item = entries.wishlist.find(entry => entry.id === id);
    if (!item) return;
    try {
      await request(`/api/journal/${encodeURIComponent(id)}`, 'PUT', {
        type: 'wishlist',
        title: item.title,
        content: item.content || '',
        category: item.category || '',
        status
      });
      announce(status === 'done' ? 'Đã đánh dấu hoàn thành' : 'Đã cập nhật trạng thái');
      await loadEntries();
    } catch (error) {
      console.error('[journal] Cannot update wishlist status:', error);
      announce(error.message || 'Không thể cập nhật trạng thái', 'error');
      renderWishlist();
    }
  }

  function setWishlistFilter(filter) {
    selectedWishlistFilter = filter;
    document.querySelectorAll('.wishlist-filter').forEach(button => {
      button.classList.toggle('active', button.dataset.filter === filter);
    });
    renderWishlist();
  }

  function shiftMonth(amount) {
    const next = monthDate(selectedMonth);
    next.setMonth(next.getMonth() + amount);
    selectedMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    resetWeightForm();
    resetMemoryForm();
    loadEntries();
  }

  function bindEvents() {
    $('journal-month').addEventListener('change', () => {
      if (!/^\d{4}-\d{2}$/.test($('journal-month').value)) return;
      selectedMonth = $('journal-month').value;
      resetWeightForm();
      resetMemoryForm();
      loadEntries();
    });
    $('journal-month-prev').addEventListener('click', () => shiftMonth(-1));
    $('journal-month-next').addEventListener('click', () => shiftMonth(1));
    $('weight-form').addEventListener('submit', submitWeight);
    $('weight-date').addEventListener('change', fillWeightForDate);
    $('memory-form').addEventListener('submit', submitMemory);
    $('memory-cancel').addEventListener('click', resetMemoryForm);
    $('wishlist-form').addEventListener('submit', submitWishlist);
    $('wishlist-cancel').addEventListener('click', resetWishlistForm);
    $('journal-export').addEventListener('click', () => window.globalUtils?.exportModule('journal'));

    document.querySelectorAll('.journal-tab').forEach(tab => {
      tab.addEventListener('click', () => changeTab(tab.dataset.tab));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        const tabs = [...document.querySelectorAll('.journal-tab')];
        const index = tabs.indexOf(tab);
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const next = tabs[(index + direction + tabs.length) % tabs.length];
        event.preventDefault();
        next.focus();
        changeTab(next.dataset.tab);
      });
    });

    document.querySelectorAll('.wishlist-filter').forEach(button => {
      button.addEventListener('click', () => {
        setWishlistFilter(button.dataset.filter);
      });
    });

    document.addEventListener('click', event => {
      const target = event.target.closest('button');
      if (!target) return;
      if (target.dataset.editWeight) editWeight(target.dataset.editWeight);
      if (target.dataset.editMemory) editMemory(target.dataset.editMemory);
      if (target.dataset.editWishlist) editWishlist(target.dataset.editWishlist);
      if (target.dataset.deleteEntry) deleteEntry(target.dataset.deleteEntry);
    });

    document.addEventListener('change', event => {
      const select = event.target.closest('select[data-wishlist-status]');
      if (select) updateWishlistStatus(select.dataset.wishlistStatus, select.value);
    });
  }

  $('nav-date').textContent = new Date().toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
  $('journal-month').value = selectedMonth;
  $('weight-date').value = dateForSelectedMonth();
  $('memory-date').value = dateForSelectedMonth();
  bindEvents();
  loadEntries();
})();
