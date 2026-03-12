const { groq, GROQ_MODEL, isGroqConfigured, createAIConfigError } = require('../config/gemini');
const todoService = require('./todo.service');
const habitService = require('./habit.service');
const noteService = require('./note.service');
const englishService = require('./english.service');
const tradingService = require('./trading.service');

// ==================== AI SERVICE ====================

class AIService {
  constructor() {
    this.chatSessions = new Map();
    this.exerciseHistory = []; // Track recently generated questions to avoid duplicates
  }

  /**
   * Send a message to AI and get response + optional actions
   * @param {string} page - 'todo' | 'habit' | 'brain'
   */
  async chat(message, sessionId = 'default', page = 'todo', context = null) {
    if (!isGroqConfigured) throw createAIConfigError();
    let systemPrompt = await this._buildSystemPrompt(page);
    if (context) systemPrompt += '\n\nDỮ LIỆU HIỆN TẠI TỪ TRÌNH DUYỆT:\n' + context;

    // Get or create chat history
    if (!this.chatSessions.has(sessionId)) {
      this.chatSessions.set(sessionId, []);
    }
    const history = this.chatSessions.get(sessionId);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message.trim() }
    ];

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2048
    });

    const aiText = response.choices[0].message.content;

    history.push({ role: 'user', content: message.trim() });
    history.push({ role: 'assistant', content: aiText });
    if (history.length > 40) {
      this.chatSessions.set(sessionId, history.slice(-40));
    }

    // Parse and execute actions
    const actions = this._parseActions(aiText);
    const results = await this._executeActions(actions, page);
    const cleanText = this._cleanResponse(aiText);

    return {
      reply: cleanText,
      actions: results
    };
  }

  /**
   * Clear all chat sessions
   */
  clearHistory() {
    this.chatSessions.clear();
    return { cleared: true };
  }

  /**
   * AI auto-classify: suggest priority and tags for a todo title
   */
  async classify(title, description = '') {
    if (!isGroqConfigured) return { priority: 'none', suggestedTags: [], reasoning: '' };
    const tags = await require('./tag.service').getAll();
    const tagNames = tags.map(t => t.name);

    const prompt = `Phân loại công việc sau và trả về JSON (KHÔNG có text khác):
Tiêu đề: "${title}"
${description ? `Mô tả: "${description}"` : ''}

Nhãn có sẵn: ${tagNames.length > 0 ? tagNames.join(', ') : '(chưa có)'}

Trả về JSON:
{"priority":"none|low|medium|high","suggestedTags":["tên nhãn phù hợp từ danh sách trên"],"reasoning":"lý do ngắn gọn"}

Chỉ gợi ý nhãn nếu có trong danh sách. Priority dựa trên mức độ quan trọng/khẩn cấp của công việc.`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 256
    });

    try {
      const text = response.choices[0].message.content.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) {}
    return { priority: 'none', suggestedTags: [], reasoning: '' };
  }

  /**
   * AI weekly productivity report
   */
  async weeklyReport() {
    if (!isGroqConfigured) throw createAIConfigError();
    const stats = await todoService.getStats();
    const currentTodos = await todoService.getAll();
    const todosContext = this._formatTodosForAI(currentTodos);

    const prompt = `Bạn là TaskFlow AI. Hãy phân tích dữ liệu sau và viết BÁO CÁO NĂNG SUẤT TUẦN bằng tiếng Việt, ngắn gọn, có emoji:

THỐNG KÊ:
- Tổng: ${stats.total} | Hoàn thành: ${stats.completed} | Đang làm: ${stats.active} | Quá hạn: ${stats.overdue}
- Ưu tiên: Cao=${stats.priorities.high}, TB=${stats.priorities.medium}, Thấp=${stats.priorities.low}
- Lặp lại: ${stats.recurring} công việc
- Thời gian hoàn thành TB: ${Math.round(stats.avgCompletionMs / 60000)} phút

7 NGÀY QUA:
${stats.dailyStats.map(d => `${d.day}: tạo ${d.created}, xong ${d.completed}`).join('\n')}

DANH SÁCH HIỆN TẠI:
${todosContext}

Viết báo cáo gồm: 1) Tổng quan, 2) Điểm mạnh, 3) Cần cải thiện, 4) Gợi ý tuần tới.`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1024
    });

    return { report: response.choices[0].message.content };
  }

  /**
   * AI habit analysis
   */
  async habitReport() {
    if (!isGroqConfigured) throw createAIConfigError();
    const stats = await habitService.getStats();
    const habits = await habitService.getAllHabits();

    const habitsContext = habits.map(h => `- ${h.icon} ${h.name}`).join('\n');
    const statsContext = stats.habits.map(h =>
      `- ${h.name}: ${h.rate}% hoàn thành, streak ${h.streak} ngày, best ${h.bestStreak} ngày, ${h.completedDays}/30 ngày`
    ).join('\n');

    const prompt = `Bạn là TaskFlow AI. Phân tích dữ liệu HABIT TRACKER và viết báo cáo bằng tiếng Việt, ngắn gọn, có emoji:

THÓI QUEN:
${habitsContext || '(Chưa có thói quen nào)'}

THỐNG KÊ 30 NGÀY:
${statsContext || '(Chưa có dữ liệu)'}
- Tổng thói quen: ${stats.overall.totalHabits}
- Tỉ lệ hoàn thành chung: ${stats.overall.overallRate}%

Viết báo cáo gồm: 1) Tổng quan, 2) Thói quen tốt nhất, 3) Cần cải thiện, 4) Mẹo duy trì streak, 5) Gợi ý thói quen mới.`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1024
    });

    return { report: response.choices[0].message.content };
  }

  /**
   * AI notes/brain analysis
   */
  async brainReport() {
    if (!isGroqConfigured) throw createAIConfigError();
    const stats = await noteService.getStats();
    const notes = await noteService.getAllNotes();
    const categories = await noteService.getCategories();
    const tags = await noteService.getTags();

    const notesContext = notes.slice(0, 20).map(n =>
      `- [${n.type}] ${n.title}${n.category ? ` | ${n.category}` : ''}${n.tags?.length ? ` | #${n.tags.join(' #')}` : ''}`
    ).join('\n');

    const prompt = `Bạn là TaskFlow AI. Phân tích dữ liệu SECOND BRAIN và viết báo cáo bằng tiếng Việt, ngắn gọn, có emoji:

THỐNG KÊ:
- Tổng: ${stats.total} | Ghi chú: ${stats.notes} | Link: ${stats.links} | Hình ảnh: ${stats.images} | Ghim: ${stats.pinned}
- Danh mục: ${categories.join(', ') || '(chưa có)'}
- Tags: ${tags.join(', ') || '(chưa có)'}

GHI CHÚ GẦN ĐÂY:
${notesContext || '(Chưa có ghi chú nào)'}

Viết báo cáo gồm: 1) Tổng quan kho kiến thức, 2) Chủ đề nổi bật, 3) Gợi ý tổ chức & phân loại, 4) Ý tưởng mở rộng.`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1024
    });

    return { report: response.choices[0].message.content };
  }

  // ==================== PRIVATE HELPERS ====================

  async _buildSystemPrompt(page) {
    if (page === 'habit') return await this._buildHabitPrompt();
    if (page === 'brain') return await this._buildBrainPrompt();
    if (page === 'english') return await this._buildEnglishPrompt();
    if (page === 'trading') return await this._buildTradingPrompt();
    if (page === 'schedule') return this._buildSchedulePrompt();
    return await this._buildTodoPrompt();
  }

  _buildSchedulePrompt() {
    return `Bạn là TaskFlow AI — trợ lý quản lý lịch trình thông minh. Trả lời bằng tiếng Việt.

NHIỆM VỤ:
- Giúp người dùng thay đổi, thêm, xóa, di chuyển các mục trong lịch trình
- Gợi ý tối ưu hóa thời gian biểu
- Phân tích lịch trình hiện tại và đề xuất cải thiện
- Tư vấn quản lý thời gian, nghỉ ngơi hợp lý

DỮ LIỆU: Người dùng sẽ gửi kèm danh sách công việc (tasks) và lịch trình hiện tại (scheduleData) từ trình duyệt.
- "tasks" = danh sách công việc chưa được lên lịch (input bên trái)
- "scheduleData" = lịch trình đã tạo bởi AI (hiển thị bên phải)
- Mode: single (1 ngày), multi (nhiều ngày), weekly (thời khóa biểu tuần)

CÁC HÀNH ĐỘNG BẠN CÓ THỂ THỰC HIỆN:
Khi người dùng yêu cầu thay đổi lịch trình, trả về action blocks:

1. Thêm công việc vào danh sách input:
\`\`\`action
{"type":"schedule_add_task","title":"Tên công việc","duration":30,"priority":"high|medium|low","deadline":"17:00","day":"Thứ 2","recurring":"daily|weekday|weekend"}
\`\`\`

2. Xóa công việc khỏi danh sách input (theo title hoặc index):
\`\`\`action
{"type":"schedule_remove_task","title":"Tên công việc"}
\`\`\`

3. Thêm mục trực tiếp vào lịch trình đã tạo (với weekly/multi: BẮT BUỘC có "day"):
\`\`\`action
{"type":"schedule_insert","time":"14:00","endTime":"15:00","title":"Tên hoạt động","type_item":"task|break|meal|exercise|free","note":"Ghi chú","day":"Thứ 2"}
\`\`\`

4. Sửa mục trong lịch trình (dùng index 0-based, với weekly/multi: BẮT BUỘC có "day"):
\`\`\`action
{"type":"schedule_edit","index":2,"day":"Thứ 3","changes":{"time":"15:00","endTime":"16:00","title":"Tên mới","note":"Ghi chú mới"}}
\`\`\`

5. Xóa mục khỏi lịch trình (với weekly/multi: BẮT BUỘC có "day"):
\`\`\`action
{"type":"schedule_delete","index":2,"day":"Thứ 4"}
\`\`\`

6. Hoán đổi 2 mục trong lịch trình (cùng 1 ngày, với weekly/multi: BẮT BUỘC có "day"):
\`\`\`action
{"type":"schedule_swap","index1":1,"index2":3,"day":"Thứ 2"}
\`\`\`

7. Tạo lại lịch trình hoàn toàn mới (yêu cầu user nhấn nút AI Lên lịch):
\`\`\`action
{"type":"schedule_regenerate"}
\`\`\`

QUAN TRỌNG: Với mode weekly hoặc multi, các action 3-6 PHẢI có trường "day" (VD: "Thứ 2", "Thứ 3"..., "Chủ nhật").
Có thể dùng NHIỀU action blocks trong 1 response.
Khi KHÔNG cần thay đổi: chỉ trả lời văn bản bình thường.

NGUYÊN TẮC:
- Ngắn gọn, rõ ràng, dùng emoji
- Khi sửa lịch, giải thích lý do thay đổi
- Đề xuất thời gian nghỉ ngơi hợp lý
- Ưu tiên việc quan trọng vào giờ tập trung cao
- Luôn xác nhận thay đổi đã thực hiện

ĐỊNH DẠNG BẮT BUỘC:
- Khi thực hiện thay đổi, BẮT BUỘC phải trả về action block bọc trong \`\`\`action ... \`\`\`
- KHÔNG chỉ mô tả thay đổi bằng text — PHẢI kèm action block để hệ thống tự động thực hiện
- Mỗi action là 1 JSON object riêng trong 1 block \`\`\`action riêng
- VÍ DỤ đúng format:\n\`\`\`action\n{"type":"schedule_insert","time":"14:00","endTime":"15:00","title":"Học Anh Văn","type_item":"task","day":"Thứ 3"}\n\`\`\``;
  }

  async _buildTodoPrompt() {
    const todos = await todoService.getAll();
    const context = this._formatTodosForAI(todos);
    return `Bạn là TaskFlow AI — trợ lý quản lý công việc thông minh. Trả lời bằng tiếng Việt.

NHIỆM VỤ:
- Giúp người dùng quản lý, lên kế hoạch, sắp xếp công việc
- Tạo todo mới khi được yêu cầu
- Phân tích tiến độ, đề xuất ưu tiên
- Đưa ra lời khuyên năng suất

DANH SÁCH CÔNG VIỆC HIỆN TẠI:
${context}

KHI NGƯỜI DÙNG MUỐN TẠO TODO MỚI:
Trả về JSON action block trong response, bọc trong \`\`\`action ... \`\`\`:
\`\`\`action
{"type":"create_todo","title":"Tiêu đề","priority":"medium","description":"Mô tả","deadline":"2025-01-20T10:00"}
\`\`\`
Có thể tạo nhiều todo bằng nhiều action blocks.

KHI KHÔNG CẦN TẠO TODO: Chỉ trả lời văn bản bình thường.

NGUYÊN TẮC: Ngắn gọn, rõ ràng, dùng emoji, phân tích dữ liệu thực tế.`;
  }

  async _buildHabitPrompt() {
    const habits = await habitService.getAllHabits();
    const stats = await habitService.getStats();
    const habitsContext = habits.length > 0
      ? habits.map(h => {
          const s = stats.habits.find(sh => sh.id === h.id);
          return `- ${h.icon} ${h.name}: ${s ? `${s.rate}% (streak: ${s.streak}, best: ${s.bestStreak})` : 'chưa có dữ liệu'}`;
        }).join('\n')
      : '(Chưa có thói quen nào)';

    return `Bạn là TaskFlow AI — trợ lý theo dõi thói quen thông minh. Trả lời bằng tiếng Việt.

NHIỆM VỤ:
- Phân tích và tư vấn về thói quen hàng ngày
- Gợi ý thói quen mới phù hợp
- Giúp duy trì streak và tăng motivation
- Đưa ra mẹo xây dựng thói quen hiệu quả

THÓI QUEN HIỆN TẠI (30 ngày gần nhất):
${habitsContext}
Tỉ lệ chung: ${stats.overall.overallRate}%

KHI NGƯỜI DÙNG MUỐN TẠO THÓI QUEN MỚI:
\`\`\`action
{"type":"create_habit","name":"Tên thói quen","icon":"emoji","color":"#hex"}
\`\`\`

NGUYÊN TẮC: Ngắn gọn, tích cực, tạo động lực, dùng emoji, dựa trên dữ liệu thực tế.`;
  }

  async _buildBrainPrompt() {
    const notes = await noteService.getAllNotes();
    const categories = await noteService.getCategories();
    const tags = await noteService.getTags();
    const stats = await noteService.getStats();

    const notesContext = notes.length > 0
      ? notes.slice(0, 15).map(n =>
          `- [${n.type}] ${n.title}${n.url ? ` (${n.url.substring(0, 50)})` : ''}${n.category ? ` | ${n.category}` : ''}${n.tags?.length ? ` | #${n.tags.join(' #')}` : ''}`
        ).join('\n')
      : '(Chưa có ghi chú nào)';

    return `Bạn là TaskFlow AI — trợ lý quản lý kiến thức (Second Brain) thông minh. Trả lời bằng tiếng Việt.

NHIỆM VỤ:
- Giúp tổ chức và phân loại ghi chú, link, tài liệu
- Tạo ghi chú/link mới khi được yêu cầu
- Gợi ý cách tổ chức kho kiến thức
- Tóm tắt, phân tích nội dung

KHO KIẾN THỨC:
- Tổng: ${stats.total} (Ghi chú: ${stats.notes}, Link: ${stats.links}, Ảnh: ${stats.images})
- Danh mục: ${categories.join(', ') || '(chưa có)'}
- Tags: ${tags.join(', ') || '(chưa có)'}

GHI CHÚ GẦN ĐÂY:
${notesContext}

KHI NGƯỜI DÙNG MUỐN TẠO GHI CHÚ/LINK MỚI:
\`\`\`action
{"type":"create_note","title":"Tiêu đề","content":"Nội dung","url":"URL nếu là link","noteType":"note|link|image","category":"Danh mục","tags":["tag1","tag2"]}
\`\`\`

NGUYÊN TẮC: Ngắn gọn, hữu ích, dùng emoji, gợi ý cách tổ chức kiến thức hiệu quả.`;
  }

  /**
   * AI generate exercises for a specific grammar topic
   * @param {string} lessonId - lesson identifier
   * @param {string} lessonTitle - human-readable title
   * @param {number} count - number of questions to generate
   * @param {string} difficulty - easy|medium|hard
   */
  async generateExercises(lessonId, lessonTitle, count = 6, difficulty = 'medium') {
    if (!isGroqConfigured) throw createAIConfigError();
    const diffDesc = {
      easy: 'đơn giản, dùng từ vựng cơ bản, ngữ cảnh rõ ràng, câu ngắn',
      medium: 'trung bình, từ vựng phổ thông, ngữ cảnh đa dạng',
      hard: 'nâng cao, từ vựng phong phú, câu phức, ngữ cảnh đời thực phức tạp'
    };

    const prompt = `Tạo ${count} câu hỏi trắc nghiệm tiếng Anh về chủ đề: "${lessonTitle}" (ID: ${lessonId}).
Độ khó: ${diffDesc[difficulty] || diffDesc.medium}

YÊU CẦU BẮT BUỘC:
- Mỗi câu có 4 đáp án, CHỈ 1 đáp án đúng
- Vị trí đáp án đúng phải NGẪU NHIÊN (không luôn ở vị trí 0)
- Câu hỏi dạng điền vào chỗ trống (dùng ___ cho chỗ trống)
- Phần giải thích bằng tiếng Việt, ngắn gọn
- Câu hỏi phải khác nhau, đa dạng ngữ cảnh
- Các đáp án sai phải hợp lý (dễ gây nhầm lẫn)

TRẢ VỀ ĐÚNG FORMAT JSON (không có text khác):
[
  {
    "q": "She ___ (go) to school every day.",
    "options": ["went", "goes", "going", "go"],
    "correct": 1,
    "explain": "She là ngôi 3 số ít, thì hiện tại đơn → goes"
  }
]

CHỈ TRẢ VỀ JSON ARRAY, KHÔNG CÓ TEXT KHÁC.`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 2048
    });

    const text = response.choices[0].message.content.trim();

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI không trả về đúng format bài tập');

    const exercises = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (!Array.isArray(exercises) || exercises.length === 0) {
      throw new Error('AI trả về danh sách bài tập rỗng');
    }

    // Validate and sanitize each exercise
    return exercises.map(ex => {
      if (!ex.q || !Array.isArray(ex.options) || ex.options.length < 2 || typeof ex.correct !== 'number') {
        throw new Error('Cấu trúc bài tập không hợp lệ');
      }
      return {
        q: String(ex.q),
        options: ex.options.map(String),
        correct: Math.min(Math.max(0, Math.floor(ex.correct)), ex.options.length - 1),
        explain: String(ex.explain || '')
      };
    });
  }

  async _buildEnglishPrompt() {
    const stats = await englishService.getStats();
    const vocabs = await englishService.getAllVocab({});
    const vocabContext = vocabs.length > 0
      ? vocabs.slice(0, 30).map(v =>
          `- ${v.word}${v.phonetic ? ` (${v.phonetic})` : ''}: ${v.meaning}${v.mastered ? ' ✅' : ''}`
        ).join('\n')
      : '(Chưa có từ vựng nào)';

    const progressContext = stats.lessons?.length > 0
      ? stats.lessons.map(p => `- ${p.lessonId}: ${Math.round((p.bestScore / p.totalQ) * 100)}% (${p.attempts} lần)`).join('\n')
      : '(Chưa làm bài tập nào)';

    return `Bạn là TaskFlow AI — trợ lý học tiếng Anh thông minh. Trả lời bằng tiếng Việt.

NHIỆM VỤ:
- Giải thích ngữ pháp, các thì tiếng Anh một cách dễ hiểu
- Đưa ra ví dụ minh họa thực tế
- Giúp luyện tập từ vựng và ngữ pháp
- Thêm từ vựng mới khi được yêu cầu
- Phân tích tiến độ học tập

TỪ VỰNG ĐÃ HỌC:
${vocabContext}
- Tổng: ${stats.vocab?.total || 0}, Đã thuộc: ${stats.vocab?.mastered || 0}

TIẾN ĐỘ BÀI TẬP:
${progressContext}

KHI NGƯỜI DÙNG MUỐN THÊM TỪ VỰNG:
\`\`\`action
{"type":"create_vocab","word":"từ tiếng Anh","meaning":"nghĩa tiếng Việt","phonetic":"/phiên âm/","example":"Câu ví dụ","category":"Chủ đề","level":"beginner|intermediate|advanced"}
\`\`\`

LƯU Ý: Hệ thống có chức năng "AI tạo đề" riêng trong tab Bài tập. Khi người dùng muốn tạo bài tập, hãy hướng dẫn họ vào tab Bài tập → nhấn nút "🤖 AI tạo đề" bên cạnh mỗi chủ đề. Bạn có thể giải thích ngữ pháp, cho ví dụ, đặt câu hỏi nhanh trong chat nhưng bài tập chính thức nên dùng chức năng AI tạo đề.

NGUYÊN TẮC: Ngắn gọn, dễ hiểu, dùng emoji, ví dụ thực tế, khuyến khích người học.`;
  }

  /**
   * AI English learning report
   */
  async englishReport() {
    const stats = await englishService.getStats();
    const vocabs = await englishService.getAllVocab({});

    const vocabSample = vocabs.slice(0, 20).map(v => `- ${v.word}: ${v.meaning}${v.mastered ? ' ✅' : ''}`).join('\n');

    const prompt = `Bạn là TaskFlow AI. Phân tích dữ liệu HỌC TIẾNG ANH và viết báo cáo bằng tiếng Việt, ngắn gọn, có emoji:

TỪ VỰNG:
- Tổng: ${stats.vocab?.total || 0}, Đã thuộc: ${stats.vocab?.mastered || 0}
- Theo level: ${JSON.stringify(stats.vocab?.byLevel || {})}
${vocabSample || '(Chưa có)'}

BÀI TẬP:
${stats.lessons?.map(p => `- ${p.lessonId}: best ${Math.round((p.bestScore/p.totalQ)*100)}%, ${p.attempts} lần`).join('\n') || '(Chưa làm bài)'}

Viết báo cáo gồm: 1) Tổng quan tiến độ, 2) Điểm mạnh, 3) Cần cải thiện, 4) Gợi ý học tập tiếp theo, 5) Mẹo nhớ từ vựng.`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1024
    });

    return { report: response.choices[0].message.content };
  }

  /**
   * AI Trading prompt builder
   */
  async _buildTradingPrompt() {
    const stats = await tradingService.getStats();
    const trades = await tradingService.getAllTrades({ sortBy: 'entryDate', sortOrder: 'desc' });
    const recentTrades = trades.slice(0, 20);
    const open = trades.filter(t => t.status === 'open');

    const tradesContext = recentTrades.length > 0
      ? recentTrades.map(t => {
          const pnlStr = t.status === 'closed' ? ` | P&L: ${t.pnl > 0 ? '+' : ''}${t.pnl}$` : '';
          return `- ${t.type.toUpperCase()} ${t.symbol} @ ${t.entryPrice}${t.exitPrice ? ` → ${t.exitPrice}` : ''} | qty: ${t.quantity}${t.leverage > 1 ? ` (${t.leverage}x)` : ''}${pnlStr} | ${t.status}${t.strategy ? ` | Strategy: ${t.strategy}` : ''}`;
        }).join('\n')
      : '(Chưa có giao dịch nào)';

    const openContext = open.length > 0
      ? open.map(t => `- ${t.type.toUpperCase()} ${t.symbol} @ ${t.entryPrice} qty ${t.quantity}${t.stopLoss ? ` SL:${t.stopLoss}` : ''}${t.takeProfit ? ` TP:${t.takeProfit}` : ''}`).join('\n')
      : '(Không có vị thế mở)';

    const o = stats.overview;

    return `Bạn là TaskFlow AI — trợ lý quản lý giao dịch (trading) thông minh. Trả lời bằng tiếng Việt.

NHIỆM VỤ:
- Phân tích danh mục giao dịch, đánh giá hiệu suất
- Tư vấn quản lý rủi ro (risk management)
- Đề xuất cải thiện chiến lược
- Ghi nhận lệnh giao dịch mới khi được yêu cầu
- Phân tích tâm lý giao dịch dựa trên dữ liệu cảm xúc
- Đưa ra nhận xét về win rate, profit factor, drawdown

TỔNG QUAN:
- Tổng lệnh: ${o.total} | Mở: ${o.open} | Đóng: ${o.closed}
- Win: ${o.wins} | Loss: ${o.losses} | Win Rate: ${o.winRate}%
- Tổng P&L: $${o.totalPnl} | Phí: $${o.totalFees} | P&L ròng: $${o.netPnl}
- Profit Factor: ${o.profitFactor} | Expectancy: $${o.expectancy}
- Max Drawdown: $${o.maxDrawdown}
- Avg Win: $${o.avgWin} | Avg Loss: $${o.avgLoss}

VỊ THẾ ĐANG MỞ:
${openContext}

GIAO DỊCH GẦN ĐÂY:
${tradesContext}

KHI NGƯỜI DÙNG MUỐN GHI NHẬN LỆNH MỚI:
\`\`\`action
{"type":"create_trade","symbol":"BTC/USDT","tradeType":"buy","entryPrice":50000,"quantity":0.1,"stopLoss":49000,"takeProfit":52000,"market":"crypto","strategy":"Breakout","notes":"Ghi chú"}
\`\`\`

NGUYÊN TẮC: Ngắn gọn, chuyên nghiệp, dùng emoji, phân tích dữ liệu thực tế, nhấn mạnh quản lý rủi ro.`;
  }

  /**
   * AI Trading report
   */
  async tradingReport() {
    const stats = await tradingService.getStats();
    const trades = await tradingService.getAllTrades({ sortBy: 'entryDate', sortOrder: 'desc' });
    const o = stats.overview;

    const strategySummary = Object.entries(stats.byStrategy || {})
      .map(([name, d]) => `- ${name}: ${d.total} lệnh, WR ${d.total > 0 ? Math.round(d.wins/d.total*100) : 0}%, P&L $${Math.round(d.pnl*100)/100}`)
      .join('\n') || '(Chưa có)';

    const emotionSummary = Object.entries(stats.byEmotion || {})
      .map(([e, d]) => `- ${e}: ${d.total} lệnh, WR ${d.total > 0 ? Math.round(d.wins/d.total*100) : 0}%, P&L $${Math.round(d.pnl*100)/100}`)
      .join('\n') || '(Chưa có)';

    const prompt = `Bạn là TaskFlow AI. Phân tích dữ liệu TRADING và viết BÁO CÁO GIAO DỊCH bằng tiếng Việt, ngắn gọn, chuyên nghiệp, có emoji:

TỔNG QUAN:
- Tổng: ${o.total} lệnh | Mở: ${o.open} | Đóng: ${o.closed} | Hủy: ${o.cancelled}
- Win: ${o.wins} | Loss: ${o.losses} | Win Rate: ${o.winRate}%
- P&L: $${o.totalPnl} | Phí: $${o.totalFees} | P&L ròng: $${o.netPnl}
- Profit Factor: ${o.profitFactor} | Expectancy: $${o.expectancy}
- Avg Win: $${o.avgWin} | Avg Loss: $${o.avgLoss}
- Largest Win: $${o.largestWin} | Largest Loss: $${o.largestLoss}
- Max Win Streak: ${o.maxWinStreak} | Max Loss Streak: ${o.maxLossStreak}
- Max Drawdown: $${o.maxDrawdown}

CHIẾN LƯỢC:
${strategySummary}

CẢM XÚC:
${emotionSummary}

Viết báo cáo gồm: 1) Tổng quan hiệu suất, 2) Điểm mạnh, 3) Điểm yếu & rủi ro, 4) Phân tích tâm lý giao dịch, 5) Đề xuất cải thiện cụ thể.`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1500
    });

    return { report: response.choices[0].message.content };
  }

  async _executeActions(actions, page) {
    const results = [];

    for (const action of actions) {
      try {
        if (action.type === 'create_todo' && action.title) {
          const todo = await todoService.create({
            title: action.title,
            description: action.description || '',
            priority: action.priority || 'none',
            deadline: action.deadline || null
          });
          results.push({ type: 'todo_created', item: todo });
        }
        if (action.type === 'create_habit' && action.name) {
          const habit = await habitService.createHabit({
            name: action.name,
            icon: action.icon || '✅',
            color: action.color || '#7c7268'
          });
          results.push({ type: 'habit_created', item: habit });
        }
        if (action.type === 'create_note' && action.title) {
          const note = await noteService.createNote({
            title: action.title,
            content: action.content || '',
            url: action.url || '',
            type: action.noteType || 'note',
            category: action.category || '',
            tags: action.tags || []
          });
          results.push({ type: 'note_created', item: note });
        }
        if (action.type === 'create_vocab' && action.word) {
          const vocab = await englishService.createVocab({
            word: action.word,
            meaning: action.meaning || '',
            phonetic: action.phonetic || '',
            example: action.example || '',
            category: action.category || '',
            level: action.level || 'beginner'
          });
          results.push({ type: 'vocab_created', item: vocab });
        }
        // Schedule actions — pass through to frontend
        if (action.type && action.type.startsWith('schedule_')) {
          results.push(action);
        }
        if (action.type === 'create_trade' && action.symbol) {
          const trade = await tradingService.createTrade({
            symbol: action.symbol,
            type: action.tradeType || 'buy',
            entryPrice: action.entryPrice || 0,
            quantity: action.quantity || 0,
            stopLoss: action.stopLoss || null,
            takeProfit: action.takeProfit || null,
            market: action.market || 'crypto',
            strategy: action.strategy || '',
            notes: action.notes || '',
            exchange: action.exchange || '',
            leverage: action.leverage || 1
          });
          results.push({ type: 'trade_created', item: trade });
        }
      } catch (e) { /* skip */ }
    }

    return results.length > 0 ? results : null;
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

    // Method 1: Parse ```action ... ``` blocks
    const regex = /```action\s*([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      try {
        actions.push(JSON.parse(match[1].trim()));
      } catch (e) { /* skip malformed */ }
    }

    // Method 2: If no action blocks found, try to find JSON objects with known action types
    if (actions.length === 0) {
      const actionTypes = ['create_todo','create_habit','create_note','create_vocab','create_trade',
        'schedule_add_task','schedule_remove_task','schedule_insert','schedule_edit',
        'schedule_delete','schedule_swap','schedule_regenerate'];
      // Look for JSON inside ```json ... ``` blocks
      const jsonRegex = /```(?:json)?\s*([\s\S]*?)```/g;
      while ((match = jsonRegex.exec(text)) !== null) {
        try {
          const parsed = JSON.parse(match[1].trim());
          if (parsed && parsed.type && actionTypes.includes(parsed.type)) {
            actions.push(parsed);
          }
        } catch (e) { /* skip */ }
      }
    }

    // Method 3: Last resort — find inline {"type":"schedule_..."} patterns
    if (actions.length === 0) {
      const inlineRegex = /\{\s*"type"\s*:\s*"(schedule_[a-z_]+)"[^}]*\}/g;
      while ((match = inlineRegex.exec(text)) !== null) {
        try {
          actions.push(JSON.parse(match[0]));
        } catch (e) { /* skip */ }
      }
    }

    return actions;
  }

  _cleanResponse(text) {
    let cleaned = text.replace(/```action\s*[\s\S]*?```/g, '').trim();
    // Also clean ```json blocks that contained action objects
    cleaned = cleaned.replace(/```(?:json)?\s*\{\s*"type"\s*:\s*"(?:create_|schedule_)[\s\S]*?```/g, '').trim();
    return cleaned;
  }

  /**
   * AI Conversation Practice for English
   */
  async conversationPractice(message, sessionId = 'conv-default', scenario = 'general', level = 'intermediate') {
    const scenarioPrompts = {
      general: 'a friendly English conversation partner',
      restaurant: 'a waiter at a restaurant, help the user order food and make small talk',
      shopping: 'a shop assistant, help the user find items, discuss prices and preferences',
      interview: 'a job interviewer conducting a professional job interview',
      travel: 'a hotel receptionist and travel guide helping the user plan their trip',
      doctor: 'a doctor during a medical consultation, ask about symptoms and give advice'
    };

    const roleDesc = scenarioPrompts[scenario] || scenarioPrompts.general;
    const levelInstr = level === 'beginner'
      ? 'Use simple vocabulary and short sentences. Correct mistakes gently by repeating the correct form.'
      : level === 'advanced'
      ? 'Use complex vocabulary, idioms, and advanced grammar. Challenge the user with nuanced topics.'
      : 'Use moderate vocabulary. Occasionally introduce new words with brief explanations.';

    const systemPrompt = `You are ${roleDesc}. You are helping a Vietnamese student practice English conversation.

Rules:
- Respond ONLY in English
- ${levelInstr}
- Keep responses conversational and natural (2-4 sentences)
- After your reply, add a line "---" then briefly note in Vietnamese: any grammar/vocabulary mistakes the user made and the correction
- If the user's English is perfect, just say "✅ Tốt lắm!" after ---
- Stay in character for the scenario
- Ask follow-up questions to keep the conversation going`;

    const convSessionId = `conv_${sessionId}_${scenario}`;
    if (!this.chatSessions.has(convSessionId)) {
      this.chatSessions.set(convSessionId, []);
    }
    const history = this.chatSessions.get(convSessionId);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message.trim() }
    ];

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature: 0.8,
      max_tokens: 1024
    });

    const aiText = response.choices[0].message.content;
    history.push({ role: 'user', content: message.trim() });
    history.push({ role: 'assistant', content: aiText });
    if (history.length > 30) this.chatSessions.set(convSessionId, history.slice(-30));

    // Split response and feedback
    const parts = aiText.split('---');
    return {
      reply: (parts[0] || '').trim(),
      feedback: (parts[1] || '').trim(),
      turns: history.length / 2
    };
  }

  // ==================== AI SUMMARIZE NOTE ====================
  async summarizeNote(title, content) {
    const prompt = `Hãy tóm tắt nội dung ghi chú sau bằng tiếng Việt, ngắn gọn và có cấu trúc:

${title ? `Tiêu đề: ${title}\n` : ''}Nội dung:
${content.substring(0, 4000)}

Trả về tóm tắt với format:
📌 **Tóm tắt:** (2-3 câu ngắn gọn)
🔑 **Điểm chính:**
- Điểm 1
- Điểm 2
- ...
💡 **Gợi ý:** (đề xuất hành động, nếu có)`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 1024
    });
    return { summary: response.choices[0].message.content.trim() };
  }

  // ==================== AI GRAMMAR CHECK ====================
  async grammarCheck(text) {
    const prompt = `You are an English grammar expert helping a Vietnamese student. Analyze the following English text for grammar, spelling, vocabulary, and style errors.

Text: "${text}"

Respond in this JSON format ONLY (no extra text):
{
  "correctedText": "the corrected version of the text",
  "errors": [
    { "original": "wrong part", "correction": "correct part", "rule": "brief rule name", "explanation": "brief explanation in Vietnamese" }
  ],
  "score": 85,
  "feedback": "Overall feedback in Vietnamese (1-2 sentences)",
  "suggestions": ["Tip 1 in Vietnamese", "Tip 2"]
}

If text is perfect, return score 100 and empty errors array.`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2048
    });

    try {
      const raw = response.choices[0].message.content.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) {}
    return { correctedText: text, errors: [], score: 0, feedback: 'Không thể phân tích', suggestions: [] };
  }

  // ==================== AI RANDOM EXERCISES ====================
  async randomExercises(count = 5, difficulty = 'medium', topics = null, previousQuestions = []) {
    const diffMap = {
      easy: 'beginner (A1-A2)',
      medium: 'intermediate (B1-B2)',
      hard: 'advanced (C1-C2)'
    };

    // ---- Large diverse pools ----
    const grammarTopics = [
      'present simple', 'present continuous', 'present perfect', 'present perfect continuous',
      'past simple', 'past continuous', 'past perfect', 'past perfect continuous',
      'future simple (will)', 'future with going to', 'future continuous', 'future perfect',
      'conditional type 0', 'conditional type 1', 'conditional type 2', 'conditional type 3',
      'passive voice (present)', 'passive voice (past)', 'passive voice (future)',
      'reported speech (statements)', 'reported speech (questions)', 'reported speech (commands)',
      'relative clauses (who/which/that)', 'relative clauses (where/when/whose)',
      'articles (a/an/the/zero)', 'prepositions of time (in/on/at)',
      'prepositions of place (in/on/at/under/between)', 'prepositions of movement (to/into/through)',
      'modal verbs: can/could', 'modal verbs: may/might', 'modal verbs: must/have to',
      'modal verbs: should/ought to', 'modal verbs: would',
      'comparatives (-er/more)', 'superlatives (-est/most)',
      'countable vs uncountable nouns', 'gerund (V-ing as subject/object)',
      'infinitive (to V after adjectives/verbs)', 'gerund vs infinitive (stop/remember/forget)',
      'tag questions', 'subject-verb agreement', 'there is/there are',
      'wish + past simple', 'wish + past perfect', 'if only',
      'used to', 'be used to + V-ing', 'get used to + V-ing',
      'so...that / such...that', 'too + adj + to V', 'adj + enough + to V',
      'both...and', 'either...or', 'neither...nor',
      'cleft sentences (It is...that)', 'inversion (Never have I...)',
      'have something done (causative)', 'embedded questions',
      'noun clauses', 'adverb clauses of time', 'adverb clauses of reason'
    ];

    const vocabTopics = [
      'phrasal verbs with GET', 'phrasal verbs with TAKE', 'phrasal verbs with PUT',
      'phrasal verbs with LOOK', 'phrasal verbs with TURN', 'phrasal verbs with GIVE',
      'phrasal verbs with COME', 'phrasal verbs with BREAK', 'phrasal verbs with RUN',
      'collocations with MAKE', 'collocations with DO', 'collocations with HAVE',
      'collocations with TAKE', 'collocations with PAY',
      'idioms about time', 'idioms about money', 'idioms about feelings',
      'idioms about success/failure', 'idioms about animals',
      'confusing words: affect/effect', 'confusing words: advice/advise',
      'confusing words: borrow/lend', 'confusing words: say/tell',
      'confusing words: make/do', 'confusing words: raise/rise',
      'confusing words: lay/lie', 'confusing words: bring/take',
      'word formation: noun suffixes (-tion, -ment, -ness)',
      'word formation: adjective suffixes (-ful, -less, -ous)',
      'word formation: negative prefixes (un-, dis-, im-, in-)',
      'word formation: verb prefixes (re-, over-, mis-)',
      'vocabulary: daily routines', 'vocabulary: travel & tourism',
      'vocabulary: food & cooking', 'vocabulary: work & career',
      'vocabulary: health & fitness', 'vocabulary: technology & internet',
      'vocabulary: environment & nature', 'vocabulary: education & learning',
      'vocabulary: shopping & fashion', 'vocabulary: emotions & personality',
      'vocabulary: sports & hobbies', 'vocabulary: family & relationships',
      'vocabulary: weather & seasons', 'vocabulary: entertainment & media',
      'vocabulary: home & furniture', 'vocabulary: transport & vehicles',
      'vocabulary: crime & law', 'vocabulary: art & music'
    ];

    const contexts = [
      'a student chatting with a classmate about homework',
      'two friends arguing about which movie to watch',
      'a tourist lost in Ho Chi Minh City asking for directions',
      'someone ordering bún bò at a street food stall and describing it to a foreigner',
      'a gamer talking about their favorite online game',
      'a couple planning their wedding on a budget',
      'someone complaining to a landlord about a broken AC',
      'a YouTuber scripting their next video introduction',
      'a grandparent telling a story about their childhood',
      'a teenager convincing parents to let them study abroad',
      'two colleagues gossiping about the new boss',
      'someone writing a Tinder bio in English',
      'a barista explaining coffee drinks to a confused customer',
      'a pet owner talking to a vet about their sick cat',
      'someone live-streaming a cooking session',
      'a traveler writing a review about a bad hotel experience',
      'a student giving an English presentation about Vietnam',
      'two friends texting about a surprise birthday party',
      'someone negotiating a price at Bến Thành market',
      'a fitness coach giving online workout instructions',
      'a customer returning a damaged product at a store',
      'someone describing their dream house to an architect',
      'a fan debating about football after a match',
      'a parent helping their child with English homework',
      'someone applying for a visa at an embassy',
      'a driver explaining to police why they were speeding',
      'two friends comparing iPhone vs Samsung',
      'someone writing a thank-you email after a job interview',
      'a librarian recommending books to a student',
      'a DJ announcing songs at a party',
      'a nurse instructing a patient about medication',
      'someone haggling at a flea market in London',
      'a waiter dealing with a customer who has food allergies',
      'two roommates making a cleaning schedule',
      'someone setting up a new smartphone and asking for help',
      'a tour guide talking about historical landmarks',
      'a student explaining why they missed class yesterday',
      'someone asking a stranger for WiFi password at a café'
    ];

    const exerciseTypes = [
      { type: 'multiple_choice', instruction: 'Write a fill-in-the-gap sentence with 4 answer choices (A/B/C/D). Only 1 is correct. Wrong answers must be plausible.' },
      { type: 'fill_blank', instruction: 'Write a sentence with ___ as blank. Student must type the correct word/phrase. Give only the correct answer.' },
      { type: 'correction', instruction: 'Write a sentence that contains ONE grammatical error. Student must find and correct it. "answer" = corrected sentence.' },
      { type: 'translation', instruction: 'Write a Vietnamese sentence. Student must translate to English. "answer" = correct English translation.' },
      { type: 'word_order', instruction: 'Give jumbled words that form a correct sentence. "question" = jumbled words separated by " / ", "answer" = correct sentence.' },
      { type: 'multiple_choice', instruction: 'Give a sentence and ask student to choose the CLOSEST meaning/synonym of an underlined word. 4 options.' },
      { type: 'multiple_choice', instruction: 'Give a sentence with an error. Ask student to identify WHICH underlined part (A/B/C/D) is wrong.' },
      { type: 'fill_blank', instruction: 'Give a short dialogue with one blank ___. Student fills the missing response. Natural conversation style.' },
      { type: 'correction', instruction: 'Write a short paragraph (2-3 sentences) with ONE subtle error. Student finds and corrects it.' },
      { type: 'translation', instruction: 'Give a Vietnamese idiom/expression. Student translates the MEANING to natural English (not word-by-word).' },
      { type: 'multiple_choice', instruction: 'Complete a mini-dialogue by choosing the best response from 4 options.' },
      { type: 'fill_blank', instruction: 'Give a sentence with a word in BRACKETS. Student writes the correct FORM of that word (e.g., noun→adjective).' }
    ];

    // Shuffle helper — Fisher-Yates
    const shuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    // Pre-assign SPECIFIC type + topic + context for EACH question
    const allTopicPool = topics && topics.length > 0
      ? shuffle([...grammarTopics, ...vocabTopics].filter(t => topics.some(sel => t.toLowerCase().includes(sel.toLowerCase()))))
      : shuffle([...grammarTopics, ...vocabTopics]);

    // Ensure enough items by cycling if needed
    const pickN = (arr, n) => {
      const shuffled = shuffle(arr);
      const result = [];
      for (let i = 0; i < n; i++) result.push(shuffled[i % shuffled.length]);
      return result;
    };

    const assignedTopics = pickN(allTopicPool.length >= count ? allTopicPool : [...grammarTopics, ...vocabTopics], count);
    const assignedContexts = pickN(contexts, count);
    const assignedTypes = pickN(exerciseTypes, count);

    // Build per-question spec
    const questionSpecs = [];
    for (let i = 0; i < count; i++) {
      questionSpecs.push({
        num: i + 1,
        type: assignedTypes[i].type,
        instruction: assignedTypes[i].instruction,
        topic: assignedTopics[i],
        context: assignedContexts[i]
      });
    }

    // Combine dedup history
    const allPrevious = [...this.exerciseHistory, ...previousQuestions]
      .filter((q, i, arr) => arr.indexOf(q) === i)
      .slice(-30);

    let avoidSection = '';
    if (allPrevious.length > 0) {
      avoidSection = `\nDO NOT reuse or closely imitate these old questions:\n${allPrevious.slice(-15).map((q, i) => `- ${q}`).join('\n')}\n`;
    }

    const prompt = `Generate EXACTLY ${count} English exercises for level ${diffMap[difficulty] || diffMap.medium}.

HERE IS THE EXACT SPEC FOR EACH QUESTION — follow it precisely:

${questionSpecs.map(s => `--- QUESTION ${s.num} ---
Type: ${s.type}
Format: ${s.instruction}
Grammar/Vocab topic: ${s.topic}
Situation/context: ${s.context}
`).join('\n')}
${avoidSection}
OUTPUT FORMAT — return ONLY this JSON array, nothing else:
[
  {
    "type": "${questionSpecs[0]?.type || 'multiple_choice'}",
    "question": "...",
    "options": ["A","B","C","D"],
    "answer": "correct answer text",
    "explanation": "Vietnamese explanation",
    "topic": "topic name"
  }
]
Note: "options" is required ONLY for multiple_choice type. For other types, omit "options" or set to null.`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You create English exercises. Follow the per-question specs EXACTLY — each question must match its assigned type, topic, and real-life context. Be creative with sentence content. Never use generic/textbook examples. Output valid JSON only.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 1.0,
      max_tokens: 3500
    });

    try {
      const raw = response.choices[0].message.content.trim();
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const exercises = JSON.parse(jsonMatch[0]);

        // Save to history
        const newQuestions = exercises.map(ex => ex.question);
        this.exerciseHistory.push(...newQuestions);
        if (this.exerciseHistory.length > 100) {
          this.exerciseHistory = this.exerciseHistory.slice(-100);
        }

        return { exercises, count: exercises.length, difficulty, historySize: this.exerciseHistory.length };
      }
    } catch (e) {}
    return { exercises: [], count: 0, difficulty };
  }

  // ==================== AI GRADE EXERCISES ====================
  async gradeExercises(exercises, userAnswers, difficulty = 'medium') {
    const diffMap = { easy: 'A1-A2', medium: 'B1-B2', hard: 'C1-C2' };
    const level = diffMap[difficulty] || diffMap.medium;

    const questionsText = exercises.map((ex, i) => {
      const userAns = userAnswers[i] !== null && userAnswers[i] !== undefined
        ? (ex.type === 'multiple_choice' && ex.options ? ex.options[userAnswers[i]] || '(không chọn)' : userAnswers[i] || '(bỏ trống)')
        : '(bỏ trống)';
      return `Câu ${i + 1} [${ex.type}] (Chủ đề: ${ex.topic || 'chung'}):\n  Đề: ${ex.question}${ex.options ? '\n  Lựa chọn: ' + ex.options.join(' | ') : ''}\n  Đáp án đúng: ${ex.answer}\n  Học sinh trả lời: ${userAns}`;
    }).join('\n\n');

    const prompt = `Bạn là giáo viên tiếng Anh chuyên nghiệp. Hãy chấm bài và phân tích chi tiết bài tập của học sinh (trình độ ${level}).

BÀI TẬP VÀ CÂU TRẢ LỜI:
${questionsText}

Hãy chấm điểm và phân tích CHI TIẾT từng câu. Trả về JSON:
{
  "score": <số câu đúng>,
  "total": <tổng số câu>,
  "percentage": <phần trăm>,
  "overallComment": "<nhận xét tổng quan bằng tiếng Việt, 2-3 câu>",
  "overallLevel": "excellent|good|average|needsImprovement",
  "results": [
    {
      "questionIndex": 0,
      "isCorrect": true/false,
      "userAnswer": "câu trả lời của học sinh",
      "correctAnswer": "đáp án đúng",
      "errorType": "grammar|vocabulary|spelling|comprehension|none",
      "errorDetail": "mô tả lỗi sai cụ thể bằng tiếng Việt (nếu sai)",
      "knowledgePoint": "kiến thức ngữ pháp/từ vựng liên quan bằng tiếng Việt",
      "explanation": "giải thích chi tiết tại sao đáp án đúng/sai bằng tiếng Việt",
      "tip": "mẹo ghi nhớ ngắn gọn bằng tiếng Việt"
    }
  ],
  "weakTopics": ["danh sách chủ đề cần ôn tập"],
  "studyAdvice": "lời khuyên học tập bằng tiếng Việt"
}`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4000
    });

    try {
      const raw = response.choices[0].message.content.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Grade parse error:', e);
    }
    return null;
  }

  // ==================== AI SCHEDULE GENERATOR ====================
  async generateSchedule(tasks, preferences = {}, options = {}) {
    const { wakeUp, sleep, breakDuration, focusHours, style } = preferences;
    const { mode = 'single', days = 1, startDate = '' } = options;

    const taskList = tasks.map((t, i) =>
      `${i + 1}. ${t.title}${t.duration ? ` (${t.duration} phút)` : ''}${t.priority ? ` [Ưu tiên: ${t.priority}]` : ''}${t.deadline ? ` [Hạn: ${t.deadline}]` : ''}${t.day ? ` [Ngày: ${t.day}]` : ''}${t.recurring ? ` [Lặp lại: ${t.recurring}]` : ''}`
    ).join('\n');

    const baseConditions = `
- Thức dậy: ${wakeUp || '7:00'}
- Đi ngủ: ${sleep || '23:00'}
- Thời gian nghỉ giữa các việc: ${breakDuration || 15} phút
- Giờ tập trung cao: ${focusHours || '8:00-12:00'}
- Phong cách: ${style || 'balanced'}`;

    let prompt, maxTokens;

    if (mode === 'weekly') {
      // ===== WEEKLY TIMETABLE =====
      const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
      prompt = `Bạn là trợ lý lập lịch trình thông minh. Hãy tạo THỜI KHÓA BIỂU CHO CẢ TUẦN (7 ngày) dựa trên danh sách công việc.

Công việc cần sắp xếp:
${taskList}

Điều kiện:${baseConditions}
- Ngày bắt đầu tuần: ${startDate || 'Thứ 2 tuần này'}

Quy tắc:
1. Sắp xếp công việc lặp lại vào đúng ngày được chỉ định
2. Phân bổ đều công việc trong tuần, tránh ngày quá nặng
3. Cuối tuần (Thứ 7, CN) nên nhẹ hơn
4. Xếp công việc ưu tiên cao vào giờ tập trung
5. Đảm bảo nghỉ trưa, ăn uống, giải trí mỗi ngày
6. Mỗi ngày nên có ít nhất 1 hoạt động thể dục/giải trí
7. "type" chỉ được là MỘT trong 5 giá trị: task, break, meal, exercise, free (KHÔNG dùng dạng kết hợp như "task|free")

Trả về JSON:
{
  "weekly": {
    ${weekDays.map(d => `"${d}": [{ "time": "07:00", "endTime": "07:30", "title": "tên", "type": "task hoặc break hoặc meal hoặc exercise hoặc free", "note": "" }]`).join(',\n    ')}
  },
  "tips": ["mẹo 1", "mẹo 2"],
  "summary": "nhận xét tổng quan"
}

CHỈ trả về JSON, không thêm text.`;
      maxTokens = 6000;
    } else if (mode === 'multi' && days > 1) {
      // ===== MULTI-DAY =====
      const dayLabels = [];
      const start = startDate ? new Date(startDate) : new Date();
      for (let i = 0; i < Math.min(days, 7); i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        dayLabels.push(d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }));
      }
      prompt = `Bạn là trợ lý lập lịch trình thông minh. Hãy tạo thời gian biểu tối ưu cho ${days} NGÀY TỚI dựa trên danh sách công việc.

Công việc cần làm:
${taskList}

Điều kiện:${baseConditions}
- Số ngày: ${days} (${dayLabels.join(', ')})

Quy tắc:
1. Phân bổ công việc hợp lý qua ${days} ngày
2. Không dồn quá nhiều việc vào 1 ngày
3. Xếp công việc ưu tiên cao và có deadline sớm trước
4. Mỗi ngày đều có nghỉ trưa, giải trí
5. Công việc nặng xen kẽ việc nhẹ
6. Nếu công việc chỉ định ngày cụ thể, hãy xếp đúng ngày đó
7. "type" chỉ được là MỘT trong 5 giá trị: task, break, meal, exercise, free

Trả về JSON:
{
  "days": [
    {
      "date": "${dayLabels[0]}",
      "schedule": [
        { "time": "07:00", "endTime": "07:30", "title": "tên", "type": "task hoặc break hoặc meal hoặc exercise hoặc free", "note": "" }
      ]
    }
  ],
  "tips": ["mẹo 1"],
  "summary": "nhận xét tổng quan"
}

CHỈ trả về JSON, không thêm text.`;
      maxTokens = Math.min(days * 1500, 8000);
    } else {
      // ===== SINGLE DAY =====
      prompt = `Bạn là trợ lý lập lịch trình thông minh. Hãy tạo thời gian biểu tối ưu cho ngày hôm nay dựa trên danh sách công việc.

Công việc cần làm:
${taskList}

Điều kiện:${baseConditions}

Quy tắc:
1. Xếp công việc ưu tiên cao vào giờ tập trung
2. Xen kẽ việc nặng/nhẹ
3. Đảm bảo có thời gian nghỉ hợp lý
4. Gợi ý thêm hoạt động giải trí/tập thể dục nếu có khoảng trống
5. "type" chỉ được là MỘT trong 5 giá trị: task, break, meal, exercise, free

Trả về JSON:
{
  "schedule": [
    { "time": "07:00", "endTime": "07:30", "title": "tên việc", "type": "task hoặc break hoặc meal hoặc exercise hoặc free", "note": "ghi chú ngắn" }
  ],
  "tips": ["mẹo 1", "mẹo 2"],
  "summary": "nhận xét tổng quan về lịch trình"
}

CHỈ trả về JSON, không thêm text.`;
      maxTokens = 3000;
    }

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: maxTokens
    });

    try {
      const raw = response.choices[0].message.content.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        parsed._mode = mode;
        return parsed;
      }
    } catch (e) {}
    return { schedule: [], tips: [], summary: 'Không thể tạo lịch trình', _mode: mode };
  }

  // ==================== LISTENING PRACTICE ====================
  async generateListening(level = 'intermediate', topic = '') {
    const levelMap = { beginner: 'A1-A2 (đơn giản, câu ngắn, từ vựng cơ bản)', intermediate: 'B1-B2 (trung cấp, câu phức hợp)', advanced: 'C1-C2 (nâng cao, từ vựng học thuật, idiom)' };
    const levelDesc = levelMap[level] || levelMap.intermediate;
    const topicHint = topic ? `Chủ đề: "${topic}".` : 'Chọn chủ đề ngẫu nhiên (du lịch, công việc, cuộc sống, khoa học, văn hóa...).';

    const prompt = `Bạn là giáo viên tiếng Anh. Hãy tạo 1 bài luyện nghe tiếng Anh cấp độ ${levelDesc}.
${topicHint}

Tạo một đoạn văn tiếng Anh (80-150 từ) với giọng tự nhiên, phù hợp trình độ.
Sau đó tạo 5 câu hỏi gồm:
- 2 câu fill-in-blank (điền từ vào chỗ trống dựa trên nội dung nghe)
- 3 câu multiple choice (trắc nghiệm nội dung nghe)

Trả về JSON:
{
  "title": "tiêu đề bài nghe",
  "passage": "đoạn văn đầy đủ tiếng Anh (không có chỗ trống)",
  "passageWithBlanks": "đoạn văn với ___ thay cho từ cần điền",
  "blanks": ["từ1", "từ2"],
  "questions": [
    { "type": "fill_blank", "question": "câu hỏi điền từ", "answer": "đáp án" },
    { "type": "mcq", "question": "câu hỏi", "options": ["A", "B", "C", "D"], "correct": 0, "explain": "giải thích" }
  ],
  "vocabulary": [
    { "word": "từ khó", "meaning": "nghĩa tiếng Việt", "phonetic": "/phiên âm/" }
  ],
  "transcript_vi": "bản dịch tiếng Việt"
}

CHỈ trả về JSON, không thêm text.`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2500
    });

    try {
      const raw = response.choices[0].message.content.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) { console.error('Parse listening error:', e); }
    return null;
  }

  // ==================== READING COMPREHENSION ====================
  async generateReading(level = 'intermediate', topic = '') {
    const levelMap = { beginner: 'A1-A2 (đơn giản, 100-150 từ, từ vựng cơ bản)', intermediate: 'B1-B2 (trung cấp, 150-250 từ, câu phức hợp)', advanced: 'C1-C2 (nâng cao, 200-350 từ, từ vựng học thuật)' };
    const levelDesc = levelMap[level] || levelMap.intermediate;
    const topicHint = topic ? `Chủ đề: "${topic}".` : 'Chọn chủ đề ngẫu nhiên (khoa học, lịch sử, công nghệ, môi trường, xã hội, văn hóa...).';

    const prompt = `Bạn là giáo viên tiếng Anh. Hãy tạo 1 bài đọc hiểu tiếng Anh cấp độ ${levelDesc}.
${topicHint}

Tạo bài đọc phù hợp trình độ, sau đó tạo 5 câu hỏi đọc hiểu:
- 2 câu True/False
- 3 câu multiple choice

Trả về JSON:
{
  "title": "tiêu đề bài đọc",
  "passage": "đoạn văn tiếng Anh đầy đủ",
  "wordCount": số_từ,
  "questions": [
    { "type": "true_false", "question": "câu hỏi", "answer": true, "explain": "giải thích" },
    { "type": "mcq", "question": "câu hỏi", "options": ["A", "B", "C", "D"], "correct": 0, "explain": "giải thích" }
  ],
  "vocabulary": [
    { "word": "từ khó", "meaning": "nghĩa tiếng Việt", "phonetic": "/phiên âm/" }
  ],
  "summary_vi": "tóm tắt tiếng Việt (2-3 câu)"
}

CHỈ trả về JSON, không thêm text.`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 3000
    });

    try {
      const raw = response.choices[0].message.content.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) { console.error('Parse reading error:', e); }
    return null;
  }

  // ==================== DAILY CHALLENGE ====================
  async generateDailyChallenge(level = 'intermediate') {
    const levelMap = { beginner: 'A1-A2', intermediate: 'B1-B2', advanced: 'C1-C2' };
    const lvl = levelMap[level] || 'B1-B2';
    const today = new Date().toLocaleDateString('vi-VN');

    const prompt = `Bạn là giáo viên tiếng Anh. Hãy tạo THỬ THÁCH HÀNG NGÀY (Daily Challenge) cho ngày ${today}, cấp độ ${lvl}.

Thử thách gồm 4 mini-task đa dạng kỹ năng:
1. 🎧 Listening: 1 câu điền từ vào chỗ trống (nghe)
2. 📖 Reading: 1 đoạn ngắn (2-3 câu) + 1 câu hỏi MCQ
3. ✍️ Writing: 1 yêu cầu viết câu (dịch hoặc sáng tạo)
4. 📝 Grammar: 1 câu trắc nghiệm ngữ pháp

Trả về JSON:
{
  "date": "${today}",
  "theme": "chủ đề ngày",
  "tasks": [
    {
      "skill": "listening",
      "icon": "🎧",
      "instruction": "hướng dẫn",
      "sentence": "câu tiếng Anh đầy đủ (để TTS đọc)",
      "question": "câu tiếng Anh với ___ chỗ trống",
      "answer": "từ cần điền",
      "xp": 25
    },
    {
      "skill": "reading",
      "icon": "📖",
      "instruction": "hướng dẫn",
      "passage": "đoạn văn ngắn",
      "question": "câu hỏi",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "xp": 25
    },
    {
      "skill": "writing",
      "icon": "✍️",
      "instruction": "hướng dẫn",
      "prompt_vi": "câu tiếng Việt cần dịch hoặc yêu cầu viết",
      "sampleAnswer": "mẫu đáp án tiếng Anh",
      "keywords": ["từ khóa 1", "từ khóa 2"],
      "xp": 30
    },
    {
      "skill": "grammar",
      "icon": "📝",
      "instruction": "hướng dẫn",
      "question": "câu hỏi ngữ pháp với ___",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explain": "giải thích",
      "xp": 20
    }
  ],
  "bonusXP": 20,
  "motivational": "câu động viên tiếng Việt"
}

CHỈ trả về JSON, không thêm text.`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 2500
    });

    try {
      const raw = response.choices[0].message.content.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) { console.error('Parse daily challenge error:', e); }
    return null;
  }

  // ===== VOCAB AI LOOKUP =====
  async lookupWord(word) {
    const prompt = `Bạn là từ điển Anh-Việt chuyên nghiệp. Tra cứu từ/cụm từ tiếng Anh sau và trả về JSON.

Từ cần tra: "${word}"

Trả về JSON CHÍNH XÁC theo format:
{
  "word": "${word}",
  "meaning": "nghĩa tiếng Việt (ngắn gọn, đầy đủ các nghĩa phổ biến)",
  "phonetic": "/phiên âm IPA/",
  "example": "1 câu ví dụ tự nhiên bằng tiếng Anh",
  "category": "chủ đề (vd: daily, business, academic, technology, travel, food, emotion...)",
  "level": "beginner|intermediate|advanced"
}

Quy tắc:
- meaning: tiếng Việt, ngắn gọn, liệt kê các nghĩa phổ biến cách nhau bằng dấu phẩy
- phonetic: IPA chuẩn, bao trong //
- example: câu tự nhiên, dễ hiểu
- category: 1 từ tiếng Anh mô tả chủ đề
- level: dựa vào độ phổ biến (CEFR A1-A2=beginner, B1-B2=intermediate, C1-C2=advanced)

CHỈ trả về JSON, không thêm text.`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500
    });

    try {
      const raw = response.choices[0].message.content.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) { console.error('Parse vocab lookup error:', e); }
    return null;
  }
}

module.exports = new AIService();
