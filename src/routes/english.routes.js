const { Router } = require('express');
const englishService = require('../services/english.service');
const aiService = require('../services/ai.service');

const router = Router();

// ==================== ENGLISH LEARNING ROUTES ====================

// GET /api/english/progress
router.get('/progress', async (req, res) => {
  try {
    const progress = await englishService.getProgress();
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy tiến độ', detail: err.message });
  }
});

// POST /api/english/progress
router.post('/progress', async (req, res) => {
  try {
    const { lessonId, score, totalQ } = req.body;
    if (!lessonId) return res.status(400).json({ error: 'lessonId is required' });
    const result = await englishService.saveProgress(lessonId, score, totalQ);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lưu tiến độ', detail: err.message });
  }
});

// DELETE /api/english/progress/:lessonId
router.delete('/progress/:lessonId', async (req, res) => {
  try {
    await englishService.resetProgress(req.params.lessonId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xóa tiến độ', detail: err.message });
  }
});

// GET /api/english/vocab
router.get('/vocab', async (req, res) => {
  try {
    const vocab = await englishService.getAllVocab(req.query);
    res.json(vocab);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy từ vựng', detail: err.message });
  }
});

// GET /api/english/vocab/review — MUST be before /vocab/:id to avoid "review" being treated as an id
router.get('/vocab/review', async (req, res) => {
  try {
    const words = await englishService.getDueForReview();
    res.json(words);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy từ cần ôn', detail: err.message });
  }
});

// POST /api/english/vocab
router.post('/vocab', async (req, res) => {
  try {
    const { word } = req.body;
    if (!word) return res.status(400).json({ error: 'word is required' });
    // If no meaning provided, auto-lookup with AI
    if (!req.body.meaning) {
      const aiResult = await aiService.lookupWord(word.trim());
      if (aiResult) {
        req.body.meaning = aiResult.meaning || '';
        if (!req.body.phonetic) req.body.phonetic = aiResult.phonetic || '';
        if (!req.body.example) req.body.example = aiResult.example || '';
        if (!req.body.category) req.body.category = aiResult.category || '';
        if (!req.body.level) req.body.level = aiResult.level || 'beginner';
      }
      if (!req.body.meaning) return res.status(400).json({ error: 'Không tìm được nghĩa cho từ này' });
    }
    const vocab = await englishService.createVocab(req.body);
    res.status(201).json(vocab);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tạo từ vựng', detail: err.message });
  }
});

// PUT /api/english/vocab/:id
router.put('/vocab/:id', async (req, res) => {
  try {
    const vocab = await englishService.updateVocab(req.params.id, req.body);
    if (!vocab) return res.status(404).json({ error: 'Không tìm thấy từ vựng' });
    res.json(vocab);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật từ vựng', detail: err.message });
  }
});

// PATCH /api/english/vocab/:id/mastered
router.patch('/vocab/:id/mastered', async (req, res) => {
  try {
    const vocab = await englishService.toggleMastered(req.params.id);
    if (!vocab) return res.status(404).json({ error: 'Không tìm thấy từ vựng' });
    res.json(vocab);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi toggle mastered', detail: err.message });
  }
});

// DELETE /api/english/vocab/:id
router.delete('/vocab/:id', async (req, res) => {
  try {
    await englishService.deleteVocab(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xóa từ vựng', detail: err.message });
  }
});

// GET /api/english/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await englishService.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy thống kê', detail: err.message });
  }
});

// POST /api/english/ai-exercises — Generate exercises with AI
router.post('/ai-exercises', async (req, res) => {
  try {
    const { lessonId, lessonTitle, count, difficulty } = req.body;
    if (!lessonId || !lessonTitle) {
      return res.status(400).json({ error: 'lessonId and lessonTitle are required' });
    }
    const exercises = await aiService.generateExercises(
      lessonId, lessonTitle, count || 6, difficulty || 'medium'
    );
    res.json({ lessonId, exercises });
  } catch (err) {
    console.error('AI Exercise Error:', err);
    res.status(500).json({ error: 'Lỗi tạo bài tập AI', detail: err.message });
  }
});

// POST /api/english/vocab/ai-lookup — AI fills in word details
router.post('/vocab/ai-lookup', async (req, res) => {
  try {
    const { word } = req.body;
    if (!word) return res.status(400).json({ error: 'word is required' });
    const result = await aiService.lookupWord(word.trim());
    if (!result) return res.status(500).json({ error: 'AI không thể tra cứu từ này' });
    res.json(result);
  } catch (err) {
    console.error('AI Vocab Lookup Error:', err);
    res.status(500).json({ error: 'Lỗi tra cứu AI', detail: err.message });
  }
});

// POST /api/english/vocab/import — Import CSV vocab
router.post('/vocab/import', async (req, res) => {
  try {
    const { vocabList } = req.body;
    if (!Array.isArray(vocabList) || vocabList.length === 0) {
      return res.status(400).json({ error: 'vocabList array is required' });
    }
    const result = await englishService.importVocab(vocabList);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi import từ vựng', detail: err.message });
  }
});

// GET /api/english/word-of-day
router.get('/word-of-day', async (req, res) => {
  try {
    const word = await englishService.getWordOfDay();
    res.json(word);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy từ ngày', detail: err.message });
  }
});

// GET /api/english/streak
router.get('/streak', async (req, res) => {
  try {
    const data = await englishService.getStreak();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy streak', detail: err.message });
  }
});

// POST /api/english/vocab/:id/review — Submit review result (SM-2)
router.post('/vocab/:id/review', async (req, res) => {
  try {
    const { quality } = req.body; // 0-5 quality rating
    if (quality === undefined || quality < 0 || quality > 5) {
      return res.status(400).json({ error: 'quality must be 0-5' });
    }
    const vocab = await englishService.processReview(req.params.id, quality);
    if (!vocab) return res.status(404).json({ error: 'Không tìm thấy từ vựng' });
    res.json(vocab);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xử lý review', detail: err.message });
  }
});

module.exports = router;
