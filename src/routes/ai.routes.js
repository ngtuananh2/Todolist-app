const { Router } = require('express');
const aiService = require('../services/ai.service');

const router = Router();

// ==================== AI CHAT ROUTES ====================

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Tin nhắn không được để trống' });
    }

    const result = await aiService.chat(message, sessionId);
    res.json(result);
  } catch (err) {
    console.error('AI Error:', err);
    res.status(500).json({
      error: 'Lỗi kết nối AI',
      detail: err.message
    });
  }
});

// DELETE /api/ai/chat
router.delete('/chat', (req, res) => {
  res.json(aiService.clearHistory());
});

module.exports = router;
