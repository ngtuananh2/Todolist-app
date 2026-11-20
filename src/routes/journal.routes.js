const { Router } = require('express');
const journalService = require('../services/journal.service');

const router = Router();

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isValidMonth(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12;
}

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function readText(value, label, maxLength, required = false) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string') throw invalid(`${label} phải là văn bản`);
  const text = value.trim();
  if (required && !text) throw invalid(`${label} không được để trống`);
  if (text.length > maxLength) throw invalid(`${label} tối đa ${maxLength} ký tự`);
  return text;
}

function normalizeEntry(body, isUpdate = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw invalid('Dữ liệu ghi chép không hợp lệ');
  }

  if (body.type === 'weight') {
    if (isUpdate) throw invalid('Hãy lưu cân nặng theo ngày để cập nhật bản ghi');
    const weight = body.weight === '' || body.weight === null ? NaN : Number(body.weight);
    if (!isValidDate(body.date)) throw invalid('Ngày cân nặng không hợp lệ');
    if (!Number.isFinite(weight) || weight < 1 || weight > 500) {
      throw invalid('Cân nặng phải nằm trong khoảng 1 đến 500 kg');
    }
    return {
      type: 'weight',
      date: body.date,
      weight,
      content: readText(body.content, 'Ghi chú', 500)
    };
  }

  if (body.type === 'memory') {
    if (!isValidDate(body.date)) throw invalid('Ngày đáng nhớ không hợp lệ');
    return {
      type: 'memory',
      date: body.date,
      title: readText(body.title, 'Tiêu đề', 160, true),
      content: readText(body.content, 'Nội dung', 5000)
    };
  }

  if (body.type === 'wishlist') {
    const status = body.status === undefined ? 'want' : body.status;
    if (!['want', 'in-progress', 'done'].includes(status)) {
      throw invalid('Trạng thái wishlist không hợp lệ');
    }
    return {
      type: 'wishlist',
      title: readText(body.title, 'Tên mong muốn', 160, true),
      content: readText(body.content, 'Ghi chú', 5000),
      category: readText(body.category, 'Danh mục', 60),
      status
    };
  }

  throw invalid('Loại ghi chép không được hỗ trợ');
}

router.get('/', async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!isValidMonth(month)) return res.status(400).json({ error: 'Tháng không hợp lệ' });
    res.json(await journalService.getEntries(month));
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const entry = await journalService.createEntry(normalizeEntry(req.body));
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ error: 'Mã ghi chép không hợp lệ' });
    }
    const data = normalizeEntry(req.body, true);
    const entry = await journalService.updateEntry(req.params.id, data);
    if (!entry) return res.status(404).json({ error: 'Không tìm thấy ghi chép' });
    res.json(entry);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ error: 'Mã ghi chép không hợp lệ' });
    }
    const deleted = await journalService.deleteEntry(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy ghi chép' });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
