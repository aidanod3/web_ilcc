/*
 * grader.js — TA/admin autograder API. Mounted at /api/grader behind requireRole('ta').
 */
const express = require('express');
const multer  = require('multer');
const db      = require('../db');
const config  = require('../config');
const logger  = require('../logger');
const { parseSubmissionsZip } = require('../services/submissions-zip');
const { gradeSubmission, gradeAssignment } = require('../services/grader');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxZipMb * 1024 * 1024, files: 1 } });

const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });
const toBool = (v) => (v === true || v === 1 || v === '1' || v === 'true') ? 1 : 0;

/* ---------- assignments ---------- */

const q = {
  listAssignments: db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM test_cases t WHERE t.assignment_id = a.id)  AS test_case_count,
      (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) AS submission_count
    FROM assignments a ORDER BY a.created_at DESC`),
  getAssignment: db.prepare('SELECT * FROM assignments WHERE id = ?'),
  insertAssignment: db.prepare(`INSERT INTO assignments (title, chapter, description, due_at, is_open, created_by_email)
    VALUES (@title, @chapter, @description, @due_at, @is_open, @created_by_email)`),
  updateAssignment: db.prepare(`UPDATE assignments SET title=@title, chapter=@chapter, description=@description,
    due_at=@due_at, is_open=@is_open, updated_at=datetime('now') WHERE id=@id`),
  deleteAssignment: db.prepare('DELETE FROM assignments WHERE id = ?'),
  testCases: db.prepare('SELECT * FROM test_cases WHERE assignment_id = ? ORDER BY ordinal, id'),
  insertTestCase: db.prepare(`INSERT INTO test_cases (assignment_id, name, stdin, expected_stdout, weight, ordinal)
    VALUES (@assignment_id, @name, @stdin, @expected_stdout, @weight, @ordinal)`),
  updateTestCase: db.prepare(`UPDATE test_cases SET name=@name, stdin=@stdin, expected_stdout=@expected_stdout,
    weight=@weight, ordinal=@ordinal WHERE id=@id`),
  deleteTestCase: db.prepare('DELETE FROM test_cases WHERE id = ?'),
  getTestCase: db.prepare('SELECT * FROM test_cases WHERE id = ?'),
  upsertSubmission: db.prepare(`INSERT INTO submissions (assignment_id, student_email, student_name, org_defined_id, source)
    VALUES (@assignment_id, @student_email, @student_name, @org_defined_id, @source)
    ON CONFLICT(assignment_id, student_email) DO UPDATE SET
      student_name = excluded.student_name, org_defined_id = COALESCE(excluded.org_defined_id, submissions.org_defined_id),
      source = excluded.source, submitted_at = datetime('now'), status = 'pending'`),
  getSubmissionByKey: db.prepare('SELECT id FROM submissions WHERE assignment_id = ? AND student_email = ?'),
  results: db.prepare(`
    SELECT s.id AS submission_id, s.student_email, s.student_name, s.org_defined_id, s.submitted_at, s.status,
           g.score, g.max_score, g.feedback, g.graded_by_email, g.graded_at
    FROM submissions s LEFT JOIN grades g ON g.submission_id = s.id
    WHERE s.assignment_id = ? ORDER BY s.student_name, s.student_email`),
  resultRows: db.prepare(`SELECT r.*, t.name AS test_name, t.weight FROM results r JOIN test_cases t ON t.id = r.test_case_id
    WHERE r.submission_id = ? ORDER BY t.ordinal, t.id`),
  submissionSource: db.prepare('SELECT source FROM submissions WHERE id = ?'),
  manualGrade: db.prepare(`INSERT INTO grades (submission_id, score, max_score, feedback, graded_by_email)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(submission_id) DO UPDATE SET score=excluded.score, max_score=excluded.max_score,
      feedback=excluded.feedback, graded_by_email=excluded.graded_by_email, graded_at=datetime('now')`),
  currentMax: db.prepare('SELECT COALESCE(SUM(weight),0) AS m FROM test_cases WHERE assignment_id = (SELECT assignment_id FROM submissions WHERE id = ?)'),
};

function validateAssignment(b) {
  const title = String(b.title || '').trim();
  if (!title) throw bad('title required');
  return {
    title,
    chapter: b.chapter == null || b.chapter === '' ? null : Number(b.chapter),
    description: String(b.description || ''),
    due_at: b.due_at ? new Date(b.due_at).toISOString() : null,
    is_open: b.is_open == null ? 1 : toBool(b.is_open),
  };
}
function validateTestCase(b, i = 0) {
  const name = String(b.name || `case ${i + 1}`).trim();
  if (b.expected_stdout == null) throw bad(`test case "${name}": expected_stdout required`);
  const weight = b.weight == null ? 1 : Number(b.weight);
  if (!(weight >= 0)) throw bad(`test case "${name}": weight must be >= 0`);
  return { name, stdin: String(b.stdin || ''), expected_stdout: String(b.expected_stdout), weight, ordinal: Number(b.ordinal ?? i) };
}

router.get('/assignments', (req, res) => res.json(q.listAssignments.all()));

router.post('/assignments', (req, res, next) => {
  try {
    const a = validateAssignment(req.body || {});
    const cases = (req.body.testCases || []).map(validateTestCase);
    const id = db.transaction(() => {
      const r = q.insertAssignment.run({ ...a, created_by_email: req.user.email });
      cases.forEach(tc => q.insertTestCase.run({ ...tc, assignment_id: r.lastInsertRowid }));
      return r.lastInsertRowid;
    })();
    res.status(201).json({ id, ...q.getAssignment.get(id), testCases: q.testCases.all(id) });
  } catch (e) { next(e); }
});

router.get('/assignments/:id', (req, res, next) => {
  const a = q.getAssignment.get(req.params.id);
  if (!a) return next(bad('not found', 404));
  res.json({ ...a, testCases: q.testCases.all(a.id) });
});

router.put('/assignments/:id', (req, res, next) => {
  try {
    if (!q.getAssignment.get(req.params.id)) throw bad('not found', 404);
    const a = validateAssignment(req.body || {});
    q.updateAssignment.run({ ...a, id: req.params.id });
    if (Array.isArray(req.body.testCases)) {
      const cases = req.body.testCases.map(validateTestCase);
      db.transaction(() => {
        db.prepare('DELETE FROM test_cases WHERE assignment_id = ?').run(req.params.id);
        cases.forEach(tc => q.insertTestCase.run({ ...tc, assignment_id: req.params.id }));
      })();
    }
    res.json({ ...q.getAssignment.get(req.params.id), testCases: q.testCases.all(req.params.id) });
  } catch (e) { next(e); }
});

router.delete('/assignments/:id', (req, res) => {
  q.deleteAssignment.run(req.params.id);
  res.status(204).end();
});

/* ---------- test cases ---------- */

router.post('/assignments/:id/test-cases', (req, res, next) => {
  try {
    if (!q.getAssignment.get(req.params.id)) throw bad('not found', 404);
    const tc = validateTestCase(req.body || {}, q.testCases.all(req.params.id).length);
    const r = q.insertTestCase.run({ ...tc, assignment_id: req.params.id });
    res.status(201).json(q.getTestCase.get(r.lastInsertRowid));
  } catch (e) { next(e); }
});
router.put('/test-cases/:id', (req, res, next) => {
  try {
    const cur = q.getTestCase.get(req.params.id);
    if (!cur) throw bad('not found', 404);
    const tc = validateTestCase({ ...cur, ...req.body }, cur.ordinal);
    q.updateTestCase.run({ ...tc, id: cur.id });
    res.json(q.getTestCase.get(cur.id));
  } catch (e) { next(e); }
});
router.delete('/test-cases/:id', (req, res) => { q.deleteTestCase.run(req.params.id); res.status(204).end(); });

/* ---------- submissions ---------- */

router.post('/parse-submissions', upload.single('zip'), (req, res, next) => {
  try {
    if (!req.file) throw bad('zip file required (field "zip")');
    const students = parseSubmissionsZip(req.file.buffer);
    logger.info({ by: req.user.email, students: students.length }, 'parsed submissions zip');
    res.json({ students });
  } catch (e) { next(e); }
});

/* Bulk upsert. Students from a Brightspace zip have no email; we synthesize
   <orgDefinedId>@import so they still get a stable identity per assignment. */
router.post('/submissions/bulk', (req, res, next) => {
  try {
    const { assignmentId, students } = req.body || {};
    if (!q.getAssignment.get(assignmentId)) throw bad('assignment not found', 404);
    if (!Array.isArray(students) || !students.length) throw bad('students[] required');
    const ids = db.transaction(() => students.map(s => {
      const email = String(s.email || (s.orgDefinedId ? `${s.orgDefinedId}@import` : '')).toLowerCase();
      if (!email) throw bad('each student needs email or orgDefinedId');
      if (typeof s.source !== 'string') throw bad(`${email}: source required`);
      q.upsertSubmission.run({
        assignment_id: assignmentId, student_email: email,
        student_name: String(s.name || s.displayName || ''), org_defined_id: s.orgDefinedId || null, source: s.source,
      });
      return q.getSubmissionByKey.get(assignmentId, email).id;
    }))();
    res.status(201).json({ ids, count: ids.length });
  } catch (e) { next(e); }
});

router.post('/submissions/:id/grade', async (req, res, next) => {
  try { res.json(await gradeSubmission(Number(req.params.id))); } catch (e) { next(e); }
});

router.post('/assignments/:id/grade-all', async (req, res, next) => {
  try {
    if (!q.getAssignment.get(req.params.id)) throw bad('not found', 404);
    res.json(await gradeAssignment(Number(req.params.id)));
  } catch (e) { next(e); }
});

router.get('/assignments/:id/results', (req, res, next) => {
  if (!q.getAssignment.get(req.params.id)) return next(bad('not found', 404));
  const rows = q.results.all(req.params.id).map(r => ({
    ...r,
    results: q.resultRows.all(r.submission_id).map(x => ({ ...x, diff: x.diff_json ? JSON.parse(x.diff_json) : [], diff_json: undefined })),
  }));
  res.json(rows);
});

router.get('/submissions/:id/source', (req, res, next) => {
  const row = q.submissionSource.get(req.params.id);
  if (!row) return next(bad('not found', 404));
  res.type('text/plain').send(row.source);
});

router.put('/submissions/:id/grade', (req, res, next) => {
  try {
    const { score, feedback = '' } = req.body || {};
    if (!(Number(score) >= 0)) throw bad('score must be >= 0');
    const max = q.currentMax.get(req.params.id)?.m ?? 0;
    q.manualGrade.run(req.params.id, Number(score), max, String(feedback), req.user.email);
    res.json({ submissionId: Number(req.params.id), score: Number(score), maxScore: max, feedback, gradedBy: req.user.email });
  } catch (e) { next(e); }
});

/* Brightspace grade import format. */
router.get('/assignments/:id/export.csv', (req, res, next) => {
  const a = q.getAssignment.get(req.params.id);
  if (!a) return next(bad('not found', 404));
  const rows = q.results.all(a.id);
  const col = `${a.title} Points Grade`;
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [['OrgDefinedId', col, 'End-of-Line Indicator'].map(esc).join(',')];
  for (const r of rows) {
    const id = r.org_defined_id || r.student_email.split('@')[0];
    lines.push([esc(id), esc(r.score ?? ''), esc('#')].join(','));
  }
  res.setHeader('Content-Disposition', `attachment; filename="${a.title.replace(/[^\w.-]+/g, '_')}-grades.csv"`);
  res.type('text/csv').send(lines.join('\r\n') + '\r\n');
});

module.exports = router;
