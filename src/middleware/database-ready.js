function databaseReadyMiddleware(databaseReady) {
  return async (req, res, next) => {
    try {
      await databaseReady;
      next();
    } catch {
      res.status(503).json({
        error: 'Không thể kết nối cơ sở dữ liệu. Hãy khởi động lại TaskFlow sau khi kiểm tra MongoDB.'
      });
    }
  };
}

module.exports = { databaseReadyMiddleware };
