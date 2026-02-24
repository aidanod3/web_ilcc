const express = require('express');
const database = require('../db/database');

const router = express.Router();

// GET /api/dashboard/submissions - List all submissions (TA/instructor view)
router.get('/submissions', (req, res) => {
  const { assignmentId } = req.query;

  let submissions;
  if (assignmentId) {
    submissions = database.submissions.getByAssignment(Number(assignmentId));
  } else {
    submissions = database.submissions.getAll();
  }

  const list = submissions.map((s) => ({
    id: s.id,
    assignmentId: s.assignment_id,
    assignmentTitle: s.assignment_title,
    studentName: s.student_name,
    studentEmail: s.student_email,
    matched: Boolean(s.matched),
    submittedAt: s.submitted_at,
    status: s.status,
  }));

  res.json({ submissions: list });
});

// GET /api/dashboard/submissions/:id - Full submission detail with diff report
router.get('/submissions/:id', (req, res) => {
  const submission = database.submissions.getById(Number(req.params.id));
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  let diffLines = [];
  try {
    diffLines = JSON.parse(submission.diff_report || '[]');
  } catch (e) {
    // ignore parse errors
  }

  res.json({
    id: submission.id,
    assignmentId: submission.assignment_id,
    assignmentTitle: submission.assignment_title,
    studentName: submission.student_name,
    studentEmail: submission.student_email,
    sourceCode: submission.source_code,
    actualOutput: submission.actual_output,
    expectedOutput: submission.expected_output,
    matched: Boolean(submission.matched),
    diffLines,
    submittedAt: submission.submitted_at,
    status: submission.status,
    downloadUrl: `/api/submit/${submission.id}/download`,
  });
});

module.exports = router;
