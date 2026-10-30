const crypto = require('crypto');
const { User } = require('../config/database');

const SESSION_COOKIE = 'taskflow_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const LOCAL_SESSION_SECRET = 'taskflow-local-development-session-secret';

function getSessionSecret() {
  if (process.env.AUTH_SESSION_SECRET) return process.env.AUTH_SESSION_SECRET;
  if (process.env.NODE_ENV !== 'production') return LOCAL_SESSION_SECRET;
  return null;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { passwordHash, passwordSalt: salt };
}

function verifyPassword(password, salt, expectedHash) {
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function signSession(userId) {
  const payload = Buffer.from(JSON.stringify({
    userId: String(userId),
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000
  })).toString('base64url');
  const secret = getSessionSecret();
  if (!secret) throw new Error('AUTH_SESSION_SECRET chưa được cấu hình');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifySession(token) {
  const secret = getSessionSecret();
  if (!token || !secret) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.expiresAt > Date.now() ? data : null;
  } catch {
    return null;
  }
}

async function register(email, password) {
  const normalizedEmail = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Email không hợp lệ');
  if (typeof password !== 'string' || password.length < 10) throw new Error('Mật khẩu phải có ít nhất 10 ký tự');
  const existing = await User.findOne({ email: normalizedEmail }).lean();
  if (existing) throw new Error('Email này đã được đăng ký');
  const { passwordHash, passwordSalt } = hashPassword(password);
  const user = await User.create({ email: normalizedEmail, passwordHash, passwordSalt });
  return { id: user.id, email: user.email };
}

async function login(email, password) {
  const user = await User.findOne({ email: normalizeEmail(email) });
  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    throw new Error('Email hoặc mật khẩu không đúng');
  }
  return { token: signSession(user.id), user: { id: user.id, email: user.email } };
}

function getSessionCookieOptions() {
  return `HttpOnly; Path=/; Max-Age=${SESSION_TTL_SECONDS}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

module.exports = { SESSION_COOKIE, getSessionCookieOptions, login, normalizeEmail, register, signSession, verifySession };
