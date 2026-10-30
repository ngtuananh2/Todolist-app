const { EnglishProgress, Vocab, EnglishMindmap } = require('../config/database');

const OXFORD_3000_URL = 'https://www.oxfordlearnersdictionaries.com/wordlist/american_english/oxford3000/';
const OXFORD_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let oxfordCache = { fetchedAt: 0, words: [] };
const EXTERNAL_SOURCE_TTL_MS = 6 * 60 * 60 * 1000;
const EXTERNAL_VOCAB_SOURCES = {
  google10000: {
    label: 'Google Top 10k',
    url: 'https://raw.githubusercontent.com/first20hours/google-10000-english/master/20k.txt'
  },
  frequency50k: {
    label: 'FrequencyWords 50k',
    url: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt'
  }
};
const externalSourceCache = {
  google10000: { fetchedAt: 0, words: [] },
  frequency50k: { fetchedAt: 0, words: [] }
};

const EXTERNAL_LEVEL_RANGES = {
  A1: [0, 1000],
  A2: [1000, 3000],
  B1: [3000, 7000],
  B2: [7000, 15000]
};

// ==================== ENGLISH SERVICE ====================

const DEFAULT_MINDMAP = {
  id: 'root',
  title: 'English Mindmap',
  children: [
    { id: 'node-grammar', title: 'Grammar', children: [] },
    { id: 'node-vocab', title: 'Vocabulary', children: [] },
    { id: 'node-skills', title: 'Skills', children: [] }
  ]
};

// ===== Progress =====

async function getProgress() {
  const docs = await EnglishProgress.find().sort({ lessonId: 1 }).lean();
  return docs.map(p => ({ ...p, id: p._id.toString() }));
}

async function saveProgress(lessonId, score, totalQ) {
  const now = new Date().toISOString();
  const existing = await EnglishProgress.findOne({ lessonId });

  if (existing) {
    existing.score = score;
    existing.totalQ = totalQ;
    existing.attempts += 1;
    if (score > existing.bestScore) existing.bestScore = score;
    existing.lastPractice = now;
    return existing.save();
  }

  return new EnglishProgress({
    lessonId,
    score,
    totalQ,
    attempts: 1,
    bestScore: score,
    lastPractice: now,
    createdAt: now
  }).save();
}

async function resetProgress(lessonId) {
  await EnglishProgress.deleteOne({ lessonId });
  return { success: true };
}

// ===== Mindmap =====

function normalizeMindmapTree(tree) {
  if (!tree || typeof tree !== 'object') return DEFAULT_MINDMAP;
  if (!tree.id || !tree.title) return DEFAULT_MINDMAP;
  return tree;
}

async function getMindmap() {
  const doc = await EnglishMindmap.findOne().lean();
  if (!doc) {
    return { title: DEFAULT_MINDMAP.title, tree: DEFAULT_MINDMAP };
  }
  return { title: doc.title || DEFAULT_MINDMAP.title, tree: normalizeMindmapTree(doc.tree) };
}

async function saveMindmap({ title, tree }) {
  const now = new Date().toISOString();
  const payload = {
    title: String(title || DEFAULT_MINDMAP.title).trim() || DEFAULT_MINDMAP.title,
    tree: normalizeMindmapTree(tree)
  };

  const doc = await EnglishMindmap.findOne();
  if (!doc) {
    return new EnglishMindmap({
      title: payload.title,
      tree: payload.tree,
      createdAt: now,
      updatedAt: now
    }).save();
  }

  doc.title = payload.title;
  doc.tree = payload.tree;
  doc.updatedAt = now;
  return doc.save();
}

// ===== Vocabulary =====

async function getAllVocab({ search, category, level, mastered, limit } = {}) {
  const filter = {};
  if (search) filter.$or = [
    { word: { $regex: search, $options: 'i' } },
    { meaning: { $regex: search, $options: 'i' } }
  ];
  if (category) filter.category = category;
  if (level) filter.level = level;
  if (mastered !== undefined) filter.mastered = mastered === 'true' || mastered === true;
  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 500, 2000));
  const vocabs = await Vocab.find(filter).sort({ createdAt: -1 }).limit(safeLimit).lean();
  return vocabs.map(v => ({ ...v, id: v._id.toString() }));
}

