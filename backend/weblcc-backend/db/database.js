const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'weblcc.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema on first init
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

// --- Assignment helpers ---

const insertAssignment = db.prepare(`
  INSERT INTO assignments (title, description, expected_output, due_date, created_by)
  VALUES (@title, @description, @expectedOutput, @dueDate, @createdBy)
`);

const getAllAssignments = db.prepare(`
  SELECT a.*, (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) AS submission_count
  FROM assignments a ORDER BY a.created_at DESC
`);

const getAssignmentById = db.prepare('SELECT * FROM assignments WHERE id = ?');

const updateAssignment = db.prepare(`
  UPDATE assignments SET title = @title, description = @description,
  expected_output = @expectedOutput, due_date = @dueDate, created_by = @createdBy
  WHERE id = @id
`);

const deleteAssignment = db.prepare('DELETE FROM assignments WHERE id = ?');

// --- Submission helpers ---

const insertSubmission = db.prepare(`
  INSERT INTO submissions (assignment_id, student_name, student_email, source_code, actual_output, matched, diff_report, zip_path, status)
  VALUES (@assignmentId, @studentName, @studentEmail, @sourceCode, @actualOutput, @matched, @diffReport, @zipPath, @status)
`);

const getAllSubmissions = db.prepare(`
  SELECT s.*, a.title AS assignment_title
  FROM submissions s LEFT JOIN assignments a ON s.assignment_id = a.id
  ORDER BY s.submitted_at DESC
`);

const getSubmissionsByAssignment = db.prepare(`
  SELECT s.*, a.title AS assignment_title
  FROM submissions s LEFT JOIN assignments a ON s.assignment_id = a.id
  WHERE s.assignment_id = ?
  ORDER BY s.submitted_at DESC
`);

const getSubmissionById = db.prepare(`
  SELECT s.*, a.title AS assignment_title, a.expected_output
  FROM submissions s LEFT JOIN assignments a ON s.assignment_id = a.id
  WHERE s.id = ?
`);

module.exports = {
  db,
  assignments: {
    insert: (data) => insertAssignment.run(data),
    getAll: () => getAllAssignments.all(),
    getById: (id) => getAssignmentById.get(id),
    update: (data) => updateAssignment.run(data),
    delete: (id) => deleteAssignment.run(id),
  },
  submissions: {
    insert: (data) => insertSubmission.run(data),
    getAll: () => getAllSubmissions.all(),
    getByAssignment: (assignmentId) => getSubmissionsByAssignment.all(assignmentId),
    getById: (id) => getSubmissionById.get(id),
  },
};
