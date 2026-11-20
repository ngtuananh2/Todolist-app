const { createHash, randomBytes } = require('node:crypto');
const { Mt5Connection, Mt5MarketData, Trade } = require('../config/database');
const { getOwnerId } = require('../middleware/ownership');

const MAX_OPEN_POSITIONS = 500;
const MAX_CLOSED_POSITIONS = 500;
const MAX_CANDLES = 500;
const SUPPORTED_TIMEFRAMES = new Set([
  'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M10', 'M12', 'M15', 'M20', 'M30',
  'H1', 'H2', 'H3', 'H4', 'H6', 'H8', 'H12', 'D1', 'W1', 'MN1'
]);

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function getOwnerFilter() {
  return { ownerId: getOwnerId() || null };
}

async function issueToken() {
  const token = `tfmt5_${randomBytes(32).toString('hex')}`;
  const now = new Date();
  await Mt5Connection.findOneAndUpdate(
    getOwnerFilter(),
    {
      $set: {
        tokenHash: hashToken(token),
        active: true,
        accountLogin: '',
        accountServer: '',
        lastSyncAt: null,
        lastSyncCounts: null,
        updatedAt: now
      },
      $setOnInsert: { ownerId: getOwnerId() || null, createdAt: now }
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  return token;
}

async function revokeConnection() {
  await Mt5Connection.deleteOne(getOwnerFilter());
  return { revoked: true };
}

async function getConnectionStatus() {
  const connection = await Mt5Connection.findOne(getOwnerFilter())
    .select('active accountLogin accountServer lastSyncAt lastSyncCounts')
    .lean();
  if (!connection) return { connected: false, lastSyncAt: null, accountLogin: '', accountServer: '' };
  return {
    connected: Boolean(connection.active),
    lastSyncAt: connection.lastSyncAt,
    accountLogin: connection.accountLogin,
    accountServer: connection.accountServer,
    lastSyncCounts: connection.lastSyncCounts || null
  };
}

async function findConnectionForToken(token) {
  if (!/^tfmt5_[a-f0-9]{64}$/.test(token || '')) return null;
  return Mt5Connection.findOne({ tokenHash: hashToken(token), active: true })
    .select('_id ownerId')
    .lean();
}

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normalizeText(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength || /[\u0000-\u001f]/.test(value)) {
    throw validationError(`${label} không hợp lệ`);
  }
  return value.trim();
}

function normalizeDate(value, label) {
  const date = typeof value === 'number'
    ? new Date(value < 1e12 ? value * 1000 : value)
    : new Date(value);
  if (!Number.isFinite(date.getTime())) throw validationError(`${label} không hợp lệ`);
  return date.toISOString();
}

function normalizeNumber(value, label, { min = -Infinity, allowZero = true } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || (!allowZero && number === 0)) {
    throw validationError(`${label} không hợp lệ`);
  }
  return number;
}

function normalizeChart(chart) {
  if (chart === undefined || chart === null) return null;
  if (!chart || typeof chart !== 'object' || !Array.isArray(chart.candles) || chart.candles.length > MAX_CANDLES) {
    throw validationError('Dữ liệu biểu đồ MT5 không hợp lệ');
  }
  const symbol = normalizeText(chart.symbol, 'Symbol biểu đồ', 32).toUpperCase();
  const timeframe = normalizeText(chart.timeframe, 'Khung thời gian', 4).toUpperCase();
  if (!SUPPORTED_TIMEFRAMES.has(timeframe)) throw validationError('Khung thời gian MT5 không được hỗ trợ');

  const seenTimes = new Set();
  const candles = chart.candles.map(candle => {
    if (!candle || typeof candle !== 'object') throw validationError('Nến MT5 không hợp lệ');
    const rawTime = typeof candle.time === 'string' && !/^\d+$/.test(candle.time)
      ? new Date(candle.time).getTime() / 1000
      : Number(candle.time);
    const time = Math.floor(rawTime > 1e12 ? rawTime / 1000 : rawTime);
    if (!Number.isFinite(time) || time <= 0 || seenTimes.has(time)) {
      throw validationError('Thời gian nến MT5 không hợp lệ hoặc bị trùng');
    }
    seenTimes.add(time);

    const open = normalizeNumber(candle.open, 'Giá mở nến', { min: 0, allowZero: false });
    const high = normalizeNumber(candle.high, 'Giá cao nến', { min: 0, allowZero: false });
    const low = normalizeNumber(candle.low, 'Giá thấp nến', { min: 0, allowZero: false });
    const close = normalizeNumber(candle.close, 'Giá đóng nến', { min: 0, allowZero: false });
    const volume = normalizeNumber(candle.volume || 0, 'Khối lượng nến', { min: 0 });
    if (high < Math.max(open, close, low) || low > Math.min(open, close, high)) {
      throw validationError('Giá OHLC của nến MT5 không hợp lệ');
    }
    return { time, open, high, low, close, volume };
  });

  candles.sort((left, right) => left.time - right.time);
  return { symbol, timeframe, candles };
}

