const { EnglishProgress, Vocab } = require('../config/database');

// ==================== ENGLISH SERVICE ====================

// ===== Progress =====

async function getProgress() {
  return EnglishProgress.find().sort({ lessonId: 1 });
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

// ===== Vocabulary =====

async function getAllVocab({ search, category, level, mastered } = {}) {
  const filter = {};
  if (search) filter.$or = [
    { word: { $regex: search, $options: 'i' } },
    { meaning: { $regex: search, $options: 'i' } }
  ];
  if (category) filter.category = category;
  if (level) filter.level = level;
  if (mastered !== undefined) filter.mastered = mastered === 'true' || mastered === true;
  return Vocab.find(filter).sort({ createdAt: -1 });
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
  const all = await Vocab.find();
  const total = all.length;
  const mastered = all.filter(v => v.mastered).length;
  const byLevel = { beginner: 0, intermediate: 0, advanced: 0 };
  const byCategory = {};
  all.forEach(v => {
    byLevel[v.level] = (byLevel[v.level] || 0) + 1;
    byCategory[v.category] = (byCategory[v.category] || 0) + 1;
  });
  return { total, mastered, learning: total - mastered, byLevel, byCategory };
}

async function getStats() {
  const progress = await getProgress();
  const vocabStats = await getVocabStats();
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
  // Use date as seed for consistent daily word
  const today = new Date().toISOString().split('T')[0];
  const all = await Vocab.find({ mastered: false });
  if (all.length === 0) {
    const any = await Vocab.find();
    if (any.length === 0) return null;
    const seed = today.split('-').reduce((s, n) => s + parseInt(n), 0);
    return any[seed % any.length];
  }
  const seed = today.split('-').reduce((s, n) => s + parseInt(n), 0);
  return all[seed % all.length];
}

// ===== Study Streak =====

async function getStreak() {
  // Count consecutive days with at least 1 review
  const reviews = await Vocab.find({ reviewCount: { $gt: 0 } });
  const progress = await EnglishProgress.find();

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
  getWordOfDay,
  getStreak
};
