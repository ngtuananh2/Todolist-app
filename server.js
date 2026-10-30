const path = require('path');
const fs = require('fs');

// Load .env from the project root regardless of Electron's working directory.
require('dotenv').config({ path: path.join(__dirname, '.env') });
const srcEnvPath = path.join(__dirname, 'src', '.env');
if (!process.env.GROQ_API_KEY && fs.existsSync(srcEnvPath)) {
  require('dotenv').config({ path: srcEnvPath });
}

const createApp = require('./src/app');
const { connectDB, mongoose } = require('./src/config/database');
const { startScheduleReminderWorker } = require('./src/services/scheduleReminder.service');
const PORT = process.env.PORT || 3000;

// ==================== START SERVER ====================

async function startServer({ deferDatabaseConnection = false } = {}) {
  let scheduleReminderTimer;
  let databaseReady;

  if (deferDatabaseConnection) {
    databaseReady = connectDB().then(() => {
      scheduleReminderTimer = startScheduleReminderWorker();
    });
    databaseReady.catch(err => {
      console.error('❌ Không thể kết nối cơ sở dữ liệu:', err.message);
    });
  } else {
    await connectDB();
    scheduleReminderTimer = startScheduleReminderWorker();
    databaseReady = Promise.resolve();
  }

  const app = createApp({ databaseReady });

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
      if (scheduleReminderTimer) clearInterval(scheduleReminderTimer);
      server.close(async () => {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
        process.exit(0);
      });
      // Force kill if graceful shutdown takes too long
      setTimeout(() => { console.error('⚠️ Forced shutdown'); process.exit(1); }, 5000);
    };
    server.on('close', () => {
      if (scheduleReminderTimer) clearInterval(scheduleReminderTimer);
    });
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
