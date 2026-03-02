const { Router } = require('express');
const todoService = require('../services/todo.service');

const router = Router();

// ==================== TODO ROUTES ====================

// GET /api/todos?search=
router.get('/', (req, res) => {
  const todos = todoService.getAll(req.query.search);
  res.json(todos);
});

// POST /api/todos
router.post('/', (req, res) => {
  const { title, description, priority, deadline, tagIds } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Tiêu đề không được để trống' });
  }

  const todo = todoService.create({ title, description, priority, deadline, tagIds });
  res.status(201).json(todo);
});

// PUT /api/todos/:id
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const updated = todoService.update(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy todo' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/todos/:id
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const result = todoService.delete(id);
  if (!result) return res.status(404).json({ error: 'Không tìm thấy todo' });
  res.json(result);
});

// DELETE /api/todos (clear completed)
router.delete('/', (req, res) => {
  const result = todoService.clearCompleted();
  res.json(result);
});

module.exports = router;
