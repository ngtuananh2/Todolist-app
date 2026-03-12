const { Habit, HabitLog } = require('../config/database');

// ==================== HABIT SERVICE ====================

/**
 * Get all active habits
 */
async function getAllHabits() {
  return Habit.find({ archived: false }).sort({ order: 1, createdAt: -1 });
}

/**
 * Create a new habit
 */
async function createHabit({ name, icon, color }) {
  const count = await Habit.countDocuments({ archived: false });
  const habit = new Habit({
    name: name.trim(),
    icon: icon || '✅',
    color: color || '#7c7268',
    order: count,
    createdAt: new Date().toISOString()
  });
  return habit.save();
}

/**
 * Update a habit
 */
async function updateHabit(id, data) {
  const update = {};
  if (data.name !== undefined) update.name = data.name.trim();
  if (data.icon !== undefined) update.icon = data.icon;
  if (data.color !== undefined) update.color = data.color;
  if (data.order !== undefined) update.order = data.order;
  return Habit.findByIdAndUpdate(id, update, { new: true });
}

/**
 * Archive (soft delete) a habit
 */
async function archiveHabit(id) {
  await Habit.findByIdAndUpdate(id, { archived: true });
  return { success: true };
}

/**
 * Delete a habit permanently
 */
async function deleteHabit(id) {
  await HabitLog.deleteMany({ habitId: id });
  await Habit.findByIdAndDelete(id);
  return { success: true };
}

/**
 * Toggle a habit log for a specific date
 */
async function toggleLog(habitId, date) {
  const existing = await HabitLog.findOne({ habitId, date });
  if (existing) {
    await HabitLog.deleteOne({ _id: existing._id });
    return { done: false };
  } else {
    const log = new HabitLog({ habitId, date, done: true });
    await log.save();
    return { done: true };
  }
}

/**
 * Get logs for a date range
 * Returns { [habitId]: Set of dates }
 */
async function getLogs(startDate, endDate) {
  const logs = await HabitLog.find({
    date: { $gte: startDate, $lte: endDate },
    done: true
  }).lean();

  // Group by habitId
  const map = {};
  logs.forEach(log => {
    const hid = log.habitId.toString();
    if (!map[hid]) map[hid] = [];
    map[hid].push(log.date);
  });
  return map;
}

/**
 * Get stats for habits
 * - Current streak per habit
 * - Completion rate per habit (last 30 days)
 * - Overall stats
 */
async function getStats() {
  const habits = await Habit.find({ archived: false }).lean();
  const today = new Date();
  const todayStr = formatDate(today);

  // Last 30 days
  const d30 = new Date(today);
  d30.setDate(d30.getDate() - 29);
  const d30Str = formatDate(d30);

  const logs = await HabitLog.find({
    date: { $gte: d30Str, $lte: todayStr },
    done: true
  }).lean();

  // Build log map: { habitId: Set<date> }
  const logMap = {};
  logs.forEach(l => {
    const hid = l.habitId.toString();
    if (!logMap[hid]) logMap[hid] = new Set();
    logMap[hid].add(l.date);
  });

  const habitStats = habits.map(h => {
    const hid = h._id.toString();
    const dates = logMap[hid] || new Set();

    // Completion rate (last 30 days)
    const rate = Math.round((dates.size / 30) * 100);

    // Current streak
    let streak = 0;
    const checkDate = new Date(today);
    while (true) {
      const dateStr = formatDate(checkDate);
      if (dates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Best streak (last 30 days)
    let bestStreak = 0;
    let tempStreak = 0;
    const walkDate = new Date(d30);
    for (let i = 0; i < 30; i++) {
      const ds = formatDate(walkDate);
      if (dates.has(ds)) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
      walkDate.setDate(walkDate.getDate() + 1);
    }

    return {
      id: hid,
      name: h.name,
      icon: h.icon,
      color: h.color,
      completedDays: dates.size,
      rate,
      streak,
      bestStreak
    };
  });

  // Overall
  const totalPossible = habits.length * 30;
  const totalDone = logs.length;
  const overallRate = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;

  // Daily completions for chart (last 30 days)
  const dailyData = [];
  const chartDate = new Date(d30);
  for (let i = 0; i < 30; i++) {
    const ds = formatDate(chartDate);
    const dayName = chartDate.toLocaleDateString('vi-VN', { weekday: 'short' });
    let count = 0;
    Object.values(logMap).forEach(dates => {
      if (dates.has(ds)) count++;
    });
    dailyData.push({ date: ds, day: dayName, count, total: habits.length });
    chartDate.setDate(chartDate.getDate() + 1);
  }

  return {
    habits: habitStats,
    overall: {
      totalHabits: habits.length,
      overallRate,
      totalDone,
      totalPossible
    },
    dailyData
  };
}

function formatDate(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

module.exports = {
  getAllHabits,
  createHabit,
  updateHabit,
  archiveHabit,
  deleteHabit,
  toggleLog,
  getLogs,
  getStats
};
