const db = require('../config/database');

// ==================== SUBTASK SERVICE ====================

class SubtaskService {
  /**
   * Add a subtask to a todo
   */
  create(todoId, title) {
    const todo = db.prepare('SELECT id FROM todos WHERE id = ?').get(todoId);
    if (!todo) return { error: 'NOT_FOUND' };

    const result = db.prepare('INSERT INTO subtasks (todoId, title, completed) VALUES (?, ?, 0)')
      .run(todoId, title.trim());

    const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid);
    subtask.completed = !!subtask.completed;
    return subtask;
  }

  /**
   * Update a subtask (title and/or completed status)
   */
  update(id, data) {
    const sub = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
    if (!sub) return null;

    if (data.title !== undefined) {
      db.prepare('UPDATE subtasks SET title = ? WHERE id = ?').run(data.title.trim(), id);
    }
    if (data.completed !== undefined) {
      db.prepare('UPDATE subtasks SET completed = ? WHERE id = ?').run(data.completed ? 1 : 0, id);
    }

    const updated = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
    updated.completed = !!updated.completed;
    return updated;
  }

  /**
   * Delete a subtask
   */
  delete(id) {
    db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
    return { id, deleted: true };
  }
}

module.exports = new SubtaskService();
