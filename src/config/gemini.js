const { GoogleGenerativeAI } = require('@google/generative-ai');

// ==================== GEMINI AI CONFIG ====================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getModel(systemPrompt) {
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: { parts: [{ text: systemPrompt }] }
  });
}

module.exports = { genAI, getModel };