async function createVocab({ word, meaning, example, phonetic, category, level }) {
  const now = new Date().toISOString();
  return new Vocab({
    word: word.trim(),
    meaning: meaning.trim(),
    example: example || '',
    phonetic: phonetic || '',
    category: category || 'general',
    level: level || 'beginner',
    createdAt: now
  }).save();
}

function mapCefrToAppLevel(cefr) {
  const normalized = String(cefr || '').toUpperCase();
  if (normalized === 'A1' || normalized === 'A2') return 'beginner';
  if (normalized === 'B1') return 'intermediate';
  if (normalized === 'B2') return 'advanced';
  return 'beginner';
}

function decodeHtmlEntities(input) {
  if (!input) return '';
  return String(input)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function normalizeWord(word) {
  return String(word || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyEnglishWord(word) {
  return /^[a-zA-Z][a-zA-Z\-'. ]{0,39}$/.test(word) && word.split(' ').length <= 4;
}

function parseOxfordWordsFromHtml(html) {
  const words = [];
  const seen = new Set();
  const anchorRegex = /<a[^>]+href="[^"]*\/definition\/american_english\/[^"/][^"]*"[^>]*title="[^"]* definition"[^>]*>([^<]+)<\/a>/gi;
  let match;

  while ((match = anchorRegex.exec(html)) !== null) {
    const rawWord = decodeHtmlEntities(match[1]).replace(/\s+/g, ' ').trim();
    if (!rawWord || !isLikelyEnglishWord(rawWord)) continue;

    const probe = html.slice(match.index, Math.min(match.index + 360, html.length));
    const cefrMatch = probe.match(/\b(A1|A2|B1|B2)\b/);
    const cefr = cefrMatch ? cefrMatch[1] : 'A1';
    const key = normalizeWord(rawWord);
    if (seen.has(key)) continue;

    seen.add(key);
    words.push({
      word: rawWord,
      cefr,
      level: mapCefrToAppLevel(cefr),
      category: 'oxford3000'
    });
  }

  return words;
}

function parseSimpleWordLines(text) {
  const seen = new Set();
  const words = [];
  const lines = String(text || '').split(/\r?\n/);

  for (const line of lines) {
    const word = String(line || '').trim().toLowerCase();
    if (!word || !isLikelyEnglishWord(word)) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    words.push(word);
  }

  return words;
}

function parseFrequencyWords(text) {
  const seen = new Set();
  const words = [];
  const lines = String(text || '').split(/\r?\n/);

  for (const line of lines) {
    const cols = String(line || '').trim().split(/\s+/);
    if (!cols.length) continue;
    const word = String(cols[0] || '').toLowerCase();
    if (!word || !isLikelyEnglishWord(word)) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    words.push(word);
  }

  return words;
}

function getExternalSourceList() {
  return [
    { id: 'oxford', label: 'Oxford 3000 (American English)' },
    ...Object.entries(EXTERNAL_VOCAB_SOURCES).map(([id, cfg]) => ({ id, label: cfg.label }))
  ];
}

function sliceWithOffset(items = [], offset = 0, limit = 80) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return [];

  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 80, list.length));
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0) % list.length;

  const end = safeOffset + safeLimit;
  if (end <= list.length) {
    return list.slice(safeOffset, end);
  }

  const first = list.slice(safeOffset);
  const remain = safeLimit - first.length;
  return first.concat(list.slice(0, remain));
}

