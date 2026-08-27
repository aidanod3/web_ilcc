/*
 * submissions-zip.js — turn a Brightspace bulk-download zip into students.
 *
 * Ported from the Python autograder's pure helpers. Brightspace names folders
 * like "123456-78901 - Jane Doe - Mar 3, 2026 1105 PM" where the leading
 * number is the OrgDefinedId. We keep .a and .a.txt files, drop macOS junk,
 * and dedupe per (student, basename) preferring .a over .a.txt.
 *
 * parseSubmissionsZip(buffer) → [{ studentKey, displayName, orgDefinedId, files: [{ name, content }] }]
 */
const AdmZip = require('adm-zip');
const config = require('../config');

const MAC_JUNK = /(^|\/)(__MACOSX\/|\._)/;
const ASM_EXT  = /\.a(\.txt)?$/i;

function shouldSkip(entryName) {
  if (!entryName || entryName.endsWith('/')) return true;
  if (MAC_JUNK.test(entryName)) return true;
  const base = entryName.split('/').pop();
  if (base.startsWith('.')) return true;
  return !ASM_EXT.test(base);
}

function isMacJunkBytes(buf) {
  /* AppleDouble files start with 0x00051607 */
  return buf.length >= 4 && buf[0] === 0x00 && buf[1] === 0x05 && buf[2] === 0x16 && buf[3] === 0x07;
}

function cleanCode(text) {
  return String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

/* "lab1.a.txt" and "lab1.a" collapse to the same key; .a wins. */
function normalizedBasename(name) {
  return name.replace(/\.txt$/i, '').toLowerCase();
}
function asmPriority(name) {
  return /\.a$/i.test(name) ? 0 : 1;
}

function orgDefinedIdFromFolder(folder) {
  const m = folder.match(/^\s*(\d{3,})/);
  return m ? m[1] : null;
}

function displayNameFromFolder(folder) {
  /* "123456-78901 - Jane Doe - Mar 3, 2026 1105 PM" → "Jane Doe" */
  const parts = folder.split(' - ').map(s => s.trim());
  if (parts.length >= 2) return parts[1];
  return folder.replace(/^\d[\d-]*\s*/, '').trim() || folder;
}

function parseSubmissionsZip(buffer) {
  const maxBytes = config.maxZipMb * 1024 * 1024;
  if (buffer.length > maxBytes) throw Object.assign(new Error(`zip exceeds ${config.maxZipMb} MB`), { status: 413 });

  const zip = new AdmZip(buffer);
  const byStudent = new Map();

  for (const entry of zip.getEntries()) {
    const name = entry.entryName;
    if (shouldSkip(name)) continue;
    const data = entry.getData();
    if (isMacJunkBytes(data)) continue;
    if (data.length > config.maxCodeBytes) continue;

    const segs = name.split('/').filter(Boolean);
    const file = segs.pop();
    /* Student folder = first directory segment that isn't a generic wrapper. */
    const folder = segs.find(s => !/^(submissions?|export|files?)$/i.test(s)) || segs[0] || '(root)';

    const key = folder;
    if (!byStudent.has(key)) {
      byStudent.set(key, {
        studentKey: key,
        displayName: displayNameFromFolder(folder),
        orgDefinedId: orgDefinedIdFromFolder(folder),
        _files: new Map(),
      });
    }
    const s = byStudent.get(key);
    const nk = normalizedBasename(file);
    const cur = s._files.get(nk);
    if (!cur || asmPriority(file) < asmPriority(cur.name)) {
      s._files.set(nk, { name: file, content: cleanCode(data.toString('utf8')) });
    }
  }

  return [...byStudent.values()]
    .map(({ _files, ...s }) => ({ ...s, files: [...
      _files.values()].sort((a, b) => a.name.localeCompare(b.name)) }))
    .filter(s => s.files.length)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

module.exports = {
  parseSubmissionsZip,
  shouldSkip, isMacJunkBytes, cleanCode, normalizedBasename, asmPriority,
  orgDefinedIdFromFolder, displayNameFromFolder,
};
