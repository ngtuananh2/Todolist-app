const { Router } = require('express');
const subtaskService = require('../services/subtask.service');

const router = Router();

// ==================== SUBTASK ROUTES ====================

// POST /api/todos/:id/subtasks
router.post('/todos/:id/subtasks', (req, res) => {
  const todoId = parseInt(req.params.id);
  const { title } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Tiêu đề không được để trống' });
  }

  const result = subtaskService.create(todoId, title);
  if (result?.error === 'NOT_FOUND') {
    return res.status(404).json({ error: 'Không tìm thấy todo' });
  }
  res.status(201).json(result);
});

// PUT /api/subtasks/:id
router.put('/subtasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const updated = subtaskService.update(id, req.body);
  if (!updated) return res.status(404).json({ error: 'Không tìm thấy subtask' });
  res.json(updated);
});

// DELETE /api/subtasks/:id
router.delete('/subtasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  res.json(subtaskService.delete(id));
});

module.exports = router;
