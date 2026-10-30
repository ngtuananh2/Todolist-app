const { Router } = require('express');
const noteService = require('../services/note.service');

const router = Router();

// ==================== NOTE ROUTES (Second Brain) ====================

// GET /api/notes — list all notes (with filters)
router.get('/', async (req, res, next) => {
  try {
    const { search, type, category, tag, pinned, archived } = req.query;
    const notes = await noteService.getAllNotes({ search, type, category, tag, pinned, archived });
    res.json(notes);
  } catch (err) { next(err); }
});

// GET /api/notes/categories — list unique categories
router.get('/categories', async (req, res, next) => {
  try {
    const cats = await noteService.getCategories({
      includeArchived: req.query.includeArchived === 'true'
    });
    res.json(cats);
  } catch (err) { next(err); }
});

router.put('/categories', async (req, res, next) => {
  try {
    const oldName = typeof req.body?.oldName === 'string' ? req.body.oldName.trim() : '';
    const newName = typeof req.body?.newName === 'string' ? req.body.newName.trim() : '';
    if (!oldName || !newName || oldName.length > 100 || newName.length > 100) {
      return res.status(400).json({ error: 'Tên danh mục phải có từ 1 đến 100 ký tự' });
    }

    const result = await noteService.renameCategory(oldName, newName);
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/categories/:name', async (req, res, next) => {
  try {
    const category = req.params.name.trim();
    if (!category || category.length > 100) {
      return res.status(400).json({ error: 'Tên danh mục không hợp lệ' });
    }
    const result = await noteService.deleteCategory(category);
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/notes/tags — list unique tags
router.get('/tags', async (req, res, next) => {
  try {
    const tags = await noteService.getTags();
    res.json(tags);
  } catch (err) { next(err); }
});

// PUT /api/notes/reorder — save the visible order for all active notes
router.put('/reorder', async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.some(id => typeof id !== 'string')) {
      return res.status(400).json({ error: 'orderedIds phải là danh sách ID ghi chú' });
    }

    const reordered = await noteService.reorderNotes(orderedIds);
    if (!reordered) {
      return res.status(409).json({ error: 'Danh sách ghi chú đã thay đổi. Hãy tải lại rồi thử lại.' });
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PUT /api/notes/tags/rename — rename a tag
router.put('/tags/rename', async (req, res, next) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ error: 'oldName và newName là bắt buộc' });
    const result = await noteService.renameTag(oldName, newName.trim());
    res.json(result);
  } catch (err) { next(err); }
});

// DELETE /api/notes/tags/:name — delete a tag from all notes
router.delete('/tags/:name', async (req, res, next) => {
  try {
    const result = await noteService.deleteTag(req.params.name);
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/notes/stats — get stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await noteService.getStats();
    res.json(stats);
  } catch (err) { next(err); }
});

// GET /api/notes/graph — get graph data
router.get('/graph', async (req, res, next) => {
  try {
    const graph = await noteService.getGraph();
    res.json(graph);
  } catch (err) { next(err); }
});

// GET /api/notes/:id/backlinks — get backlinks for a note
router.get('/:id/backlinks', async (req, res, next) => {
  try {
    const backlinks = await noteService.getBacklinks(req.params.id);
    res.json(backlinks);
  } catch (err) { next(err); }
});

// GET /api/notes/:id/history — get version history
router.get('/:id/history', async (req, res, next) => {
  try {
    const history = await noteService.getNoteHistory(req.params.id);
    res.json(history);
  } catch (err) { next(err); }
});

// POST /api/notes/:id/restore/:versionId — restore a version
router.post('/:id/restore/:versionId', async (req, res, next) => {
  try {
    const note = await noteService.restoreVersion(req.params.id, req.params.versionId);
    if (!note) return res.status(404).json({ error: 'Không tìm thấy phiên bản' });
    res.json(note);
  } catch (err) { next(err); }
});

// GET /api/notes/:id — get a single note
router.get('/:id', async (req, res, next) => {
  try {
    const note = await noteService.getNoteById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú' });
    res.json(note);
  } catch (err) { next(err); }
});

// POST /api/notes — create a note
router.post('/', async (req, res, next) => {
  try {
    const { title, content, url, type, category, tags, color } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Tiêu đề không được để trống' });
    const note = await noteService.createNote({ title, content, url, type, category, tags, color });
    res.status(201).json(note);
  } catch (err) { next(err); }
});

// PUT /api/notes/:id — update a note
router.put('/:id', async (req, res, next) => {
  try {
    const note = await noteService.updateNote(req.params.id, req.body);
    if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú' });
    res.json(note);
  } catch (err) { next(err); }
});

// PATCH /api/notes/:id/pin — toggle pin
router.patch('/:id/pin', async (req, res, next) => {
  try {
    const note = await noteService.togglePin(req.params.id);
    if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú' });
    res.json(note);
  } catch (err) { next(err); }
});

// PATCH /api/notes/:id/archive — archive
router.patch('/:id/archive', async (req, res, next) => {
  try {
    const note = await noteService.archiveNote(req.params.id);
    if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú' });
    res.json(note);
  } catch (err) { next(err); }
});

// PATCH /api/notes/:id/unarchive — restore from archive
router.patch('/:id/unarchive', async (req, res, next) => {
  try {
    const note = await noteService.unarchiveNote(req.params.id);
    if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú' });
    res.json(note);
  } catch (err) { next(err); }
});

// DELETE /api/notes/:id — delete permanently
router.delete('/:id', async (req, res, next) => {
  try {
    await noteService.deleteNote(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