async function getExternalSourceWords({ source = 'google10000', level, limit = 80, offset = 0, refresh = false } = {}) {
  if (!EXTERNAL_VOCAB_SOURCES[source]) {
    throw new Error('Nguồn từ vựng không hợp lệ');
  }

  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 80, 300));
  const requestedLevel = level ? String(level).toUpperCase() : '';
  const cache = externalSourceCache[source];
  const now = Date.now();

  let baseWords = cache.words;
  if (refresh || !baseWords.length || (now - cache.fetchedAt) >= EXTERNAL_SOURCE_TTL_MS) {
    const res = await fetch(EXTERNAL_VOCAB_SOURCES[source].url, {
      headers: { 'User-Agent': 'TaskFlow/1.0' }
    });
    if (!res.ok) {
      throw new Error(`Không tải được nguồn ${EXTERNAL_VOCAB_SOURCES[source].label} (HTTP ${res.status})`);
    }

    const text = await res.text();
    baseWords = source === 'frequency50k' ? parseFrequencyWords(text) : parseSimpleWordLines(text);
    if (!baseWords.length) {
      throw new Error(`Không đọc được dữ liệu từ nguồn ${EXTERNAL_VOCAB_SOURCES[source].label}`);
    }

    externalSourceCache[source] = { fetchedAt: now, words: baseWords };
  }

  let candidateWords = baseWords;
  if (requestedLevel && EXTERNAL_LEVEL_RANGES[requestedLevel]) {
    const [start, end] = EXTERNAL_LEVEL_RANGES[requestedLevel];
    candidateWords = baseWords.slice(start, Math.min(end, baseWords.length));
  }

  return sliceWithOffset(candidateWords, offset, safeLimit).map(word => ({
    word,
    cefr: requestedLevel,
    level: requestedLevel ? mapCefrToAppLevel(requestedLevel) : 'beginner',
    category: source
  }));
}

async function getWordSourceWords({ source = 'oxford', level, limit = 80, offset = 0, refresh = false } = {}) {
  const normalized = String(source || 'oxford').toLowerCase();
  if (normalized === 'oxford') {
    return getOxford3000Words({ level, limit, offset, refresh });
  }
  return getExternalSourceWords({ source: normalized, level, limit, offset, refresh });
}

async function getOxford3000Words({ level, limit = 80, offset = 0, refresh = false } = {}) {
  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 80, 300));
  const requestedLevel = level ? String(level).toUpperCase() : '';
  const now = Date.now();

  if (!refresh && oxfordCache.words.length > 0 && (now - oxfordCache.fetchedAt) < OXFORD_CACHE_TTL_MS) {
    const cached = sliceWithOffset(oxfordCache.words, offset, safeLimit);
    if (!requestedLevel) return cached;
    return cached.map(w => ({
      ...w,
      cefr: requestedLevel,
      level: mapCefrToAppLevel(requestedLevel)
    }));
  }

  const res = await fetch(OXFORD_3000_URL, {
    headers: {
      'User-Agent': 'TaskFlow/1.0 (+https://www.oxfordlearnersdictionaries.com/)'
    }
  });

  if (!res.ok) {
    throw new Error(`Không tải được Oxford 3000 (HTTP ${res.status})`);
  }

  const html = await res.text();
  const parsedWords = parseOxfordWordsFromHtml(html);
  if (parsedWords.length === 0) {
    throw new Error('Không parse được danh sách Oxford 3000 từ nguồn đã cung cấp');
  }

  oxfordCache = {
    fetchedAt: now,
    words: parsedWords
  };

  const base = sliceWithOffset(parsedWords, offset, safeLimit);
  if (!requestedLevel) return base;
  return base.map(w => ({
    ...w,
    cefr: requestedLevel,
    level: mapCefrToAppLevel(requestedLevel)
  }));
}

async function importOxfordWords(words = []) {
  if (!Array.isArray(words) || words.length === 0) {
    return { imported: 0, skipped: 0, reason: 'empty' };
  }

  const now = new Date().toISOString();
  const existing = await Vocab.find({}, { word: 1 });
  const existingSet = new Set(existing.map(v => normalizeWord(v.word)));

  const uniqueIncoming = [];
  const incomingSet = new Set();

  for (const item of words) {
    const word = decodeHtmlEntities(item.word || '').replace(/\s+/g, ' ').trim();
    if (!word || !isLikelyEnglishWord(word)) continue;

    const key = normalizeWord(word);
    if (incomingSet.has(key)) continue;
    incomingSet.add(key);

    uniqueIncoming.push({
      word,
      cefr: String(item.cefr || '').toUpperCase(),
      level: item.level || mapCefrToAppLevel(item.cefr),
      meaning: item.meaning,
      phonetic: item.phonetic,
      example: item.example,
      category: item.category
    });
  }

  const docs = uniqueIncoming
    .filter(item => !existingSet.has(normalizeWord(item.word)))
    .map(item => ({
      word: item.word,
      meaning: String(item.meaning || '').trim() || (item.cefr
        ? `[Oxford ${item.cefr}] Tu trong Oxford 3000. Bo sung nghia sau.`
        : '[Oxford 3000] Tu trong Oxford 3000. Bo sung nghia sau.'),
      example: String(item.example || '').trim(),
      phonetic: String(item.phonetic || '').trim(),
      category: String(item.category || '').trim() || 'oxford3000',
      level: ['beginner', 'intermediate', 'advanced'].includes(item.level) ? item.level : 'beginner',
      mastered: false,
      reviewCount: 0,
      nextReview: '',
      easeFactor: 2.5,
      interval: 0,
      repetition: 0,
      createdAt: now
    }));

  if (docs.length > 0) {
    await Vocab.insertMany(docs);
  }

  return {
    imported: docs.length,
    skipped: uniqueIncoming.length - docs.length
  };
}

