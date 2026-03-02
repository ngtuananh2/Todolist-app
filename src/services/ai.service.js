const { getModel } = require('../config/gemini');
const todoService = require('./todo.service');

// ==================== AI SERVICE ====================

class AIService {
  constructor() {
    this.chatSessions = new Map();
  }

  /**
   * Send a message to AI and get response + optional actions
   */
  async chat(message, sessionId = 'default') {
    // Get current todos for context
    const currentTodos = todoService.getAll();
    const todosContext = this._formatTodosForAI(currentTodos);
    const systemPrompt = this._buildSystemPrompt(todosContext);

    // Get or create chat session
    if (!this.chatSessions.has(sessionId)) {
      this.chatSessions.set(sessionId, []);
    }
    const history = this.chatSessions.get(sessionId);

    // Create model with dynamic system instruction
    const model = getModel(systemPrompt);

    const chatHistory = history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }));

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(message.trim());
    const aiText = result.response.text();

    // Save to history
    history.push({ role: 'user', text: message.trim() });
    history.push({ role: 'model', text: aiText });

    // Keep only last 20 exchanges
    if (history.length > 40) {
      this.chatSessions.set(sessionId, history.slice(-40));
    }

    // Parse actions & execute them
    const actions = this._parseActions(aiText);
    const createdTodos = [];

    for (const action of actions) {
      if (action.type === 'create_todo' && action.title) {
        const newTodo = todoService.create({
          title: action.title,
          description: action.description || '',
          priority: action.priority || 'none',
          deadline: action.deadline || null
        });
        createdTodos.push(newTodo);
      }
    }

    const cleanText = this._cleanResponse(aiText);

    return {
      reply: cleanText,
      actions: createdTodos.length > 0
        ? { type: 'todos_created', todos: createdTodos }
        : null
    };
  }

  /**
   * Clear all chat sessions
   */
  clearHistory() {
    this.chatSessions.clear();
    return { cleared: true };
  }

  // ---- Private helpers ----

  _buildSystemPrompt(todosContext) {
    return `Bạn là TaskFlow AI — trợ lý quản lý công việc thông minh. Trả lời bằng tiếng Việt.

NHIỆM VỤ:
- Giúp người dùng quản lý, lên kế hoạch, sắp xếp công việc
- Tạo todo mới khi được yêu cầu
- Phân tích tiến độ, đề xuất ưu tiên
- Đưa ra lời khuyên năng suất

DANH SÁCH CÔNG VIỆC HIỆN TẠI:
${todosContext}

KHI NGƯỜI DÙNG MUỐN TẠO TODO MỚI:
Trả về JSON action block trong response, bọc trong \`\`\`action ... \`\`\`:
\`\`\`action
{"type":"create_todo","title":"Tiêu đề","priority":"medium","description":"Mô tả","deadline":"2025-01-20T10:00"}
\`\`\`

Priority: "none", "low", "medium", "high"
Deadline: ISO datetime string hoặc null
Có thể tạo nhiều todo bằng nhiều action blocks.

KHI KHÔNG CẦN TẠO TODO:
Chỉ trả lời văn bản bình thường, hữu ích và thân thiện.

NGUYÊN TẮC:
- Ngắn gọn, rõ ràng
- Dùng emoji phù hợp
- Phân tích dữ liệu thực tế từ danh sách todo
- Nếu không rõ yêu cầu, hỏi lại`;
  }

  _formatTodosForAI(todos) {
    if (todos.length === 0) return '(Chưa có công việc nào)';

    return todos.map((t, i) => {
      const status = t.completed ? '✅ Xong' : '⬜ Chưa xong';
      const prio = t.priority !== 'none' ? ` [${t.priority.toUpperCase()}]` : '';
      const deadline = t.deadline ? ` | Hạn: ${t.deadline}` : '';
      const tags = t.tags?.length > 0 ? ` | Nhãn: ${t.tags.map(tg => tg.name).join(', ')}` : '';
      const subtaskInfo = t.subtasks?.length > 0
        ? ` | Việc con: ${t.subtasks.filter(s => s.completed).length}/${t.subtasks.length} xong`
        : '';
      const desc = t.description ? ` | Ghi chú: ${t.description}` : '';
      return `${i + 1}. ${status}${prio} ${t.title}${deadline}${tags}${subtaskInfo}${desc}`;
    }).join('\n');
  }

  _parseActions(text) {
    const actions = [];
    const regex = /```action\s*([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      try {
        actions.push(JSON.parse(match[1].trim()));
      } catch (e) { /* skip malformed */ }
    }
    return actions;
  }

  _cleanResponse(text) {
    return text.replace(/```action\s*[\s\S]*?```/g, '').trim();
  }
}

module.exports = new AIService();
