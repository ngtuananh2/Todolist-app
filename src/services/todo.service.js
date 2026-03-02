const db = require('../config/database');

// ==================== TODO SERVICE ====================

class TodoService {
  /**
   * Get single todo with tags + subtasks joined
   */
  getById(id) {
    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    if (!todo) return null;
    return this._hydrate(todo);
  }

  /**
   * Get all todos, optionally filtered by search query
   */
  getAll(search = '') {
    let rows;
    if (search && search.trim()) {
      rows = db.prepare('SELECT * FROM todos WHERE title LIKE ? ORDER BY createdAt DESC')
        .all(`%${search.trim()}%`);
    } else {
      rows = db.prepare('SELECT * FROM todos ORDER BY createdAt DESC').all();
    }
    return rows.map(todo => this._hydrate(todo));
  }

  /**
   * Create a new todo
   */
  create({ title, description = '', priority = 'none', deadline = null, tagIds = [] }) {
    const validPriorities = ['none', 'low', 'medium', 'high'];
    const prio = validPriorities.includes(priority) ? priority : 'none';

    const result = db.prepare(`
      INSERT INTO todos (title, description, completed, priority, deadline, completedAt, createdAt)
      VALUES (?, ?, 0, ?, ?, NULL, ?)
    `).run(title.trim(), (description || '').trim(), prio, deadline || null, new Date().toISOString());

    const todoId = result.lastInsertRowid;

    // Attach tags
    if (Array.isArray(tagIds) && tagIds.length > 0) {
      const insertTag = db.prepare('INSERT OR IGNORE INTO todo_tags (todoId, tagId) VALUES (?, ?)');
      tagIds.forEach(tagId => insertTag.run(todoId, tagId));
    }

    return this.getById(todoId);
  }

  /**
   * Update an existing todo (partial update)
   */
  update(id, data) {
    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    if (!todo) return null;

    const { title, description, completed, priority, deadline, tagIds } = data;

    if (title !== undefined) {
      if (!title.trim()) throw new Error('Tiêu đề không được để trống');
      db.prepare('UPDATE todos SET title = ? WHERE id = ?').run(title.trim(), id);
    }

    if (description !== undefined) {
      db.prepare('UPDATE todos SET description = ? WHERE id = ?').run(description, id);
    }

    if (priority !== undefined) {
      const validPriorities = ['none', 'low', 'medium', 'high'];
      if (validPriorities.includes(priority)) {
        db.prepare('UPDATE todos SET priority = ? WHERE id = ?').run(priority, id);
      }
    }

    if (deadline !== undefined) {
      db.prepare('UPDATE todos SET deadline = ? WHERE id = ?').run(deadline || null, id);
    }

    if (completed !== undefined) {
      const completedAt = completed ? new Date().toISOString() : null;
      db.prepare('UPDATE todos SET completed = ?, completedAt = ? WHERE id = ?')
        .run(completed ? 1 : 0, completedAt, id);
    }

    if (Array.isArray(tagIds)) {
      db.prepare('DELETE FROM todo_tags WHERE todoId = ?').run(id);
      const insertTag = db.prepare('INSERT OR IGNORE INTO todo_tags (todoId, tagId) VALUES (?, ?)');
      tagIds.forEach(tagId => insertTag.run(id, tagId));
    }

    return this.getById(id);
  }

  /**
   * Delete a single todo by ID
   */
  delete(id) {
    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    if (!todo) return null;
    db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    return { id, deleted: true };
  }

  /**
   * Delete all completed todos
   */
  clearCompleted() {
    const result = db.prepare('DELETE FROM todos WHERE completed = 1').run();
    return { deleted: result.changes };
  }

  // ---- Private helpers ----

  _hydrate(todo) {
    todo.completed = !!todo.completed;
    todo.tags = db.prepare(`
      SELECT t.id, t.name, t.color FROM tags t
      JOIN todo_tags tt ON t.id = tt.tagId
      WHERE tt.todoId = ?
    `).all(todo.id);
    todo.subtasks = db.prepare('SELECT * FROM subtasks WHERE todoId = ? ORDER BY id').all(todo.id);
    todo.subtasks.forEach(s => s.completed = !!s.completed);
    return todo;
  }
}

module.exports = new TodoService();
