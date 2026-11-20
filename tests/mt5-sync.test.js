const test = require('node:test');
const assert = require('node:assert/strict');
const createApp = require('../src/app');
const { Mt5Connection, Mt5MarketData, Trade, mongoose } = require('../src/config/database');
const { runWithOwner } = require('../src/middleware/ownership');
const mt5SyncService = require('../src/services/mt5-sync.service');

function snapshot() {
  return {
    version: 1,
    account: { login: '12345678', server: 'Exness-MT5Real' },
    openPositions: [{
      positionId: '9001',
      symbol: 'EURUSD',
      type: 'buy',
      volume: 0.1,
      entryPrice: 1.08,
      currentPrice: 1.09,
      stopLoss: 1.07,
      takeProfit: 1.1,
      floatingPnl: 10,
      openedAt: 1710000000000
    }],
    closedPositions: [{
      positionId: '9002',
      symbol: 'XAUUSD',
      type: 'sell',
      volume: 0.2,
      entryPrice: 2200,
      exitPrice: 2190,
      pnl: 20,
      fees: 1.5,
      openedAt: 1710000000,
      closedAt: 1710003600
    }],
    chart: {
      symbol: 'EURUSD',
      timeframe: 'M5',
      candles: [
        { time: 1710000300, open: 1.09, high: 1.11, low: 1.08, close: 1.1, volume: 22 },
        { time: 1710000000, open: 1.08, high: 1.1, low: 1.07, close: 1.09, volume: 18 }
      ]
    }
  };
}

