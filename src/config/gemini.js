const Groq = require('groq-sdk');

// ==================== GROQ CONFIG ====================
const AI_NOT_CONFIGURED_MESSAGE = 'AI chưa được cấu hình (thiếu GROQ_API_KEY)';

function createAIConfigError() {
  const err = new Error(AI_NOT_CONFIGURED_MESSAGE);
  err.code = 'AI_NOT_CONFIGURED';
  err.status = 503;
  return err;
}

let groq;
let isGroqConfigured = false;
try {
  if (process.env.GROQ_API_KEY) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    isGroqConfigured = true;
  } else {
    console.warn('⚠️ GROQ_API_KEY chưa được cấu hình — tính năng AI sẽ bị tắt');
  }
} catch (err) {
  console.warn('⚠️ Không thể khởi tạo Groq client:', err.message);
}

if (!groq) {
  groq = {
    chat: {
      completions: {
        create: async () => {
          throw createAIConfigError();
        }
      }
    }
  };
}

// Model: llama-3.3-70b-versatile (free tier: 30 req/min, 14400 req/day)
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

module.exports = {
  groq,
  GROQ_MODEL,
  isGroqConfigured,
  AI_NOT_CONFIGURED_MESSAGE,
  createAIConfigError
};