async function updateVocab(id, data) {
  const update = {};
  if (data.word !== undefined) update.word = data.word.trim();
  if (data.meaning !== undefined) update.meaning = data.meaning.trim();
  if (data.example !== undefined) update.example = data.example;
  if (data.phonetic !== undefined) update.phonetic = data.phonetic;
  if (data.category !== undefined) update.category = data.category;
  if (data.level !== undefined) update.level = data.level;
  if (data.mastered !== undefined) update.mastered = data.mastered;
  if (data.reviewCount !== undefined) update.reviewCount = data.reviewCount;
  if (data.nextReview !== undefined) update.nextReview = data.nextReview;
  return Vocab.findByIdAndUpdate(id, update, { new: true });
}

async function toggleMastered(id) {
  const vocab = await Vocab.findById(id);
  if (!vocab) return null;
  vocab.mastered = !vocab.mastered;
  vocab.reviewCount += 1;
  return vocab.save();
}

async function deleteVocab(id) {
  await Vocab.findByIdAndDelete(id);
  return { success: true };
}

async function getVocabStats() {
  const [total, mastered, byLevelAgg, byCatAgg] = await Promise.all([
    Vocab.countDocuments(),
    Vocab.countDocuments({ mastered: true }),
    Vocab.aggregate([
      { $group: { _id: '$level', count: { $sum: 1 } } }
    ]),
    Vocab.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ])
  ]);
  const byLevel = { beginner: 0, intermediate: 0, advanced: 0 };
  byLevelAgg.forEach(item => {
    if (item._id && byLevel[item._id] !== undefined) byLevel[item._id] = item.count;
  });
  const byCategory = {};
  byCatAgg.forEach(item => {
    if (item._id) byCategory[item._id] = item.count;
  });
  return { total, mastered, learning: total - mastered, byLevel, byCategory };
}

async function getStats() {
  // Run getProgress and getVocabStats in parallel for efficiency
  const [progress, vocabStats] = await Promise.all([
    getProgress(),
    getVocabStats()
  ]);
  const totalLessons = progress.length;
  const totalAttempts = progress.reduce((s, p) => s + p.attempts, 0);
  const avgScore = totalLessons > 0
    ? Math.round(progress.reduce((s, p) => s + (p.bestScore / p.totalQ) * 100, 0) / totalLessons)
    : 0;

  return {
    lessons: { total: totalLessons, attempts: totalAttempts, avgScore },
    vocab: vocabStats,
    progress: progress
  };
}

// ===== Spaced Repetition (SM-2 Algorithm) =====

async function getDueForReview() {
  const now = new Date().toISOString().split('T')[0];
  // Get words that are due for review (nextReview <= today or never reviewed)
  const words = await Vocab.find({
    mastered: false,
    $or: [
      { nextReview: '' },
      { nextReview: { $exists: false } },
      { nextReview: { $lte: now } }
    ]
  }).sort({ nextReview: 1, createdAt: -1 }).limit(20);
  return words;
}

