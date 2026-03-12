const { Todo } = require('../config/database');

// ==================== SUBTASK SERVICE ====================

class SubtaskService {
  /**
   * Add a subtask to a todo
   */
  async create(todoId, title) {
    const todo = await Todo.findById(todoId);
    if (!todo) return { error: 'NOT_FOUND' };

    todo.subtasks.push({ title: title.trim(), completed: false });
    await todo.save();

    const sub = todo.subtasks[todo.subtasks.length - 1];
    return { id: sub._id.toString(), title: sub.title, completed: sub.completed };
  }

  /**
   * Update a subtask (title and/or completed status)
   */
  async update(id, data) {
    const todo = await Todo.findOne({ 'subtasks._id': id });
    if (!todo) return null;

    const sub = todo.subtasks.id(id);
    if (!sub) return null;

    if (data.title !== undefined) sub.title = data.title.trim();
    if (data.completed !== undefined) sub.completed = !!data.completed;

    await todo.save();
    return { id: sub._id.toString(), title: sub.title, completed: sub.completed };
  }

  /**
   * Delete a subtask
   */
  async delete(id) {
    const todo = await Todo.findOne({ 'subtasks._id': id });
    if (!todo) return { id, deleted: true };

    todo.subtasks.pull({ _id: id });
    await todo.save();
    return { id, deleted: true };
  }
}

module.exports = new SubtaskService();

