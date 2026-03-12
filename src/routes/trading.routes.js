const { Router } = require('express');
const tradingService = require('../services/trading.service');

const router = Router();

// ==================== TRADING ROUTES ====================

// GET /api/trading — list trades with filters
router.get('/', async (req, res, next) => {
  try {
    const trades = await tradingService.getAllTrades(req.query);
    res.json(trades);
  } catch (err) { next(err); }
});

// GET /api/trading/stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await tradingService.getStats();
    res.json(stats);
  } catch (err) { next(err); }
});

// GET /api/trading/strategies
router.get('/strategies', async (req, res, next) => {
  try {
    const strategies = await tradingService.getStrategies();
    res.json(strategies);
  } catch (err) { next(err); }
});

// GET /api/trading/symbols
router.get('/symbols', async (req, res, next) => {
  try {
    const symbols = await tradingService.getSymbols();
    res.json(symbols);
  } catch (err) { next(err); }
});

// GET /api/trading/exchanges
router.get('/exchanges', async (req, res, next) => {
  try {
    const exchanges = await tradingService.getExchanges();
    res.json(exchanges);
  } catch (err) { next(err); }
});

// GET /api/trading/accounts
router.get('/accounts', async (req, res, next) => {
  try {
    const accounts = await tradingService.getAllAccounts();
    res.json(accounts);
  } catch (err) { next(err); }
});

// POST /api/trading/accounts
router.post('/accounts', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Tên tài khoản không được để trống' });
    const account = await tradingService.createAccount(req.body);
    res.status(201).json(account);
  } catch (err) { next(err); }
});

// PUT /api/trading/accounts/:id
router.put('/accounts/:id', async (req, res, next) => {
  try {
    const updated = await tradingService.updateAccount(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/trading/accounts/:id
router.delete('/accounts/:id', async (req, res, next) => {
  try {
    const result = await tradingService.deleteAccount(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/trading/:id
router.get('/:id', async (req, res, next) => {
  try {
    const trade = await tradingService.getTradeById(req.params.id);
    if (!trade) return res.status(404).json({ error: 'Không tìm thấy lệnh' });
    res.json(trade);
  } catch (err) { next(err); }
});

// POST /api/trading
router.post('/', async (req, res, next) => {
  try {
    const { symbol, type, entryPrice, quantity } = req.body;
    if (!symbol || !symbol.trim()) return res.status(400).json({ error: 'Symbol không được để trống' });
    if (!type) return res.status(400).json({ error: 'Loại lệnh không được để trống' });
    if (!entryPrice || entryPrice <= 0) return res.status(400).json({ error: 'Giá vào lệnh không hợp lệ' });
    if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Số lượng không hợp lệ' });

    const trade = await tradingService.createTrade(req.body);
    res.status(201).json(trade);
  } catch (err) { next(err); }
});

// PUT /api/trading/:id
router.put('/:id', async (req, res, next) => {
  try {
    const updated = await tradingService.updateTrade(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy lệnh' });
    res.json(updated);
  } catch (err) { next(err); }
});

// PUT /api/trading/:id/close — close a trade
router.put('/:id/close', async (req, res, next) => {
  try {
    const { exitPrice, exitDate } = req.body;
    if (!exitPrice || exitPrice <= 0) return res.status(400).json({ error: 'Giá đóng lệnh không hợp lệ' });
    const trade = await tradingService.closeTrade(req.params.id, exitPrice, exitDate);
    if (!trade) return res.status(404).json({ error: 'Không tìm thấy lệnh' });
    res.json(trade);
  } catch (err) { next(err); }
});

// DELETE /api/trading/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await tradingService.deleteTrade(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
