const { Router } = require('express');
const habitService = require('../services/habit.service');

const router = Router();

// ==================== HABIT ROUTES ====================

// GET /api/habits — list all active habits
router.get('/', async (req, res, next) => {
  try {
    const habits = await habitService.getAllHabits();
    res.json(habits);
  } catch (err) { next(err); }
});

// POST /api/habits — create a habit
router.post('/', async (req, res, next) => {
  try {
    const { name, icon, color } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Tên habit không được để trống' });
    const habit = await habitService.createHabit({ name, icon, color });
    res.status(201).json(habit);
  } catch (err) { next(err); }
});

// PUT /api/habits/:id — update a habit
router.put('/:id', async (req, res, next) => {
  try {
    const habit = await habitService.updateHabit(req.params.id, req.body);
    if (!habit) return res.status(404).json({ error: 'Không tìm thấy habit' });
    res.json(habit);
  } catch (err) { next(err); }
});

// DELETE /api/habits/:id — delete a habit
router.delete('/:id', async (req, res, next) => {
  try {
    await habitService.deleteHabit(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/habits/:id/toggle — toggle a log for a date
router.post('/:id/toggle', async (req, res, next) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });
    const result = await habitService.toggleLog(req.params.id, date);
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/habits/logs?start=&end= — get logs for date range
router.get('/logs', async (req, res, next) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end dates required' });
    const logs = await habitService.getLogs(start, end);
    res.json(logs);
  } catch (err) { next(err); }
});

// GET /api/habits/stats — get habit stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await habitService.getStats();
    res.json(stats);
  } catch (err) { next(err); }
});

module.exports = router;
