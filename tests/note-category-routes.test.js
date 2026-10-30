const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const noteRoutes = require('../src/routes/note.routes');
const noteService = require('../src/services/note.service');

test('validates and applies category management routes', async () => {
  const originalGetCategories = noteService.getCategories;
  const originalRenameCategory = noteService.renameCategory;
  const originalDeleteCategory = noteService.deleteCategory;
  const calls = [];
  noteService.getCategories = async options => {
    calls.push(['list', options]);
    return ['Learning'];
  };
  noteService.renameCategory = async (...args) => {
    calls.push(['rename', ...args]);
    return { modified: 2 };
  };
  noteService.deleteCategory = async (...args) => {
    calls.push(['delete', ...args]);
    return { modified: 1 };
  };

  const app = express();
  app.use(express.json());
  app.use('/api/notes', noteRoutes);
  const server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/notes`;

  try {
    const listResponse = await fetch(`${baseUrl}/categories?includeArchived=true`);
    assert.deepEqual(await listResponse.json(), ['Learning']);

    const renameResponse = await fetch(`${baseUrl}/categories`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName: '  Study  ', newName: '  Learning  ' })
    });
    assert.equal(renameResponse.status, 200);
    assert.deepEqual(await renameResponse.json(), { modified: 2 });

    const invalidRename = await fetch(`${baseUrl}/categories`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName: ' ', newName: 'Learning' })
    });
    assert.equal(invalidRename.status, 400);

    const deleteResponse = await fetch(`${baseUrl}/categories/${encodeURIComponent('Learning & Notes')}`, {
      method: 'DELETE'
    });
    assert.equal(deleteResponse.status, 200);
    assert.deepEqual(await deleteResponse.json(), { modified: 1 });
    assert.deepEqual(calls, [
      ['list', { includeArchived: true }],
      ['rename', 'Study', 'Learning'],
      ['delete', 'Learning & Notes']
    ]);
  } finally {
    noteService.getCategories = originalGetCategories;
    noteService.renameCategory = originalRenameCategory;
    noteService.deleteCategory = originalDeleteCategory;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
