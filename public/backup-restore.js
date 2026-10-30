(function () {
  'use strict';

  const collectionLabels = {
    todos: 'Công việc',
    tags: 'Nhãn',
    habits: 'Thói quen',
    habitLogs: 'Lịch sử thói quen',
    notes: 'Ghi chú',
    noteVersions: 'Phiên bản ghi chú',
    englishProgress: 'Tiến độ tiếng Anh',
    englishMindmaps: 'Sơ đồ tiếng Anh',
    vocab: 'Từ vựng',
    trades: 'Lệnh giao dịch',
    tradingAccounts: 'Tài khoản giao dịch',
    schedules: 'Lịch trình'
  };

  function createDialog() {
    const dialog = document.createElement('dialog');
    dialog.className = 'backup-restore-dialog';
    dialog.innerHTML = `
      <form class="backup-restore-content">
        <h2>Xem trước bản sao lưu</h2>
        <p class="backup-restore-meta"></p>
        <div class="backup-restore-counts"></div>
        <p class="backup-restore-warning" hidden></p>
        <div class="backup-restore-modes">
          <label class="backup-restore-mode">
            <input type="radio" name="restore-mode" value="merge" checked>
            <div><strong>Gộp dữ liệu</strong><span>Giữ dữ liệu hiện có, chỉ thêm bản ghi mới. Mã hoặc trường duy nhất bị trùng sẽ được báo lỗi để tránh ghi đè nhầm.</span></div>
          </label>
          <label class="backup-restore-mode">
            <input type="radio" name="restore-mode" value="replace">
            <div><strong>Thay thế dữ liệu</strong><span>Thay các phần dữ liệu có trong file. Ứng dụng sẽ tải backup hiện tại xuống trước khi thực hiện.</span></div>
          </label>
        </div>
        <label class="backup-restore-confirm" hidden>
          Nhập THAY THE để xác nhận
          <input type="text" autocomplete="off" spellcheck="false">
        </label>
        <p class="backup-restore-error" role="alert"></p>
        <div class="backup-restore-actions">
          <button type="button" data-cancel>Hủy</button>
          <button type="submit" disabled>Khôi phục</button>
        </div>
      </form>`;
    document.body.append(dialog);
    return dialog;
  }

  function getErrorMessage(body, fallback) {
    return body?.detail || body?.error || fallback;
  }

  async function responseJson(response) {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Máy chủ trả về phản hồi không hợp lệ (HTTP ${response.status})`);
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadCurrentBackup() {
    const response = await fetch('/api/dashboard/backup');
    if (!response.ok) {
      const body = await responseJson(response);
      throw new Error(getErrorMessage(body, 'Không thể tạo backup dữ liệu hiện tại'));
    }
    const blob = await response.blob();
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `taskflow-backup-before-restore-${date}.json`);
  }

  async function openPreview(file, dialog) {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File backup vượt quá giới hạn 5 MB của máy chủ.');
    }

    let payload;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      throw new Error('File không phải JSON hợp lệ.');
    }

    const response = await fetch('/api/dashboard/restore/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload })
    });
    const preview = await responseJson(response);
    if (!response.ok) throw new Error(getErrorMessage(preview, 'Không thể kiểm tra file backup'));

    dialog.dataset.payload = JSON.stringify(payload);
    dialog.querySelector('.backup-restore-meta').textContent =
      `Phiên bản ${preview.version}${preview.exportedAt ? ` · Xuất lúc ${new Date(preview.exportedAt).toLocaleString('vi-VN')}` : ''}`;

    const counts = dialog.querySelector('.backup-restore-counts');
    counts.replaceChildren();
    for (const [key, label] of Object.entries(collectionLabels)) {
      const count = preview.counts[key];
      if (count === null || count === undefined) continue;
      const row = document.createElement('div');
      row.textContent = label;
      const value = document.createElement('strong');
      value.textContent = count.toLocaleString('vi-VN');
      row.append(value);
      counts.append(row);
    }

    const warning = dialog.querySelector('.backup-restore-warning');
    if (preview.omittedCollections.length) {
      warning.hidden = false;
      warning.textContent = `Backup cũ không chứa ${preview.omittedCollections.map(key => collectionLabels[key] || key).join(', ')}. Các phần dữ liệu này sẽ được giữ nguyên.`;
    } else {
      warning.hidden = true;
      warning.textContent = '';
    }
  }

  function initialize() {
    const fileInput = document.getElementById('restore-file');
    if (!fileInput || fileInput.dataset.backupRestoreReady) return;
    fileInput.dataset.backupRestoreReady = 'true';
    const dialog = createDialog();
    const form = dialog.querySelector('form');
    const confirmInput = dialog.querySelector('.backup-restore-confirm');
    const confirmText = confirmInput.querySelector('input');
    const applyButton = dialog.querySelector('button[type="submit"]');
    const errorEl = dialog.querySelector('.backup-restore-error');

    function updateMode() {
      const mode = dialog.querySelector('input[name="restore-mode"]:checked').value;
      confirmInput.hidden = mode !== 'replace';
      applyButton.disabled = dialog.dataset.previewReady !== 'true' || (mode === 'replace' && confirmText.value !== 'THAY THE');
    }

    dialog.querySelectorAll('input[name="restore-mode"]').forEach(input => {
      input.addEventListener('change', updateMode);
    });
    confirmText.addEventListener('input', updateMode);
    dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      fileInput.value = '';
      dialog.dataset.payload = '';
      dialog.dataset.previewReady = 'false';
      confirmText.value = '';
      errorEl.textContent = '';
      dialog.querySelector('input[value="merge"]').checked = true;
      updateMode();
    });

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      errorEl.textContent = '';
      try {
        await openPreview(file, dialog);
        dialog.dataset.previewReady = 'true';
        updateMode();
        dialog.showModal();
      } catch (error) {
        dialog.dataset.previewReady = 'false';
        errorEl.textContent = error.message;
        updateMode();
        dialog.showModal();
      }
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const mode = dialog.querySelector('input[name="restore-mode"]:checked').value;
      if (dialog.dataset.previewReady !== 'true') return;
      applyButton.disabled = true;
      dialog.querySelector('[data-cancel]').disabled = true;
      errorEl.textContent = 'Đang khôi phục dữ liệu...';

      try {
        if (mode === 'replace') await downloadCurrentBackup();
        const payload = JSON.parse(dialog.dataset.payload);
        const response = await fetch('/api/dashboard/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload, mode })
        });
        const result = await responseJson(response);
        if (!response.ok) throw new Error(getErrorMessage(result, 'Khôi phục thất bại'));

        const summary = Object.entries(result.imported || {})
          .map(([key, count]) => `${collectionLabels[key] || key}: ${count}`)
          .join(' · ');
        errorEl.style.color = '#059669';
        errorEl.textContent = `Khôi phục thành công (${mode === 'merge' ? 'gộp' : 'thay thế'}). ${summary}`;
        setTimeout(() => location.reload(), 1600);
      } catch (error) {
        errorEl.style.color = '#dc2626';
        errorEl.textContent = error.message;
        applyButton.disabled = false;
        dialog.querySelector('[data-cancel]').disabled = false;
      }
    });

    updateMode();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
