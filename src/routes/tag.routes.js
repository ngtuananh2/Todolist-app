const { Router } = require('express');
const tagService = require('../services/tag.service');

const router = Router();

// ==================== TAG ROUTES ====================

// GET /api/tags
router.get('/', async (req, res, next) => {
  try {
    const tags = await tagService.getAll();
    res.json(tags);
  } catch (err) { next(err); }
});

// POST /api/tags
router.post('/', async (req, res, next) => {
  try {
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tên tag không được để trống' });
    }

    const tag = await tagService.create(name, color);
    res.status(201).json(tag);
  } catch (e) {
    if (e.message.includes('duplicate') || e.code === 11000) {
      return res.status(409).json({ error: 'Tag đã tồn tại' });
    }
    next(e);
  }
});

// DELETE /api/tags/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await tagService.delete(id);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
