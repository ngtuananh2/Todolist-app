const {
  Todo, Tag, Habit, HabitLog, Note, NoteVersion, EnglishProgress,
  EnglishMindmap, Vocab, Trade, TradingAccount, Schedule
} = require('../config/database');
const { validateBackupPayload, validateModulePayload } = require('./backup-payload');

class DashboardService {
  /* ─────── Aggregated stats from ALL modules ─────── */
  async getOverview() {
    const [todos, habits, notes, vocab, trades, progress] = await Promise.all([
      this._todoStats(),
      this._habitStats(),
      this._brainStats(),
      this._vocabStats(),
      this._tradingStats(),
      this._englishStats()
    ]);
    return { todos, habits, notes, vocab, trades, english: progress, generatedAt: new Date().toISOString() };
  }

  /* ─────── Activity timeline (recent actions across all modules) ─────── */
  async getTimeline(limit = 30) {
    const boundLimit = Math.min(limit, 50);
    const [todos, notes, vocabs, trades, habitLogs] = await Promise.all([
      Todo.find().select('title completed completedAt createdAt').sort({ createdAt: -1 }).limit(boundLimit).lean(),
      Note.find().select('title type createdAt').sort({ createdAt: -1 }).limit(boundLimit).lean(),
      Vocab.find().select('word meaning createdAt').sort({ createdAt: -1 }).limit(boundLimit).lean(),
      Trade.find().select('type symbol status pnl createdAt').sort({ createdAt: -1 }).limit(boundLimit).lean(),
      HabitLog.find({ done: true }).populate('habitId', 'name icon').sort({ date: -1 }).limit(boundLimit).lean()
    ]);

    const items = [];

    todos.forEach(t => items.push({
      type: 'todo', icon: t.completed ? '✅' : '📝',
      title: t.completed ? `Hoàn thành: ${t.title}` : `Tạo todo: ${t.title}`,
      date: t.completedAt || t.createdAt, module: 'todo'
    }));

    notes.forEach(n => items.push({
      type: 'note', icon: n.type === 'link' ? '🔗' : n.type === 'image' ? '🖼️' : '📒',
      title: `Ghi chú: ${n.title}`, date: n.createdAt, module: 'brain'
    }));

    vocabs.forEach(v => items.push({
      type: 'vocab', icon: '📚',
      title: `Từ vựng: ${v.word} — ${v.meaning}`, date: v.createdAt, module: 'english'
    }));

    trades.forEach(tr => items.push({
      type: 'trade', icon: tr.pnl >= 0 ? '📈' : '📉',
      title: `${tr.type.toUpperCase()} ${tr.symbol} — ${tr.status === 'closed' ? (tr.pnl >= 0 ? '+' : '') + tr.pnl.toFixed(2) + '$' : 'Open'}`,
      date: tr.createdAt, module: 'trading'
    }));

    habitLogs.forEach(l => {
      if (l.habitId) {
        items.push({
          type: 'habit', icon: l.habitId.icon || '✅',
          title: `Hoàn thành: ${l.habitId.name || 'Thói quen'}`, date: l.date + 'T12:00:00.000Z', module: 'habit'
        });
      }
    });

    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    return items.slice(0, limit);
  }

  /* ─────── Today Focus — Unified daily view ─────── */
  async getTodayFocus() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const [allTodos, habits, todayLogs, dueVocab, openTrades] = await Promise.all([
      Todo.find({ completed: false }).select('title description deadline priority').lean().limit(1000),
      Habit.find({ archived: false }).select('name icon color order').lean(),
      HabitLog.find({ date: today, done: true }).select('habitId').lean(),
      Vocab.find({ mastered: false, nextReview: { $ne: '', $lte: today } }).select('word meaning phonetic category level').lean(),
      Trade.find({ status: 'open' }).select('symbol type entryPrice quantity leverage stopLoss takeProfit market').lean()
    ]);

    // Todos: overdue + due today + high priority
    const overdueTodos = allTodos.filter(t => t.deadline && t.deadline < today)
      .map(t => ({ ...t, id: t._id.toString(), _urgency: 'overdue' }));
    const dueTodayTodos = allTodos.filter(t => t.deadline && t.deadline.startsWith(today))
      .map(t => ({ ...t, id: t._id.toString(), _urgency: 'today' }));
    const highPriorityTodos = allTodos.filter(t => t.priority === 'high' && !t.deadline?.startsWith(today) && !(t.deadline && t.deadline < today))
      .map(t => ({ ...t, id: t._id.toString(), _urgency: 'high' }));

