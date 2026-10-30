const test = require('node:test');
const assert = require('node:assert/strict');
const createApp = require('../src/app');

test('revalidates HTML, CSS, and JavaScript assets after app updates', async () => {
  const server = createApp().listen(0);

  try {
    await new Promise(resolve => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    for (const asset of ['/schedule.html', '/schedule.css', '/schedule.js']) {
      const response = await fetch(`${baseUrl}${asset}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-cache');
    }
  } finally {
    server.close();
    server.closeAllConnections();
  }
});

test('serves the PWA manifest, service worker, and offline fallback', async () => {
  const server = createApp().listen(0);

  try {
    await new Promise(resolve => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    for (const asset of ['/manifest.webmanifest', '/sw.js', '/offline.html']) {
      const response = await fetch(`${baseUrl}${asset}`);
      assert.equal(response.status, 200);
    }

    const manifest = await (await fetch(`${baseUrl}/manifest.webmanifest`)).json();
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.start_url, '/');
  } finally {
    server.close();
    server.closeAllConnections();
  }
});
