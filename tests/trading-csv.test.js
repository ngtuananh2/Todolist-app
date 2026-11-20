const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTradingCsv } = require('../src/services/trading-csv.service');
const { Trade, mongoose } = require('../src/config/database');
const { runWithOwner } = require('../src/middleware/ownership');
const { importCsv } = require('../src/services/trading.service');

test('parses Binance Futures trade history rows and generates stable import keys', () => {
  const csv = [
    'Date(UTC),Symbol,Side,Price,Quantity,Realized Profit,Fee,Trade ID,Order ID',
    '2026-11-18 07:10:00,BTCUSDT,BUY,95000.5,0.01,12.34,0.05,trade-1,order-1'
  ].join('\n');

  const [trade] = parseTradingCsv(csv, 'binance_futures');
  const [reimported] = parseTradingCsv(csv, 'binance_futures');

  assert.equal(trade.exchange, 'Binance');
  assert.equal(trade.market, 'futures');
  assert.equal(trade.type, 'buy');
  assert.equal(trade.status, 'closed');
  assert.equal(trade.entryPrice, 95000.5);
  assert.equal(trade.exitPrice, null);
  assert.equal(trade.quantity, 0.01);
  assert.equal(trade.pnl, 12.34);
  assert.equal(trade.fees, 0.05);
  assert.match(trade.entryDate, /^2026-11-18T07:10:00\.000Z$/);
  assert.equal(trade.importKey, reimported.importKey);
});

test('parses Bybit semicolon CSV with localized decimal values and quoted fields', () => {
  const csv = [
    'Trade History',
    'Trading Time;Symbol;Side;Trade Price;Trade Qty;Closed P&L;Fee;Trade ID;Order ID',
    '2026-11-18 07:10:00;"ETHUSDT";Sell;3.250,50;0,25;-12,75;0,40;bybit-trade-1;bybit-order-1'
  ].join('\n');

  const [trade] = parseTradingCsv(csv, 'bybit');
  assert.equal(trade.exchange, 'Bybit');
  assert.equal(trade.market, 'crypto');
  assert.equal(trade.type, 'sell');
  assert.equal(trade.entryPrice, 3250.5);
  assert.equal(trade.quantity, 0.25);
  assert.equal(trade.pnl, -12.75);
  assert.equal(trade.fees, 0.4);
});

test('rejects unsupported sources, unrecognized headers, and malformed rows', () => {
  assert.throws(() => parseTradingCsv('time,symbol,side,price,qty\nx', 'mt5'), /không hỗ trợ MT5/);
  assert.throws(() => parseTradingCsv('time,profit\n2026-11-18,12', 'bybit'), /Không nhận diện được tiêu đề CSV/);
  assert.throws(
    () => parseTradingCsv('Time,Symbol,Side,Price,Qty\n2026-11-18,BTCUSDT,BUY,0,1', 'bybit'),
    /giá và khối lượng phải lớn hơn 0/
  );
});

test('imports normalized rows once per user and skips duplicates on re-import', async () => {
  const originalFind = Trade.find;
  const originalInsertMany = Trade.insertMany;
  const ownerId = new mongoose.Types.ObjectId().toString();
  const storedKeys = new Set();
  let inserted;
  const csv = [
    'Date(UTC),Symbol,Side,Price,Quantity,Realized Profit,Fee,Trade ID',
    '2026-11-18 07:10:00,BTCUSDT,BUY,95000.5,0.01,12.34,0.05,trade-1'
  ].join('\n');

  Trade.find = filter => ({
    select: () => ({
      lean: async () => filter.importKey.$in
        .filter(key => storedKeys.has(key))
        .map(importKey => ({ importKey }))
    })
  });
  Trade.insertMany = async documents => {
    inserted = documents;
    documents.forEach(document => storedKeys.add(document.importKey));
  };

  try {
    const first = await runWithOwner(ownerId, () => importCsv('binance_futures', csv));
    const second = await runWithOwner(ownerId, () => importCsv('binance_futures', csv));

    assert.deepEqual(first, { imported: 1, skippedDuplicates: 0 });
    assert.deepEqual(second, { imported: 0, skippedDuplicates: 1 });
    assert.equal(inserted[0].ownerId.toString(), ownerId);
  } finally {
    Trade.find = originalFind;
    Trade.insertMany = originalInsertMany;
  }
});
