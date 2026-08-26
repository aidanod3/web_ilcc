import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { get, post, put, ADMIN, STUDENT, as } from './helpers.js';

const prog = (n) => fs.readFileSync(path.join(__dirname, 'fixtures', 'programs', n), 'utf8');

describe('runTestCase (unit)', () => {
  let runTestCase, normalize, computeDiff;
  it('loads', () => {
    ({ runTestCase, normalize, computeDiff } = require('../src/services/grader'));
  });

  it('no input program', async () => {
    const r = await runTestCase(prog('hello.a'), '');
    expect(r).toMatchObject({ stdout: '5\n', error: null, timedOut: false });
    expect(r.runtimeMs).toBeGreaterThanOrEqual(0);
  });

  it('feeds stdin lines on each input request; input is NOT echoed', async () => {
    expect((await runTestCase(prog('sum_two.a'), '4\n6')).stdout).toBe('10\n');
    expect((await runTestCase(prog('echo_name.a'), 'Ada')).stdout).toBe('Hi Ada\n');
  });

  it('CRLF stdin and trailing newline are tolerated', async () => {
    expect((await runTestCase(prog('sum_two.a'), '4\r\n6\r\n')).stdout).toBe('10\n');
  });

  it('runaway program is stopped and reported', async () => {
    const r = await runTestCase(prog('infinite.a'), '');
    expect(r.error).toMatch(/infinite loop|timed out/i);
  });

  it('assembly error is reported, not thrown', async () => {
    const r = await runTestCase(prog('asm_error.a'), '');
    expect(r.error).toBeTruthy();
    expect(r.stdout).toBe('');
  });

  it('normalize + computeDiff', () => {
    expect(normalize('a \r\nb\n\n')).toBe('a\nb');
    expect(computeDiff('8\n12\n', '8\n')).toEqual([{ line: 2, expected: '12', actual: null }]);
    expect(computeDiff('x', 'x')).toEqual([]);
  });
});

describe('autograder API (integration)', () => {
  let aid;
  const cases = [
    { name: 'doubles 5',  stdin: '5',    expected_stdout: '10\n' },
    { name: 'doubles -3', stdin: '-3',   expected_stdout: '-6\n', weight: 2 },
    { name: 'two inputs', stdin: '4\n6', expected_stdout: '8\n12\n' },
  ];
  const good = '    din r0\n    add r0, r0, r0\n    dout r0\n    nl\n    din r0\n    add r0, r0, r0\n    dout r0\n    nl\n    halt\n';
  const half = '    din r0\n    add r0, r0, r0\n    dout r0\n    nl\n    halt\n';

  it('TA creates an assignment with test cases', async () => {
    const r = await post('/api/grader/assignments', { title: 'Lab 1: doubler', chapter: 1, testCases: cases }, ADMIN);
    expect(r.status).toBe(201);
    aid = r.body.id;
    expect(r.body.testCases).toHaveLength(3);
    expect((await post('/api/grader/assignments', { title: '' }, ADMIN)).status).toBe(400);
  });

  it('students see it as open and can submit; submit auto-grades', async () => {
    const open = await get('/api/assignments/open', STUDENT);
    expect(open.body.map(a => a.id)).toContain(aid);

    const r = await post('/api/submissions', { assignmentId: aid, source: good }, STUDENT);
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ score: 4, maxScore: 4 });
    expect(r.body.results.every(x => x.passed)).toBe(true);

    const r2 = await post('/api/submissions', { assignmentId: aid, source: half }, as('s2@newpaltz.edu'));
    expect(r2.body).toMatchObject({ score: 3, maxScore: 4 });
    expect(r2.body.results.map(x => x.passed)).toEqual([true, true, false]);
  });

  it('student can only see their own scores, never expected output', async () => {
    const r = await get('/api/submissions/mine', STUDENT);
    expect(r.body).toHaveLength(1);
    expect(r.body[0]).toMatchObject({ assignment_id: aid, score: 4, max_score: 4, status: 'graded' });
    expect(JSON.stringify(r.body)).not.toContain('expected');
  });

  it('resubmit replaces (UNIQUE assignment+email)', async () => {
    await post('/api/submissions', { assignmentId: aid, source: half }, STUDENT);
    const r = await get('/api/submissions/mine', STUDENT);
    expect(r.body).toHaveLength(1);
    expect(r.body[0].score).toBe(3);
  });

  it('TA results include per-case diff; manual override sticks; CSV exports', async () => {
    const res = await get(`/api/grader/assignments/${aid}/results`, ADMIN);
    expect(res.status).toBe(200);
    const s2 = res.body.find(x => x.student_email === 's2@newpaltz.edu');
    expect(s2.results[2].diff).toEqual([{ line: 2, expected: '12', actual: null }]);

    const ov = await put(`/api/grader/submissions/${s2.submission_id}/grade`, { score: 3.5, feedback: 'close' }, ADMIN);
    expect(ov.body).toMatchObject({ score: 3.5, gradedBy: 'gopeen1@newpaltz.edu' });
    // grade-all must not clobber the manual grade
    await post(`/api/grader/assignments/${aid}/grade-all`, {}, ADMIN);
    const again = (await get(`/api/grader/assignments/${aid}/results`, ADMIN)).body.find(x => x.student_email === 's2@newpaltz.edu');
    expect(again.score).toBe(3.5);

    const csv = await get(`/api/grader/assignments/${aid}/export.csv`, ADMIN);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text.split('\r\n')[0]).toBe('"OrgDefinedId","Lab 1: doubler Points Grade","End-of-Line Indicator"');
    expect(csv.text).toContain('"s2","3.5","#"');
  });

  it('closed assignment rejects submissions', async () => {
    await put(`/api/grader/assignments/${aid}`, { title: 'Lab 1: doubler', is_open: 0 }, ADMIN);
    expect((await post('/api/submissions', { assignmentId: aid, source: good }, STUDENT)).status).toBe(403);
    expect((await get('/api/assignments/open', STUDENT)).body.map(a => a.id)).not.toContain(aid);
  });
});

