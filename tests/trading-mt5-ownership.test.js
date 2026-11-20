const test = require('node:test');
const assert = require('node:assert/strict');
const { Trade } = require('../src/config/database');
const { updateTrade, closeTrade, deleteTrade } = require('../src/services/trading.service');

test('prevents manual edits, closes, and deletes of MT5-synced trades', async () => {
  const originalFindById = Trade.findById;
  const originalDelete = Trade.findByIdAndDelete;
  let deleteCalled = false;
  Trade.findById = async () => ({ importSource: 'mt5' });
  Trade.findByIdAndDelete = async () => { deleteCalled = true; };

  try {
    await assert.rejects(updateTrade('mt5-trade', { notes: 'manual edit' }), {
      status: 409,
      message: /chỉ có thể chỉnh sửa trực tiếp trong MT5/
    });
    await assert.rejects(closeTrade('mt5-trade', 1.1), {
      status: 409,
      message: /chỉ có thể chỉnh sửa trực tiếp trong MT5/
    });
    await assert.rejects(deleteTrade('mt5-trade'), {
      status: 409,
      message: /chỉ có thể chỉnh sửa trực tiếp trong MT5/
    });
    assert.equal(deleteCalled, false);
  } finally {
    Trade.findById = originalFindById;
    Trade.findByIdAndDelete = originalDelete;
  }
});
