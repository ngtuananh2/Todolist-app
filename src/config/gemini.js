const Groq = require('groq-sdk');

// ==================== AI PROVIDER CONFIG ====================
const AI_NOT_CONFIGURED_MESSAGE = 'AI chưa được cấu hình (thiếu GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY hoặc OPENAI_API_KEY)';

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

const OPENROUTER_API_BASE = process.env.OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const isOpenRouterConfigured = !!process.env.OPENROUTER_API_KEY;
const GEMINI_API_BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
const isGeminiConfigured = !!process.env.GEMINI_API_KEY;
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const isOpenAIConfigured = !!process.env.OPENAI_API_KEY;

if (!isOpenRouterConfigured) {
  console.warn('⚠️ OPENROUTER_API_KEY chưa được cấu hình — fallback AI sẽ không khả dụng');
}
if (!isGeminiConfigured) {
  console.warn('⚠️ GEMINI_API_KEY chưa được cấu hình — fallback Gemini sẽ không khả dụng');
}
if (!isOpenAIConfigured) {
  console.warn('⚠️ OPENAI_API_KEY chưa được cấu hình — fallback OpenAI sẽ không khả dụng');
}

function shouldFallbackToOpenRouter(err) {
  const status = Number(err?.status || err?.code || 0);
  const msg = String(err?.message || '').toLowerCase();
  return status === 400 || status === 401 || status === 403 || status === 404 || status === 408 || status === 429 || status >= 500 || /rate\s*limit|rate_limit|too many requests|timeout|timed out|network|fetch failed|socket|econnreset|etimedout|not found|unsupported/.test(msg);
}

async function createOpenRouterCompletion(params) {
  if (!isOpenRouterConfigured) throw createAIConfigError();

  const payload = {
    model: OPENROUTER_MODEL,
    messages: params.messages || [],
    temperature: params.temperature,
    max_tokens: params.max_tokens
  };

  const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'TaskFlow'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    const err = new Error(`${response.status} ${text}`);
    err.status = response.status;
    throw err;
  }

  return response.json();
}

function convertMessagesToGeminiContents(messages = []) {
  return messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(msg.content || '') }]
  }));
}

function extractGeminiText(payload) {
  const text = payload?.candidates?.[0]?.content?.parts?.map(p => p?.text || '').join('') || '';
  return text.trim();
}

async function createGeminiCompletion(params) {
  if (!isGeminiConfigured) throw createAIConfigError();

  const payload = {
    contents: convertMessagesToGeminiContents(params.messages || []),
    generationConfig: {
      temperature: typeof params.temperature === 'number' ? params.temperature : 0.7,
      maxOutputTokens: Number(params.max_tokens) || 2048
    }
  };

  const response = await fetch(
    `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const text = await response.text();
    const err = new Error(`${response.status} ${text}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const content = extractGeminiText(data);
  return {
    choices: [
      {
        message: {
          content
        }
      }
    ]
  };
}

async function createOpenAICompletion(params) {
  if (!isOpenAIConfigured) throw createAIConfigError();

  const payload = {
    model: OPENAI_MODEL,
    messages: params.messages || [],
    temperature: params.temperature,
    max_tokens: params.max_tokens
  };

  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    const err = new Error(`${response.status} ${text}`);
    err.status = response.status;
    throw err;
  }

  return response.json();
}

async function createCompletionWithFallback(params) {
  if (isGroqConfigured && groq) {
    try {
      return await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens
      });
    } catch (err) {
      if (!shouldFallbackToOpenRouter(err)) {
        throw err;
      }

      if (isGeminiConfigured) {
        console.warn('⚠️ Groq lỗi/tới hạn, chuyển sang Gemini fallback:', err.message);
        try {
          return await createGeminiCompletion(params);
        } catch (gemErr) {
          if (!shouldFallbackToOpenRouter(gemErr)) throw gemErr;
          console.warn('⚠️ Gemini lỗi/tới hạn:', gemErr.message);
        }
      }

      if (isOpenRouterConfigured) {
        console.warn('⚠️ Chuyển sang OpenRouter fallback:', err.message);
        try {
          return await createOpenRouterCompletion(params);
        } catch (orErr) {
          if (!shouldFallbackToOpenRouter(orErr)) throw orErr;
          console.warn('⚠️ OpenRouter lỗi/tới hạn:', orErr.message);
        }
      }

      if (isOpenAIConfigured) {
        console.warn('⚠️ Chuyển sang OpenAI fallback:', err.message);
        return createOpenAICompletion(params);
      }

      throw err;
    }
  }

  if (isGeminiConfigured) {
    try {
      return await createGeminiCompletion(params);
    } catch (gemErr) {
      if (!shouldFallbackToOpenRouter(gemErr)) throw gemErr;
      console.warn('⚠️ Gemini lỗi/tới hạn, thử OpenRouter/OpenAI:', gemErr.message);
    }
  }

  if (isOpenRouterConfigured) {
    try {
      return await createOpenRouterCompletion(params);
    } catch (orErr) {
      if (isOpenAIConfigured && shouldFallbackToOpenRouter(orErr)) {
        console.warn('⚠️ OpenRouter lỗi/tới hạn, chuyển sang OpenAI fallback:', orErr.message);
        return createOpenAICompletion(params);
      }
      throw orErr;
    }
  }

  if (isOpenAIConfigured) {
    return createOpenAICompletion(params);
  }

  throw createAIConfigError();
}

const aiGateway = {
  chat: {
    completions: {
      create: createCompletionWithFallback
    }
  }
};

// Model: llama-3.3-70b-versatile (free tier: 30 req/min, 14400 req/day)
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

module.exports = {
  groq: aiGateway,
  GROQ_MODEL,
  isGroqConfigured,
  isGeminiConfigured,
  isOpenRouterConfigured,
  isOpenAIConfigured,
  GEMINI_MODEL,
  OPENROUTER_MODEL,
  OPENAI_MODEL,
  AI_NOT_CONFIGURED_MESSAGE,
  createAIConfigError
};
