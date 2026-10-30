const NodeCache = require('node-cache');

// ==================== RESPONSE CACHING MIDDLEWARE ====================
// Domain-aware in-memory caching for GET endpoints
// Cache TTL: 5 minutes by default

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

function getCacheKey(req) {
  return `${req.method}:${req.originalUrl || req.url}`;
}

const ROUTE_DOMAINS = {
  '/api/todos': ['/api/todos', '/api/tags', '/api/dashboard'],
  '/api/subtasks': ['/api/todos', '/api/dashboard'],
  '/api/tags': ['/api/todos', '/api/tags', '/api/dashboard'],
  '/api/habits': ['/api/habits', '/api/dashboard'],
  '/api/notes': ['/api/notes', '/api/dashboard'],
  '/api/english': ['/api/english', '/api/dashboard'],
  '/api/trading': ['/api/trading', '/api/dashboard'],
  '/api/schedule': ['/api/schedule', '/api/dashboard'],
  '/api/dashboard': ['/api/dashboard']
};

function invalidateForUrl(url) {
  let matched = false;
  for (const [prefix, domains] of Object.entries(ROUTE_DOMAINS)) {
    if (url.startsWith(prefix)) {
      matched = true;
      domains.forEach(domain => clearCache(domain));
      break;
    }
  }
  if (!matched) {
    clearCache('/api/');
  }
}

/**
 * Cache middleware - caches successful GET responses
 * Granularly invalidates cache on successful POST/PUT/DELETE/PATCH
 */
function cacheMiddleware(req, res, next) {
  // Only cache GET requests
  if (req.method !== 'GET') {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          invalidateForUrl(req.originalUrl || req.url);
        }
      });
    }
    return next();
  }

  // Do not cache AI generation or search endpoints that require fresh data
  if (req.originalUrl && (req.originalUrl.startsWith('/api/ai') || req.originalUrl.startsWith('/api/dashboard/notifications'))) {
    return next();
  }

  const cacheKey = getCacheKey(req);
  const cachedResponse = cache.get(cacheKey);

  if (cachedResponse) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cachedResponse);
  }

  // Wrap res.json to cache the response
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    if (res.statusCode === 200) {
      cache.set(cacheKey, data);
      res.setHeader('X-Cache', 'MISS');
    }
    return originalJson(data);
  };

  next();
}

/**
 * Clear cache for specific route
 */
function clearCache(route) {
  const keys = cache.keys();
  keys.forEach(key => {
    if (key.includes(route)) {
      cache.del(key);
    }
  });
}

/**
 * Get cache stats (for debugging)
 */
function getCacheStats() {
  return {
    keys: cache.keys().length,
    stats: cache.getStats()
  };
}

module.exports = { cacheMiddleware, clearCache, getCacheStats };
