// ==================== REQUEST VALIDATION MIDDLEWARE ====================
// Lightweight Zod-like validator without external dependencies

/**
 * Validate request body against a schema
 * @param {object} schema - { field: { type, required, min, max, enum, pattern, default } }
 */
function validate(schema) {
  return (req, res, next) => {
    const errors = [];
    const cleaned = {};

    for (const [field, rules] of Object.entries(schema)) {
      let value = req.body[field];

      // Apply default if undefined
      if (value === undefined && rules.default !== undefined) {
        value = typeof rules.default === 'function' ? rules.default() : rules.default;
      }

      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`'${field}' là bắt buộc`);
        continue;
      }

      // Skip optional empty fields
      if (value === undefined || value === null) {
        if (rules.default !== undefined) cleaned[field] = typeof rules.default === 'function' ? rules.default() : rules.default;
        continue;
      }

      // Type check
      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push(`'${field}' phải là chuỗi`);
        continue;
      }
      if (rules.type === 'number') {
        value = Number(value);
        if (isNaN(value)) { errors.push(`'${field}' phải là số`); continue; }
      }
      if (rules.type === 'boolean') {
        value = Boolean(value);
      }
      if (rules.type === 'array' && !Array.isArray(value)) {
        errors.push(`'${field}' phải là mảng`);
        continue;
      }

      // String constraints
      if (typeof value === 'string') {
        value = value.trim();
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`'${field}' phải có ít nhất ${rules.minLength} ký tự`);
          continue;
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`'${field}' tối đa ${rules.maxLength} ký tự`);
          continue;
        }
      }

      // Number constraints
      if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`'${field}' phải >= ${rules.min}`);
          continue;
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`'${field}' phải <= ${rules.max}`);
          continue;
        }
      }

      // Enum check
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`'${field}' phải là một trong: ${rules.enum.join(', ')}`);
        continue;
      }

      cleaned[field] = value;
    }

    if (errors.length) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ', details: errors });
    }

    // Merge cleaned data back (keep original fields not in schema)
    req.body = { ...req.body, ...cleaned };
    next();
  };
}

// ==================== Common Schemas ====================

const todoSchema = {
  title: { type: 'string', required: true, minLength: 1, maxLength: 500 },
  description: { type: 'string', maxLength: 5000, default: '' },
  priority: { type: 'string', enum: ['none', 'low', 'medium', 'high'], default: 'none' },
  recurrence: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' }
};

const noteSchema = {
  title: { type: 'string', required: true, minLength: 1, maxLength: 500 },
  content: { type: 'string', maxLength: 50000, default: '' },
  type: { type: 'string', enum: ['note', 'link', 'image'], default: 'note' }
};

const vocabSchema = {
  word: { type: 'string', required: true, minLength: 1, maxLength: 200 },
  meaning: { type: 'string', required: true, minLength: 1, maxLength: 1000 },
  level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' }
};

const tradeSchema = {
  symbol: { type: 'string', required: true, minLength: 1, maxLength: 50 },
  type: { type: 'string', required: true, enum: ['buy', 'sell', 'long', 'short'] },
  entryPrice: { type: 'number', required: true, min: 0 },
  quantity: { type: 'number', required: true, min: 0 },
  market: { type: 'string', enum: ['crypto', 'forex', 'stock', 'futures', 'options'], default: 'crypto' },
  emotion: { type: 'string', enum: ['confident', 'neutral', 'fearful', 'greedy', 'fomo', 'revenge'], default: 'neutral' },
  rating: { type: 'number', min: 0, max: 5, default: 0 }
};

const habitSchema = {
  name: { type: 'string', required: true, minLength: 1, maxLength: 200 }
};

const reviewSchema = {
  quality: { type: 'number', required: true, min: 0, max: 5 }
};

module.exports = {
  validate,
  schemas: { todoSchema, noteSchema, vocabSchema, tradeSchema, habitSchema, reviewSchema }
};
