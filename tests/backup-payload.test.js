const test = require('node:test');
const assert = require('node:assert/strict');
const { validateBackupPayload, validateModulePayload } = require('../src/services/backup-payload');

const requiredCollections = [
  'todos',
  'tags',
  'habits',
  'habitLogs',
  'notes',
  'englishProgress',
  'vocab',
  'trades',
  'tradingAccounts'
];

function makePayload() {
  return {
    version: '2.0',
    data: Object.fromEntries(requiredCollections.map(key => [key, []]))
  };
}

test('accepts a complete backup and reports optional collections as omitted', () => {
  const result = validateBackupPayload(makePayload());
  assert.equal(result.counts.todos, 0);
  assert.equal(result.counts.noteVersions, null);
  assert.deepEqual(result.omittedCollections, ['noteVersions', 'englishMindmaps', 'schedules']);
});

test('rejects backups missing required collections', () => {
  const payload = makePayload();
  delete payload.data.vocab;
  assert.throws(() => validateBackupPayload(payload), /thiếu dữ liệu: vocab/);
});

test('rejects non-list and invalid collection entries', () => {
  const payload = makePayload();
  payload.data.todos = [{ _id: 'task-1' }, null];
  assert.throws(() => validateBackupPayload(payload), /todos\[1\] không hợp lệ/);
});

test('rejects entries without stable ids and duplicate ids', () => {
  const missingId = makePayload();
  missingId.data.todos = [{ title: 'Việc chưa có mã' }];
  assert.throws(() => validateBackupPayload(missingId), /thiếu mã _id/);

  const duplicateIds = makePayload();
  duplicateIds.data.todos = [{ _id: 'same' }, { _id: 'same' }];
  assert.throws(() => validateBackupPayload(duplicateIds), /_id bị trùng trong todos/);
});

test('rejects optional collections with invalid types', () => {
  const payload = makePayload();
  payload.data.schedules = {};
  assert.throws(() => validateBackupPayload(payload), /schedules phải là một danh sách/);
});

test('rejects duplicate values protected by database unique indexes', () => {
  const payload = makePayload();
  payload.data.tags = [
    { _id: 'tag-1', name: 'Work' },
    { _id: 'tag-2', name: 'Work' }
  ];
  assert.throws(() => validateBackupPayload(payload), /định danh bị trùng trong tags/);
});

test('accepts a complete module export payload', () => {
  const result = validateModulePayload('brain', {
    version: '2.0',
    module: 'brain',
    data: { notes: [{ _id: 'note-1' }], noteVersions: [] }
  });
  assert.deepEqual(result.counts, { notes: 1, noteVersions: 0 });
});

test('accepts older module exports without newer optional collections', () => {
  const result = validateModulePayload('brain', {
    version: '2.0',
    module: 'brain',
    data: { notes: [{ _id: 'note-1' }] }
  });
  assert.deepEqual(result.data.noteVersions, []);
});

test('rejects unsupported modules and malformed module exports', () => {
  assert.throws(() => validateModulePayload('schedule', {}), /không được hỗ trợ/);
  assert.throws(() => validateModulePayload('brain', { module: 'english', data: {} }), /không đúng định dạng/);
  assert.throws(() => validateModulePayload('brain', {
    module: 'brain',
    data: { notes: [{ _id: 'duplicate' }, { _id: 'duplicate' }], noteVersions: [] }
  }), /_id bị trùng trong notes/);
});
