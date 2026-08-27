/*
 * staff.js — who is a TA / admin. Backed by the `staff` table.
 * admin ⊇ ta. Faculty (SAML affiliation) are auto-promoted by the auth
 * middleware via ensureAdmin(); SEED_ADMINS are inserted at boot.
 */
const db = require('../db');
const config = require('../config');
const logger = require('../logger');

const q = {
  get:    db.prepare('SELECT email, role, added_by_email, added_at FROM staff WHERE email = ?'),
  list:   db.prepare('SELECT email, role, added_by_email, added_at FROM staff ORDER BY role, email'),
  upsert: db.prepare(`INSERT INTO staff (email, role, added_by_email) VALUES (?, ?, ?)
                      ON CONFLICT(email) DO UPDATE SET role = excluded.role`),
  insertIgnore: db.prepare('INSERT OR IGNORE INTO staff (email, role, added_by_email) VALUES (?, ?, ?)'),
  del:    db.prepare('DELETE FROM staff WHERE email = ?'),
  countAdmins: db.prepare("SELECT COUNT(*) AS n FROM staff WHERE role = 'admin'"),
};

const norm = (e) => String(e || '').trim().toLowerCase();

function getRole(email) {
  return q.get.get(norm(email))?.role ?? null;
}

function list() {
  return q.list.all();
}

function ensureAdmin(email, addedBy) {
  const e = norm(email);
  const cur = q.get.get(e);
  if (cur?.role === 'admin') return cur;
  q.upsert.run(e, 'admin', addedBy);
  logger.info({ email: e, by: addedBy }, 'promoted to admin');
  return q.get.get(e);
}

function add(email, role, addedBy) {
  const e = norm(email);
  if (!/^[^@\s]+@newpaltz\.edu$/.test(e)) throw Object.assign(new Error('must be a @newpaltz.edu address'), { status: 400 });
  if (!['admin', 'ta'].includes(role)) throw Object.assign(new Error('role must be admin or ta'), { status: 400 });
  q.upsert.run(e, role, norm(addedBy));
  logger.info({ email: e, role, by: addedBy }, 'staff upsert');
  return q.get.get(e);
}

function remove(email, requestedBy) {
  const e = norm(email);
  if (e === norm(requestedBy)) throw Object.assign(new Error('cannot remove yourself'), { status: 400 });
  const cur = q.get.get(e);
  if (!cur) throw Object.assign(new Error('not found'), { status: 404 });
  if (cur.role === 'admin' && q.countAdmins.get().n <= 1) {
    throw Object.assign(new Error('cannot remove the last admin'), { status: 400 });
  }
  q.del.run(e);
  logger.info({ email: e, by: requestedBy }, 'staff removed');
}

function seedAdmins() {
  for (const e of config.seedAdmins) {
    const r = q.insertIgnore.run(norm(e), 'admin', 'seed');
    if (r.changes) logger.info({ email: e }, 'seeded admin');
  }
}

module.exports = { getRole, list, ensureAdmin, add, remove, seedAdmins };
