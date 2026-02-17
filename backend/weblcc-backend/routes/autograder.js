const express = require('express');
const { grade } = require('../services/grader');
const { createSubmission } = require('../services/submission');
const database = require('../db/database');
const path = require('path');

const router = express.Router();

/**
 * POST /api/grade
 * Grade code against an assignment's expected output.
 * Students see: their actual output + pass/fail. NOT the expected output.
 */
router.post('/grade', async (req, res) => {
  const { code, assignmentId, fileNames } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }
  if (!assignmentId) {
    return res.status(400).json({ error: 'Missing assignmentId' });
  }

  const assignment = database.assignments.getById(assignmentId);
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  try {
    const result = await grade(code, assignment.expected_output, fileNames);

    // Do NOT expose expected output or diff details to students
    return res.json({
      success: result.success,
      actualOutput: result.actualOutput,
      matched: result.matched,
      error: result.error,
    });
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/submit
 * Full submission: grade + zip bundle + store in DB.
 * Returns download URL for the zip (student uploads to Brightspace).
 */
router.post('/submit', async (req, res) => {
  const { assignmentId, studentName, studentEmail, sourceCode, fileNames } = req.body;

  if (!assignmentId || !studentName || !sourceCode) {
    return res.status(400).json({ error: 'Missing required fields: assignmentId, studentName, sourceCode' });
  }

  try {
    const result = await createSubmission({
      assignmentId,
      studentName,
      studentEmail,
      sourceCode,
      fileNames,
    });

    return res.json({
      submissionId: result.submissionId,
      matched: result.matched,
      actualOutput: result.actualOutput,
      error: result.error,
      downloadUrl: result.downloadUrl,
    });
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});

/**
 * GET /api/submit/:id/download
 * Download a submission's zip bundle.
 */
router.get('/submit/:id/download', (req, res) => {
  const submission = database.submissions.getById(Number(req.params.id));
  if (!submission || !submission.zip_path) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  const zipPath = submission.zip_path;
  const fileName = `submission_${submission.id}_${submission.student_name.replace(/\s+/g, '_')}.zip`;

  res.download(zipPath, fileName, (err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to download file' });
    }
  });
});

module.exports = router;
