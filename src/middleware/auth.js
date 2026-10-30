const { SESSION_COOKIE, verifySession } = require('../services/auth.service');

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(part => {
    const index = part.indexOf('=');
    return index < 0 ? [part.trim(), ''] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function attachUser(req, _res, next) {
  const session = verifySession(parseCookies(req.headers.cookie || '')[SESSION_COOKIE]);
  req.user = session ? { id: session.userId } : null;
  next();
}

module.exports = { attachUser, parseCookies };
