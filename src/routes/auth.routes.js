const { Router } = require('express');
const { SESSION_COOKIE, getSessionCookieOptions, login, register } = require('../services/auth.service');
const { attachUser } = require('../middleware/auth');

const router = Router();

router.get('/me', attachUser, (req, res) => {
  res.json({ authenticated: Boolean(req.user), user: req.user });
});

router.post('/register', async (req, res, next) => {
  try {
    const user = await register(req.body.email, req.body.password);
    const session = await login(req.body.email, req.body.password);
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(session.token)}; ${getSessionCookieOptions()}`);
    res.status(201).json({ user });
  } catch (error) {
    if (/đã được đăng ký|không hợp lệ|ít nhất/.test(error.message)) return res.status(400).json({ error: error.message });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const session = await login(req.body.email, req.body.password);
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(session.token)}; ${getSessionCookieOptions()}`);
    res.json({ user: session.user });
  } catch (error) {
    if (error.message === 'Email hoặc mật khẩu không đúng') return res.status(401).json({ error: error.message });
    next(error);
  }
});

router.post('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
  res.status(204).end();
});

module.exports = router;
