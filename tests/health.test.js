const test = require('node:test');
const assert = require('node:assert/strict');
const createApp = require('../src/app');

test('exposes a public health check without database access', async () => {
  const server = createApp().listen(0);

  try {
    await new Promise(resolve => server.once('listening', resolve));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok', service: 'taskflow' });
  } finally {
    server.close();
    server.closeAllConnections();
  }
});
