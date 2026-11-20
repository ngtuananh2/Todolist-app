const crypto = require('node:crypto');

const SOURCES = {
  binance_futures: { exchange: 'Binance', market: 'futures' },
  bybit: { exchange: 'Bybit', market: 'crypto' }
};
const MAX_CSV_BYTES = 4_500_000;
const MAX_ROWS = 5000;

function invalidCsv(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normalizeHeader(value) {
  return String(value || '')
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function countDelimiters(line) {
  let quoted = false;
  const counts = { ',': 0, ';': 0, '\t': 0 };
  for (let index = 0; index < line.length; index++) {
    if (line[index] === '"') {
      if (quoted && line[index + 1] === '"') index++;
      else quoted = !quoted;
    } else if (!quoted && Object.hasOwn(counts, line[index])) {
      counts[line[index]]++;
    }
  }
  return counts;
}

function detectDelimiter(csv) {
  const sample = csv.split(/\r?\n/).filter(line => line.trim()).slice(0, 10);
  const totals = { ',': 0, ';': 0, '\t': 0 };
  sample.forEach(line => {
    const counts = countDelimiters(line);
    Object.keys(totals).forEach(delimiter => {
      totals[delimiter] += counts[delimiter];
    });
  });
  return Object.keys(totals).sort((a, b) => totals[b] - totals[a])[0];
}

function parseCsvRows(csv, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index++) {
    const char = csv[index];
    if (quoted) {
      if (char === '"' && csv[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === '') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && csv[index + 1] === '\n') index++;
      row.push(field);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some(value => value.trim())) rows.push(row);
  if (quoted) throw invalidCsv('File CSV có dấu ngoặc kép chưa đóng');
  return rows;
}

function findColumn(headers, aliases) {
  const names = new Set(aliases.map(normalizeHeader));
  return headers.findIndex(header => names.has(normalizeHeader(header)));
}

function parseNumber(value, delimiter, rowNumber, label, { optional = false, absolute = false } = {}) {
  const input = String(value || '').trim();
  if (!input && optional) return 0;
  if (!input) throw invalidCsv(`Dòng ${rowNumber}: thiếu ${label}`);

  const negative = /^\(.*\)$/.test(input);
  let normalized = input.replace(/[()$\u20ac\u00a3\u00a5\s]/g, '');
  const comma = normalized.lastIndexOf(',');
  const dot = normalized.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    normalized = comma > dot
      ? normalized.replace(/\./g, '').replace(',', '.')
      : normalized.replace(/,/g, '');
  } else if (comma >= 0) {
    normalized = delimiter === ';' || delimiter === '\t'
      ? normalized.replace(',', '.')
      : normalized.replace(/,/g, '');
  }

  const number = Number(normalized) * (negative ? -1 : 1);
  if (!Number.isFinite(number)) throw invalidCsv(`Dòng ${rowNumber}: ${label} không phải số hợp lệ`);
  return absolute ? Math.abs(number) : number;
}

function parseTradeDate(value, rowNumber) {
  const input = String(value || '').trim();
  if (!input) throw invalidCsv(`Dòng ${rowNumber}: thiếu thời gian giao dịch`);

  let date;
  if (/^\d{10}$/.test(input)) {
    date = new Date(Number(input) * 1000);
  } else if (/^\d{13}$/.test(input)) {
    date = new Date(Number(input));
  } else {
    const isoLike = input.replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T');
    date = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(isoLike) ? isoLike : `${isoLike}Z`);
  }

  if (Number.isNaN(date.getTime())) throw invalidCsv(`Dòng ${rowNumber}: thời gian giao dịch không hợp lệ`);
  return date.toISOString();
}

function parseSide(sideValue, positionSideValue, rowNumber) {
  const positionSide = String(positionSideValue || '').trim().toLowerCase();
  if (positionSide === 'long' || positionSide === 'short') return positionSide;

  const side = String(sideValue || '').trim().toLowerCase();
  if (side === 'buy' || side === 'long' || side === 'buy/long') return side === 'buy' ? 'buy' : 'long';
  if (side === 'sell' || side === 'short' || side === 'sell/short') return side === 'sell' ? 'sell' : 'short';
  throw invalidCsv(`Dòng ${rowNumber}: không nhận diện được chiều giao dịch "${sideValue}"`);
}