function normalizeSnapshot(payload) {
  if (!payload || payload.version !== 1 || !payload.account || typeof payload.account !== 'object') {
    throw validationError('Phiên bản hoặc thông tin tài khoản MT5 không hợp lệ');
  }
  const login = normalizeText(String(payload.account.login || ''), 'Login MT5', 32);
  const server = normalizeText(payload.account.server, 'Server MT5', 120);
  if (!/^\d{1,20}$/.test(login)) throw validationError('Login MT5 phải là số');

  const openPositions = payload.openPositions;
  const closedPositions = payload.closedPositions;
  if (!Array.isArray(openPositions) || !Array.isArray(closedPositions)
    || openPositions.length > MAX_OPEN_POSITIONS || closedPositions.length > MAX_CLOSED_POSITIONS) {
    throw validationError('Danh sách lệnh MT5 vượt giới hạn cho phép');
  }

  const seen = new Set();
  const normalizePosition = (position, status) => {
    if (!position || typeof position !== 'object') throw validationError('Dữ liệu vị thế MT5 không hợp lệ');
    const positionId = normalizeText(String(position.positionId || ''), 'ID vị thế', 64);
    if (!/^[a-zA-Z0-9_-]+$/.test(positionId)) throw validationError('ID vị thế không hợp lệ');
    const importKey = `mt5:${server}:${login}:${positionId}`;
    if (seen.has(importKey)) throw validationError('Snapshot MT5 chứa ID vị thế trùng lặp');
    seen.add(importKey);

    const symbol = normalizeText(position.symbol, 'Symbol', 32);
    const type = String(position.type || '').toLowerCase();
    if (!['buy', 'sell'].includes(type)) throw validationError('Loại lệnh MT5 không hợp lệ');
    const entryPrice = normalizeNumber(position.entryPrice, 'Giá vào lệnh', { min: 0, allowZero: false });
    const quantity = normalizeNumber(position.volume, 'Khối lượng', { min: 0, allowZero: false });
    const entryDate = normalizeDate(position.openedAt, 'Thời gian vào lệnh');
    const exchange = `MT5 ${server} (${login})`.slice(0, 160);
    const now = new Date().toISOString();
    const common = {
      importKey,
      importSource: 'mt5',
      symbol: symbol.toUpperCase(),
      type,
      status,
      entryPrice,
      quantity,
      leverage: 1,
      stopLoss: normalizeNumber(position.stopLoss || 0, 'Stop Loss', { min: 0 }),
      takeProfit: normalizeNumber(position.takeProfit || 0, 'Take Profit', { min: 0 }),
      exchange,
      market: 'forex',
      entryDate,
      updatedAt: now
    };

    if (status === 'open') {
      return {
        ...common,
        exitPrice: null,
        exitDate: null,
        currentPrice: normalizeNumber(position.currentPrice, 'Giá hiện tại', { min: 0 }),
        pnl: normalizeNumber(position.floatingPnl, 'Lãi/lỗ tạm tính'),
        fees: 0
      };
    }

    const pnl = normalizeNumber(position.pnl, 'Lãi/lỗ đã chốt');
    const exitPrice = normalizeNumber(position.exitPrice, 'Giá thoát lệnh', { min: 0, allowZero: false });
    return {
      ...common,
      status: 'closed',
      exitPrice,
      exitDate: normalizeDate(position.closedAt, 'Thời gian đóng lệnh'),
      currentPrice: null,
      pnl,
      pnlPercent: Math.round((pnl / (entryPrice * quantity)) * 10000) / 100,
      fees: normalizeNumber(position.fees || 0, 'Phí giao dịch', { min: 0 })
    };
  };

  return {
    account: { login, server },
    openPositions: openPositions.map(position => normalizePosition(position, 'open')),
    closedPositions: closedPositions.map(position => normalizePosition(position, 'closed')),
    chart: normalizeChart(payload.chart)
  };
}

