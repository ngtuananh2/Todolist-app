const { Router } = require('express');
const englishService = require('../services/english.service');
const aiService = require('../services/ai.service');

const router = Router();

async function lookupWordFallback(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0] || {};
    const phonetic = entry.phonetic || (Array.isArray(entry.phonetics)
      ? (entry.phonetics.find(p => p && p.text)?.text || '')
      : '');

    let meaning = '';
    if (Array.isArray(entry.meanings) && entry.meanings.length > 0) {
      const firstMeaning = entry.meanings[0];
      const firstDef = Array.isArray(firstMeaning.definitions)
        ? firstMeaning.definitions.find(d => d && d.definition)
        : null;
      meaning = firstDef?.definition || '';
    }

    return {
      meaning,
      phonetic,
      example: Array.isArray(entry.meanings) && entry.meanings[0]?.definitions?.[0]?.example
        ? entry.meanings[0].definitions[0].example
        : ''
    };
  } catch (_) {
    return null;
  }
}

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

// GET /api/english/oxford3000
router.get('/oxford3000', async (req, res) => {
  try {
    const words = await englishService.getOxford3000Words({
      level: req.query.level,
      limit: req.query.limit,
      refresh: req.query.refresh === 'true'
    });
    res.json(words);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy Oxford 3000', detail: err.message });
  }
});

// GET /api/english/word-sources
router.get('/word-sources', async (req, res) => {
  try {
    const sources = englishService.getExternalSourceList();
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy danh sách nguồn từ vựng', detail: err.message });
  }
});

// GET /api/english/vocab-source
router.get('/vocab-source', async (req, res) => {
  try {
    const words = await englishService.getWordSourceWords({
      source: req.query.source,
      level: req.query.level,
      limit: req.query.limit,
      offset: req.query.offset,
      refresh: req.query.refresh === 'true'
    });
    res.json(words);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy danh sách từ vựng theo nguồn', detail: err.message });
  }
});

// POST /api/english/vocab/import-oxford
router.post('/vocab/import-oxford', async (req, res) => {
  try {
    const { words } = req.body;
    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: 'words array is required' });
    }

    const uniqueWords = [];
    const seen = new Set();
    for (const item of words) {
      const w = String(item.word || '').trim();
      if (!w) continue;
      const key = w.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      uniqueWords.push(item);
    }

    async function enrichWord(item) {
      const word = String(item.word || '').trim();
      if (!word) return null;

      const enriched = {
        ...item,
        word,
        meaning: String(item.meaning || '').trim(),
        phonetic: String(item.phonetic || '').trim(),
        example: String(item.example || '').trim()
      };

      // Auto-fill meaning + IPA via AI when missing
      if (!enriched.meaning || !enriched.phonetic) {
        try {
          const ai = await aiService.lookupWord(word);
          if (ai) {
            if (!enriched.meaning && ai.meaning) enriched.meaning = String(ai.meaning).trim();
            if (!enriched.phonetic && ai.phonetic) enriched.phonetic = String(ai.phonetic).trim();
            if (!enriched.example && ai.example) enriched.example = String(ai.example).trim();
            if (!enriched.category && ai.category) enriched.category = String(ai.category).trim();
            if (!enriched.level && ai.level) enriched.level = String(ai.level).trim();
          }
        } catch (_) {
          // Keep fallback fields if AI lookup fails for a word
        }
      }

      // Fallback dictionary when AI is unavailable
      if (!enriched.meaning || !enriched.phonetic) {
        const fb = await lookupWordFallback(word);
        if (fb) {
          if (!enriched.meaning && fb.meaning) enriched.meaning = String(fb.meaning).trim();
          if (!enriched.phonetic && fb.phonetic) enriched.phonetic = String(fb.phonetic).trim();
          if (!enriched.example && fb.example) enriched.example = String(fb.example).trim();
        }
      }

      return enriched;
    }

    const enrichedWords = [];
    const batchSize = 4;
    for (let i = 0; i < uniqueWords.length; i += batchSize) {
      const chunk = uniqueWords.slice(i, i + batchSize);
      const chunkResults = await Promise.all(chunk.map(enrichWord));
      enrichedWords.push(...chunkResults.filter(Boolean));
    }

    const result = await englishService.importOxfordWords(enrichedWords);
    const autoFilled = enrichedWords.filter(w => w.meaning && w.phonetic).length;
    res.json({ ...result, autoFilled });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi import Oxford 3000', detail: err.message });
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

// GET /api/english/mindmap
router.get('/mindmap', async (req, res) => {
  try {
    const data = await englishService.getMindmap();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy mindmap', detail: err.message });
  }
});

// PUT /api/english/mindmap
router.put('/mindmap', async (req, res) => {
  try {
    const { title, tree } = req.body || {};
    const data = await englishService.saveMindmap({ title, tree });
    res.json({ title: data.title, tree: data.tree });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lưu mindmap', detail: err.message });
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

// POST /api/english/vocab/quick-lookup — quick lookup with fallback (no save)
router.post('/vocab/quick-lookup', async (req, res) => {
  try {
    const { word } = req.body;
    const normalized = String(word || '').trim();
    if (!normalized) return res.status(400).json({ error: 'word is required' });

    let result = null;
    try {
      result = await aiService.lookupWord(normalized);
    } catch (_) {
      result = null;
    }

    if (!result || (!result.meaning && !result.phonetic)) {
      const fb = await lookupWordFallback(normalized);
      if (fb) {
        result = {
          word: normalized,
          meaning: result?.meaning || fb.meaning || '',
          phonetic: result?.phonetic || fb.phonetic || '',
          example: result?.example || fb.example || '',
          category: result?.category || 'conversation',
          level: result?.level || 'beginner'
        };
      }
    }

    if (!result) return res.status(404).json({ error: 'Không tra được nghĩa cho từ này' });
    res.json({
      word: normalized,
      meaning: String(result.meaning || '').trim(),
      phonetic: String(result.phonetic || '').trim(),
      example: String(result.example || '').trim(),
      category: String(result.category || '').trim(),
      level: String(result.level || '').trim()
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tra cứu từ nhanh', detail: err.message });
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
