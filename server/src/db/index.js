/*
 * db/index.js — one better-sqlite3 connection, WAL mode, FKs on.
 * Migrations run at require-time so every importer sees a ready schema.
 */
const fs   = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');
const logger = require('../logger');

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

/* ---- migrations: server/db/migrations/NNN_name.sql, applied in order ---- */
db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);

const migrationsDir = path.join(__dirname, '..', '..', 'db', 'migrations');
const applied = new Set(db.prepare('SELECT name FROM schema_migrations').all().map(r => r.name));
const files = fs.existsSync(migrationsDir)
  ? fs.readdirSync(migrationsDir).filter(f => /^\d+_.*\.sql$/.test(f)).sort()
  : [];

const apply = db.transaction((name, sql) => {
  db.exec(sql);
  db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);
});

for (const f of files) {
  if (applied.has(f)) continue;
  apply(f, fs.readFileSync(path.join(migrationsDir, f), 'utf8'));
  logger.info({ migration: f }, 'applied migration');
}

module.exports = db;
