-- 001_init.sql — ILCC persistence: staff roles + autograder.
-- Rewritten from the abandoned weblcc-backend schema; the key change is
-- test_cases with per-case stdin so interactive (SIN/DIN) programs are gradable.

CREATE TABLE staff (
  email           TEXT PRIMARY KEY,
  role            TEXT NOT NULL CHECK (role IN ('admin', 'ta')),
  added_by_email  TEXT NOT NULL,
  added_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE assignments (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            TEXT NOT NULL,
  chapter          INTEGER,
  description      TEXT NOT NULL DEFAULT '',
  due_at           TEXT,                      -- ISO-8601 or NULL
  is_open          INTEGER NOT NULL DEFAULT 1,
  created_by_email TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE test_cases (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id   INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  stdin           TEXT NOT NULL DEFAULT '',   -- newline-separated lines fed on input requests
  expected_stdout TEXT NOT NULL,
  weight          REAL NOT NULL DEFAULT 1,
  ordinal         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_test_cases_assignment ON test_cases(assignment_id, ordinal);

CREATE TABLE submissions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id   INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_email   TEXT NOT NULL,
  student_name    TEXT NOT NULL DEFAULT '',
  org_defined_id  TEXT,                       -- Brightspace ID from zip import
  source          TEXT NOT NULL,
  submitted_at    TEXT NOT NULL DEFAULT (datetime('now')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'graded', 'error')),
  UNIQUE (assignment_id, student_email)       -- re-submit replaces
);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_student ON submissions(student_email);

CREATE TABLE results (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id  INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  test_case_id   INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  actual_stdout  TEXT NOT NULL DEFAULT '',
  passed         INTEGER NOT NULL DEFAULT 0,
  diff_json      TEXT,
  runtime_ms     INTEGER,
  error          TEXT,
  UNIQUE (submission_id, test_case_id)
);

CREATE TABLE grades (
  submission_id   INTEGER PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,
  score           REAL NOT NULL,
  max_score       REAL NOT NULL,
  feedback        TEXT NOT NULL DEFAULT '',
  graded_by_email TEXT NOT NULL,              -- 'autograder' or a staff email
  graded_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
