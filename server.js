require('dotenv').config();

const createApp = require('./src/app');
const PORT = process.env.PORT || 3000;

// ==================== START SERVER ====================

function startServer() {
  const app = createApp();

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
      console.log(`📂 Database: taskflow.db`);
      console.log(`📁 Architecture: microservice`);
      resolve(server);
    });
  });
}

// If run directly (not from Electron)
if (require.main === module) {
  startServer();
}

module.exports = { startServer, PORT };

