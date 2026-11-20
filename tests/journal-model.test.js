const test = require('node:test');
const assert = require('node:assert/strict');
const { JournalEntry } = require('../src/config/database');

const timestamps = {
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z'
};

test('validates daily weights and journal date values', () => {
  assert.equal(new JournalEntry({
    ...timestamps,
    type: 'weight',
    date: '2026-05-01',
    weight: 62.4
  }).validateSync(), undefined);

  const invalidDate = new JournalEntry({
    ...timestamps,
    type: 'memory',
    date: '2026-02-31',
    title: 'Ngày không hợp lệ'
  }).validateSync();
  assert.ok(invalidDate.errors.date);

  const invalidWeight = new JournalEntry({
    ...timestamps,
    type: 'weight',
    date: '2026-05-01',
    weight: 501
  }).validateSync();
  assert.ok(invalidWeight.errors.weight);
});

test('requires titles for memories and wishlist entries', () => {
  const memoryError = new JournalEntry({
    ...timestamps,
    type: 'memory',
    date: '2026-05-01'
  }).validateSync();
  assert.ok(memoryError.errors.title);

  const wishlist = new JournalEntry({
    ...timestamps,
    type: 'wishlist',
    title: 'Đi học lặn biển'
  });
  assert.equal(wishlist.validateSync(), undefined);
  assert.equal(wishlist.status, 'want');
});
