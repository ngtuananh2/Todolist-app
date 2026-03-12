const { Todo, Tag, Habit, HabitLog, Note, EnglishProgress, Vocab, Trade, TradingAccount } = require('../config/database');

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
    const [todos, notes, vocabs, trades, habitLogs] = await Promise.all([
      Todo.find().sort({ createdAt: -1 }).limit(limit).lean(),
      Note.find().sort({ createdAt: -1 }).limit(limit).lean(),
      Vocab.find().sort({ createdAt: -1 }).limit(limit).lean(),
      Trade.find().sort({ createdAt: -1 }).limit(limit).lean(),
      HabitLog.find({ done: true }).sort({ date: -1 }).limit(limit).populate('habitId').lean()
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
          title: `Hoàn thành: ${l.habitId.name}`, date: l.date + 'T12:00:00.000Z', module: 'habit'
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
      Todo.find({ completed: false }).populate('tags').lean(),
      Habit.find({ archived: false }).lean(),
      HabitLog.find({ date: today, done: true }).lean(),
      Vocab.find({ mastered: false, nextReview: { $ne: '', $lte: today } }).lean(),
      Trade.find({ status: 'open' }).lean()
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
    const [todos, tags, habits, habitLogs, notes, progress, vocab, trades, accounts] = await Promise.all([
      Todo.find().lean(), Tag.find().lean(), Habit.find().lean(),
      HabitLog.find().lean(), Note.find().lean(), EnglishProgress.find().lean(),
      Vocab.find().lean(), Trade.find().lean(), TradingAccount.find().lean()
    ]);
    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      data: { todos, tags, habits, habitLogs, notes, englishProgress: progress, vocab, trades, tradingAccounts: accounts }
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
        const notes = await Note.find().lean();
        data = { notes };
        break;
      }
      case 'english': {
        const [progress, vocab] = await Promise.all([EnglishProgress.find().lean(), Vocab.find().lean()]);
        data = { englishProgress: progress, vocab };
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

  /* ─────── Restore: import ALL data ─────── */
  async importAll(payload) {
    if (!payload?.data) throw new Error('Invalid backup file');
    const d = payload.data;
    const counts = {};

    if (d.tags?.length) { await Tag.deleteMany({}); await Tag.insertMany(d.tags); counts.tags = d.tags.length; }
    if (d.todos?.length) { await Todo.deleteMany({}); await Todo.insertMany(d.todos); counts.todos = d.todos.length; }
    if (d.habits?.length) { await Habit.deleteMany({}); await Habit.insertMany(d.habits); counts.habits = d.habits.length; }
    if (d.habitLogs?.length) { await HabitLog.deleteMany({}); await HabitLog.insertMany(d.habitLogs); counts.habitLogs = d.habitLogs.length; }
    if (d.notes?.length) { await Note.deleteMany({}); await Note.insertMany(d.notes); counts.notes = d.notes.length; }
    if (d.englishProgress?.length) { await EnglishProgress.deleteMany({}); await EnglishProgress.insertMany(d.englishProgress); counts.englishProgress = d.englishProgress.length; }
    if (d.vocab?.length) { await Vocab.deleteMany({}); await Vocab.insertMany(d.vocab); counts.vocab = d.vocab.length; }
    if (d.trades?.length) { await Trade.deleteMany({}); await Trade.insertMany(d.trades); counts.trades = d.trades.length; }
    if (d.tradingAccounts?.length) { await TradingAccount.deleteMany({}); await TradingAccount.insertMany(d.tradingAccounts); counts.tradingAccounts = d.tradingAccounts.length; }

    return { success: true, imported: counts };
  }

  // ─── Private helpers ───
  async _todoStats() {
    const all = await Todo.find().lean();
    const total = all.length;
    const done = all.filter(t => t.completed).length;
    const active = total - done;
    const overdue = all.filter(t => !t.completed && t.deadline && new Date(t.deadline) < new Date()).length;
    const highPriority = all.filter(t => !t.completed && t.priority === 'high').length;
    return { total, done, active, overdue, highPriority, completionRate: total ? Math.round(done / total * 100) : 0 };
  }

  async _habitStats() {
    const habits = await Habit.find({ archived: false }).lean();
    const today = new Date().toISOString().split('T')[0];
    const logs = await HabitLog.find({ done: true }).lean();
    const todayLogs = logs.filter(l => l.date === today);
    
    // Calculate streaks
    let totalStreak = 0;
    for (const h of habits) {
      const hLogs = logs.filter(l => l.habitId.toString() === h._id.toString()).map(l => l.date).sort().reverse();
      let streak = 0;
      let d = new Date();
      for (let i = 0; i < 365; i++) {
        const ds = d.toISOString().split('T')[0];
        if (hLogs.includes(ds)) { streak++; d.setDate(d.getDate() - 1); }
        else break;
      }
      totalStreak = Math.max(totalStreak, streak);
    }

    return { total: habits.length, todayDone: todayLogs.length, todayTotal: habits.length, longestStreak: totalStreak, totalLogs: logs.length };
  }

  async _brainStats() {
    const all = await Note.find({ archived: false }).lean();
    const total = all.length;
    const pinned = all.filter(n => n.pinned).length;
    const byType = { note: 0, link: 0, image: 0 };
    all.forEach(n => { if (byType[n.type] !== undefined) byType[n.type]++; });
    return { total, pinned, byType };
  }

  async _vocabStats() {
    const all = await Vocab.find().lean();
    const mastered = all.filter(v => v.mastered).length;
    return { total: all.length, mastered, learning: all.length - mastered };
  }

  async _tradingStats() {
    const all = await Trade.find().lean();
    const closed = all.filter(t => t.status === 'closed');
    const open = all.filter(t => t.status === 'open');
    const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
    const wins = closed.filter(t => t.pnl > 0).length;
    const winRate = closed.length ? Math.round(wins / closed.length * 100) : 0;
    return { total: all.length, open: open.length, closed: closed.length, totalPnl, winRate };
  }

  async _englishStats() {
    const progress = await EnglishProgress.find().lean();
    const vocab = await Vocab.find().lean();
    const totalLessons = progress.length;
    const avgScore = totalLessons ? Math.round(progress.reduce((s, p) => s + (p.bestScore || 0), 0) / totalLessons) : 0;
    return { lessonsCompleted: totalLessons, avgScore, totalVocab: vocab.length, mastered: vocab.filter(v => v.mastered).length };
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
    }).lean();
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
    }).lean();
    if (dueVocab.length > 0) {
      notifications.push({
        type: 'vocab_review', icon: '📖', priority: 'medium',
        title: `${dueVocab.length} từ vựng cần ôn tập`,
        message: 'Ôn tập để ghi nhớ tốt hơn (SM-2)',
        module: 'english', url: '/english.html'
      });
    }

    // 3. Habits not done today
    const habits = await Habit.find({ archived: false }).lean();
    const todayLogs = await HabitLog.find({ date: today, done: true }).lean();
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
    const openTrades = await Trade.find({ status: 'open' }).lean();
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
