CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  expected_output TEXT NOT NULL,
  due_date DATETIME,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER REFERENCES assignments(id),
  student_name TEXT NOT NULL,
  student_email TEXT,
  source_code TEXT NOT NULL,
  actual_output TEXT,
  matched BOOLEAN,
  diff_report TEXT,
  zip_path TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending'
);
