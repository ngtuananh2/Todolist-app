// ==================== GLOBAL ERROR HANDLER ====================

function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message);

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Dữ liệu bị xung đột',
      detail: err.message
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: err.message || 'Dữ liệu không hợp lệ'
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'ID không hợp lệ'
    });
  }

  // Default 500
  res.status(err.status || 500).json({
    error: 'Lỗi máy chủ nội bộ',
    detail: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}

// ==================== 404 HANDLER ====================

function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Không tìm thấy API endpoint',
    path: req.originalUrl
  });
}

module.exports = { errorHandler, notFoundHandler };
