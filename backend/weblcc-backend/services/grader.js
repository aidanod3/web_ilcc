const { runEmulator } = require('./emulator');

/**
 * Grade student code against expected output.
 *
 * @param {string|string[]} code - Assembly source (string or array for multi-file)
 * @param {string} expectedOutput - Expected program output
 * @param {string[]} [fileNames] - Optional file names for multi-file
 * @returns {Promise<{success, actualOutput, expectedOutput, matched, diffLines, error, artifacts}>}
 */
async function grade(code, expectedOutput, fileNames) {
  try {
    const result = await runEmulator(code, fileNames);

    if (result.exitCode !== 0 && !result.stdout) {
      return {
        success: false,
        actualOutput: '',
        expectedOutput,
        matched: false,
        diffLines: [],
        error: result.stderr || 'Emulator exited with an error',
        artifacts: result.artifacts,
      };
    }

    const actual = result.stdout.trim();
    const expected = expectedOutput.trim();
    const diffLines = computeDiff(expected, actual);
    const matched = diffLines.every((line) => line.status === 'match');

    return {
      success: true,
      actualOutput: actual,
      expectedOutput: expected,
      matched,
      diffLines,
      error: result.stderr || null,
      artifacts: result.artifacts,
    };
  } catch (err) {
    return {
      success: false,
      actualOutput: '',
      expectedOutput,
      matched: false,
      diffLines: [],
      error: err.message,
      artifacts: {},
    };
  }
}

/**
 * Compute a line-by-line diff between expected and actual output.
 */
function computeDiff(expected, actual) {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');
  const maxLen = Math.max(expectedLines.length, actualLines.length);
  const diffLines = [];

  for (let i = 0; i < maxLen; i++) {
    const exp = i < expectedLines.length ? expectedLines[i] : undefined;
    const act = i < actualLines.length ? actualLines[i] : undefined;

    if (exp === undefined) {
      diffLines.push({ lineNum: i + 1, expected: null, actual: act, status: 'extra' });
    } else if (act === undefined) {
      diffLines.push({ lineNum: i + 1, expected: exp, actual: null, status: 'missing' });
    } else if (exp === act) {
      diffLines.push({ lineNum: i + 1, expected: exp, actual: act, status: 'match' });
    } else {
      diffLines.push({ lineNum: i + 1, expected: exp, actual: act, status: 'mismatch' });
    }
  }

  return diffLines;
}

module.exports = { grade, computeDiff };