test('issues a high-entropy MT5 token and stores only its hash', async () => {
  const originalFindOneAndUpdate = Mt5Connection.findOneAndUpdate;
  const ownerId = new mongoose.Types.ObjectId().toString();
  let savedUpdate;
  Mt5Connection.findOneAndUpdate = async (_filter, update) => { savedUpdate = update; };

  try {
    const token = await runWithOwner(ownerId, () => mt5SyncService.issueToken());
    assert.match(token, /^tfmt5_[a-f0-9]{64}$/);
    assert.equal(savedUpdate.$set.tokenHash, mt5SyncService.hashToken(token));
    assert.notEqual(savedUpdate.$set.tokenHash, token);
    assert.equal(savedUpdate.$setOnInsert.ownerId, ownerId);
  } finally {
    Mt5Connection.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('normalizes open and closed positions and rejects duplicate or malformed identifiers', () => {
  const normalized = mt5SyncService.normalizeSnapshot(snapshot());
  assert.equal(normalized.openPositions[0].status, 'open');
  assert.equal(normalized.openPositions[0].currentPrice, 1.09);
  assert.equal(normalized.openPositions[0].pnl, 10);
  assert.equal(normalized.closedPositions[0].status, 'closed');
  assert.equal(normalized.closedPositions[0].entryDate, '2024-03-09T16:00:00.000Z');
  assert.deepEqual(normalized.chart.candles.map(candle => candle.time), [1710000000, 1710000300]);
  assert.throws(() => mt5SyncService.normalizeSnapshot({
    ...snapshot(),
    closedPositions: [{ ...snapshot().openPositions[0], openedAt: 1710000000000 }]
  }), /ID vị thế trùng lặp/);
  assert.throws(() => mt5SyncService.normalizeSnapshot({
    ...snapshot(),
    openPositions: [{ ...snapshot().openPositions[0], positionId: '../other-user' }]
  }), /ID vị thế không hợp lệ/);
  assert.throws(() => mt5SyncService.normalizeSnapshot({
    ...snapshot(),
    chart: { ...snapshot().chart, candles: [{ time: 1710000000, open: 10, high: 9, low: 8, close: 8.5 }] }
  }), /OHLC/);
});

test('upserts MT5 positions under the token owner without changing manual trades', async () => {
  const originalTradeUpsert = Trade.findOneAndUpdate;
  const originalConnectionUpdate = Mt5Connection.updateOne;
  const originalMarketUpsert = Mt5MarketData.findOneAndUpdate;
  const ownerId = new mongoose.Types.ObjectId().toString();
  const connection = { _id: new mongoose.Types.ObjectId(), ownerId };
  const writes = [];
  let connectionUpdate;
  let marketUpdate;
  Trade.findOneAndUpdate = async (filter, update) => { writes.push({ filter, update }); };
  Mt5Connection.updateOne = async (filter, update) => { connectionUpdate = { filter, update }; };
  Mt5MarketData.findOneAndUpdate = async (filter, update) => { marketUpdate = { filter, update }; };

  try {
    const result = await runWithOwner(ownerId, () => mt5SyncService.syncSnapshot(connection, snapshot()));
    assert.deepEqual(result.openPositions, 1);
    assert.deepEqual(result.closedPositions, 1);
    assert.equal(writes.length, 2);
    assert.equal(writes[0].filter.ownerId, ownerId);
    assert.equal(writes[0].update.$set.importSource, 'mt5');
    assert.equal(writes[0].update.$set.status, 'open');
    assert.equal(writes[0].update.$setOnInsert.ownerId, ownerId);
    assert.equal(writes[1].update.$set.status, 'closed');
    assert.equal(writes[1].update.$set.pnl, 20);
    assert.deepEqual(marketUpdate.update.$set.candles.map(candle => candle.time), [1710000000, 1710000300]);
    assert.equal(marketUpdate.filter.ownerId, ownerId);
    assert.equal(connectionUpdate.update.$set.accountLogin, '12345678');
  } finally {
    Trade.findOneAndUpdate = originalTradeUpsert;
    Mt5Connection.updateOne = originalConnectionUpdate;
    Mt5MarketData.findOneAndUpdate = originalMarketUpsert;
  }
});

test('returns available chart pairs and the selected MT5 candle series', async () => {
  const originalFind = Mt5MarketData.find;
  const originalFindById = Mt5MarketData.findById;
  const metadata = [{
    _id: 'market-data-id',
    symbol: 'EURUSD',
    timeframe: 'M5',
    accountLogin: '12345678',
    accountServer: 'Exness-MT5Real',
    lastCandleAt: 1710000300,
    lastSyncAt: new Date('2024-03-09T17:00:00.000Z')
  }];
  const chartDoc = { ...metadata[0], candles: snapshot().chart.candles };
  let filter;
  Mt5MarketData.find = query => {
    filter = query;
    return {
      select: () => ({
        sort: () => ({ lean: async () => metadata })
      })
    };
  };
  Mt5MarketData.findById = id => ({
    select: () => ({ lean: async () => id === 'market-data-id' ? chartDoc : null })
  });

  try {
    const result = await mt5SyncService.getMt5ChartData({ symbol: 'eurusd', timeframe: 'm5' });
    assert.deepEqual(filter, { symbol: 'EURUSD', timeframe: 'M5' });
    assert.equal(result.chart.accountLogin, '12345678');
    assert.equal(result.chart.candles.length, 2);
    assert.equal(result.charts[0].symbol, 'EURUSD');
  } finally {
    Mt5MarketData.find = originalFind;
    Mt5MarketData.findById = originalFindById;
  }
});

test('accepts a token-authenticated sync without requiring a browser session', async () => {
  const originalFindConnection = mt5SyncService.findConnectionForToken;
  const originalSyncSnapshot = mt5SyncService.syncSnapshot;
  const originalGetChartData = mt5SyncService.getMt5ChartData;
  const token = `tfmt5_${'a'.repeat(64)}`;
  let receivedPayload;
  mt5SyncService.findConnectionForToken = async supplied => supplied === token ? { _id: 'connection', ownerId: null } : null;
  mt5SyncService.syncSnapshot = async (_connection, payload) => {
    receivedPayload = payload;
    return { openPositions: 0, closedPositions: 0, syncedAt: new Date().toISOString() };
  };
  mt5SyncService.getMt5ChartData = async query => ({
    charts: [{ symbol: query.symbol || 'EURUSD', timeframe: query.timeframe || 'M5' }],
    chart: null
  });
  const server = createApp().listen(0);

  try {
    await new Promise(resolve => server.once('listening', resolve));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/trading/mt5/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot())
    });
    assert.equal(response.status, 200);
    assert.deepEqual(receivedPayload, snapshot());

    const unauthorized = await fetch(`http://127.0.0.1:${server.address().port}/api/trading/mt5/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot())
    });
    assert.equal(unauthorized.status, 401);

    const chartResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/trading/mt5/chart?symbol=EURUSD&timeframe=M5`);
    assert.equal(chartResponse.status, 200);
    assert.deepEqual((await chartResponse.json()).charts, [{ symbol: 'EURUSD', timeframe: 'M5' }]);
  } finally {
    server.close();
    server.closeAllConnections();
    mt5SyncService.findConnectionForToken = originalFindConnection;
    mt5SyncService.syncSnapshot = originalSyncSnapshot;
    mt5SyncService.getMt5ChartData = originalGetChartData;
  }
});
