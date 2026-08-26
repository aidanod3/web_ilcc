/*
 * grader.js — run a program against test cases and score it.
 *
 * Wraps runner.js (the same assemble/execute path the editor uses) rather
 * than shelling out to lcc, so students are graded by exactly what they
 * tested against in the browser.
 *
 * NOTE on timeouts: the interpreter yields between steps (handleSteps is
 * async), so setTimeout can interrupt a runaway program and the session
 * is cleaned up. A fully synchronous busy loop inside one instruction is
 * not possible in this ISA, so this is sufficient without worker threads.
 */
const db     = require('../db');
const config = require('../config');
const logger = require('../logger');
const { createRunSession } = require('./runner');

/* Trailing-whitespace-per-line and CRLF tolerant compare. */
function normalize(s) {
  return String(s ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(l => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

/* Line-level diff: [{ line, expected, actual }] for mismatched lines only. */
function computeDiff(expected, actual) {
  const e = normalize(expected).split('\n');
  const a = normalize(actual).split('\n');
  const n = Math.max(e.length, a.length);
  const out = [];
  for (let i = 0; i < n; i++) {
    if (e[i] !== a[i]) out.push({ line: i + 1, expected: e[i] ?? null, actual: a[i] ?? null });
  }
  return out;
}

/**
 * runTestCase(source, stdinText) → { stdout, error, runtimeMs, timedOut }
 * stdin lines are fed one per input request; when exhausted, an empty line
 * is supplied once and then the run is aborted with error 'input_exhausted'.
 */
function runTestCase(source, stdinText = '', { timeoutMs = config.graderTimeoutMs } = {}) {
  return new Promise((resolve) => {
    const lines = String(stdinText ?? '').replace(/\r\n?/g, '\n').split('\n');
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    let stdout = '';
    let done = false;
    let exhausted = false;
    const t0 = Date.now();
    let session = null;

    const finish = (extra) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { session?.cleanup(); } catch { /* ignore */ }
      resolve({ stdout, runtimeMs: Date.now() - t0, timedOut: false, error: null, ...extra });
    };

    const timer = setTimeout(() => finish({ timedOut: true, error: `timed out after ${timeoutMs} ms` }), timeoutMs);

    session = createRunSession(source, {
      onOutput: (t) => { stdout += t; },
      onInputRequest: () => {
        if (lines.length) {
          session.provideInput(lines.shift());
        } else if (!exhausted) {
          exhausted = true;
          session.provideInput('');
        } else {
          finish({ error: 'input_exhausted' });
        }
      },
      onDone:  () => finish({}),
      onError: (m) => finish({ error: m }),
    }, { echoInput: false });

    if (!session) return; // assembly error already routed through onError → finish
    session.start();
  });
}

const q = {
  submission: db.prepare('SELECT * FROM submissions WHERE id = ?'),
  testCases:  db.prepare('SELECT * FROM test_cases WHERE assignment_id = ? ORDER BY ordinal, id'),
  upsertResult: db.prepare(`INSERT INTO results (submission_id, test_case_id, actual_stdout, passed, diff_json, runtime_ms, error)
    VALUES (@submission_id, @test_case_id, @actual_stdout, @passed, @diff_json, @runtime_ms, @error)
    ON CONFLICT(submission_id, test_case_id) DO UPDATE SET
      actual_stdout = excluded.actual_stdout, passed = excluded.passed, diff_json = excluded.diff_json,
      runtime_ms = excluded.runtime_ms, error = excluded.error`),
  existingGrade: db.prepare('SELECT graded_by_email FROM grades WHERE submission_id = ?'),
  upsertGrade: db.prepare(`INSERT INTO grades (submission_id, score, max_score, feedback, graded_by_email)
    VALUES (?, ?, ?, '', 'autograder')
    ON CONFLICT(submission_id) DO UPDATE SET score = excluded.score, max_score = excluded.max_score,
      graded_by_email = 'autograder', graded_at = datetime('now')`),
  setStatus: db.prepare('UPDATE submissions SET status = ? WHERE id = ?'),
};

async function gradeSubmission(submissionId) {
  const sub = q.submission.get(submissionId);
  if (!sub) throw Object.assign(new Error('submission not found'), { status: 404 });
  const cases = q.testCases.all(sub.assignment_id);

  let score = 0, max = 0, anyError = false;
  const results = [];
  for (const tc of cases) {
    const r = await runTestCase(sub.source, tc.stdin);
    const passed = !r.error && !r.timedOut && normalize(r.stdout) === normalize(tc.expected_stdout);
    const diff = passed ? [] : computeDiff(tc.expected_stdout, r.stdout);
    if (r.error && !r.timedOut && /assembl|syntax/i.test(r.error)) anyError = true;
    max += tc.weight;
    if (passed) score += tc.weight;
    const row = {
      submission_id: sub.id, test_case_id: tc.id, actual_stdout: r.stdout, passed: passed ? 1 : 0,
      diff_json: JSON.stringify(diff), runtime_ms: r.runtimeMs, error: r.error,
    };
    q.upsertResult.run(row);
    results.push({ testCaseId: tc.id, name: tc.name, passed, weight: tc.weight, runtimeMs: r.runtimeMs, error: r.error, diff });
  }

  /* Don't clobber a manual grade. */
  const existing = q.existingGrade.get(sub.id);
  if (!existing || existing.graded_by_email === 'autograder') q.upsertGrade.run(sub.id, score, max);
  q.setStatus.run(anyError ? 'error' : 'graded', sub.id);

  logger.info({ submissionId: sub.id, score, max, cases: cases.length }, 'graded');
  return { submissionId: sub.id, score, maxScore: max, results };
}

async function gradeAssignment(assignmentId, { concurrency = 2 } = {}) {
  const ids = db.prepare('SELECT id FROM submissions WHERE assignment_id = ?').all(assignmentId).map(r => r.id);
  let graded = 0, errors = 0, i = 0;
  const worker = async () => {
    while (i < ids.length) {
      const id = ids[i++];
      try { await gradeSubmission(id); graded++; }
      catch (e) { errors++; logger.warn({ err: e, id }, 'grade failed'); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
  return { graded, errors, total: ids.length };
}

module.exports = { normalize, computeDiff, runTestCase, gradeSubmission, gradeAssignment };
