const test = require('node:test');
const assert = require('node:assert/strict');
const createApp = require('../src/app');

test('revalidates HTML, CSS, and JavaScript assets after app updates', async () => {
  const server = createApp().listen(0);

  try {
    await new Promise(resolve => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    for (const asset of [
      '/schedule.html', '/schedule.css', '/schedule.js',
      '/journal.html', '/journal.css', '/journal.js',
      '/global-utils.js', '/sw.js'
    ]) {
      const response = await fetch(`${baseUrl}${asset}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-cache');
    }

    const mt5EaResponse = await fetch(`${baseUrl}/mt5/TaskFlowSync.mq5`);
    assert.equal(mt5EaResponse.status, 200);
    assert.match(await mt5EaResponse.text(), /Read-only MT5 position and history sync/);

    for (const page of [
      '/index.html', '/dashboard.html', '/habit.html', '/brain.html', '/journal.html',
      '/settings.html', '/trading.html', '/schedule.html', '/today.html', '/english.html'
    ]) {
      const response = await fetch(`${baseUrl}${page}`);
      assert.match(await response.text(), /<a href="\/journal\.html" class="nav-link(?: active)?"(?: aria-current="page")?>Nhật ký<\/a>/);
    }

    const [dashboardHtml, journalHtml] = await Promise.all([
      fetch(`${baseUrl}/dashboard.html`).then(response => response.text()),
      fetch(`${baseUrl}/journal.html`).then(response => response.text())
    ]);
    assert.ok(dashboardHtml.indexOf('id="db-kpi-row"') < dashboardHtml.indexOf('id="db-goals-card"'));
    assert.ok(dashboardHtml.indexOf('id="db-goals-card"') < dashboardHtml.indexOf('id="db-schedule-card"'));
    const navLinks = html => {
      const nav = html.match(/<div class="nav-center">([\s\S]*?)<\/div>/);
      assert.ok(nav, 'Page should have a central navigation menu');
      return [...nav[1].matchAll(/href="([^"]+)"/g)].map(match => match[1]);
    };
    assert.deepEqual(navLinks(journalHtml), navLinks(dashboardHtml));
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
