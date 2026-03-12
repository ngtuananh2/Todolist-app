const { Router } = require('express');
const aiService = require('../services/ai.service');

const router = Router();

function sendAIError(res, err, fallbackMessage) {
  const isConfigError = err?.code === 'AI_NOT_CONFIGURED';
  res.status(isConfigError ? 503 : (err.status || 500)).json({
    error: isConfigError ? 'AI chưa được cấu hình' : fallbackMessage,
    detail: err.message
  });
}

// ==================== AI CHAT ROUTES ====================

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, page, context } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Tin nhắn không được để trống' });
    }

    const result = await aiService.chat(message, sessionId, page || 'todo', context || null);
    res.json(result);
  } catch (err) {
    console.error('AI Error:', err);
    sendAIError(res, err, 'Lỗi kết nối AI');
  }
});

// DELETE /api/ai/chat
router.delete('/chat', (req, res) => {
  res.json(aiService.clearHistory());
});

// POST /api/ai/classify
router.post('/classify', async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Tiêu đề không được để trống' });
    }
    const result = await aiService.classify(title, description);
    res.json(result);
  } catch (err) {
    console.error('AI Classify Error:', err);
    sendAIError(res, err, 'Lỗi phân loại AI');
  }
});

// GET /api/ai/report
router.get('/report', async (req, res) => {
  try {
    const result = await aiService.weeklyReport();
    res.json(result);
  } catch (err) {
    console.error('AI Report Error:', err);
    sendAIError(res, err, 'Lỗi tạo báo cáo AI');
  }
});

// GET /api/ai/report/habit
router.get('/report/habit', async (req, res) => {
  try {
    const result = await aiService.habitReport();
    res.json(result);
  } catch (err) {
    console.error('AI Habit Report Error:', err);
    sendAIError(res, err, 'Lỗi tạo báo cáo thói quen');
  }
});

// GET /api/ai/report/brain
router.get('/report/brain', async (req, res) => {
  try {
    const result = await aiService.brainReport();
    res.json(result);
  } catch (err) {
    console.error('AI Brain Report Error:', err);
    sendAIError(res, err, 'Lỗi tạo báo cáo ghi chú');
  }
});

// GET /api/ai/report/english
router.get('/report/english', async (req, res) => {
  try {
    const result = await aiService.englishReport();
    res.json(result);
  } catch (err) {
    console.error('AI English Report Error:', err);
    sendAIError(res, err, 'Lỗi tạo báo cáo học tiếng Anh');
  }
});

// GET /api/ai/report/trading
router.get('/report/trading', async (req, res) => {
  try {
    const result = await aiService.tradingReport();
    res.json(result);
  } catch (err) {
    console.error('AI Trading Report Error:', err);
    sendAIError(res, err, 'Lỗi tạo báo cáo giao dịch');
  }
});

// POST /api/ai/summarize-note
router.post('/summarize-note', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!content) return res.status(400).json({ error: 'Nội dung không được để trống' });
    const result = await aiService.summarizeNote(title, content);
    res.json(result);
  } catch (err) {
    console.error('AI Summarize Error:', err);
    sendAIError(res, err, 'Lỗi tóm tắt AI');
  }
});

// POST /api/ai/grammar-check
router.post('/grammar-check', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Văn bản không được để trống' });
    const result = await aiService.grammarCheck(text);
    res.json(result);
  } catch (err) {
    console.error('AI Grammar Check Error:', err);
    sendAIError(res, err, 'Lỗi kiểm tra ngữ pháp');
  }
});

// POST /api/ai/random-exercises
router.post('/random-exercises', async (req, res) => {
  try {
    const { count, difficulty, topics, previousQuestions } = req.body;
    const result = await aiService.randomExercises(count || 5, difficulty || 'medium', topics, previousQuestions || []);
    res.json(result);
  } catch (err) {
    console.error('AI Random Exercises Error:', err);
    sendAIError(res, err, 'Lỗi tạo bài tập ngẫu nhiên');
  }
});

// POST /api/ai/grade-exercises
router.post('/grade-exercises', async (req, res) => {
  try {
    const { exercises, userAnswers, difficulty } = req.body;
    if (!exercises || !Array.isArray(exercises)) {
      return res.status(400).json({ error: 'Danh sách bài tập không hợp lệ' });
    }
    const result = await aiService.gradeExercises(exercises, userAnswers || [], difficulty);
    if (!result) return res.status(500).json({ error: 'Không thể chấm bài' });
    res.json(result);
  } catch (err) {
    console.error('AI Grade Error:', err);
    sendAIError(res, err, 'Lỗi chấm bài');
  }
});

// POST /api/ai/schedule
router.post('/schedule', async (req, res) => {
  try {
    const { tasks, preferences, options } = req.body;
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'Danh sách công việc không được để trống' });
    }
    const result = await aiService.generateSchedule(tasks, preferences, options || {});
    res.json(result);
  } catch (err) {
    console.error('AI Schedule Error:', err);
    sendAIError(res, err, 'Lỗi tạo lịch trình');
  }
});

// POST /api/ai/conversation
router.post('/conversation', async (req, res) => {
  try {
    const { message, sessionId, scenario, level } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Tin nhắn không được để trống' });
    const result = await aiService.conversationPractice(message, sessionId, scenario, level);
    res.json(result);
  } catch (err) {
    console.error('AI Conversation Error:', err);
    sendAIError(res, err, 'Lỗi luyện hội thoại');
  }
});

// POST /api/ai/listening
router.post('/listening', async (req, res) => {
  try {
    const { level, topic } = req.body;
    const result = await aiService.generateListening(level || 'intermediate', topic || '');
    if (!result) return res.status(500).json({ error: 'Không thể tạo bài luyện nghe' });
    res.json(result);
  } catch (err) {
    console.error('AI Listening Error:', err);
    sendAIError(res, err, 'Lỗi tạo bài luyện nghe');
  }
});

// POST /api/ai/reading
router.post('/reading', async (req, res) => {
  try {
    const { level, topic } = req.body;
    const result = await aiService.generateReading(level || 'intermediate', topic || '');
    if (!result) return res.status(500).json({ error: 'Không thể tạo bài đọc hiểu' });
    res.json(result);
  } catch (err) {
    console.error('AI Reading Error:', err);
    sendAIError(res, err, 'Lỗi tạo bài đọc hiểu');
  }
});

// POST /api/ai/daily-challenge
router.post('/daily-challenge', async (req, res) => {
  try {
    const { level } = req.body;
    const result = await aiService.generateDailyChallenge(level || 'intermediate');
    if (!result) return res.status(500).json({ error: 'Không thể tạo thử thách' });
    res.json(result);
  } catch (err) {
    console.error('AI Daily Challenge Error:', err);
    sendAIError(res, err, 'Lỗi tạo thử thách hàng ngày');
  }
});

module.exports = router;
