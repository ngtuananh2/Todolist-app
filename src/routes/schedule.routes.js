const { Router } = require('express');
const { Schedule } = require('../config/database');
const { isEmailConfigured } = require('../services/scheduleReminder.service');

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const saved = await Schedule.findOne({ key: 'main' }).lean();
    res.json({ schedule: saved?.data || null, emailConfigured: isEmailConfigured() });
  } catch (err) { next(err); }
});

router.put('/', async (req, res, next) => {
  try {
    const schedule = req.body?.schedule;
    if (schedule !== null && (!schedule || typeof schedule !== 'object' || Array.isArray(schedule))) {
      return res.status(400).json({ error: 'Lịch trình không hợp lệ' });
    }
    if (schedule && schedule._mode === 'weekly' && (!schedule.weekly || typeof schedule.weekly !== 'object')) {
      return res.status(400).json({ error: 'Thời khóa biểu tuần không hợp lệ' });
    }

    await Schedule.findOneAndUpdate(
      { key: 'main' },
      { $set: { data: schedule || null, updatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ saved: true });
  } catch (err) { next(err); }
});

router.delete('/', async (req, res, next) => {
  try {
    await Schedule.findOneAndUpdate(
      { key: 'main' },
      { $set: { data: null, sentOccurrences: {}, updatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

module.exports = router;