const { Router } = require('express');
const subtaskService = require('../services/subtask.service');

const router = Router();

// ==================== SUBTASK ROUTES ====================

// POST /api/todos/:id/subtasks
router.post('/todos/:id/subtasks', async (req, res, next) => {
  try {
    const todoId = req.params.id;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Tiêu đề không được để trống' });
    }

    const result = await subtaskService.create(todoId, title);
    if (result?.error === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Không tìm thấy todo' });
    }
    res.status(201).json(result);
  } catch (err) { next(err); }
});

// PUT /api/subtasks/:id
router.put('/subtasks/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const updated = await subtaskService.update(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy subtask' });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/subtasks/:id
router.delete('/subtasks/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await subtaskService.delete(id);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
