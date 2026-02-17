const express = require('express');
const database = require('../db/database');

const router = express.Router();

// GET /api/assignments - List all assignments (public: students see title + due date)
router.get('/', (req, res) => {
  const assignments = database.assignments.getAll();
  // Only expose public fields to students
  const publicList = assignments.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    dueDate: a.due_date,
    submissionCount: a.submission_count,
  }));
  res.json({ assignments: publicList });
});

// POST /api/assignments - Create assignment (instructor only)
router.post('/', (req, res) => {
  const { title, description, expectedOutput, dueDate, createdBy } = req.body;

  if (!title || !expectedOutput) {
    return res.status(400).json({ error: 'Missing required fields: title, expectedOutput' });
  }

  try {
    const result = database.assignments.insert({
      title,
      description: description || null,
      expectedOutput,
      dueDate: dueDate || null,
      createdBy: createdBy || null,
    });

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Assignment created',
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/assignments/:id - Get single assignment (instructor sees expected output)
router.get('/:id', (req, res) => {
  const assignment = database.assignments.getById(Number(req.params.id));
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  res.json({
    id: assignment.id,
    title: assignment.title,
    description: assignment.description,
    expectedOutput: assignment.expected_output,
    dueDate: assignment.due_date,
    createdBy: assignment.created_by,
    createdAt: assignment.created_at,
  });
});

// PUT /api/assignments/:id - Update assignment
router.put('/:id', (req, res) => {
  const { title, description, expectedOutput, dueDate, createdBy } = req.body;

  if (!title || !expectedOutput) {
    return res.status(400).json({ error: 'Missing required fields: title, expectedOutput' });
  }

  try {
    database.assignments.update({
      id: Number(req.params.id),
      title,
      description: description || null,
      expectedOutput,
      dueDate: dueDate || null,
      createdBy: createdBy || null,
    });

    res.json({ message: 'Assignment updated' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// DELETE /api/assignments/:id - Delete assignment
router.delete('/:id', (req, res) => {
  try {
    database.assignments.delete(Number(req.params.id));
    res.json({ message: 'Assignment deleted' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

module.exports = router;
