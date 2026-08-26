/*
 * materials.js — browse lecture slides + textbook in the browser (SSO).
 *
 * The course zip (cuh63*.zip on the downloads PVC) carries the slides as
 * .pdf/.pptx/.docx. We index them once at boot and stream individual
 * members straight out of the zip — nothing is extracted to disk.
 *
 *   GET /api/materials          → { chapters: [{ chapter, title, items: [...] }], textbook }
 *   GET /api/materials/:id      → the file (inline for PDF so <embed> works)
 */
const express = require('express');
const fs     = require('fs');
const path   = require('path');
const AdmZip = require('adm-zip');
const config = require('../config');
const logger = require('../logger');
const { requireSSO } = require('../middleware/auth');

const router = express.Router();
router.use(requireSSO);

const TEXTBOOK = 'cuh-2e.pdf';
const ZIP_CANDIDATES = ['cuh63.zip', 'cuh63Linux.zip', 'cuh63MacArm.zip', 'cuh63MacIntel.zip', 'cuh63Windows.zip'];
const SLIDE_EXT = /\.(pdf|pptx|docx)$/i;
const MIME = { pdf: 'application/pdf', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };

/* id → { zipPath, entryName, name, ext, chapter, size } */
let index = new Map();
let chapters = [];
let zipPath = null;

/* The course zip names slides "slidescuh/7 Pointers.pdf" (bare leading number)
   and reference docs "Chapter19VirtualMemory.pdf" / "LCCInstructionSetSummary.pdf".
   Returns { chapter: number|null, group: 'slides'|'reference' }. */
function classify(entryName) {
  const base = path.basename(entryName);
  const inSlides = /(^|\/)slides/i.test(entryName);
  let m = base.match(/^\s*0*(\d{1,2})\s+/);                       // "7 Pointers.pdf"
  if (!m) m = base.match(/(?:^|[^a-z])ch(?:apter)?\s*_?0*(\d{1,2})/i); // "Chapter19..."
  return { chapter: m ? Number(m[1]) : null, group: inSlides ? 'slides' : 'reference' };
}
function titleOf(base) {
  return base
    .replace(SLIDE_EXT, '')
    .replace(/^\s*\d{1,2}\s+/, '')
    .replace(/^ch(?:apter)?\s*_?\d+/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')       // CamelCase → spaced
    .replace(/[_-]+/g, ' ')
    .trim() || base;
}

function buildIndex() {
  index = new Map(); chapters = []; zipPath = null;
  const found = ZIP_CANDIDATES.map(f => path.join(config.downloadsDir, f)).find(p => fs.existsSync(p));
  if (!found) { logger.warn('no course zip present — materials index empty'); return; }
  zipPath = found;

  const byChapter = new Map();   // slides, keyed by chapter number
  const reference = [];          // root-level reference PDFs
  for (const e of new AdmZip(zipPath).getEntries()) {
    if (e.isDirectory) continue;
    const base = path.basename(e.entryName);
    if (!SLIDE_EXT.test(base) || /(^|\/)(__MACOSX|\._)/.test(e.entryName)) continue;
    const ext = base.split('.').pop().toLowerCase();
    const { chapter, group } = classify(e.entryName);
    const id = Buffer.from(e.entryName).toString('base64url');
    const item = { id, name: base, title: titleOf(base), ext, chapter, size: e.header.size };
    index.set(id, { entryName: e.entryName, ...item });
    if (group === 'reference') { reference.push(item); continue; }
    const key = chapter ?? 0;
    if (!byChapter.has(key)) byChapter.set(key, []);
    byChapter.get(key).push(item);
  }
  const pdfFirst = (a, b) => (a.ext === 'pdf' ? 0 : 1) - (b.ext === 'pdf' ? 0 : 1) || a.name.localeCompare(b.name);
  chapters = [...byChapter.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([chapter, items]) => ({
      chapter: chapter || null,
      title: chapter ? `Chapter ${chapter}` : 'Other slides',
      items: items.sort(pdfFirst),
    }));
  if (reference.length) chapters.push({ chapter: null, title: 'Reference sheets', items: reference.sort(pdfFirst) });
  logger.info({ zip: path.basename(zipPath), items: index.size, chapters: chapters.length }, 'materials indexed');
}
buildIndex();

router.get('/', (req, res) => {
  const tb = path.join(config.downloadsDir, TEXTBOOK);
  res.json({
    chapters,
    textbook: fs.existsSync(tb) ? { file: TEXTBOOK, title: 'C and C++ Under the Hood, 2nd ed.', url: `${config.publicBase}/api/downloads/${TEXTBOOK}` } : null,
    source: zipPath ? path.basename(zipPath) : null,
  });
});

router.post('/_reindex', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  buildIndex();
  res.json({ items: index.size, chapters: chapters.length });
});

router.get('/:id', (req, res) => {
  const item = index.get(req.params.id);
  if (!item || !zipPath) return res.status(404).json({ error: 'not_found' });
  const entry = new AdmZip(zipPath).getEntry(item.entryName);
  if (!entry) return res.status(404).json({ error: 'not_found' });
  const buf = entry.getData();
  res.setHeader('Content-Type', MIME[item.ext] || 'application/octet-stream');
  res.setHeader('Content-Length', buf.length);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  /* PDFs inline so the browser renders them in the viewer; office files download. */
  res.setHeader('Content-Disposition', `${item.ext === 'pdf' ? 'inline' : 'attachment'}; filename="${item.name}"`);
  logger.info({ email: req.user.email, file: item.name }, 'material');
  res.end(buf);
});

module.exports = router;
