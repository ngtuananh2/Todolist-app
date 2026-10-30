const test = require('node:test');
const assert = require('node:assert/strict');
const { Todo } = require('../src/config/database');

test('serializes Todo and subtask identifiers for frontend actions', () => {
  const todo = new Todo({
    _id: '507f1f77bcf86cd799439011',
    title: 'Test Todo',
    createdAt: '2026-10-28T10:00:00.000Z',
    subtasks: [{
      _id: '507f1f77bcf86cd799439012',
      title: 'Test subtask',
      completed: false
    }]
  }).toJSON();

  assert.equal(todo.id, '507f1f77bcf86cd799439011');
  assert.equal(todo._id, undefined);
  assert.equal(todo.subtasks[0].id, '507f1f77bcf86cd799439012');
  assert.equal(todo.subtasks[0]._id, undefined);
});
