const { Tag, Todo } = require('../config/database');

// ==================== TAG SERVICE ====================

class TagService {
  /**
   * Get all tags sorted by name
   */
  async getAll() {
    const tags = await Tag.find().sort({ name: 1 });
    return tags.map(t => t.toJSON());
  }

  /**
   * Create a new tag
   */
  async create(name, color = '#78716c') {
    const tag = await Tag.create({ name: name.trim(), color: color || '#78716c' });
    return tag.toJSON();
  }

  /**
   * Delete a tag by ID (also remove from all todos)
   */
  async delete(id) {
    await Tag.findByIdAndDelete(id);
    // Xóa tag khỏi tất cả todos
    await Todo.updateMany({ tags: id }, { $pull: { tags: id } });
    return { id, deleted: true };
  }
}

module.exports = new TagService();