async function processReview(id, quality) {
  // SM-2 Algorithm: quality 0-5
  // 0: complete blackout
  // 1: incorrect, remembered upon seeing answer
  // 2: incorrect, but answer seemed easy to recall
  // 3: correct with serious difficulty
  // 4: correct after hesitation
  // 5: perfect response
  const vocab = await Vocab.findById(id);
  if (!vocab) return null;

  let { easeFactor, interval, repetition } = vocab;
  easeFactor = easeFactor || 2.5;
  interval = interval || 0;
  repetition = repetition || 0;

  if (quality >= 3) {
    // Correct response
    if (repetition === 0) interval = 1;
    else if (repetition === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetition += 1;
  } else {
    // Incorrect response - reset
    repetition = 0;
    interval = 1;
  }

  // Update ease factor: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  // Calculate next review date
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  const nextReview = nextDate.toISOString().split('T')[0];

  vocab.easeFactor = easeFactor;
  vocab.interval = interval;
  vocab.repetition = repetition;
  vocab.nextReview = nextReview;
  vocab.reviewCount = (vocab.reviewCount || 0) + 1;

  // Mark as mastered if interval > 21 days and quality consistently >= 4
  if (interval > 21 && quality >= 4) {
    vocab.mastered = true;
  }

  return vocab.save();
}

// ===== Import Vocab from CSV =====

async function importVocab(vocabArray) {
  const now = new Date().toISOString();
  const docs = vocabArray.map(v => ({
    word: (v.word || '').trim(),
    meaning: (v.meaning || '').trim(),
    example: (v.example || '').trim(),
    phonetic: (v.phonetic || '').trim(),
    category: (v.category || 'general').trim(),
    level: ['beginner', 'intermediate', 'advanced'].includes(v.level) ? v.level : 'beginner',
    mastered: false,
    reviewCount: 0,
    nextReview: '',
    easeFactor: 2.5,
    interval: 0,
    repetition: 0,
    createdAt: now
  })).filter(v => v.word && v.meaning);

  if (docs.length === 0) return { imported: 0, skipped: vocabArray.length };
  const result = await Vocab.insertMany(docs);
  return { imported: result.length, skipped: vocabArray.length - docs.length };
}

// ===== Word of the Day =====

async function getWordOfDay() {
  const today = new Date().toISOString().split('T')[0];
  const count = await Vocab.countDocuments({ mastered: false });
  const seed = today.split('-').reduce((s, n) => s + parseInt(n, 10), 0);
  if (count > 0) {
    const word = await Vocab.findOne({ mastered: false }).skip(seed % count).lean();
    if (word) return { ...word, id: word._id.toString() };
  }
  const totalAny = await Vocab.countDocuments();
  if (totalAny === 0) return null;
  const word = await Vocab.findOne().skip(seed % totalAny).lean();
  return word ? { ...word, id: word._id.toString() } : null;
}

// ===== Study Streak =====

async function getStreak() {
  // Count consecutive days with at least 1 review
  const [reviews, progress] = await Promise.all([
    Vocab.find({ reviewCount: { $gt: 0 } }).select('createdAt').lean(),
    EnglishProgress.find().select('createdAt lastPractice').lean()
  ]);

  // Collect all activity dates
  const dateSet = new Set();
  reviews.forEach(v => {
    if (v.nextReview) {
      // nextReview is future, but we can infer past activity from interval
      // Use createdAt as a proxy
    }
    if (v.createdAt) dateSet.add(v.createdAt.split('T')[0]);
  });
  progress.forEach(p => {
    if (p.lastPractice) dateSet.add(p.lastPractice.split('T')[0]);
    if (p.createdAt) dateSet.add(p.createdAt.split('T')[0]);
  });

  if (dateSet.size === 0) return { streak: 0, totalDays: 0 };

  const sortedDates = Array.from(dateSet).sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Streak must include today or yesterday
  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
    return { streak: 0, totalDays: dateSet.size };
  }

  let streak = 1;
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const curr = new Date(sortedDates[i]);
    const prev = new Date(sortedDates[i + 1]);
    const diff = (curr - prev) / 86400000;
    if (diff === 1) streak++;
    else break;
  }

  return { streak, totalDays: dateSet.size };
}

module.exports = {
  getProgress,
  saveProgress,
  resetProgress,
  getAllVocab,
  createVocab,
  updateVocab,
  toggleMastered,
  deleteVocab,
  getVocabStats,
  getStats,
  getDueForReview,
  processReview,
  importVocab,
  getExternalSourceList,
  getWordSourceWords,
  getOxford3000Words,
  importOxfordWords,
  getWordOfDay,
  getStreak,
  getMindmap,
  saveMindmap
};
