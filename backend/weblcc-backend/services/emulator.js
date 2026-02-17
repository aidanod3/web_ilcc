const { spawn } = require('child_process');
const fs = require('fs/promises');
const fsSync = require('fs');
const os = require('os');
const path = require('path');

const emulatorPath = path.join(__dirname, '..', '..', 'emulator', 'src', 'core', 'lcc.js');

/**
 * Run LCC assembly source through the emulator.
 * Supports single-file and multi-file (linking) workflows.
 *
 * @param {string|string[]} source - Assembly source code (string for single file, array for multi-file)
 * @param {string[]} [fileNames] - Optional file names for multi-file mode (e.g. ['main.a', 'utils.a'])
 * @param {object} [options] - Options
 * @param {number} [options.timeout=5000] - Execution timeout in ms
 * @returns {Promise<{stdout, stderr, exitCode, artifacts}>}
 */
async function runEmulator(source, fileNames, options = {}) {
  const timeout = options.timeout || 5000;
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'weblcc-'));

  try {
    const files = Array.isArray(source) ? source : [source];
    const names = fileNames || (files.length === 1 ? ['program.a'] : files.map((_, i) => `file${i}.a`));

    // Write source files
    const sourcePaths = [];
    for (let i = 0; i < files.length; i++) {
      const filePath = path.join(tmpDir, names[i]);
      await fs.writeFile(filePath, files[i], 'utf8');
      sourcePaths.push(filePath);
    }

    // Run the emulator
    const args = [emulatorPath, ...sourcePaths];
    const result = await spawnWithTimeout('node', args, { cwd: tmpDir, timeout });

    // Collect artifacts from the temp directory
    const artifacts = await collectArtifacts(tmpDir);

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      artifacts,
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

function spawnWithTimeout(cmd, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Execution timed out'));
    }, options.timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function collectArtifacts(dir) {
  const artifacts = {};
  const entries = await fs.readdir(dir);

  for (const entry of entries) {
    const ext = path.extname(entry).toLowerCase();
    const filePath = path.join(dir, entry);

    if (['.a', '.e', '.o', '.lst', '.bst'].includes(ext)) {
      const content = await fs.readFile(filePath, 'utf8');
      const key = ext.slice(1) + 'Files';

      if (!artifacts[key]) artifacts[key] = [];
      artifacts[key].push({ name: entry, content });
    }
  }

  return artifacts;
}

module.exports = { runEmulator };
