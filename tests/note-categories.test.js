const test = require('node:test');
const assert = require('node:assert/strict');
const { Note } = require('../src/config/database');
const { deleteCategory, getCategories, renameCategory } = require('../src/services/note.service');

test('renames and clears a category across active and archived notes', async () => {
  const originalUpdateMany = Note.updateMany;
  const calls = [];
  Note.updateMany = async (...args) => {
    calls.push(args);
    return { modifiedCount: 2 };
  };

  try {
    assert.deepEqual(await renameCategory('Study', 'Learning'), { modified: 2 });
    assert.deepEqual(await deleteCategory('Learning'), { modified: 2 });
    assert.deepEqual(calls, [
      [{ category: 'Study' }, { $set: { category: 'Learning' } }],
      [{ category: 'Learning' }, { $set: { category: '' } }]
    ]);
  } finally {
    Note.updateMany = originalUpdateMany;
  }
});

test('includes archived categories only when requested', async () => {
  const originalDistinct = Note.distinct;
  const calls = [];
  Note.distinct = async (...args) => {
    calls.push(args);
    return ['Study'];
  };

  try {
    assert.deepEqual(await getCategories(), ['Study']);
    assert.deepEqual(await getCategories({ includeArchived: true }), ['Study']);
    assert.deepEqual(calls, [
      ['category', { category: { $ne: '' }, archived: false }],
      ['category', { category: { $ne: '' } }]
    ]);
  } finally {
    Note.distinct = originalDistinct;
  }
});
