const { Note, NoteVersion } = require('../config/database');

// ==================== NOTE SERVICE (Second Brain) ====================

/**
 * Get all notes (non-archived), with optional filters
 */
async function getAllNotes({ search, type, category, tag, pinned, archived, limit } = {}) {
  const archivedMode = String(archived || '').toLowerCase(); // '', 'true', 'false', 'all'
  const filter = {};

  if (archivedMode === 'all') {
    // no archived filter
  } else if (archivedMode === 'true') {
    filter.archived = true;
  } else {
    filter.archived = false;
  }

  if (type && type !== 'all') filter.type = type;
  if (category) filter.category = category;
  if (tag) filter.tags = tag;
  if (pinned === 'true') filter.pinned = true;

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { title: regex },
      { content: regex },
      { url: regex },
      { tags: regex },
      { category: regex }
    ];
  }

  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 500, 1000));
  return Note.find(filter).sort({ pinned: -1, order: 1, updatedAt: -1 }).limit(safeLimit).lean().then(notes =>
    notes.map(n => ({ ...n, id: n._id.toString(), _id: undefined, __v: undefined }))
  );
}

/**
 * Get all unique categories
 */
async function getCategories({ includeArchived = false } = {}) {
  const filter = { category: { $ne: '' } };
  if (!includeArchived) filter.archived = false;
  const cats = await Note.distinct('category', filter);
  return cats.sort();
}

async function renameCategory(oldName, newName) {
  const result = await Note.updateMany(
    { category: oldName },
    { $set: { category: newName } }
  );
  return { modified: result.modifiedCount };
}

async function deleteCategory(category) {
  const result = await Note.updateMany(
    { category },
    { $set: { category: '' } }
  );
  return { modified: result.modifiedCount };
}

/**
 * Get all unique tags
 */
async function getTags() {
  const tags = await Note.distinct('tags', { archived: false });
  return tags.filter(Boolean).sort();
}

/**
 * Get a single note by ID
 */
async function getNoteById(id) {
  const note = await Note.findById(id);
  return note;
}

/**
 * Create a new note
 */
async function createNote({ title, content, url, type, category, tags, color }) {
  const now = new Date().toISOString();
  const lastNote = await Note.findOne({ archived: false }).sort({ order: -1, updatedAt: -1 }).select('order').lean();
  const note = await Note.create({
    title: title.trim(),
    content: content || '',
    url: url || '',
    type: type || (url ? 'link' : 'note'),
    category: category || '',
    tags: tags || [],
    order: (lastNote?.order || 0) + 1,
    color: color || '',
    favicon: url ? `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32` : '',
    createdAt: now,
    updatedAt: now
  });
  return note;
}

async function reorderNotes(orderedIds) {
  if (new Set(orderedIds).size !== orderedIds.length) return false;

  const activeNotes = await Note.find({ archived: false }).select('_id').lean();
  const activeIds = new Set(activeNotes.map(note => note._id.toString()));

  if (orderedIds.length !== activeIds.size || orderedIds.some(id => !activeIds.has(id))) {
    return false;
  }

  if (orderedIds.length > 0) {
    await Note.bulkWrite(orderedIds.map((id, order) => ({
      updateOne: {
        filter: { _id: id, archived: false },
        update: { $set: { order } }
      }
    })));
  }

  return true;
}

/**
 * Update a note
 */
async function updateNote(id, data) {
  // Save version before update
  const oldNote = await Note.findById(id).lean();
  if (oldNote) {
    await NoteVersion.create({
      noteId: oldNote._id,
      title: oldNote.title,
      content: oldNote.content || '',
      url: oldNote.url || '',
      category: oldNote.category || '',
      tags: oldNote.tags || [],
      savedAt: oldNote.updatedAt || new Date().toISOString()
    });
  }

  data.updatedAt = new Date().toISOString();
  // Update favicon if URL changed
  if (data.url) {
    try {
      data.favicon = `https://www.google.com/s2/favicons?domain=${new URL(data.url).hostname}&sz=32`;
    } catch (_) {
      data.favicon = '';
    }
  }
  if (data.url === '') data.favicon = '';
  const note = await Note.findByIdAndUpdate(id, data, { new: true });
  return note;
}

/**
 * Toggle pin status
 */
async function togglePin(id) {
  const note = await Note.findById(id);
  if (!note) return null;
  note.pinned = !note.pinned;
  note.updatedAt = new Date().toISOString();
  await note.save();
  return note;
}

