const path = require('path');
const Database = require('better-sqlite3');

// ==================== DATABASE CONNECTION ====================
const DB_PATH = path.join(__dirname, '..', '..', 'taskflow.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ==================== TABLE MIGRATIONS ====================
function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      completed INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'none',
      deadline TEXT,
      completedAt TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      todoId INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      FOREIGN KEY (todoId) REFERENCES todos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#78716c'
    );

    CREATE TABLE IF NOT EXISTS todo_tags (
      todoId INTEGER NOT NULL,
      tagId INTEGER NOT NULL,
      PRIMARY KEY (todoId, tagId),
      FOREIGN KEY (todoId) REFERENCES todos(id) ON DELETE CASCADE,
      FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
    );
  `);
}

initTables();

module.exports = db;
