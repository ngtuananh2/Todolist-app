const test = require('node:test');
const assert = require('node:assert/strict');

process.env.AUTH_SESSION_SECRET = 'test-secret-that-is-long-enough';
const { signSession, verifySession } = require('../src/services/auth.service');

test('signs and verifies expiring sessions', () => {
  const token = signSession('user-123');
  assert.deepEqual(verifySession(token).userId, 'user-123');
  assert.equal(verifySession(`${token}x`), null);
});
