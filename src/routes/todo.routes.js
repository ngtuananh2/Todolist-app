const { Router } = require('express');
const todoService = require('../services/todo.service');

const router = Router();

// ==================== TODO ROUTES ====================

// GET /api/todos?search=
router.get('/', async (req, res, next) => {
  try {
    const todos = await todoService.getAll(req.query.search);
    res.json(todos);
  } catch (err) { next(err); }
});

// GET /api/todos/projects
router.get('/projects', async (req, res, next) => {
  try {
    const projects = await todoService.getProjects();
    res.json(projects);
  } catch (err) { next(err); }
});

// GET /api/todos/stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await todoService.getStats();
    res.json(stats);
  } catch (err) { next(err); }
});

// GET /api/todos/export
router.get('/export', async (req, res, next) => {
  try {
    const data = await todoService.exportData();
    res.setHeader('Content-Disposition', 'attachment; filename=taskflow-export.json');
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/todos/import
router.post('/import', async (req, res, next) => {
  try {
    const result = await todoService.importData(req.body);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/todos/reorder
router.post('/reorder', async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds must be an array' });
    const result = await todoService.reorder(orderedIds);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/todos/restore (undo delete)
router.post('/restore', async (req, res, next) => {
  try {
    const todo = await todoService.restore(req.body);
    res.status(201).json(todo);
  } catch (err) { next(err); }
});

// POST /api/todos
router.post('/', async (req, res, next) => {
  try {
    const { title, description, priority, deadline, tagIds, recurrence, project } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Tiêu đề không được để trống' });
    }
    const todo = await todoService.create({ title, description, priority, deadline, tagIds, recurrence, project });
    res.status(201).json(todo);
  } catch (err) { next(err); }
});

// PUT /api/todos/:id
router.put('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const updated = await todoService.update(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy todo' });
    res.json(updated);
  } catch (err) {
    if (err.message === 'Tiêu đề không được để trống') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// DELETE /api/todos/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await todoService.delete(id);
    if (!result) return res.status(404).json({ error: 'Không tìm thấy todo' });
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/todos/bulk/complete
router.post('/bulk/complete', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' });
    const result = await todoService.bulkComplete(ids);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/todos/bulk/delete
router.post('/bulk/delete', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' });
    const result = await todoService.bulkDelete(ids);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/todos/bulk/move
router.post('/bulk/move', async (req, res, next) => {
  try {
    const { ids, project } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' });
    const result = await todoService.bulkMoveProject(ids, project || '');
    res.json(result);
  } catch (err) { next(err); }
});

// DELETE /api/todos (clear completed)
router.delete('/', async (req, res, next) => {
  try {
    const result = await todoService.clearCompleted();
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
