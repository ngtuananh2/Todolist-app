const test = require('node:test');
const assert = require('node:assert/strict');
const { Note } = require('../src/config/database');
const { reorderNotes } = require('../src/services/note.service');

test('reorders only a complete, unique list of active notes', async () => {
  const originalFind = Note.find;
  const originalBulkWrite = Note.bulkWrite;
  const activeIds = ['note-a', 'note-b', 'note-c'];
  let writeOperations;

  Note.find = () => ({
    select: () => ({
      lean: async () => activeIds.map(id => ({ _id: { toString: () => id } }))
    })
  });
  Note.bulkWrite = async operations => {
    writeOperations = operations;
  };

  try {
    assert.equal(await reorderNotes(['note-a', 'note-a', 'note-c']), false);
    assert.equal(await reorderNotes(['note-a', 'note-b']), false);
    assert.equal(writeOperations, undefined);

    assert.equal(await reorderNotes(['note-c', 'note-a', 'note-b']), true);
    assert.deepEqual(writeOperations.map(({ updateOne }) => ({
      id: updateOne.filter._id,
      order: updateOne.update.$set.order,
      activeOnly: updateOne.filter.archived
    })), [
      { id: 'note-c', order: 0, activeOnly: false },
      { id: 'note-a', order: 1, activeOnly: false },
      { id: 'note-b', order: 2, activeOnly: false }
    ]);
  } finally {
    Note.find = originalFind;
    Note.bulkWrite = originalBulkWrite;
  }
});
