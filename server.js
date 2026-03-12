require('dotenv').config();

const createApp = require('./src/app');
const { connectDB, mongoose } = require('./src/config/database');
const PORT = process.env.PORT || 3000;

// ==================== START SERVER ====================

async function startServer() {
  // Kết nối MongoDB trước khi khởi động server
  await connectDB();

  const app = createApp();

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
      console.log(`📂 Database: MongoDB / ${process.env.MONGO_URI || 'mongodb://localhost:27017/TaskFlowDB'}`);
      console.log(`📁 Architecture: microservice`);
      resolve(server);
    });

    // ---- Graceful Shutdown ----
    const shutdown = async (signal) => {
      console.log(`\n🛑 ${signal} received — shutting down gracefully...`);
      server.close(async () => {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
        process.exit(0);
      });
      // Force kill if graceful shutdown takes too long
      setTimeout(() => { console.error('⚠️ Forced shutdown'); process.exit(1); }, 5000);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  });
}

// If run directly (not from Electron)
if (require.main === module) {
  startServer().catch(err => {
    console.error('❌ Không thể khởi động server:', err.message);
    process.exit(1);
  });
}

module.exports = { startServer, PORT };

