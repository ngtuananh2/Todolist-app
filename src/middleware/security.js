// ==================== SECURITY MIDDLEWARE ====================

/**
 * Simple rate limiter (in-memory, per-IP)
 * @param {number} maxReqs - Max requests per window
 * @param {number} windowMs - Time window in ms
 */
function rateLimiter(maxReqs = 30, windowMs = 60000) {
  const hits = new Map();

  // Cleanup every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of hits) {
      if (now - val.start > windowMs) hits.delete(key);
    }
  }, 300000);

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const record = hits.get(key);

    if (!record || now - record.start > windowMs) {
      hits.set(key, { count: 1, start: now });
      return next();
    }

    record.count++;
    if (record.count > maxReqs) {
      return res.status(429).json({
        error: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
        retryAfter: Math.ceil((record.start + windowMs - now) / 1000)
      });
    }

    next();
  };
}

/**
 * Security headers middleware
 */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

module.exports = { rateLimiter, securityHeaders };
