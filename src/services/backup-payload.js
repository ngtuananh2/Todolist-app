const REQUIRED_COLLECTIONS = [
  'todos',
  'tags',
  'habits',
  'habitLogs',
  'notes',
  'englishProgress',
  'vocab',
  'trades',
  'tradingAccounts'
];

const OPTIONAL_COLLECTIONS = ['noteVersions', 'englishMindmaps', 'schedules'];
const UNIQUE_KEYS = {
  tags: record => record.name,
  habitLogs: record => `${record.habitId}:${record.date}`,
  englishProgress: record => record.lessonId,
  schedules: record => record.key
};
const MODULE_COLLECTIONS = {
  habit: ['habits', 'habitLogs'],
  brain: ['notes', 'noteVersions'],
  english: ['englishProgress', 'englishMindmaps', 'vocab'],
  trading: ['trades', 'tradingAccounts']
};
const MODULE_UNIQUE_KEYS = {
  habitLogs: UNIQUE_KEYS.habitLogs,
  englishProgress: UNIQUE_KEYS.englishProgress
};

function invalidBackup(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function validateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
    throw invalidBackup('File backup không đúng định dạng TaskFlow');
  }

  const data = payload.data;
  const missing = REQUIRED_COLLECTIONS.filter(key => !Array.isArray(data[key]));
  if (missing.length) {
    throw invalidBackup(`File backup thiếu dữ liệu: ${missing.join(', ')}`);
  }

  for (const key of OPTIONAL_COLLECTIONS) {
    if (data[key] !== undefined && !Array.isArray(data[key])) {
      throw invalidBackup(`Dữ liệu ${key} phải là một danh sách`);
    }
  }

  const collections = [...REQUIRED_COLLECTIONS, ...OPTIONAL_COLLECTIONS];
  for (const key of collections) {
    const records = data[key];
    if (!Array.isArray(records)) continue;

    const ids = new Set();
    const naturalKeys = new Set();
    for (const [index, record] of records.entries()) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        throw invalidBackup(`Dữ liệu ${key}[${index}] không hợp lệ`);
      }

      if (typeof record._id !== 'string' || record._id.trim() === '') {
        throw invalidBackup(`Dữ liệu ${key}[${index}] thiếu mã _id`);
      }

      if (ids.has(record._id)) {
        throw invalidBackup(`File backup có mã _id bị trùng trong ${key}`);
      }
      ids.add(record._id);

      const getUniqueKey = UNIQUE_KEYS[key];
      if (getUniqueKey) {
        const naturalKey = getUniqueKey(record);
        if (typeof naturalKey !== 'string' || naturalKey.trim() === '') {
          throw invalidBackup(`Dữ liệu ${key}[${index}] thiếu trường định danh`);
        }
        if (naturalKeys.has(naturalKey)) {
          throw invalidBackup(`File backup có dữ liệu định danh bị trùng trong ${key}`);
        }
        naturalKeys.add(naturalKey);
      }
    }
  }

  const counts = Object.fromEntries(collections.map(key => [
    key,
    Array.isArray(data[key]) ? data[key].length : null
  ]));

  return {
    data,
    counts,
    omittedCollections: OPTIONAL_COLLECTIONS.filter(key => data[key] === undefined)
  };
}

function validateModulePayload(moduleName, payload) {
  const collections = MODULE_COLLECTIONS[moduleName];
  if (!collections) {
    throw invalidBackup('Loại dữ liệu nhập không được hỗ trợ');
  }
  if (
    !payload || typeof payload !== 'object' || Array.isArray(payload) ||
    payload.module !== moduleName ||
    !payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)
  ) {
    throw invalidBackup('File không đúng định dạng xuất dữ liệu của TaskFlow');
  }

  const data = { ...payload.data };
  const counts = {};
  for (const key of collections) {
    const records = data[key] === undefined ? [] : data[key];
    if (!Array.isArray(records)) {
      throw invalidBackup(`File thiếu danh sách dữ liệu ${key}`);
    }
    data[key] = records;

    const ids = new Set();
    const naturalKeys = new Set();
    for (const [index, record] of records.entries()) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        throw invalidBackup(`Dữ liệu ${key}[${index}] không hợp lệ`);
      }
      if (typeof record._id !== 'string' || record._id.trim() === '') {
        throw invalidBackup(`Dữ liệu ${key}[${index}] thiếu mã _id`);
      }
      if (ids.has(record._id)) {
        throw invalidBackup(`File có mã _id bị trùng trong ${key}`);
      }
      ids.add(record._id);

      const getUniqueKey = MODULE_UNIQUE_KEYS[key];
      if (getUniqueKey) {
        const naturalKey = getUniqueKey(record);
        if (typeof naturalKey !== 'string' || naturalKey.trim() === '') {
          throw invalidBackup(`Dữ liệu ${key}[${index}] thiếu trường định danh`);
        }
        if (naturalKeys.has(naturalKey)) {
          throw invalidBackup(`File có dữ liệu định danh bị trùng trong ${key}`);
        }
        naturalKeys.add(naturalKey);
      }
    }
    counts[key] = records.length;
  }

  return { data, collections, counts };
}

module.exports = { validateBackupPayload, validateModulePayload };
