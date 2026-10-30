const { SESSION_COOKIE, verifySession } = require('../services/auth.service');
const { runWithOwner } = require('./ownership');

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(part => {
    const index = part.indexOf('=');
    return index < 0 ? [part.trim(), ''] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function attachUser(req, _res, next) {
  const session = verifySession(parseCookies(req.headers.cookie || '')[SESSION_COOKIE]);
  req.user = session ? { id: session.userId, email: session.email || null } : null;
  next();
}

function requireAuth(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next();
  if (!req.user) return res.status(401).json({ error: 'Bạn cần đăng nhập để sử dụng TaskFlow' });
  return runWithOwner(req.user.id, next);
}

module.exports = { attachUser, parseCookies, requireAuth };
