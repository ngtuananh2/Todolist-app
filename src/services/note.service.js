const { Note, NoteVersion } = require('../config/database');

// ==================== NOTE SERVICE (Second Brain) ====================

/**
 * Get all notes (non-archived), with optional filters
 */
async function getAllNotes({ search, type, category, tag, pinned } = {}) {
  const filter = { archived: false };

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

  return Note.find(filter).sort({ pinned: -1, updatedAt: -1 }).lean().then(notes =>
    notes.map(n => ({ ...n, id: n._id.toString(), _id: undefined, __v: undefined }))
  );
}

/**
 * Get all unique categories
 */
async function getCategories() {
  const cats = await Note.distinct('category', { archived: false, category: { $ne: '' } });
  return cats.sort();
}

/**
 * Get all unique tags
 */
async function getTags() {
  const notes = await Note.find({ archived: false }, { tags: 1 }).lean();
  const tagSet = new Set();
  notes.forEach(n => (n.tags || []).forEach(t => tagSet.add(t)));
  return [...tagSet].sort();
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
  const note = await Note.create({
    title: title.trim(),
    content: content || '',
    url: url || '',
    type: type || (url ? 'link' : 'note'),
    category: category || '',
    tags: tags || [],
    color: color || '',
    favicon: url ? `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32` : '',
    createdAt: now,
    updatedAt: now
  });
  return note;
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
 * Delete a note permanently
 */
async function deleteNote(id) {
  await Note.findByIdAndDelete(id);
}

/**
 * Get stats for Second Brain
 */
async function getStats() {
  const total = await Note.countDocuments({ archived: false });
  const notes = await Note.countDocuments({ archived: false, type: 'note' });
  const links = await Note.countDocuments({ archived: false, type: 'link' });
  const images = await Note.countDocuments({ archived: false, type: 'image' });
  const pinned = await Note.countDocuments({ archived: false, pinned: true });
  const categories = await getCategories();
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
  const notes = await Note.find({ archived: false }).lean();
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
  getTags,
  getNoteById,
  createNote,
  updateNote,
  togglePin,
  archiveNote,
  deleteNote,
  getStats,
  getBacklinks,
  getGraph,
  getNoteHistory,
  restoreVersion,
  renameTag,
  deleteTag
};