describe('zip ingest', () => {
  it('parses Brightspace folders, drops macOS junk, prefers .a over .a.txt', () => {
    const { parseSubmissionsZip } = require('../src/services/submissions-zip');
    const buf = fs.readFileSync(path.join(__dirname, 'fixtures', 'submissions.zip'));
    const students = parseSubmissionsZip(buf);
    expect(students.map(s => [s.displayName, s.orgDefinedId, s.files.map(f => f.name)])).toEqual([
      ['Bob Ray',  '67890', ['lab1.a']],
      ['Jane Doe', '12345', ['lab1.a']],
    ]);
    expect(students[1].files[0].content).toContain('mov r0, 1');
  });

  it('POST /parse-submissions + bulk import + grade-all round trip', async () => {
    const a = await post('/api/grader/assignments', { title: 'Zip lab', testCases: [{ name: 'prints', stdin: '', expected_stdout: '1' }] }, ADMIN);
    const parsed = await require('supertest')(require('../index.js').app)
      .post('/api/grader/parse-submissions').set(ADMIN)
      .attach('zip', path.join(__dirname, 'fixtures', 'submissions.zip'));
    expect(parsed.status).toBe(200);
    expect(parsed.body.students).toHaveLength(2);

    const bulk = await post('/api/grader/submissions/bulk', {
      assignmentId: a.body.id,
      students: parsed.body.students.map(s => ({ name: s.displayName, orgDefinedId: s.orgDefinedId, source: s.files[0].content })),
    }, ADMIN);
    expect(bulk.status).toBe(201);
    expect(bulk.body.count).toBe(2);

    const g = await post(`/api/grader/assignments/${a.body.id}/grade-all`, {}, ADMIN);
    expect(g.body).toMatchObject({ graded: 2, errors: 0, total: 2 });
    const res = (await get(`/api/grader/assignments/${a.body.id}/results`, ADMIN)).body;
    const jane = res.find(r => r.org_defined_id === '12345');
    expect(jane.score).toBe(1);       // prints 1 → matches
    const bob  = res.find(r => r.org_defined_id === '67890');
    expect(bob.score).toBe(0);        // prints 2 → mismatch
    const csv = (await get(`/api/grader/assignments/${a.body.id}/export.csv`, ADMIN)).text;
    expect(csv).toContain('"12345","1","#"');
  });
});
