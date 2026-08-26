/*
 * student.js — what a signed-in student can do. Mounted at /api behind requireSSO.
 *   GET  /assignments/open       — assignments currently accepting submissions
 *   POST /submissions            — submit the editor's code; auto-graded
 *   GET  /submissions/mine       — my submissions with score/feedback (never expected outputs)
 */
const express = require('express');
const db      = require('../db');
const config  = require('../config');
const { gradeSubmission } = require('../services/grader');

const router = express.Router();
const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });

const q = {
  open: db.prepare(`SELECT id, title, chapter, description, due_at FROM assignments
    WHERE is_open = 1 AND (due_at IS NULL OR due_at > datetime('now')) ORDER BY due_at IS NULL, due_at, id`),
  get:  db.prepare('SELECT id, is_open, due_at FROM assignments WHERE id = ?'),
  upsert: db.prepare(`INSERT INTO submissions (assignment_id, student_email, student_name, source)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(assignment_id, student_email) DO UPDATE SET source = excluded.source,
      submitted_at = datetime('now'), status = 'pending'`),
  byKey: db.prepare('SELECT id FROM submissions WHERE assignment_id = ? AND student_email = ?'),
  mine: db.prepare(`SELECT s.id, s.assignment_id, a.title, s.submitted_at, s.status,
      g.score, g.max_score, g.feedback, g.graded_at
    FROM submissions s JOIN assignments a ON a.id = s.assignment_id
    LEFT JOIN grades g ON g.submission_id = s.id
    WHERE s.student_email = ? ORDER BY s.submitted_at DESC`),
  mineResults: db.prepare(`SELECT t.name, r.passed, r.error, r.runtime_ms FROM results r
    JOIN test_cases t ON t.id = r.test_case_id WHERE r.submission_id = ? ORDER BY t.ordinal, t.id`),
};

router.get('/assignments/open', (req, res) => res.json(q.open.all()));

router.post('/submissions', async (req, res, next) => {
  try {
    const { assignmentId, source } = req.body || {};
    const a = q.get.get(assignmentId);
    if (!a) throw bad('assignment not found', 404);
    if (!a.is_open || (a.due_at && new Date(a.due_at) < new Date())) throw bad('assignment is closed', 403);
    if (typeof source !== 'string' || !source.trim()) throw bad('source required');
    if (Buffer.byteLength(source) > config.maxCodeBytes) throw bad('source too large', 413);

    q.upsert.run(assignmentId, req.user.email, req.user.netid, source);
    const { id } = q.byKey.get(assignmentId, req.user.email);
    const g = await gradeSubmission(id);
    res.status(201).json({ id, score: g.score, maxScore: g.maxScore,
      results: g.results.map(r => ({ name: r.name, passed: r.passed, error: r.error })) });
  } catch (e) { next(e); }
});

router.get('/submissions/mine', (req, res) => {
  const rows = q.mine.all(req.user.email).map(r => ({ ...r, results: q.mineResults.all(r.id) }));
  res.json(rows);
});

module.exports = router;
