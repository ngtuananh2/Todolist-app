const { Router } = require('express');
const dashboardService = require('../services/dashboard.service');

const router = Router();

// GET /api/dashboard — Aggregated stats from all modules
router.get('/', async (req, res, next) => {
  try {
    const data = await dashboardService.getOverview();
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/dashboard/timeline — Activity timeline
router.get('/timeline', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const items = await dashboardService.getTimeline(limit);
    res.json(items);
  } catch (err) { next(err); }
});

// GET /api/dashboard/today — Today Focus data
router.get('/today', async (req, res, next) => {
  try {
    const data = await dashboardService.getTodayFocus();
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/dashboard/search?q= — Global search
router.get('/search', async (req, res, next) => {
  try {
    const results = await dashboardService.globalSearch(req.query.q);
    res.json(results);
  } catch (err) { next(err); }
});

// GET /api/dashboard/backup — Export all data
router.get('/backup', async (req, res, next) => {
  try {
    const data = await dashboardService.exportAll();
    res.setHeader('Content-Disposition', 'attachment; filename=taskflow-backup.json');
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/dashboard/notifications — Get pending reminders
router.get('/notifications', async (req, res, next) => {
  try {
    const notifications = await dashboardService.getNotifications();
    res.json(notifications);
  } catch (err) { next(err); }
});

// GET /api/dashboard/export/:module — Export single module
router.get('/export/:module', async (req, res, next) => {
  try {
    const data = await dashboardService.exportModule(req.params.module);
    res.setHeader('Content-Disposition', `attachment; filename=taskflow-${req.params.module}.json`);
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/dashboard/restore — Import all data
router.post('/restore', async (req, res, next) => {
  try {
    const result = await dashboardService.importAll(req.body);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
