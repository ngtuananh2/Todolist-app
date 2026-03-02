const { Router } = require('express');
const tagService = require('../services/tag.service');

const router = Router();

// ==================== TAG ROUTES ====================

// GET /api/tags
router.get('/', (req, res) => {
  res.json(tagService.getAll());
});

// POST /api/tags
router.post('/', (req, res) => {
  const { name, color } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Tên tag không được để trống' });
  }

  try {
    const tag = tagService.create(name, color);
    res.status(201).json(tag);
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Tag đã tồn tại' });
    }
    throw e;
  }
});

// DELETE /api/tags/:id
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  res.json(tagService.delete(id));
});

module.exports = router;