    // Habits not done today
    const doneHabitIds = new Set(todayLogs.map(l => l.habitId.toString()));
    const undoneHabits = habits.filter(h => !doneHabitIds.has(h._id.toString()))
      .map(h => ({ ...h, id: h._id.toString() }));
    const doneHabits = habits.filter(h => doneHabitIds.has(h._id.toString()))
      .map(h => ({ ...h, id: h._id.toString() }));

    return {
      date: today,
      todos: { overdue: overdueTodos, dueToday: dueTodayTodos, highPriority: highPriorityTodos },
      habits: { undone: undoneHabits, done: doneHabits, total: habits.length },
      vocab: { due: dueVocab.map(v => ({ ...v, id: v._id.toString() })), count: dueVocab.length },
      trades: { open: openTrades.map(t => ({ ...t, id: t._id.toString() })), count: openTrades.length }
    };
  }

  /* ─────── Global search across all modules ─────── */
  async globalSearch(q) {
    if (!q || !q.trim()) return [];
    const regex = new RegExp(q.trim(), 'i');

    const [todos, notes, vocabs, trades, habits] = await Promise.all([
      Todo.find({ $or: [{ title: regex }, { description: regex }] }).limit(10).lean(),
      Note.find({ $or: [{ title: regex }, { content: regex }] }).limit(10).lean(),
      Vocab.find({ $or: [{ word: regex }, { meaning: regex }] }).limit(10).lean(),
      Trade.find({ $or: [{ symbol: regex }, { notes: regex }, { strategy: regex }] }).limit(10).lean(),
      Habit.find({ name: regex }).limit(10).lean()
    ]);

    const results = [];
    todos.forEach(t => results.push({ type: 'todo', title: t.title, sub: t.description || '', id: t._id, url: '/', icon: '📝' }));
    notes.forEach(n => results.push({ type: 'note', title: n.title, sub: n.content?.substring(0, 100) || '', id: n._id, url: '/brain.html', icon: '🧠' }));
    vocabs.forEach(v => results.push({ type: 'vocab', title: v.word, sub: v.meaning, id: v._id, url: '/english.html', icon: '📚' }));
    trades.forEach(tr => results.push({ type: 'trade', title: `${tr.type} ${tr.symbol}`, sub: tr.strategy || '', id: tr._id, url: '/trading.html', icon: '📈' }));
    habits.forEach(h => results.push({ type: 'habit', title: h.name, sub: '', id: h._id, url: '/habit.html', icon: h.icon || '✅' }));
    return results;
  }

  /* ─────── Backup: export ALL data ─────── */
  async exportAll() {
    const [todos, tags, habits, habitLogs, notes, noteVersions, progress, mindmaps, vocab, trades, accounts, schedules] = await Promise.all([
      Todo.find().lean(), Tag.find().lean(), Habit.find().lean(),
      HabitLog.find().lean(), Note.find().lean(), NoteVersion.find().lean(),
      EnglishProgress.find().lean(), EnglishMindmap.find().lean(),
      Vocab.find().lean(), Trade.find().lean(), TradingAccount.find().lean(), Schedule.find().lean()
    ]);
    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      data: {
        todos, tags, habits, habitLogs, notes, noteVersions,
        englishProgress: progress, englishMindmaps: mindmaps, vocab,
        trades, tradingAccounts: accounts, schedules
      }
    };
  }

  /* ─────── Backup: export single module ─────── */
  async exportModule(moduleName) {
    const exportedAt = new Date().toISOString();
    let data = {};

    switch (moduleName) {
      case 'todo': {
        const [todos, tags] = await Promise.all([Todo.find().lean(), Tag.find().lean()]);
        data = { todos, tags };
        break;
      }
      case 'habit': {
        const [habits, habitLogs] = await Promise.all([Habit.find().lean(), HabitLog.find().lean()]);
        data = { habits, habitLogs };
        break;
      }
      case 'brain': {
        const [notes, noteVersions] = await Promise.all([Note.find().lean(), NoteVersion.find().lean()]);
        data = { notes, noteVersions };
        break;
      }
      case 'english': {
        const [progress, mindmaps, vocab] = await Promise.all([
          EnglishProgress.find().lean(), EnglishMindmap.find().lean(), Vocab.find().lean()
        ]);
        data = { englishProgress: progress, englishMindmaps: mindmaps, vocab };
        break;
      }
      case 'trading': {
        const [trades, accounts] = await Promise.all([Trade.find().lean(), TradingAccount.find().lean()]);
        data = { trades, tradingAccounts: accounts };
        break;
      }
      default:
        throw new Error('Invalid module: ' + moduleName);
    }

    return { version: '2.0', module: moduleName, exportedAt, data };
  }

  async importModule(moduleName, payload) {
    const { data, collections, counts } = validateModulePayload(moduleName, payload);
    const moduleModels = {
      habit: { habits: Habit, habitLogs: HabitLog },
      brain: { notes: Note, noteVersions: NoteVersion },
      english: { englishProgress: EnglishProgress, englishMindmaps: EnglishMindmap, vocab: Vocab },
      trading: { trades: Trade, tradingAccounts: TradingAccount }
    };
    const imported = {};
    const skipped = {};
    const plans = [];

    for (const key of collections) {
      const Model = moduleModels[moduleName][key];
      const records = data[key];
      for (const [index, record] of records.entries()) {
        const validationError = new Model(record).validateSync();
        if (validationError) {
          const error = new Error(`Dữ liệu ${key}[${index}] không hợp lệ: ${validationError.message}`);
          error.status = 400;
          throw error;
        }
      }

      const existingIds = records.length
        ? await Model.distinct('_id', { _id: { $in: records.map(record => record._id) } })
        : [];
      const existingIdSet = new Set(existingIds.map(id => id.toString()));
      const recordsToImport = records.filter(record => !existingIdSet.has(record._id));
      await this._assertNoMergeUniqueConflicts(key, Model, recordsToImport);
      plans.push({ key, Model, recordsToImport });
      imported[key] = recordsToImport.length;
      skipped[key] = counts[key] - recordsToImport.length;
    }

    for (const { Model, recordsToImport } of plans) {
      if (recordsToImport.length) await Model.insertMany(recordsToImport);
    }

    return { success: true, mode: 'merge', imported, skipped };
  }

  /* ─────── Restore: import ALL data ─────── */
  previewImport(payload) {
    const { counts, omittedCollections } = validateBackupPayload(payload);
    return {
      version: payload.version || 'unknown',
      exportedAt: payload.exportedAt || null,
      counts,
      omittedCollections
    };
  }

  async importAll(payload, mode = 'replace') {
    if (!['merge', 'replace'].includes(mode)) {
      const error = new Error('Chế độ khôi phục không hợp lệ');
      error.status = 400;
      throw error;
    }

    const { data } = validateBackupPayload(payload);
    const collections = {
      todos: Todo,
      tags: Tag,
      habits: Habit,
      habitLogs: HabitLog,
      notes: Note,
      noteVersions: NoteVersion,
      englishProgress: EnglishProgress,
      englishMindmaps: EnglishMindmap,
      vocab: Vocab,
      trades: Trade,
      tradingAccounts: TradingAccount,
      schedules: Schedule
    };
    const plans = [];

    for (const [key, Model] of Object.entries(collections)) {
      const records = data[key];
      if (!Array.isArray(records)) continue;

      records.forEach((record, index) => {
        const validationError = new Model(record).validateSync();
        if (validationError) {
          const error = new Error(`Dữ liệu ${key}[${index}] không hợp lệ: ${validationError.message}`);
          error.status = 400;
          throw error;
        }
      });

      let recordsToImport = records;
      if (mode === 'merge' && records.length) {
        const existingIds = await Model.distinct('_id', {
          _id: { $in: records.map(record => record._id) }
        });
        const existingIdSet = new Set(existingIds.map(id => id.toString()));
        recordsToImport = records.filter(record => !existingIdSet.has(record._id));
        await this._assertNoMergeUniqueConflicts(key, Model, recordsToImport);
      }
      plans.push({ key, Model, recordsToImport, total: records.length });
    }

    const imported = {};
    const skipped = {};
    for (const { key, Model, recordsToImport, total } of plans) {
      if (mode === 'replace') await Model.deleteMany({});
      if (recordsToImport.length) await Model.insertMany(recordsToImport);
      imported[key] = recordsToImport.length;
      if (mode === 'merge') skipped[key] = total - recordsToImport.length;
    }

    return { success: true, mode, imported, ...(mode === 'merge' ? { skipped } : {}) };
  }

  async _assertNoMergeUniqueConflicts(key, Model, records) {
    const uniqueFields = {
      tags: ['name'],
      englishProgress: ['lessonId'],
      schedules: ['key']
    };
    const fields = uniqueFields[key] || [];

    for (const field of fields) {
      const values = [...new Set(records.map(record => record[field]).filter(Boolean))];
      if (!values.length) continue;
      const existing = await Model.find({ [field]: { $in: values } }).select(`_id ${field}`).lean();
      if (existing.length) {
        const error = new Error(`Không thể gộp ${key}: đã tồn tại ${field} trùng. Hãy chọn thay thế hoặc xử lý dữ liệu trùng trước.`);
        error.status = 409;
        throw error;
      }
    }

    if (key === 'habitLogs' && records.length) {
      const dates = [...new Set(records.map(record => record.date).filter(Boolean))];
      const existing = await HabitLog.find({ date: { $in: dates } }).select('_id habitId date').lean();
      const existingKeys = new Set(existing.map(record => `${record.habitId}:${record.date}`));
      if (records.some(record => existingKeys.has(`${record.habitId}:${record.date}`))) {
        const error = new Error('Không thể gộp habitLogs: đã tồn tại lịch sử thói quen trùng. Hãy chọn thay thế hoặc xử lý dữ liệu trùng trước.');
        error.status = 409;
        throw error;
      }
    }
  }

  // ─── Private helpers ───
  async _todoStats() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const weekStartDate = weekStart.toISOString().slice(0, 10);

    const [total, done, overdue, highPriority, weeklyCompleted] = await Promise.all([
      Todo.countDocuments(),
      Todo.countDocuments({ completed: true }),
      Todo.countDocuments({ completed: false, deadline: { $ne: null, $lt: today } }),
      Todo.countDocuments({ completed: false, priority: 'high' }),
      Todo.countDocuments({ completed: true, completedAt: { $gte: weekStartDate } })
    ]);
    const active = total - done;
    return {
      total, done, active, overdue, highPriority, weeklyCompleted,
      completionRate: total ? Math.round(done / total * 100) : 0
    };
  }

  async _habitStats() {
    const habits = await Habit.find({ archived: false }).select('_id name icon').lean();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const d365 = new Date(now);
    d365.setDate(d365.getDate() - 365);
    const d365Str = d365.toISOString().split('T')[0];

    const [logs, totalLogs] = await Promise.all([
      HabitLog.find({ done: true, date: { $gte: d365Str } }).select('habitId date').lean(),
      HabitLog.countDocuments({ done: true })
    ]);

    const logMap = new Map();
    let todayDone = 0;
    logs.forEach(l => {
      const hid = l.habitId.toString();
      if (!logMap.has(hid)) logMap.set(hid, new Set());
      logMap.get(hid).add(l.date);
      if (l.date === today) todayDone++;
    });

    let totalStreak = 0;
    for (const h of habits) {
      const dates = logMap.get(h._id.toString());
      if (!dates) continue;
      let streak = 0;
      let d = new Date(now);
      const todayStr = d.toISOString().split('T')[0];
      if (!dates.has(todayStr)) {
        d.setDate(d.getDate() - 1);
      }
      for (let i = 0; i < 365; i++) {
        const ds = d.toISOString().split('T')[0];
        if (dates.has(ds)) {
          streak++;
          d.setDate(d.getDate() - 1);
        } else {
          break;
        }
      }
      totalStreak = Math.max(totalStreak, streak);
    }

    return { total: habits.length, todayDone, todayTotal: habits.length, longestStreak: totalStreak, totalLogs };
  }

  async _brainStats() {
    const [total, pinned, byTypeAgg] = await Promise.all([
      Note.countDocuments({ archived: false }),
      Note.countDocuments({ archived: false, pinned: true }),
      Note.aggregate([
        { $match: { archived: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);
    const byType = { note: 0, link: 0, image: 0 };
    byTypeAgg.forEach(item => {
      if (byType[item._id] !== undefined) byType[item._id] = item.count;
    });
    return { total, pinned, byType };
  }

  async _vocabStats() {
    const [total, mastered] = await Promise.all([
      Vocab.countDocuments(),
      Vocab.countDocuments({ mastered: true })
    ]);
    return { total, mastered, learning: total - mastered };
  }

  async _tradingStats() {
    const trades = await Trade.find().select('status pnl').lean();
    const closed = trades.filter(t => t.status === 'closed');
    const open = trades.filter(t => t.status === 'open');
    const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
    const wins = closed.filter(t => t.pnl > 0).length;
    const winRate = closed.length ? Math.round(wins / closed.length * 100) : 0;
    return { total: trades.length, open: open.length, closed: closed.length, totalPnl: Math.round(totalPnl * 100) / 100, winRate };
  }

  async _englishStats() {
    const [progress, totalVocab, masteredVocab] = await Promise.all([
      EnglishProgress.find().select('bestScore').lean().limit(500),
      Vocab.countDocuments(),
      Vocab.countDocuments({ mastered: true })
    ]);
    const totalLessons = progress.length;
    const avgScore = totalLessons ? Math.round(progress.reduce((s, p) => s + (p.bestScore || 0), 0) / totalLessons) : 0;
    return { lessonsCompleted: totalLessons, avgScore, totalVocab, mastered: masteredVocab };
  }

  /* ─────── Notifications / Reminders ─────── */
  async getNotifications() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
    const notifications = [];

    // 1. Overdue todos
    const overdueTodos = await Todo.find({
      completed: false,
      deadline: { $ne: null, $exists: true }
    }).lean().limit(500);
    overdueTodos.forEach(t => {
      if (t.deadline && t.deadline < today) {
        notifications.push({
          type: 'overdue', icon: '🔴', priority: 'high',
          title: `Quá hạn: ${t.title}`,
          message: `Deadline: ${t.deadline}`,
          module: 'todo', url: '/'
        });
      } else if (t.deadline === today) {
        notifications.push({
          type: 'due_today', icon: '🟡', priority: 'medium',
          title: `Hết hạn hôm nay: ${t.title}`,
          message: 'Cần hoàn thành trong hôm nay',
          module: 'todo', url: '/'
        });
      } else if (t.deadline === tomorrow) {
        notifications.push({
          type: 'due_tomorrow', icon: '🟠', priority: 'low',
          title: `Hết hạn ngày mai: ${t.title}`,
          message: `Deadline: ${t.deadline}`,
          module: 'todo', url: '/'
        });
      }
    });

    // 2. Vocab due for review (Spaced Repetition)
    const dueVocab = await Vocab.find({
      mastered: false,
      nextReview: { $ne: '', $lte: today }
    }).lean().limit(200);
    if (dueVocab.length > 0) {
      notifications.push({
        type: 'vocab_review', icon: '📖', priority: 'medium',
        title: `${dueVocab.length} từ vựng cần ôn tập`,
        message: 'Ôn tập để ghi nhớ tốt hơn (SM-2)',
        module: 'english', url: '/english.html'
      });
    }

    // 3. Habits not done today
    const habits = await Habit.find({ archived: false }).lean().limit(200);
    const todayLogs = await HabitLog.find({ date: today, done: true }).lean().limit(300);
    const doneIds = new Set(todayLogs.map(l => l.habitId.toString()));
    const undoneHabits = habits.filter(h => !doneIds.has(h._id.toString()));
    if (undoneHabits.length > 0) {
      notifications.push({
        type: 'habit_reminder', icon: '💪', priority: 'low',
        title: `${undoneHabits.length} thói quen chưa hoàn thành`,
        message: undoneHabits.slice(0, 3).map(h => h.name).join(', ') + (undoneHabits.length > 3 ? '...' : ''),
        module: 'habit', url: '/habit.html'
      });
    }

    // 4. Open trades (risk awareness)
    const openTrades = await Trade.find({ status: 'open' }).lean().limit(100);
    if (openTrades.length > 0) {
      notifications.push({
        type: 'open_trades', icon: '📊', priority: 'low',
        title: `${openTrades.length} lệnh đang mở`,
        message: openTrades.slice(0, 3).map(t => t.symbol).join(', '),
        module: 'trading', url: '/trading.html'
      });
    }

    // Sort by priority: high > medium > low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    notifications.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return { notifications, count: notifications.length, checkedAt: now.toISOString() };
  }
}

module.exports = new DashboardService();
