const mongoose = require('mongoose');

// ==================== MONGODB CONFIG ====================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/TaskFlowDB';

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`✅ Đã kết nối MongoDB: ${MONGO_URI}`);
  } catch (err) {
    console.error('❌ Lỗi kết nối MongoDB:', err.message);
    throw err;
  }
}

// ==================== SCHEMAS ====================

const todoSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  completed:   { type: Boolean, default: false },
  priority:    { type: String, default: 'none', enum: ['none', 'low', 'medium', 'high'] },
  deadline:    { type: String, default: null },
  completedAt: { type: String, default: null },
  createdAt:   { type: String, required: true },
  order:       { type: Number, default: 0 },
  recurrence:  { type: String, default: 'none', enum: ['none', 'daily', 'weekly', 'monthly'] },
  project:     { type: String, default: '' },
  tags:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  subtasks:    [{ 
    title:     { type: String, required: true },
    completed: { type: Boolean, default: false }
  }]
});

// Virtual "id" trả về _id dạng string
todoSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : undefined;
    if (ret.subtasks) {
      ret.subtasks = ret.subtasks.map(s => ({
        id: s._id.toString(),
        title: s.title,
        completed: s.completed
      }));
    }
    if (ret.order === undefined) ret.order = 0;
    if (ret.recurrence === undefined) ret.recurrence = 'none';
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const tagSchema = new mongoose.Schema({
  name:  { type: String, required: true, unique: true },
  color: { type: String, default: '#78716c' }
});

tagSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : undefined;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// ==================== HABIT TRACKER SCHEMAS ====================

const habitSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  icon:      { type: String, default: '✅' },
  color:     { type: String, default: '#7c7268' },
  order:     { type: Number, default: 0 },
  archived:  { type: Boolean, default: false },
  createdAt: { type: String, required: true }
});

habitSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : undefined;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const habitLogSchema = new mongoose.Schema({
  habitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', required: true },
  date:    { type: String, required: true }, // YYYY-MM-DD
  done:    { type: Boolean, default: true }
});

habitLogSchema.index({ habitId: 1, date: 1 }, { unique: true });

habitLogSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.habitId = ret.habitId.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// ==================== SECOND BRAIN SCHEMAS ====================

const noteSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  content:     { type: String, default: '' },
  url:         { type: String, default: '' },
  type:        { type: String, default: 'note', enum: ['note', 'link', 'image'] },
  category:    { type: String, default: '' },
  tags:        [{ type: String }],
  pinned:      { type: Boolean, default: false },
  archived:    { type: Boolean, default: false },
  color:       { type: String, default: '' },
  favicon:     { type: String, default: '' },
  createdAt:   { type: String, required: true },
  updatedAt:   { type: String, required: true }
});

noteSchema.index({ title: 'text', content: 'text', tags: 'text' });

noteSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// ==================== ENGLISH LEARNING SCHEMAS ====================

const englishProgressSchema = new mongoose.Schema({
  lessonId:    { type: String, required: true },
  score:       { type: Number, default: 0 },
  totalQ:      { type: Number, default: 0 },
  attempts:    { type: Number, default: 0 },
  bestScore:   { type: Number, default: 0 },
  lastPractice:{ type: String, default: '' },
  createdAt:   { type: String, required: true }
});

englishProgressSchema.index({ lessonId: 1 }, { unique: true });

englishProgressSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const vocabSchema = new mongoose.Schema({
  word:        { type: String, required: true },
  meaning:     { type: String, required: true },
  example:     { type: String, default: '' },
  phonetic:    { type: String, default: '' },
  category:    { type: String, default: 'general' },
  level:       { type: String, default: 'beginner', enum: ['beginner', 'intermediate', 'advanced'] },
  mastered:    { type: Boolean, default: false },
  reviewCount: { type: Number, default: 0 },
  nextReview:  { type: String, default: '' },
  // SM-2 Spaced Repetition fields
  easeFactor:  { type: Number, default: 2.5 },
  interval:    { type: Number, default: 0 },
  repetition:  { type: Number, default: 0 },
  createdAt:   { type: String, required: true }
});

vocabSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// ==================== TRADING SCHEMAS ====================

const tradeSchema = new mongoose.Schema({
  symbol:       { type: String, required: true },             // BTC/USDT, AAPL, EUR/USD
  type:         { type: String, required: true, enum: ['buy', 'sell', 'long', 'short'] },
  status:       { type: String, default: 'open', enum: ['open', 'closed', 'cancelled'] },
  entryPrice:   { type: Number, required: true },
  exitPrice:    { type: Number, default: null },
  quantity:     { type: Number, required: true },
  leverage:     { type: Number, default: 1 },
  stopLoss:     { type: Number, default: null },
  takeProfit:   { type: Number, default: null },
  fees:         { type: Number, default: 0 },
  pnl:          { type: Number, default: 0 },
  pnlPercent:   { type: Number, default: 0 },
  strategy:     { type: String, default: '' },
  exchange:     { type: String, default: '' },                // Binance, Bybit, MetaTrader
  market:       { type: String, default: 'crypto', enum: ['crypto', 'forex', 'stock', 'futures', 'options'] },
  timeframe:    { type: String, default: '' },                // 1m, 5m, 1h, 4h, 1d
  setup:        { type: String, default: '' },                // Trade setup description
  notes:        { type: String, default: '' },
  tags:         [{ type: String }],
  emotion:      { type: String, default: 'neutral', enum: ['confident', 'neutral', 'fearful', 'greedy', 'fomo', 'revenge'] },
  rating:       { type: Number, default: 0, min: 0, max: 5 },
  screenshot:   { type: String, default: '' },
  entryDate:    { type: String, required: true },
  exitDate:     { type: String, default: null },
  createdAt:    { type: String, required: true },
  updatedAt:    { type: String, required: true }
});

tradeSchema.index({ symbol: 1, status: 1 });
tradeSchema.index({ entryDate: -1 });
tradeSchema.index({ market: 1 });
tradeSchema.index({ strategy: 'text', notes: 'text', symbol: 'text' });

tradeSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const tradingAccountSchema = new mongoose.Schema({
  name:         { type: String, required: true },             // Account name
  exchange:     { type: String, default: '' },
  balance:      { type: Number, default: 0 },
  initialBalance: { type: Number, default: 0 },
  currency:     { type: String, default: 'USDT' },
  isDefault:    { type: Boolean, default: false },
  notes:        { type: String, default: '' },
  createdAt:    { type: String, required: true },
  updatedAt:    { type: String, required: true }
});

tradingAccountSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Todo = mongoose.model('Todo', todoSchema);
const Tag  = mongoose.model('Tag', tagSchema);
const Habit = mongoose.model('Habit', habitSchema);
const HabitLog = mongoose.model('HabitLog', habitLogSchema);
const Note = mongoose.model('Note', noteSchema);

// ==================== NOTE VERSION ====================
const noteVersionSchema = new mongoose.Schema({
  noteId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true },
  title:     { type: String, required: true },
  content:   { type: String, default: '' },
  url:       { type: String, default: '' },
  category:  { type: String, default: '' },
  tags:      [{ type: String }],
  savedAt:   { type: String, required: true }
});
noteVersionSchema.set('toJSON', {
  virtuals: true, transform: (_, ret) => { ret.id = ret._id.toString(); delete ret._id; delete ret.__v; return ret; }
});
const NoteVersion = mongoose.model('NoteVersion', noteVersionSchema);

const EnglishProgress = mongoose.model('EnglishProgress', englishProgressSchema);
const Vocab = mongoose.model('Vocab', vocabSchema);
const Trade = mongoose.model('Trade', tradeSchema);
const TradingAccount = mongoose.model('TradingAccount', tradingAccountSchema);

module.exports = { connectDB, Todo, Tag, Habit, HabitLog, Note, NoteVersion, EnglishProgress, Vocab, Trade, TradingAccount, mongoose };


