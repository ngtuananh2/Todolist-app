const db = require('../config/database');

// ==================== TAG SERVICE ====================

class TagService {
  /**
   * Get all tags sorted by name
   */
  getAll() {
    return db.prepare('SELECT * FROM tags ORDER BY name').all();
  }

  /**
   * Create a new tag
   */
  create(name, color = '#78716c') {
    const result = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)')
      .run(name.trim(), color || '#78716c');
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
  }

  /**
   * Delete a tag by ID
   */
  delete(id) {
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    return { id, deleted: true };
  }
}

module.exports = new TagService();
