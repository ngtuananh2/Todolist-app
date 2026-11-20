const { Router } = require('express');
const { rateLimiter } = require('../middleware/security');
const { runWithOwner } = require('../middleware/ownership');
const mt5SyncService = require('../services/mt5-sync.service');

const router = Router();

router.post('/sync', rateLimiter(30, 60000), async (req, res, next) => {
  try {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer (tfmt5_[a-f0-9]{64})$/);
    if (!match) return res.status(401).json({ error: 'Token MT5 không hợp lệ' });

    const connection = await mt5SyncService.findConnectionForToken(match[1]);
    if (!connection) return res.status(401).json({ error: 'Token MT5 không hợp lệ hoặc đã bị thu hồi' });

    const sync = () => mt5SyncService.syncSnapshot(connection, req.body);
    const result = connection.ownerId
      ? await runWithOwner(connection.ownerId.toString(), sync)
      : await sync();
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
