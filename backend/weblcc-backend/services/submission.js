const archiver = require('archiver');
const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { grade } = require('./grader');
const database = require('../db/database');

const SUBMISSIONS_DIR = path.join(__dirname, '..', 'data', 'submissions');

/**
 * Create a full submission: grade, generate artifacts, bundle zip, store in DB.
 *
 * @param {object} params
 * @param {number} params.assignmentId
 * @param {string} params.studentName
 * @param {string} [params.studentEmail]
 * @param {string|string[]} params.sourceCode
 * @param {string[]} [params.fileNames]
 * @returns {Promise<{submissionId, matched, actualOutput, error, downloadUrl}>}
 */
async function createSubmission({ assignmentId, studentName, studentEmail, sourceCode, fileNames }) {
  const assignment = database.assignments.getById(assignmentId);
  if (!assignment) {
    throw new Error('Assignment not found');
  }

  // Grade the submission
  const result = await grade(sourceCode, assignment.expected_output, fileNames);

  // Create submission directory
  const submissionDir = path.join(SUBMISSIONS_DIR, String(assignmentId));
  await fsp.mkdir(submissionDir, { recursive: true });

  // Generate report text (includes expected output - only in the zip for TA/professor review)
  const report = generateReport({
    studentName,
    studentEmail,
    assignmentTitle: assignment.title,
    matched: result.matched,
    actualOutput: result.actualOutput,
    expectedOutput: result.expectedOutput,
    diffLines: result.diffLines,
    error: result.error,
  });

  // Build the zip
  const zipFileName = `${crypto.randomUUID()}.zip`;
  const zipPath = path.join(submissionDir, zipFileName);
  await createZip(zipPath, sourceCode, fileNames, result.artifacts, report);

  // Store in database
  const diffReport = JSON.stringify(result.diffLines);
  const dbResult = database.submissions.insert({
    assignmentId,
    studentName,
    studentEmail: studentEmail || null,
    sourceCode: Array.isArray(sourceCode) ? JSON.stringify(sourceCode) : sourceCode,
    actualOutput: result.actualOutput,
    matched: result.matched ? 1 : 0,
    diffReport,
    zipPath,
    status: 'graded',
  });

  const submissionId = dbResult.lastInsertRowid;

  return {
    submissionId,
    matched: result.matched,
    actualOutput: result.actualOutput,
    error: result.error,
    downloadUrl: `/api/submit/${submissionId}/download`,
  };
}

function generateReport({ studentName, studentEmail, assignmentTitle, matched, actualOutput, expectedOutput, diffLines, error }) {
  const lines = [
    'ILCC Submission Report',
    '======================',
    `Student: ${studentName}`,
    studentEmail ? `Email: ${studentEmail}` : null,
    `Assignment: ${assignmentTitle}`,
    `Submitted: ${new Date().toISOString()}`,
    '',
    `Result: ${matched ? 'PASS' : 'FAIL'}`,
    '',
  ].filter(Boolean);

  if (error) {
    lines.push('Errors:', '-------', error, '');
  }

  lines.push('Actual Output:', '--------------', actualOutput || '(no output)', '');

  if (diffLines && diffLines.length > 0) {
    lines.push('Diff:', '-----');
    for (const d of diffLines) {
      const status = d.status.toUpperCase().padEnd(8);
      const exp = d.expected !== null ? `"${d.expected}"` : '(none)';
      const act = d.actual !== null ? `"${d.actual}"` : '(none)';
      lines.push(`Line ${d.lineNum}: ${status} | Expected: ${exp} | Actual: ${act}`);
    }
  }

  return lines.join('\n');
}

async function createZip(zipPath, sourceCode, fileNames, artifacts, report) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);

    // Add source files
    const sources = Array.isArray(sourceCode) ? sourceCode : [sourceCode];
    const names = fileNames || (sources.length === 1 ? ['program.a'] : sources.map((_, i) => `file${i}.a`));
    for (let i = 0; i < sources.length; i++) {
      archive.append(sources[i], { name: names[i] });
    }

    // Add artifact files
    if (artifacts) {
      for (const [key, files] of Object.entries(artifacts)) {
        if (Array.isArray(files)) {
          for (const file of files) {
            archive.append(file.content, { name: file.name });
          }
        }
      }
    }

    // Add report
    archive.append(report, { name: 'report.txt' });

    archive.finalize();
  });
}

module.exports = { createSubmission };
