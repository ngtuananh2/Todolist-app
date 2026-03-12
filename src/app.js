const express = require('express');
const path = require('path');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { rateLimiter, securityHeaders } = require('./middleware/security');

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

// ==================== EXPRESS APP SETUP ====================

function createApp() {
  const app = express();

  // ---- Security & Global Middleware ----
  app.use(securityHeaders);
  app.use(express.json({ limit: '5mb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

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

  // ---- Error handling ----
  app.use('/api/:path', notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