/**
 * Archive a note
 */
async function archiveNote(id) {
  const note = await Note.findByIdAndUpdate(id, {
    archived: true,
    updatedAt: new Date().toISOString()
  }, { new: true });
  return note;
}

/**
 * Restore a note from archive
 */
async function unarchiveNote(id) {
  const note = await Note.findByIdAndUpdate(id, {
    archived: false,
    updatedAt: new Date().toISOString()
  }, { new: true });
  return note;
}

/**
 * Delete a note permanently
 */
async function deleteNote(id) {
  await Promise.all([
    Note.findByIdAndDelete(id),
    NoteVersion.deleteMany({ noteId: id })
  ]);
}

/**
 * Get stats for Second Brain
 */
async function getStats() {
  const [total, notes, links, images, pinned, categories] = await Promise.all([
    Note.countDocuments({ archived: false }),
    Note.countDocuments({ archived: false, type: 'note' }),
    Note.countDocuments({ archived: false, type: 'link' }),
    Note.countDocuments({ archived: false, type: 'image' }),
    Note.countDocuments({ archived: false, pinned: true }),
    getCategories()
  ]);
  return { total, notes, links, images, pinned, categories: categories.length };
}

/**
 * Get backlinks — notes that reference a given note via [[title]]
 */
async function getBacklinks(noteId) {
  const note = await Note.findById(noteId).lean();
  if (!note) return [];
  const regex = new RegExp(`\\[\\[${note.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'i');
  const backlinks = await Note.find({ archived: false, _id: { $ne: noteId }, content: regex }).lean();
  return backlinks.map(n => ({ id: n._id.toString(), title: n.title, type: n.type, category: n.category }));
}

/**
 * Get graph data — all notes with their [[link]] connections
 */
async function getGraph() {
  const notes = await Note.find({ archived: false }).select('_id title type category pinned content').lean();
  const titleMap = {};
  notes.forEach(n => { titleMap[n.title.toLowerCase()] = n._id.toString(); });

  const nodes = notes.map(n => ({ id: n._id.toString(), title: n.title, type: n.type, category: n.category || '', pinned: n.pinned }));
  const edges = [];
  const linkRegex = /\[\[([^\]]+)\]\]/g;

  notes.forEach(n => {
    let match;
    while ((match = linkRegex.exec(n.content || '')) !== null) {
      const targetTitle = match[1].toLowerCase();
      const targetId = titleMap[targetTitle];
      if (targetId && targetId !== n._id.toString()) {
        edges.push({ source: n._id.toString(), target: targetId });
      }
    }
  });

  return { nodes, edges };
}

/**
 * Get version history for a note
 */
async function getNoteHistory(noteId) {
  const versions = await NoteVersion.find({ noteId }).sort({ savedAt: -1 }).lean();
  return versions.map(v => ({ ...v, id: v._id.toString(), _id: undefined, __v: undefined }));
}

/**
 * Restore a note to a specific version
 */
async function restoreVersion(noteId, versionId) {
  const version = await NoteVersion.findById(versionId).lean();
  if (!version || version.noteId.toString() !== noteId) return null;
  const note = await Note.findByIdAndUpdate(noteId, {
    title: version.title,
    content: version.content,
    url: version.url,
    category: version.category,
    tags: version.tags,
    updatedAt: new Date().toISOString()
  }, { new: true });
  return note;
}

/**
 * Rename a tag across all notes
 */
async function renameTag(oldName, newName) {
  const result = await Note.updateMany(
    { tags: oldName },
    { $set: { 'tags.$': newName.trim() } }
  );
  return { modified: result.modifiedCount };
}

/**
 * Delete a tag from all notes
 */
async function deleteTag(tagName) {
  const result = await Note.updateMany(
    { tags: tagName },
    { $pull: { tags: tagName } }
  );
  return { modified: result.modifiedCount };
}

module.exports = {
  getAllNotes,
  getCategories,
  renameCategory,
  deleteCategory,
  getTags,
  getNoteById,
  createNote,
  reorderNotes,
  updateNote,
  togglePin,
  archiveNote,
  unarchiveNote,
  deleteNote,
  getStats,
  getBacklinks,
  getGraph,
  getNoteHistory,
  restoreVersion,
  renameTag,
  deleteTag
};
