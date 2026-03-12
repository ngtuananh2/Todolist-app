/**
 * TaskFlow AI Chat — Shared module for all pages
 * Usage: initAIChat({ page, onAction })
 */

(function () {
  'use strict';

  // ===== Config per page =====
  const PAGE_CONFIG = {
    todo: {
      welcome: `<p>Xin chào! Tôi là <strong>TaskFlow AI</strong> — trợ lý quản lý công việc của bạn.</p>
        <p>Tôi có thể giúp bạn:</p>
        <ul>
          <li>📝 Tạo công việc mới bằng ngôn ngữ tự nhiên</li>
          <li>📊 Phân tích tiến độ &amp; đề xuất ưu tiên</li>
          <li>💡 Lên kế hoạch &amp; tổ chức công việc</li>
          <li>⏰ Nhắc nhở deadline &amp; quản lý thời gian</li>
        </ul>
        <p>Hãy hỏi tôi bất cứ điều gì!</p>`,
      suggestions: [
        { label: '📊 Phân tích tiến độ', msg: 'Phân tích tiến độ công việc của tôi' },
        { label: '🎯 Đề xuất ưu tiên', msg: 'Tôi nên ưu tiên việc gì trước?' },
        { label: '📋 Kế hoạch hôm nay', msg: 'Giúp tôi lên kế hoạch hôm nay' }
      ],
      actionMsg: (results) => {
        const todos = results.filter(r => r.type === 'todo_created');
        if (todos.length) return `✅ Đã tạo ${todos.length} công việc mới!`;
        return null;
      }
    },
    habit: {
      welcome: `<p>Xin chào! Tôi là <strong>TaskFlow AI</strong> — trợ lý theo dõi thói quen.</p>
        <p>Tôi có thể giúp bạn:</p>
        <ul>
          <li>✅ Tạo thói quen mới bằng ngôn ngữ tự nhiên</li>
          <li>📊 Phân tích tỷ lệ hoàn thành &amp; streak</li>
          <li>💪 Gợi ý thói quen tốt cho sức khỏe &amp; năng suất</li>
          <li>🔥 Mẹo duy trì streak &amp; tạo động lực</li>
        </ul>
        <p>Hãy hỏi tôi bất cứ điều gì!</p>`,
      suggestions: [
        { label: '📊 Phân tích thói quen', msg: 'Phân tích tình hình thói quen của tôi' },
        { label: '💡 Gợi ý thói quen', msg: 'Gợi ý thói quen tốt cho tôi' },
        { label: '🔥 Mẹo duy trì streak', msg: 'Làm sao duy trì streak hiệu quả?' }
      ],
      actionMsg: (results) => {
        const habits = results.filter(r => r.type === 'habit_created');
        if (habits.length) return `✅ Đã tạo ${habits.length} thói quen mới!`;
        return null;
      }
    },
    brain: {
      welcome: `<p>Xin chào! Tôi là <strong>TaskFlow AI</strong> — trợ lý quản lý kiến thức.</p>
        <p>Tôi có thể giúp bạn:</p>
        <ul>
          <li>📝 Tạo ghi chú &amp; lưu link nhanh</li>
          <li>🗂️ Gợi ý phân loại &amp; tổ chức ghi chú</li>
          <li>🔍 Tìm kiếm &amp; tóm tắt nội dung</li>
          <li>💡 Ý tưởng mở rộng kho kiến thức</li>
        </ul>
        <p>Hãy hỏi tôi bất cứ điều gì!</p>`,
      suggestions: [
        { label: '📊 Phân tích kho kiến thức', msg: 'Phân tích kho kiến thức của tôi' },
        { label: '🗂️ Gợi ý tổ chức', msg: 'Gợi ý cách tổ chức ghi chú hiệu quả' },
        { label: '💡 Ý tưởng ghi chú', msg: 'Gợi ý chủ đề ghi chú mới cho tôi' }
      ],
      actionMsg: (results) => {
        const notes = results.filter(r => r.type === 'note_created');
        if (notes.length) return `✅ Đã tạo ${notes.length} ghi chú mới!`;
        return null;
      }
    },
    english: {
      welcome: `<p>Xin chào! Tôi là <strong>TaskFlow AI</strong> — trợ lý học tiếng Anh.</p>
        <p>Tôi có thể giúp bạn:</p>
        <ul>
          <li>📖 Giải thích ngữ pháp &amp; các thì tiếng Anh</li>
          <li>✍️ Luyện tập với bài tập tương tác</li>
          <li>📝 Thêm từ vựng mới vào danh sách</li>
          <li>💡 Mẹo học tiếng Anh hiệu quả</li>
        </ul>
        <p>Hãy hỏi tôi bất cứ điều gì!</p>`,
      suggestions: [
        { label: '📖 Giải thích thì', msg: 'Giải thích cách dùng thì hiện tại hoàn thành?' },
        { label: '🤖 Tạo bài tập', msg: 'Tạo bài tập luyện tập về thì quá khứ đơn cho tôi' },
        { label: '📊 Phân tích tiến độ', msg: 'Phân tích tiến độ học tiếng Anh của tôi' },
        { label: '💡 Mẹo học từ vựng', msg: 'Cho tôi mẹo học từ vựng hiệu quả' }
      ],
      actionMsg: (results) => {
        const vocabs = results.filter(r => r.type === 'vocab_created');
        if (vocabs.length) return `✅ Đã thêm ${vocabs.length} từ vựng mới!`;
        return null;
      }
    },
    trading: {
      welcome: `<p>Xin chào! Tôi là <strong>TaskFlow AI</strong> — trợ lý quản lý giao dịch.</p>
        <p>Tôi có thể giúp bạn:</p>
        <ul>
          <li>📊 Phân tích hiệu suất giao dịch</li>
          <li>🎯 Tư vấn quản lý rủi ro & chiến lược</li>
          <li>📝 Ghi nhận lệnh giao dịch mới</li>
          <li>🧠 Phân tích tâm lý giao dịch</li>
        </ul>
        <p>Hãy hỏi tôi bất cứ điều gì về trading!</p>`,
      suggestions: [
        { label: '📊 Phân tích hiệu suất', msg: 'Phân tích hiệu suất giao dịch của tôi' },
        { label: '🎯 Cải thiện win rate', msg: 'Gợi ý cách cải thiện win rate của tôi' },
        { label: '⚠️ Quản lý rủi ro', msg: 'Tư vấn quản lý rủi ro cho danh mục giao dịch của tôi' },
        { label: '🧠 Tâm lý trading', msg: 'Phân tích tâm lý giao dịch và đưa ra lời khuyên' }
      ],
      actionMsg: (results) => {
        const trades = results.filter(r => r.type === 'trade_created');
        if (trades.length) return `✅ Đã ghi nhận ${trades.length} lệnh giao dịch mới!`;
        return null;
      }
    },
    schedule: {
      welcome: `<p>Xin chào! Tôi là <strong>TaskFlow AI</strong> — trợ lý quản lý lịch trình.</p>
        <p>Tôi có thể giúp bạn:</p>
        <ul>
          <li>➕ Thêm/xóa công việc vào lịch trình</li>
          <li>✏️ Sửa thời gian, di chuyển hoạt động</li>
          <li>💡 Tối ưu hóa sắp xếp thời gian biểu</li>
          <li>📊 Phân tích & cải thiện lịch trình</li>
        </ul>
        <p>Hãy nhắn cho tôi để thay đổi lịch trình!</p>`,
      suggestions: [
        { label: '➕ Thêm công việc', msg: 'Thêm công việc "Học tiếng Anh" 45 phút vào lịch trình' },
        { label: '📊 Phân tích lịch', msg: 'Phân tích lịch trình hiện tại và gợi ý cải thiện' },
        { label: '🔄 Tối ưu hóa', msg: 'Tối ưu hóa lịch trình của tôi cho năng suất cao nhất' },
        { label: '☕ Thêm giờ nghỉ', msg: 'Thêm thời gian nghỉ ngơi hợp lý vào lịch trình' }
      ],
      actionMsg: (results) => {
        const adds = results.filter(r => r.type === 'schedule_add_task');
        const inserts = results.filter(r => r.type === 'schedule_insert');
        const edits = results.filter(r => r.type === 'schedule_edit');
        const deletes = results.filter(r => r.type === 'schedule_delete');
        const removes = results.filter(r => r.type === 'schedule_remove_task');
        const swaps = results.filter(r => r.type === 'schedule_swap');
        const regen = results.filter(r => r.type === 'schedule_regenerate');

        const parts = [];
        if (adds.length) parts.push(`➕ Thêm ${adds.length} công việc`);
        if (inserts.length) parts.push(`📌 Chèn ${inserts.length} mục vào lịch`);
        if (edits.length) parts.push(`✏️ Sửa ${edits.length} mục`);
        if (deletes.length) parts.push(`🗑️ Xóa ${deletes.length} mục`);
        if (removes.length) parts.push(`❌ Xóa ${removes.length} công việc`);
        if (swaps.length) parts.push(`🔄 Hoán đổi ${swaps.length} cặp`);
        if (regen.length) parts.push('🔄 Yêu cầu tạo lại lịch trình');
        return parts.length ? parts.join(' | ') : null;
      }
    }
  };

  // ===== State =====
  let currentPage = 'todo';
  let panelOpen = false;
  let loading = false;
  let onActionCallback = null;
  let getContextFn = null;

  // ===== DOM references =====
  let elFab, elPanel, elMessages, elSuggestions, elInput, elSendBtn;

  // ===== Escape HTML =====
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ===== Format AI response =====
  function formatAIResponse(text) {
    let html = escapeHtml(text);
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/^- (.+)/gm, '• $1');
    return html;
  }

  // ===== Scroll to bottom =====
  function scrollToBottom() {
    requestAnimationFrame(() => {
      elMessages.scrollTop = elMessages.scrollHeight;
    });
  }

  // ===== Append message =====
  function appendMessage(role, text) {
    const div = document.createElement('div');
    if (role === 'system') {
      div.className = 'ai-msg ai-msg-system';
      div.innerHTML = `<div class="ai-msg-content ai-system-msg">${text}</div>`;
    } else if (role === 'user') {
      div.className = 'ai-msg ai-msg-user';
      div.innerHTML = `<div class="ai-msg-content">${escapeHtml(text)}</div><div class="ai-msg-avatar">👤</div>`;
    } else {
      div.className = 'ai-msg ai-msg-bot';
      div.innerHTML = `<div class="ai-msg-avatar">🤖</div><div class="ai-msg-content">${formatAIResponse(text)}</div>`;
    }
    elMessages.appendChild(div);
    scrollToBottom();
  }

  // ===== Send message =====
  async function sendMessage(message) {
    if (!message.trim() || loading) return;
    loading = true;
    elSendBtn.disabled = true;
    elSuggestions.style.display = 'none';

    appendMessage('user', message);

    // Loading indicator
    const loadingEl = document.createElement('div');
    loadingEl.className = 'ai-msg ai-msg-bot ai-msg-loading';
    loadingEl.innerHTML = `<div class="ai-msg-avatar">🤖</div><div class="ai-msg-content"><div class="ai-typing"><span></span><span></span><span></span></div></div>`;
    elMessages.appendChild(loadingEl);
    scrollToBottom();

    try {
      const body = { message, page: currentPage };
      if (typeof getContextFn === 'function') {
        const ctx = getContextFn();
        if (ctx) body.context = ctx;
      }

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      loadingEl.remove();

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        appendMessage('bot', `❌ ${err.error || 'Lỗi kết nối AI'}`);
        return;
      }

      const data = await res.json();
      appendMessage('bot', data.reply);

      // Handle actions
      if (data.actions && Array.isArray(data.actions) && data.actions.length > 0) {
        const config = PAGE_CONFIG[currentPage];
        const systemMsg = config.actionMsg(data.actions);
        if (systemMsg) appendMessage('system', systemMsg);

        // Callback to refresh page data
        if (typeof onActionCallback === 'function') {
          onActionCallback(data.actions);
        }
      }
    } catch (err) {
      loadingEl.remove();
      appendMessage('bot', '❌ Không thể kết nối đến AI.');
    } finally {
      loading = false;
      elSendBtn.disabled = false;
    }
  }

  // ===== Clear chat =====
  async function clearChat() {
    await fetch('/api/ai/chat', { method: 'DELETE' });
    elMessages.innerHTML = `
      <div class="ai-msg ai-msg-bot">
        <div class="ai-msg-avatar">🤖</div>
        <div class="ai-msg-content"><p>Cuộc trò chuyện đã được xóa. Hỏi tôi bất cứ điều gì!</p></div>
      </div>`;
    elSuggestions.style.display = '';
  }

  // ===== Build suggestion chips =====
  function buildSuggestions() {
    const config = PAGE_CONFIG[currentPage];
    elSuggestions.innerHTML = '';
    config.suggestions.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'ai-suggestion-chip';
      btn.textContent = s.label;
      btn.addEventListener('click', () => {
        if (!loading) {
          sendMessage(s.msg);
          elSuggestions.style.display = 'none';
        }
      });
      elSuggestions.appendChild(btn);
    });
  }

  // ===== Init =====
  function initAIChat(options = {}) {
    currentPage = options.page || 'todo';
    onActionCallback = options.onAction || null;
    getContextFn = options.getContext || null;

    elFab = document.getElementById('ai-fab');
    elPanel = document.getElementById('ai-panel');
    elMessages = document.getElementById('ai-messages');
    elSuggestions = document.getElementById('ai-suggestions');
    elInput = document.getElementById('ai-input');
    elSendBtn = document.getElementById('ai-send-btn');

    if (!elFab || !elPanel) return;

    // Set welcome message
    const config = PAGE_CONFIG[currentPage];
    elMessages.innerHTML = `
      <div class="ai-msg ai-msg-bot">
        <div class="ai-msg-avatar">🤖</div>
        <div class="ai-msg-content">${config.welcome}</div>
      </div>`;

    // Build suggestion chips
    buildSuggestions();

    // FAB toggle
    elFab.addEventListener('click', () => {
      panelOpen = !panelOpen;
      elPanel.classList.toggle('open', panelOpen);
      elFab.classList.toggle('active', panelOpen);
      if (panelOpen) { elInput.focus(); scrollToBottom(); }
    });

    // Close button
    document.getElementById('ai-btn-close')?.addEventListener('click', () => {
      panelOpen = false;
      elPanel.classList.remove('open');
      elFab.classList.remove('active');
    });

    // Clear button
    document.getElementById('ai-btn-clear')?.addEventListener('click', clearChat);

    // Form submit
    document.getElementById('ai-input-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = elInput.value.trim();
      if (msg && !loading) {
        sendMessage(msg);
        elInput.value = '';
      }
    });
  }

  // Expose globally
  window.initAIChat = initAIChat;
})();
