const test = require('node:test');
const assert = require('node:assert/strict');

process.env.AUTH_SESSION_SECRET = 'test-secret-that-is-long-enough';
const { signSession, verifySession } = require('../src/services/auth.service');

test('signs and verifies expiring sessions', () => {
  const token = signSession('user-123');
  assert.deepEqual(verifySession(token).userId, 'user-123');
  assert.equal(verifySession(`${token}x`), null);
});

test('uses a development session secret when local configuration is absent', () => {
  const configured = process.env.AUTH_SESSION_SECRET;
  const environment = process.env.NODE_ENV;
  delete process.env.AUTH_SESSION_SECRET;
  delete process.env.NODE_ENV;
  const token = signSession('local-user');
  assert.equal(verifySession(token).userId, 'local-user');
  if (configured) process.env.AUTH_SESSION_SECRET = configured;
  if (environment) process.env.NODE_ENV = environment;
});
