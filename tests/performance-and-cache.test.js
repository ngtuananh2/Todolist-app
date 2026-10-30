const test = require('node:test');
const assert = require('node:assert/strict');
const { cacheMiddleware, clearCache, getCacheStats } = require('../src/middleware/cache');

test('cache middleware selectively invalidates routes according to domain', () => {
  // Clear any existing cache
  clearCache('/api/');

  let headers = {};
  let sentData = null;

  function createMockRes() {
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      json(data) { sentData = data; return this; },
      on(event, cb) {
        if (event === 'finish') this._finishCb = cb;
      },
      emitFinish() {
        if (this._finishCb) this._finishCb();
      }
    };
    return res;
  }

  // 1. Prime cache with GET /api/todos and GET /api/habits
  const reqTodos = { method: 'GET', originalUrl: '/api/todos', url: '/api/todos' };
  const resTodos1 = createMockRes();
  cacheMiddleware(reqTodos, resTodos1, () => {
    resTodos1.json([{ id: '1', title: 'Task 1' }]);
  });
  assert.equal(resTodos1.headers['X-Cache'], 'MISS');

  // Verify second GET is a cache HIT
  const resTodos2 = createMockRes();
  cacheMiddleware(reqTodos, resTodos2, () => assert.fail('should hit cache'));
  assert.equal(resTodos2.headers['X-Cache'], 'HIT');

  // Prime habits
  const reqHabits = { method: 'GET', originalUrl: '/api/habits', url: '/api/habits' };
  const resHabits1 = createMockRes();
  cacheMiddleware(reqHabits, resHabits1, () => {
    resHabits1.json([{ id: 'h1', name: 'Exercise' }]);
  });
  assert.equal(resHabits1.headers['X-Cache'], 'MISS');

  // 2. Perform POST /api/todos (write operation)
  const reqPostTodo = { method: 'POST', originalUrl: '/api/todos', url: '/api/todos' };
  const resPost = createMockRes();
  cacheMiddleware(reqPostTodo, resPost, () => {});
  resPost.emitFinish();

  // 3. GET /api/todos must be a MISS (invalidated)
  const resTodos3 = createMockRes();
  cacheMiddleware(reqTodos, resTodos3, () => {
    resTodos3.json([{ id: '1', title: 'Task 1' }, { id: '2', title: 'Task 2' }]);
  });
  assert.equal(resTodos3.headers['X-Cache'], 'MISS');

  // 4. GET /api/habits MUST STILL BE A CACHE HIT (not invalidated by todo writes!)
  const resHabits2 = createMockRes();
  cacheMiddleware(reqHabits, resHabits2, () => assert.fail('habits cache should not be cleared'));
  assert.equal(resHabits2.headers['X-Cache'], 'HIT');
});

test('pruning schedule sent occurrences older than 30 days', () => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const sentOccurrences = {
    recentKey: new Date(now - 2 * dayMs).toISOString(),
    oldKey: new Date(now - 45 * dayMs).toISOString()
  };

  const cutoffTime = now - 30 * dayMs;
  for (const [k, ts] of Object.entries(sentOccurrences)) {
    if (new Date(ts).getTime() < cutoffTime) {
      delete sentOccurrences[k];
    }
  }

  assert.equal(sentOccurrences.recentKey !== undefined, true);
  assert.equal(sentOccurrences.oldKey, undefined);
});
