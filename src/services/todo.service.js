const { Todo, Tag } = require('../config/database');

// ==================== TODO SERVICE ====================

function formatTodo(todo) {
  if (!todo) return null;
  const id = todo._id ? todo._id.toString() : (todo.id || undefined);
  return {
    ...todo,
    id,
    _id: undefined,
    __v: undefined,
    tags: Array.isArray(todo.tags)
      ? todo.tags.map(t => {
          if (!t) return null;
          if (typeof t === 'object' && t._id) {
            return { id: t._id.toString(), name: t.name, color: t.color };
          }
          return t;
        }).filter(Boolean)
      : [],
    subtasks: Array.isArray(todo.subtasks)
      ? todo.subtasks.map(s => ({
          id: s._id ? s._id.toString() : s.id,
          title: s.title,
          completed: Boolean(s.completed)
        }))
      : [],
    order: todo.order !== undefined ? todo.order : 0,
    recurrence: todo.recurrence || 'none'
  };
}

class TodoService {
  async getById(id) {
    const todo = await Todo.findById(id).populate('tags').lean();
    if (!todo) return null;
    return formatTodo(todo);
  }

  async getAll(search = '', limit = 500) {
    let query = {};
    if (search && search.trim()) {
      query.title = { $regex: search.trim(), $options: 'i' };
    }
    const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 500, 1000));
    const todos = await Todo.find(query)
      .populate('tags')
      .sort({ order: 1, createdAt: -1 })
      .limit(safeLimit)
      .lean();
    return todos.map(formatTodo);
  }

  async create({ title, description = '', priority = 'none', deadline = null, tagIds = [], recurrence = 'none', project = '' }) {
    const validPriorities = ['none', 'low', 'medium', 'high'];
    const prio = validPriorities.includes(priority) ? priority : 'none';
    const validRecurrence = ['none', 'daily', 'weekly', 'monthly'];
    const rec = validRecurrence.includes(recurrence) ? recurrence : 'none';

    const maxOrder = await Todo.findOne().sort({ order: -1 }).select('order').lean();
    const nextOrder = (maxOrder?.order || 0) + 1;

    const todo = await Todo.create({
      title: title.trim(),
      description: (description || '').trim(),
      completed: false,
      priority: prio,
      deadline: deadline || null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      order: nextOrder,
      recurrence: rec,
      project: (project || '').trim(),
      tags: Array.isArray(tagIds) ? tagIds : [],
      subtasks: []
    });

    return this.getById(todo._id);
  }

  async update(id, data) {
    const todo = await Todo.findById(id);
    if (!todo) return null;

    const { title, description, completed, priority, deadline, tagIds, recurrence, project } = data;

    if (title !== undefined) {
      if (!title.trim()) throw new Error('Tiêu đề không được để trống');
      todo.title = title.trim();
    }
    if (description !== undefined) todo.description = description;
    if (priority !== undefined) {
      const vp = ['none', 'low', 'medium', 'high'];
      if (vp.includes(priority)) todo.priority = priority;
    }
    if (deadline !== undefined) {
      todo.deadline = deadline || null;
      todo.deadlineReminderSentAt = null;
    }
    if (recurrence !== undefined) {
      const vr = ['none', 'daily', 'weekly', 'monthly'];
      if (vr.includes(recurrence)) todo.recurrence = recurrence;
    }
    if (completed !== undefined) {
      todo.completed = !!completed;
      todo.completedAt = completed ? new Date().toISOString() : null;
      if (completed && todo.recurrence && todo.recurrence !== 'none') {
        await this._createNextRecurrence(todo);
      }
    }
    if (Array.isArray(tagIds)) todo.tags = tagIds;
    if (project !== undefined) todo.project = (project || '').trim();

    await todo.save();
    return this.getById(id);
  }

  async getProjects() {
    const projects = await Todo.distinct('project', { project: { $ne: '' } });
    return projects.sort();
  }

  async reorder(orderedIds) {
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: { filter: { _id: id }, update: { $set: { order: index } } }
    }));
    await Todo.bulkWrite(bulkOps);
    return { reordered: true };
  }

  async getStats() {
    const todos = await Todo.find()
      .select('completed deadline priority recurrence completedAt createdAt')
      .lean()
      .limit(2000);
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const active = total - completed;
    const now = new Date();
    const overdue = todos.filter(t => !t.completed && t.deadline && new Date(t.deadline) < now).length;

    const priorities = { high: 0, medium: 0, low: 0, none: 0 };
    todos.forEach(t => { priorities[t.priority || 'none']++; });

    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const created = todos.filter(t => t.createdAt && t.createdAt.startsWith(dayStr)).length;
      const done = todos.filter(t => t.completedAt && t.completedAt.startsWith(dayStr)).length;
      dailyStats.push({ date: dayStr, day: d.toLocaleDateString('vi-VN', { weekday: 'short' }), created, completed: done });
    }

    const recurring = todos.filter(t => t.recurrence && t.recurrence !== 'none').length;
    const completedWithTime = todos.filter(t => t.completed && t.completedAt && t.createdAt);
    let avgCompletionMs = 0;
    if (completedWithTime.length > 0) {
      const totalMs = completedWithTime.reduce((sum, t) => sum + (new Date(t.completedAt) - new Date(t.createdAt)), 0);
      avgCompletionMs = totalMs / completedWithTime.length;
    }

    return { total, completed, active, overdue, priorities, dailyStats, recurring, avgCompletionMs };
  }

  async exportData() {
    const [todos, tags] = await Promise.all([
      Todo.find().populate('tags').sort({ order: 1 }).lean(),
      Tag.find().lean()
    ]);
    return {
      exportDate: new Date().toISOString(),
      version: '1.0',
      tags: tags.map(t => ({ id: t._id.toString(), name: t.name, color: t.color })),
      todos: todos.map(formatTodo)
    };
  }

  async importData(data) {
    let imported = { tags: 0, todos: 0 };
    if (data.tags && Array.isArray(data.tags)) {
      for (const tag of data.tags) {
        try {
          await Tag.updateOne({ name: tag.name }, { $setOnInsert: { color: tag.color || '#78716c' } }, { upsert: true });
          imported.tags++;
        } catch (e) {}
      }
    }
    if (data.todos && Array.isArray(data.todos)) {
      const allTags = await Tag.find().lean();
      const tagMap = new Map(allTags.map(t => [t.name, t._id]));
      const todoDocs = data.todos.map(todo => {
        let tagIds = [];
        if (todo.tags && Array.isArray(todo.tags)) {
          tagIds = todo.tags.map(t => {
            const name = typeof t === 'string' ? t : t.name;
            return tagMap.get(name) || null;
          }).filter(Boolean);
        }
        return {
          title: todo.title,
          description: todo.description || '',
          completed: todo.completed || false,
          priority: todo.priority || 'none',
          deadline: todo.deadline || null,
          completedAt: todo.completedAt || null,
          createdAt: todo.createdAt || new Date().toISOString(),
          order: todo.order || 0,
          recurrence: todo.recurrence || 'none',
          tags: tagIds,
          subtasks: (todo.subtasks || []).map(s => ({ title: s.title, completed: s.completed || false }))
        };
      });
      if (todoDocs.length > 0) {
        const created = await Todo.insertMany(todoDocs);
        imported.todos = created.length;
      }
    }
    return imported;
  }

  async delete(id) {
    const todo = await Todo.findById(id).populate('tags').lean();
    if (!todo) return null;
    const todoData = formatTodo(todo);
    await Todo.findByIdAndDelete(id);
    return { id, deleted: true, todo: todoData };
  }

  async restore(todoData) {
    const todo = await Todo.create({
      title: todoData.title,
      description: todoData.description || '',
      completed: todoData.completed || false,
      priority: todoData.priority || 'none',
      deadline: todoData.deadline || null,
      completedAt: todoData.completedAt || null,
      deadlineReminderSentAt: null,
      createdAt: todoData.createdAt || new Date().toISOString(),
      order: todoData.order || 0,
      recurrence: todoData.recurrence || 'none',
      tags: (todoData.tags || []).map(t => t.id || t._id || t),
      subtasks: (todoData.subtasks || []).map(s => ({ title: s.title, completed: s.completed || false }))
    });
    return this.getById(todo._id);
  }

  async clearCompleted() {
    const result = await Todo.deleteMany({ completed: true });
    return { deleted: result.deletedCount };
  }

  async bulkComplete(ids) {
    const result = await Todo.updateMany(
      { _id: { $in: ids }, completed: false },
      { $set: { completed: true, completedAt: new Date().toISOString() } }
    );
    return { modified: result.modifiedCount };
  }

  async bulkDelete(ids) {
    const result = await Todo.deleteMany({ _id: { $in: ids } });
    return { deleted: result.deletedCount };
  }

  async bulkMoveProject(ids, project) {
    const result = await Todo.updateMany(
      { _id: { $in: ids } },
      { $set: { project: (project || '').trim() } }
    );
    return { modified: result.modifiedCount };
  }

  async _createNextRecurrence(todo) {
    let nextDeadline = null;
    if (todo.deadline) {
      const d = new Date(todo.deadline);
      switch (todo.recurrence) {
        case 'daily': d.setDate(d.getDate() + 1); break;
        case 'weekly': d.setDate(d.getDate() + 7); break;
        case 'monthly': d.setMonth(d.getMonth() + 1); break;
      }
      nextDeadline = d.toISOString();
    }
    const maxOrder = await Todo.findOne().sort({ order: -1 }).select('order').lean();
    const nextOrder = (maxOrder?.order || 0) + 1;
    await Todo.create({
      title: todo.title,
      description: todo.description || '',
      completed: false,
      priority: todo.priority || 'none',
      deadline: nextDeadline,
      completedAt: null,
      deadlineReminderSentAt: null,
      createdAt: new Date().toISOString(),
      order: nextOrder,
      recurrence: todo.recurrence,
      tags: todo.tags || [],
      subtasks: (todo.subtasks || []).map(s => ({ title: s.title, completed: false }))
    });
  }
}

module.exports = new TodoService();