async function getMt5ChartData({ symbol, timeframe } = {}) {
  const filter = {};
  if (symbol) filter.symbol = normalizeText(symbol, 'Symbol biểu đồ', 32).toUpperCase();
  if (timeframe) {
    const normalizedTimeframe = normalizeText(timeframe, 'Khung thời gian', 4).toUpperCase();
    if (!SUPPORTED_TIMEFRAMES.has(normalizedTimeframe)) throw validationError('Khung thời gian MT5 không được hỗ trợ');
    filter.timeframe = normalizedTimeframe;
  }

  const chartMetadata = await Mt5MarketData.find(filter)
    .select('symbol timeframe accountLogin accountServer lastCandleAt lastSyncAt')
    .sort({ lastSyncAt: -1 })
    .lean();
  const selected = chartMetadata[0];
  if (!selected) return { charts: [], chart: null };

  const chart = await Mt5MarketData.findById(selected._id)
    .select('symbol timeframe accountLogin accountServer lastCandleAt lastSyncAt candles')
    .lean();
  return {
    charts: chartMetadata.map(({ symbol: itemSymbol, timeframe: itemTimeframe, accountLogin, accountServer, lastCandleAt, lastSyncAt }) => ({
      symbol: itemSymbol,
      timeframe: itemTimeframe,
      accountLogin,
      accountServer,
      lastCandleAt,
      lastSyncAt
    })),
    chart: chart ? {
      symbol: chart.symbol,
      timeframe: chart.timeframe,
      accountLogin: chart.accountLogin,
      accountServer: chart.accountServer,
      lastCandleAt: chart.lastCandleAt,
      lastSyncAt: chart.lastSyncAt,
      candles: chart.candles
    } : null
  };
}

async function syncSnapshot(connection, payload) {
  const snapshot = normalizeSnapshot(payload);
  const now = new Date();
  const ownerId = connection.ownerId || null;

  for (const trade of [...snapshot.openPositions, ...snapshot.closedPositions]) {
    const filter = { ...getOwnerFilter(), importKey: trade.importKey, exchange: trade.exchange };
    await Trade.findOneAndUpdate(
      filter,
      {
        $set: trade,
        $setOnInsert: { ownerId, createdAt: trade.entryDate }
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }

  if (snapshot.chart?.candles.length) {
    const accountKey = `${snapshot.account.server}:${snapshot.account.login}`;
    await Mt5MarketData.findOneAndUpdate(
      { ...getOwnerFilter(), accountKey, symbol: snapshot.chart.symbol, timeframe: snapshot.chart.timeframe },
      {
        $set: {
          accountKey,
          accountLogin: snapshot.account.login,
          accountServer: snapshot.account.server,
          symbol: snapshot.chart.symbol,
          timeframe: snapshot.chart.timeframe,
          candles: snapshot.chart.candles,
          lastCandleAt: snapshot.chart.candles[snapshot.chart.candles.length - 1].time,
          lastSyncAt: now,
          updatedAt: now
        },
        $setOnInsert: { ownerId }
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }

  const lastSyncCounts = {
    openPositions: snapshot.openPositions.length,
    closedPositions: snapshot.closedPositions.length
  };
  await Mt5Connection.updateOne(
    { _id: connection._id, ...getOwnerFilter() },
    {
      $set: {
        accountLogin: snapshot.account.login,
        accountServer: snapshot.account.server,
        lastSyncAt: now,
        lastSyncCounts,
        updatedAt: now
      }
    }
  );

  return { ...lastSyncCounts, syncedAt: now.toISOString() };
}

module.exports = {
  findConnectionForToken,
  getMt5ChartData,
  getConnectionStatus,
  hashToken,
  issueToken,
  normalizeSnapshot,
  revokeConnection,
  syncSnapshot
};
