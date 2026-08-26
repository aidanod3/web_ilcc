/*
 * demos.js — the bundled example programs.
 *   GET /api/demos        → [{ name, content, description }]
 *   GET /api/demos/:name  → { name, content, description }   (for ?demo= permalinks)
 * description = first comment line of the file, if any.
 */
const express = require('express');
const fs   = require('fs');
const path = require('path');

const router   = express.Router();
const demosDir = path.join(__dirname, '..', 'demos');

const SAFE = /^[A-Za-z0-9 _.-]+\.a$/;

function describe(content) {
  const first = content.split('\n').find(l => l.trim().startsWith(';'));
  return first ? first.replace(/^\s*;\s*/, '').trim() : '';
}

let cache = null;
function load() {
  if (cache) return cache;
  cache = fs.readdirSync(demosDir)
    .filter(f => f.endsWith('.a'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map(name => {
      const content = fs.readFileSync(path.join(demosDir, name), 'utf8');
      return { name, content, description: describe(content) };
    });
  return cache;
}

router.get('/', (req, res, next) => {
  try { res.json(load()); } catch (e) { next(e); }
});

router.get('/:name', (req, res, next) => {
  try {
    const { name } = req.params;
    if (!SAFE.test(name)) return res.status(400).json({ error: 'bad_name' });
    const demo = load().find(d => d.name === name);
    if (!demo) return res.status(404).json({ error: 'not_found' });
    res.json(demo);
  } catch (e) { next(e); }
});

module.exports = router;
