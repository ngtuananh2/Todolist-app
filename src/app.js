const express = require('express');
const path = require('path');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import route modules
const todoRoutes = require('./routes/todo.routes');
const subtaskRoutes = require('./routes/subtask.routes');
const tagRoutes = require('./routes/tag.routes');
const aiRoutes = require('./routes/ai.routes');

// ==================== EXPRESS APP SETUP ====================

function createApp() {
  const app = express();

  // ---- Global Middleware ----
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // ---- API Routes (microservice-style) ----
  app.use('/api/todos', todoRoutes);      // Todo service
  app.use('/api', subtaskRoutes);          // Subtask service
  app.use('/api/tags', tagRoutes);         // Tag service
  app.use('/api/ai', aiRoutes);            // AI service

  // ---- Error handling ----
  app.use('/api/:path', notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
