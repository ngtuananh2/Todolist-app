const { Trade, TradingAccount } = require('../config/database');

// ==================== TRADING SERVICE ====================

// ===== Trades =====

async function getAllTrades({ search, status, market, strategy, symbol, startDate, endDate, sortBy, sortOrder } = {}) {
  const filter = {};

  if (search) {
    filter.$or = [
      { symbol: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
      { strategy: { $regex: search, $options: 'i' } },
      { setup: { $regex: search, $options: 'i' } }
    ];
  }
  if (status) filter.status = status;
  if (market) filter.market = market;
  if (strategy) filter.strategy = { $regex: strategy, $options: 'i' };
  if (symbol) filter.symbol = { $regex: symbol, $options: 'i' };
  if (startDate || endDate) {
    filter.entryDate = {};
    if (startDate) filter.entryDate.$gte = startDate;
    if (endDate) filter.entryDate.$lte = endDate;
  }

  const sort = {};
  sort[sortBy || 'entryDate'] = sortOrder === 'asc' ? 1 : -1;

  return Trade.find(filter).sort(sort);
}

async function getTradeById(id) {
  return Trade.findById(id);
}

async function createTrade(data) {
  const now = new Date().toISOString();
  const trade = new Trade({
    symbol: data.symbol.toUpperCase().trim(),
    type: data.type,
    status: data.status || 'open',
    entryPrice: data.entryPrice,
    exitPrice: data.exitPrice || null,
    quantity: data.quantity,
    leverage: data.leverage || 1,
    stopLoss: data.stopLoss || null,
    takeProfit: data.takeProfit || null,
    fees: data.fees || 0,
    strategy: data.strategy || '',
    exchange: data.exchange || '',
    market: data.market || 'crypto',
    timeframe: data.timeframe || '',
    setup: data.setup || '',
    notes: data.notes || '',
    tags: data.tags || [],
    emotion: data.emotion || 'neutral',
    rating: data.rating || 0,
    screenshot: data.screenshot || '',
    entryDate: data.entryDate || now,
    exitDate: data.exitDate || null,
    createdAt: now,
    updatedAt: now
  });

  // Auto-calculate PnL if closed
  if (data.status === 'closed' && data.exitPrice) {
    _calculatePnl(trade);
  }

  return trade.save();
}

async function updateTrade(id, data) {
  const trade = await Trade.findById(id);
  if (!trade) return null;

  const now = new Date().toISOString();
  const fields = ['symbol', 'type', 'status', 'entryPrice', 'exitPrice', 'quantity', 'leverage',
    'stopLoss', 'takeProfit', 'fees', 'strategy', 'exchange', 'market', 'timeframe',
    'setup', 'notes', 'tags', 'emotion', 'rating', 'screenshot', 'entryDate', 'exitDate'];

  fields.forEach(f => {
    if (data[f] !== undefined) trade[f] = data[f];
  });

  if (data.symbol) trade.symbol = data.symbol.toUpperCase().trim();
  trade.updatedAt = now;

  // Auto-calculate PnL
  if (trade.exitPrice && trade.entryPrice) {
    _calculatePnl(trade);
  }

  // Auto-close if exitPrice is provided
  if (data.exitPrice && trade.status === 'open') {
    trade.status = 'closed';
    if (!trade.exitDate) trade.exitDate = now;
  }

  return trade.save();
}

async function closeTrade(id, exitPrice, exitDate) {
  const trade = await Trade.findById(id);
  if (!trade) return null;

  const now = new Date().toISOString();
  trade.exitPrice = exitPrice;
  trade.exitDate = exitDate || now;
  trade.status = 'closed';
  trade.updatedAt = now;
  _calculatePnl(trade);

  return trade.save();
}

async function deleteTrade(id) {
  await Trade.findByIdAndDelete(id);
  return { success: true };
}

// ===== Trading Accounts =====

async function getAllAccounts() {
  return TradingAccount.find().sort({ isDefault: -1, createdAt: -1 });
}

async function createAccount(data) {
  const now = new Date().toISOString();
  return new TradingAccount({
    name: data.name.trim(),
    exchange: data.exchange || '',
    balance: data.balance || 0,
    initialBalance: data.initialBalance || data.balance || 0,
    currency: data.currency || 'USDT',
    isDefault: data.isDefault || false,
    notes: data.notes || '',
    createdAt: now,
    updatedAt: now
  }).save();
}

async function updateAccount(id, data) {
  const update = { updatedAt: new Date().toISOString() };
  if (data.name !== undefined) update.name = data.name.trim();
  if (data.exchange !== undefined) update.exchange = data.exchange;
  if (data.balance !== undefined) update.balance = data.balance;
  if (data.currency !== undefined) update.currency = data.currency;
  if (data.isDefault !== undefined) update.isDefault = data.isDefault;
  if (data.notes !== undefined) update.notes = data.notes;
  return TradingAccount.findByIdAndUpdate(id, update, { new: true });
}

async function deleteAccount(id) {
  await TradingAccount.findByIdAndDelete(id);
  return { success: true };
}

// ===== Analytics & Stats =====

async function getStats() {
  const allTrades = await Trade.find();
  const closed = allTrades.filter(t => t.status === 'closed');
  const open = allTrades.filter(t => t.status === 'open');
  const cancelled = allTrades.filter(t => t.status === 'cancelled');

  const wins = closed.filter(t => t.pnl > 0);
  const losses = closed.filter(t => t.pnl < 0);
  const breakeven = closed.filter(t => t.pnl === 0);

  const totalPnl = closed.reduce((sum, t) => sum + t.pnl, 0);
  const totalFees = allTrades.reduce((sum, t) => sum + (t.fees || 0), 0);
  const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));

  const winRate = closed.length > 0 ? (wins.length / closed.length * 100) : 0;
  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const expectancy = closed.length > 0 ? totalPnl / closed.length : 0;

  // Largest win/loss
  const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0;
  const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0;

  // Win/Loss streak
  let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
  const sortedClosed = [...closed].sort((a, b) => a.exitDate > b.exitDate ? 1 : -1);
  sortedClosed.forEach(t => {
    if (t.pnl > 0) { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin); }
    else if (t.pnl < 0) { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss); }
    else { curWin = 0; curLoss = 0; }
  });

  // Average holding time
  let totalHoldMs = 0, holdCount = 0;
  closed.forEach(t => {
    if (t.entryDate && t.exitDate) {
      const diff = new Date(t.exitDate) - new Date(t.entryDate);
      if (diff > 0) { totalHoldMs += diff; holdCount++; }
    }
  });
  const avgHoldTimeMs = holdCount > 0 ? totalHoldMs / holdCount : 0;

  // By market
  const byMarket = {};
  allTrades.forEach(t => {
    if (!byMarket[t.market]) byMarket[t.market] = { total: 0, wins: 0, losses: 0, pnl: 0 };
    byMarket[t.market].total++;
    if (t.status === 'closed') {
      if (t.pnl > 0) byMarket[t.market].wins++;
      else if (t.pnl < 0) byMarket[t.market].losses++;
      byMarket[t.market].pnl += t.pnl;
    }
  });

  // By strategy
  const byStrategy = {};
  allTrades.forEach(t => {
    const strat = t.strategy || 'Không có';
    if (!byStrategy[strat]) byStrategy[strat] = { total: 0, wins: 0, losses: 0, pnl: 0 };
    byStrategy[strat].total++;
    if (t.status === 'closed') {
      if (t.pnl > 0) byStrategy[strat].wins++;
      else if (t.pnl < 0) byStrategy[strat].losses++;
      byStrategy[strat].pnl += t.pnl;
    }
  });

  // By symbol (top 10)
  const bySymbol = {};
  allTrades.forEach(t => {
    if (!bySymbol[t.symbol]) bySymbol[t.symbol] = { total: 0, wins: 0, losses: 0, pnl: 0 };
    bySymbol[t.symbol].total++;
    if (t.status === 'closed') {
      if (t.pnl > 0) bySymbol[t.symbol].wins++;
      else if (t.pnl < 0) bySymbol[t.symbol].losses++;
      bySymbol[t.symbol].pnl += t.pnl;
    }
  });

  // Daily PnL (last 30 days)
  const dailyPnl = {};
  closed.forEach(t => {
    if (t.exitDate) {
      const day = t.exitDate.substring(0, 10);
      if (!dailyPnl[day]) dailyPnl[day] = 0;
      dailyPnl[day] += t.pnl;
    }
  });

  // Monthly PnL
  const monthlyPnl = {};
  closed.forEach(t => {
    if (t.exitDate) {
      const month = t.exitDate.substring(0, 7);
      if (!monthlyPnl[month]) monthlyPnl[month] = { pnl: 0, trades: 0, wins: 0 };
      monthlyPnl[month].pnl += t.pnl;
      monthlyPnl[month].trades++;
      if (t.pnl > 0) monthlyPnl[month].wins++;
    }
  });

  // Drawdown calculation
  let peak = 0, maxDrawdown = 0, cumPnl = 0;
  sortedClosed.forEach(t => {
    cumPnl += t.pnl;
    if (cumPnl > peak) peak = cumPnl;
    const dd = peak - cumPnl;
    if (dd > maxDrawdown) maxDrawdown = dd;
  });

  // Emotion analysis
  const byEmotion = {};
  closed.forEach(t => {
    if (!byEmotion[t.emotion]) byEmotion[t.emotion] = { total: 0, wins: 0, pnl: 0 };
    byEmotion[t.emotion].total++;
    if (t.pnl > 0) byEmotion[t.emotion].wins++;
    byEmotion[t.emotion].pnl += t.pnl;
  });

  // Open positions value
  const openValue = open.reduce((sum, t) => sum + (t.entryPrice * t.quantity), 0);

  return {
    overview: {
      total: allTrades.length,
      open: open.length,
      closed: closed.length,
      cancelled: cancelled.length,
      wins: wins.length,
      losses: losses.length,
      breakeven: breakeven.length,
      winRate: Math.round(winRate * 100) / 100,
      totalPnl: Math.round(totalPnl * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      netPnl: Math.round((totalPnl - totalFees) * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossLoss: Math.round(grossLoss * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      expectancy: Math.round(expectancy * 100) / 100,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      largestWin: Math.round(largestWin * 100) / 100,
      largestLoss: Math.round(largestLoss * 100) / 100,
      maxWinStreak,
      maxLossStreak,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      avgHoldTimeMs,
      openPositionsValue: Math.round(openValue * 100) / 100
    },
    byMarket,
    byStrategy,
    bySymbol,
    byEmotion,
    dailyPnl,
    monthlyPnl
  };
}

async function getStrategies() {
  const trades = await Trade.find({ strategy: { $ne: '' } });
  const strategies = {};
  trades.forEach(t => {
    if (!strategies[t.strategy]) {
      strategies[t.strategy] = { name: t.strategy, trades: 0, wins: 0, pnl: 0 };
    }
    strategies[t.strategy].trades++;
    if (t.status === 'closed') {
      if (t.pnl > 0) strategies[t.strategy].wins++;
      strategies[t.strategy].pnl += t.pnl;
    }
  });
  return Object.values(strategies).map(s => ({
    ...s,
    winRate: s.trades > 0 ? Math.round(s.wins / s.trades * 100) : 0,
    pnl: Math.round(s.pnl * 100) / 100
  }));
}

async function getSymbols() {
  const trades = await Trade.find().distinct('symbol');
  return trades.sort();
}

async function getExchanges() {
  const trades = await Trade.find({ exchange: { $ne: '' } }).distinct('exchange');
  return trades.sort();
}

// ===== Helpers =====

function _calculatePnl(trade) {
  const { entryPrice, exitPrice, quantity, type, leverage, fees } = trade;
  if (!exitPrice || !entryPrice || !quantity) return;

  let rawPnl;
  if (type === 'buy' || type === 'long') {
    rawPnl = (exitPrice - entryPrice) * quantity * (leverage || 1);
  } else {
    rawPnl = (entryPrice - exitPrice) * quantity * (leverage || 1);
  }

  trade.pnl = Math.round((rawPnl - (fees || 0)) * 100) / 100;
  trade.pnlPercent = entryPrice > 0
    ? Math.round((rawPnl / (entryPrice * quantity) * 100) * 100) / 100
    : 0;
}

module.exports = {
  getAllTrades,
  getTradeById,
  createTrade,
  updateTrade,
  closeTrade,
  deleteTrade,
  getAllAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getStats,
  getStrategies,
  getSymbols,
  getExchanges
};
