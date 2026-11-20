const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const journalRoutes = require('../src/routes/journal.routes');

test('rejects invalid journal months, dates, weights, and titles', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/journal', journalRoutes);
  app.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({ error: error.message });
  });
  const server = app.listen(0);

  try {
    await new Promise(resolve => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/journal`;

    const invalidMonth = await fetch(`${baseUrl}?month=2026-13`);
    assert.equal(invalidMonth.status, 400);

    const invalidDate = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'weight', date: '2026-02-31', weight: 62.4 })
    });
    assert.equal(invalidDate.status, 400);

    const invalidWeight = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'weight', date: '2026-05-01', weight: 501 })
    });
    assert.equal(invalidWeight.status, 400);

    const missingTitle = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'memory', date: '2026-05-01', title: '  ' })
    });
    assert.equal(missingTitle.status, 400);
  } finally {
    server.close();
    server.closeAllConnections();
  }
});
