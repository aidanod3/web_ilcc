const crypto = require('crypto');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Path to the interactive interpreter in the submodule
const iinterpreterPath = path.join(
  __dirname, '..', '..', 'interactive_lccjs', 'src', 'interactive', 'ilcc.js'
);

const sessions = new Map();

/**
 * Create a new debug session.
 * Assembles the code and prepares the interactive interpreter for stepping.
 *
 * For now, we use a subprocess approach: spawn the interactive interpreter
 * with flags that allow programmatic stepping via stdin/stdout.
 *
 * @param {string|string[]} sourceCode
 * @param {string[]} [fileNames]
 * @returns {Promise<{sessionId, state}>}
 */
async function createSession(sourceCode, fileNames) {
  const sessionId = crypto.randomUUID();
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'weblcc-debug-'));

  // Write source files
  const sources = Array.isArray(sourceCode) ? sourceCode : [sourceCode];
  const names = fileNames || (sources.length === 1 ? ['program.a'] : sources.map((_, i) => `file${i}.a`));

  for (let i = 0; i < sources.length; i++) {
    await fsp.writeFile(path.join(tmpDir, names[i]), sources[i], 'utf8');
  }

  const sourcePaths = names.map((n) => path.join(tmpDir, n));

  // Store session metadata - the actual interpreter integration
  // will be built when the interactive interpreter is adapted for web use.
  // For now, store the session info and provide a basic step-through
  // using the core emulator's debug capability.
  const session = {
    id: sessionId,
    tmpDir,
    sourcePaths,
    sourceCode: sources,
    fileNames: names,
    lastAccess: Date.now(),
    snapshots: [],
    currentStep: 0,
    running: true,
  };

  sessions.set(sessionId, session);
  scheduleCleanup(sessionId);

  return {
    sessionId,
    state: {
      stepNumber: 0,
      totalSteps: 0,
      pc: '0x0000',
      ir: '0x0000',
      registers: { r0: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0, r6: 0, r7: 0 },
      flags: { n: 0, z: 0, c: 0, v: 0 },
      memoryChanges: [],
      output: '',
      running: true,
    },
  };
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  session.lastAccess = Date.now();
  return session;
}

async function destroySession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    await fsp.rm(session.tmpDir, { recursive: true, force: true }).catch(() => {});
    sessions.delete(sessionId);
  }
}

function scheduleCleanup(sessionId) {
  setTimeout(() => {
    const session = sessions.get(sessionId);
    if (session && Date.now() - session.lastAccess >= SESSION_TIMEOUT_MS) {
      destroySession(sessionId);
    } else if (session) {
      scheduleCleanup(sessionId);
    }
  }, SESSION_TIMEOUT_MS);
}

module.exports = { createSession, getSession, destroySession };
