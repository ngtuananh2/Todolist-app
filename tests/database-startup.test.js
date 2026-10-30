const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { databaseReadyMiddleware } = require('../src/middleware/database-ready');

test('serves the UI while database startup is pending and reports connection failures', async () => {
  let rejectDatabase;
  const databaseReady = new Promise((resolve, reject) => {
    rejectDatabase = reject;
  });
  const app = express();
  app.get('/index.html', (req, res) => res.send('TaskFlow UI'));
  app.use('/api', databaseReadyMiddleware(databaseReady));
  app.get('/api/todos', (req, res) => res.json([]));
  const server = app.listen(0);

  try {
    await new Promise(resolve => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const pageResponse = await fetch(`${baseUrl}/index.html`);
    assert.equal(pageResponse.status, 200);

    const apiRequest = fetch(`${baseUrl}/api/todos`);
    const pending = await Promise.race([
      apiRequest.then(() => false),
      new Promise(resolve => setTimeout(() => resolve(true), 50))
    ]);
    assert.equal(pending, true);

    rejectDatabase(new Error('database unavailable'));
    const apiResponse = await apiRequest;
    assert.equal(apiResponse.status, 503);
    assert.match((await apiResponse.json()).error, /cơ sở dữ liệu/i);
  } finally {
    server.close();
    server.closeAllConnections();
  }
});
