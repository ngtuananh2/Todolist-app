const { JournalEntry } = require('../config/database');
const { getOwnerId } = require('../middleware/ownership');

function serializeEntry(entry) {
  if (!entry) return null;
  return {
    id: entry._id.toString(),
    type: entry.type,
    date: entry.date,
    weight: entry.weight,
    title: entry.title,
    content: entry.content,
    status: entry.status,
    category: entry.category,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  };
}

function getMonthBounds(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, '0')}`
  };
}

async function getEntries(month) {
  const { start, end } = getMonthBounds(month);
  const [weights, memories, wishlist] = await Promise.all([
    JournalEntry.find({ type: 'weight', date: { $gte: start, $lte: end } }).sort({ date: 1 }).lean(),
    JournalEntry.find({ type: 'memory', date: { $gte: start, $lte: end } }).sort({ date: -1, createdAt: -1 }).lean(),
    JournalEntry.find({ type: 'wishlist' }).sort({ status: 1, createdAt: -1 }).lean()
  ]);
  return {
    weights: weights.map(serializeEntry),
    memories: memories.map(serializeEntry),
    wishlist: wishlist.map(serializeEntry)
  };
}

async function createEntry(data) {
  const now = new Date().toISOString();
  if (data.type === 'weight') {
    const update = {
      $set: { weight: data.weight, content: data.content, updatedAt: now },
      $setOnInsert: {
        type: 'weight',
        date: data.date,
        title: '',
        status: 'want',
        category: '',
        createdAt: now,
        ownerId: getOwnerId()
      }
    };

    try {
      const entry = await JournalEntry.findOneAndUpdate(
        { type: 'weight', date: data.date },
        update,
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      ).lean();
      return serializeEntry(entry);
    } catch (error) {
      if (error.code !== 11000) throw error;
      const entry = await JournalEntry.findOneAndUpdate(
        { type: 'weight', date: data.date },
        { $set: { weight: data.weight, content: data.content, updatedAt: now } },
        { new: true, runValidators: true }
      ).lean();
      if (!entry) throw error;
      return serializeEntry(entry);
    }
  }

  const entry = await JournalEntry.create({
    ...data,
    createdAt: now,
    updatedAt: now
  });
  return serializeEntry(entry);
}

async function updateEntry(id, data) {
  const existing = await JournalEntry.findById(id);
  if (!existing || existing.type !== data.type || existing.type === 'weight') return null;

  const update = { updatedAt: new Date().toISOString() };
  if (existing.type === 'memory') {
    update.date = data.date;
    update.title = data.title;
    update.content = data.content;
  } else {
    update.title = data.title;
    update.content = data.content;
    update.status = data.status;
    update.category = data.category;
  }

  const entry = await JournalEntry.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true
  });
  return serializeEntry(entry);
}

async function deleteEntry(id) {
  const entry = await JournalEntry.findByIdAndDelete(id);
  return Boolean(entry);
}

module.exports = { getEntries, createEntry, updateEntry, deleteEntry };