function parseTradingCsv(csv, source) {
  if (!SOURCES[source]) throw invalidCsv('Chỉ hỗ trợ CSV Binance Futures Trade History và Bybit Trade History; không hỗ trợ MT5');
  if (typeof csv !== 'string' || !csv.trim()) throw invalidCsv('File CSV đang trống');
  if (Buffer.byteLength(csv, 'utf8') > MAX_CSV_BYTES) throw invalidCsv('File CSV vượt quá giới hạn 4.5 MB');

  const delimiter = detectDelimiter(csv);
  const rows = parseCsvRows(csv, delimiter);
  const aliases = {
    symbol: ['symbol', 'trading pair', 'pair', 'contract', 'instrument'],
    side: ['side', 'trade side', 'direction'],
    positionSide: ['position side'],
    price: ['price', 'trade price', 'execution price', 'executed price'],
    quantity: ['quantity', 'qty', 'trade quantity', 'trade qty', 'execution qty', 'executed qty', 'filled qty'],
    date: ['date(utc)', 'date utc', 'trading time', 'execution time', 'trade time', 'time', 'timestamp'],
    fee: ['fee', 'commission', 'trading fee', 'execution fee'],
    pnl: ['realized profit', 'realized pnl', 'realized p&l', 'realized p/l', 'closed pnl', 'closed p&l'],
    tradeId: ['trade id', 'tradeid', 'execution id', 'exec id'],
    orderId: ['order id', 'orderid']
  };
  const headerRowIndex = rows.findIndex(row => {
    const headers = row.map(normalizeHeader);
    const hasSymbol = findColumn(headers, aliases.symbol) >= 0;
    const hasSide = findColumn(headers, aliases.side) >= 0 || findColumn(headers, aliases.positionSide) >= 0;
    return hasSymbol && hasSide
      && findColumn(headers, aliases.price) >= 0
      && findColumn(headers, aliases.quantity) >= 0
      && findColumn(headers, aliases.date) >= 0;
  });
  if (headerRowIndex < 0) {
    throw invalidCsv('Không nhận diện được tiêu đề CSV. Hãy chọn file Binance Futures Trade History hoặc Bybit Trade History.');
  }

  const headers = rows[headerRowIndex].map(normalizeHeader);
  const columns = Object.fromEntries(Object.entries(aliases).map(([name, names]) => [
    name,
    findColumn(headers, names)
  ]));
  const sourceInfo = SOURCES[source];
  const identicalRows = new Map();
  const trades = [];
  const now = new Date().toISOString();

  for (let index = headerRowIndex + 1; index < rows.length; index++) {
    const row = rows[index];
    const rowNumber = index + 1;
    if (row.map(normalizeHeader).join(',') === headers.join(',')) continue;

    const symbol = String(row[columns.symbol] || '').trim().toUpperCase();
    if (!symbol) throw invalidCsv(`Dòng ${rowNumber}: thiếu mã giao dịch`);
    const type = parseSide(row[columns.side], columns.positionSide >= 0 ? row[columns.positionSide] : '', rowNumber);
    const entryPrice = parseNumber(row[columns.price], delimiter, rowNumber, 'giá');
    const quantity = parseNumber(row[columns.quantity], delimiter, rowNumber, 'khối lượng');
    const fees = columns.fee >= 0
      ? parseNumber(row[columns.fee], delimiter, rowNumber, 'phí', { optional: true, absolute: true })
      : 0;
    const pnl = columns.pnl >= 0
      ? parseNumber(row[columns.pnl], delimiter, rowNumber, 'P&L', { optional: true })
      : 0;
    if (entryPrice <= 0 || quantity <= 0) {
      throw invalidCsv(`Dòng ${rowNumber}: giá và khối lượng phải lớn hơn 0`);
    }

    const tradeDate = parseTradeDate(row[columns.date], rowNumber);
    const tradeId = columns.tradeId >= 0 ? String(row[columns.tradeId] || '').trim() : '';
    const orderId = columns.orderId >= 0 ? String(row[columns.orderId] || '').trim() : '';
    const signature = JSON.stringify([symbol, type, entryPrice, quantity, tradeDate, fees, pnl, orderId]);
    const occurrence = identicalRows.get(signature) || 0;
    identicalRows.set(signature, occurrence + 1);
    const importKey = crypto.createHash('sha256')
      .update(`${source}:${tradeId || `${signature}:${occurrence}`}`)
      .digest('hex');
    const ids = [
      tradeId ? `trade ID ${tradeId}` : '',
      orderId ? `order ID ${orderId}` : ''
    ].filter(Boolean).join(', ');

    trades.push({
      symbol,
      type,
      status: 'closed',
      entryPrice,
      exitPrice: null,
      quantity,
      leverage: 1,
      fees,
      pnl,
      pnlPercent: entryPrice * quantity ? Math.round((pnl / (entryPrice * quantity)) * 10000) / 100 : 0,
      exchange: sourceInfo.exchange,
      market: sourceInfo.market,
      notes: `${sourceInfo.exchange} fill import${ids ? ` (${ids})` : ''}; giá đóng/giá vào của vị thế không được gộp từ file khớp lệnh.`,
      entryDate: tradeDate,
      exitDate: tradeDate,
      importKey,
      createdAt: now,
      updatedAt: now
    });

    if (trades.length > MAX_ROWS) throw invalidCsv(`File CSV vượt quá giới hạn ${MAX_ROWS} dòng`);
  }

  if (!trades.length) throw invalidCsv('File CSV không có dòng giao dịch để nhập');
  return trades;
}

module.exports = { parseTradingCsv };
