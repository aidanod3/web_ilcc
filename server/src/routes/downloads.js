/*
 * downloads.js — the course software package + textbook.
 *
 *   GET  /api/downloads/manifest   public   — [{ file, title, platform, size, sha256, description }]
 *   GET  /api/downloads/:file      SSO      — streams the file (Range/ETag via res.sendFile)
 *   POST /api/downloads/_rescan    admin    — recompute manifest after sync-downloads.sh
 *
 * Files live on the ilcc-downloads PVC. Only names in DESCRIPTORS with a
 * whitelisted extension are ever served; everything else is 404.
 */
const express = require('express');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../logger');
const { requireSSO, requireRole } = require('../middleware/auth');

const router = express.Router();

/* filename → presentation. Keep in sync with scripts/sync-downloads.sh. */
const DESCRIPTORS = {
  'cuh63.zip':         { title: 'Course package — all platforms', platform: 'all',       description: 'One zip that works on Linux, macOS (Intel & Apple Silicon), and Windows. Larger download.' },
  'cuh63Linux.zip':    { title: 'Course package — Linux',         platform: 'linux',     description: 'lcc, ilcc, and every textbook sample program for x86-64 Linux (also WSL).' },
  'cuh63MacIntel.zip': { title: 'Course package — macOS (Intel)', platform: 'mac-intel', description: 'For Macs with an Intel processor.' },
  'cuh63MacArm.zip':   { title: 'Course package — macOS (Apple Silicon)', platform: 'mac-arm', description: 'For M1/M2/M3/M4 Macs.' },
  'cuh63Windows.zip':  { title: 'Course package — Windows',       platform: 'windows',   description: 'lcc.exe, ilcc.exe, and the sample programs for 64-bit Windows.' },
  'executables.zip':   { title: 'ilcc debugger only (all platforms)', platform: 'all',   description: 'Just the interactive debugger binaries, no sample files.' },
  'cuh-2e.pdf':        { title: 'Textbook — C and C++ Under the Hood, 2nd ed.', platform: 'textbook', description: 'Course textbook (PDF). For enrolled students only.' },
};
const SAFE_NAME = /^[A-Za-z0-9._-]+\.(zip|pdf)$/;

let manifest = [];

function sha256File(p) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    fs.createReadStream(p).on('data', d => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
  });
}

async function buildManifest() {
  const out = [];
  for (const [file, meta] of Object.entries(DESCRIPTORS)) {
    const abs = path.join(config.downloadsDir, file);
    try {
      const st = fs.statSync(abs);
      if (!st.isFile()) continue;
      out.push({ file, ...meta, size: st.size, sha256: await sha256File(abs) });
    } catch { /* not present — skip */ }
  }
  manifest = out;
  logger.info({ count: out.length, dir: config.downloadsDir }, 'downloads manifest built');
  return out;
}

/* Build once at boot (async; manifest is [] until done). */
fs.mkdirSync(config.downloadsDir, { recursive: true });
buildManifest().catch(e => logger.error({ err: e }, 'manifest build failed'));

router.get('/manifest', (req, res) => {
  res.json({ files: manifest, signedIn: !!req.user });
});

router.post('/_rescan', requireRole('admin'), async (req, res, next) => {
  try { res.json({ files: await buildManifest() }); } catch (e) { next(e); }
});

router.get('/:file', requireSSO, (req, res) => {
  const { file } = req.params;
  if (!SAFE_NAME.test(file) || path.basename(file) !== file || !DESCRIPTORS[file]) {
    return res.status(404).json({ error: 'not_found' });
  }
  const abs = path.resolve(config.downloadsDir, file);
  if (!abs.startsWith(path.resolve(config.downloadsDir) + path.sep)) {
    return res.status(404).json({ error: 'not_found' });
  }
  if (!manifest.some(m => m.file === file)) return res.status(404).json({ error: 'not_found' });

  logger.info({ email: req.user.email, file }, 'download');
  res.download(abs, file, { acceptRanges: true, cacheControl: false });
});

module.exports = router;
module.exports.DESCRIPTORS = DESCRIPTORS;
