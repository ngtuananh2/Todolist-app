const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { rateLimiter, securityHeaders } = require('./middleware/security');
const { cacheMiddleware } = require('./middleware/cache');
const { databaseReadyMiddleware } = require('./middleware/database-ready');

// Import route modules
const todoRoutes = require('./routes/todo.routes');
const subtaskRoutes = require('./routes/subtask.routes');
const tagRoutes = require('./routes/tag.routes');
const aiRoutes = require('./routes/ai.routes');
const habitRoutes = require('./routes/habit.routes');
const noteRoutes = require('./routes/note.routes');
const englishRoutes = require('./routes/english.routes');
const tradingRoutes = require('./routes/trading.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const settingsRoutes = require('./routes/settings.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const authRoutes = require('./routes/auth.routes');
const { attachUser, requireAuth } = require('./middleware/auth');

// ==================== EXPRESS APP SETUP ====================

function createApp({ databaseReady } = {}) {
  const app = express();

  // ---- Security & Performance Middleware ----
  const cspDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();
  cspDirectives['script-src'] = ["'self'", "'unsafe-inline'"];
  cspDirectives['script-src-attr'] = ["'unsafe-inline'"];
  app.use(helmet({ contentSecurityPolicy: { directives: cspDirectives } }));
  app.use(compression({ level: 6, threshold: 1024 }));
  app.use(securityHeaders);
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'taskflow' });
  });
  app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '1h',
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
      if (/\.(?:html|css|js)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));
  if (databaseReady) {
    app.use('/api', databaseReadyMiddleware(databaseReady));
  }
  app.use(cacheMiddleware);
  app.use('/api/auth', authRoutes);
  app.use('/api', attachUser, requireAuth);

  // ---- Rate Limiting for AI routes ----
  app.use('/api/ai', rateLimiter(30, 60000));   // 30 requests/min for AI

  // ---- API Routes (microservice-style) ----
  app.use('/api/todos', todoRoutes);      // Todo service
  app.use('/api', subtaskRoutes);          // Subtask service
  app.use('/api/tags', tagRoutes);         // Tag service
  app.use('/api/ai', aiRoutes);            // AI service
  app.use('/api/habits', habitRoutes);     // Habit tracker service
  app.use('/api/notes', noteRoutes);       // Second Brain service
  app.use('/api/english', englishRoutes);  // English learning service
  app.use('/api/trading', tradingRoutes);  // Trading management service
  app.use('/api/dashboard', dashboardRoutes); // Global dashboard service
  app.use('/api/app-settings', settingsRoutes); // App preferences shared with Electron
  app.use('/api/schedule', scheduleRoutes);

  // ---- Error handling ----
  app.use('/api/:path', notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
