const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');
const Assembler = require('../emulator/src/core/assembler');
const Interpreter = require('../emulator/src/core/interpreter');

const app = express();
const port = process.env.PORT || 3002;
process.env.LCCJS_THROW_ON_ERROR = '1';

app.use(cors());
app.use(express.json({ limit: '256kb' }));

const emulatorPath = path.join(
  __dirname,
  '..',
  'emulator',
  'src',
  'core',
  'lcc.js'
);

const MAX_MEMORY = 0x10000;
const STACK_PREVIEW_SIZE = 16;
const MEMORY_PREVIEW_CELLS = 32;
const MEMORY_ROW_SIZE = 4;
const TRACE_SESSION_TTL_MS = 30 * 60 * 1000;
const TRACE_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

const traceSessions = new Map();

function formatHex(value) {
  const normalized = ((value % 0x10000) + 0x10000) % 0x10000;
  return `0x${normalized.toString(16).padStart(4, '0')}`;
}

function buildAddressMap(listing) {
  const map = new Map();
  if (!Array.isArray(listing)) return map;

  listing.forEach((entry) => {
    if (!entry || !Array.isArray(entry.codeWords) || entry.codeWords.length === 0) {
      return;
    }
    entry.codeWords.forEach((_, index) => {
      const addr = (entry.locCtr + index) & 0xffff;
      if (!map.has(addr)) {
        map.set(addr, {
          lineNumber: entry.lineNum,
          sourceLine: entry.sourceLine,
          mnemonic: entry.mnemonic,
          label: entry.label
        });
      }
    });
  });
  return map;
}

function buildRegisterList(registers) {
  const aliases = { 5: 'FP', 6: 'SP', 7: 'LR' };
  return registers.map((value, index) => ({
    name: aliases[index] ? `r${index} (${aliases[index]})` : `r${index}`,
    value: formatHex(value)
  }));
}

function buildFlags(flags) {
  const n = flags.n ? 1 : 0;
  const z = flags.z ? 1 : 0;
  const c = flags.c ? 1 : 0;
  const v = flags.v ? 1 : 0;
  const p = n === 0 && z === 0 ? 1 : 0;
  return { N: n, Z: z, P: p, C: c, V: v };
}

function buildStack(mem, sp, fp) {
  const items = [];
  const max = Math.min(STACK_PREVIEW_SIZE, MAX_MEMORY - sp);
  for (let offset = 0; offset < max; offset += 1) {
    const addr = (sp + offset) & 0xffff;
    const tags = [];
    if (addr === sp) tags.push('SP');
    if (addr === fp) tags.push('FP');
    items.push({
      addr: formatHex(addr),
      value: formatHex(mem[addr]),
      tags
    });
  }
  return items;
}

function buildMemoryRows(mem, sp, fp, pc) {
  let start = sp - Math.floor(MEMORY_PREVIEW_CELLS / 2);
  if (start < 0) start = 0;
  if (start + MEMORY_PREVIEW_CELLS > MAX_MEMORY) {
    start = MAX_MEMORY - MEMORY_PREVIEW_CELLS;
  }
  start = Math.max(0, start);
  start -= start % MEMORY_ROW_SIZE;
  if (start + MEMORY_PREVIEW_CELLS > MAX_MEMORY) {
    start = Math.max(0, MAX_MEMORY - MEMORY_PREVIEW_CELLS);
  }

  const rows = [];
  for (let offset = 0; offset < MEMORY_PREVIEW_CELLS; offset += MEMORY_ROW_SIZE) {
    const rowAddr = (start + offset) & 0xffff;
    const cells = [];
    for (let cell = 0; cell < MEMORY_ROW_SIZE; cell += 1) {
      const addr = (rowAddr + cell) & 0xffff;
      const tags = [];
      if (addr === sp) tags.push('SP');
      if (addr === fp) tags.push('FP');
      if (addr === pc) tags.push('PC');
      cells.push({
        addr: formatHex(addr),
        value: formatHex(mem[addr]),
        tags
      });
    }
    rows.push({ addr: formatHex(rowAddr), cells });
  }
  return rows;
}

function buildStatus(interpreter) {
  return {
    running: Boolean(interpreter.running),
    pauseReason: interpreter.pauseReason || null,
    halted: interpreter.pauseReason === 'halt',
    waitingForInput: interpreter.pauseReason === 'input'
  };
}

function buildSnapshot(session, traceMeta) {
  const interpreter = session.interpreter;
  const regs = Array.from(interpreter.r);
  const sp = regs[6] ?? 0;
  const fp = regs[5] ?? 0;
  const pc = interpreter.pc & 0xffff;

  const executedAddress = traceMeta ? (traceMeta.address & 0xffff) : pc;
  const entry = session.addressMap.get(executedAddress) || {};

  const mnemonic = traceMeta?.mnemonic || entry.mnemonic || 'INIT';

  return {
    lineNumber: entry.lineNumber || 0,
    code: entry.sourceLine || '',
    pc: formatHex(executedAddress),
    nextPc: formatHex(pc),
    ir: formatHex(traceMeta?.ir ?? interpreter.ir ?? 0),
    mnemonic,
    action: traceMeta ? `${mnemonic} @ ${formatHex(executedAddress)}` : 'Program loaded',
    registers: buildRegisterList(regs),
    special: [
      { name: 'pc', value: formatHex(pc) },
      { name: 'ir', value: formatHex(interpreter.ir ?? 0) }
    ],
    flags: buildFlags({ n: interpreter.n, z: interpreter.z, c: interpreter.c, v: interpreter.v }),
    stack: buildStack(interpreter.mem, sp, fp),
    memory: buildMemoryRows(interpreter.mem, sp, fp, pc),
    decoded: {
      opcode: traceMeta?.opcode ?? null,
      eopcode: traceMeta?.eopcode ?? null,
      dr: traceMeta?.dr ?? null,
      sr: traceMeta?.sr ?? null,
      sr1: traceMeta?.sr1 ?? null,
      sr2: traceMeta?.sr2 ?? null,
      baser: traceMeta?.baser ?? null,
      imm5: traceMeta?.imm5 ?? null,
      pcoffset9: traceMeta?.pcoffset9 ?? null,
      pcoffset11: traceMeta?.pcoffset11 ?? null,
      offset6: traceMeta?.offset6 ?? null,
      trapvec: traceMeta?.trapvec ?? null
    }
  };
}

async function removeTraceSession(sessionId) {
  const session = traceSessions.get(sessionId);
  if (!session) return;
  traceSessions.delete(sessionId);
  await fs.rm(session.tmpDir, { recursive: true, force: true });
}

async function createCompiledSession(source, input = '') {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'weblcc-trace-'));
  const sourcePath = path.join(tmpDir, 'program.a');
  const executablePath = path.join(tmpDir, 'program.e');

  await fs.writeFile(sourcePath, source, 'utf8');

  const assembler = new Assembler();
  assembler.inputFileName = sourcePath;
  assembler.outputFileName = executablePath;
  assembler.main([sourcePath]);

  const interpreter = new Interpreter();
  interpreter.options = { pauseOnInput: true };
  interpreter.inputBuffer = input;
  interpreter.loadExecutableFile(executablePath);
  interpreter.traceHook = (snapshot) => {
    interpreter.lastTraceSnapshot = snapshot;
  };

  const sessionId = crypto.randomUUID();
  const now = Date.now();
  const session = {
    id: sessionId,
    source,
    tmpDir,
    sourcePath,
    executablePath,
    addressMap: buildAddressMap(assembler.listing),
    interpreter,
    createdAt: now,
    updatedAt: now
  };

  traceSessions.set(sessionId, session);

  return session;
}

function touchSession(session) {
  session.updatedAt = Date.now();
}

function appendInput(session, input) {
  if (typeof input !== 'string' || input.length === 0) return;
  session.interpreter.inputBuffer += input;
}

function resumeIfPaused(session) {
  const interpreter = session.interpreter;
  if (!interpreter.running) {
    if (interpreter.pauseReason === 'halt') return false;
    interpreter.pauseReason = null;
    interpreter.running = true;
  }
  return true;
}

function stepSession(session) {
  const interpreter = session.interpreter;
  if (!resumeIfPaused(session)) {
    return { executed: false, snapshot: buildSnapshot(session, interpreter.lastTraceSnapshot || null) };
  }

  interpreter.lastTraceSnapshot = null;
  interpreter.step();
  return {
    executed: true,
    snapshot: buildSnapshot(session, interpreter.lastTraceSnapshot || null)
  };
}

function tracePayload(session, snapshot, extra = {}) {
  return {
    sessionId: session.id,
    status: buildStatus(session.interpreter),
    snapshot,
    output: session.interpreter.output,
    ...extra
  };
}

setInterval(async () => {
  const cutoff = Date.now() - TRACE_SESSION_TTL_MS;
  const ids = [];
  for (const [sessionId, session] of traceSessions.entries()) {
    if (session.updatedAt < cutoff) {
      ids.push(sessionId);
    }
  }

  for (const sessionId of ids) {
    await removeTraceSession(sessionId);
  }
}, TRACE_SWEEP_INTERVAL_MS).unref();

app.post('/api/run', async (req, res) => {
  const source = req.body && req.body.source;
  if (!source || typeof source !== 'string') {
    return res.status(400).json({ error: 'Missing source' });
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'weblcc-'));
  const sourcePath = path.join(tmpDir, 'program.a');

  try {
    await fs.writeFile(sourcePath, source, 'utf8');

    const child = spawn('node', [emulatorPath, sourcePath], {
      cwd: tmpDir,
      env: { ...process.env, LCCJS_THROW_ON_ERROR: '0' }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const exitCode = await new Promise((resolve) => {
      child.on('close', resolve);
    });

    return res.json({ stdout, stderr, exitCode });
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

app.post('/api/trace/sessions', async (req, res) => {
  const source = req.body?.source;
  const input = typeof req.body?.input === 'string' ? req.body.input : '';

  if (!source || typeof source !== 'string') {
    return res.status(400).json({ error: 'Missing source' });
  }

  try {
    const session = await createCompiledSession(source, input);
    const snapshot = buildSnapshot(session, null);
    return res.json(tracePayload(session, snapshot));
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});

app.get('/api/trace/sessions/:sessionId/state', async (req, res) => {
  const session = traceSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Trace session not found' });
  }

  touchSession(session);
  const snapshot = buildSnapshot(session, session.interpreter.lastTraceSnapshot || null);
  return res.json(tracePayload(session, snapshot));
});

app.post('/api/trace/sessions/:sessionId/step', async (req, res) => {
  const session = traceSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Trace session not found' });
  }

  const input = typeof req.body?.input === 'string' ? req.body.input : '';
  const count = Number.isInteger(req.body?.count)
    ? Math.max(1, Math.min(req.body.count, 500))
    : 1;

  try {
    appendInput(session, input);

    let executedSteps = 0;
    let current = { snapshot: buildSnapshot(session, session.interpreter.lastTraceSnapshot || null) };

    while (executedSteps < count) {
      if (!session.interpreter.running && session.interpreter.pauseReason === 'halt') {
        break;
      }

      current = stepSession(session);
      if (!current.executed) {
        break;
      }
      executedSteps += 1;

      if (!session.interpreter.running) {
        break;
      }
    }

    touchSession(session);

    return res.json(
      tracePayload(session, current.snapshot, {
        executedSteps
      })
    );
  } catch (error) {
    await removeTraceSession(session.id);
    return res.status(500).json({ error: String(error) });
  }
});

app.post('/api/trace/sessions/:sessionId/continue', async (req, res) => {
  const session = traceSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Trace session not found' });
  }

  const input = typeof req.body?.input === 'string' ? req.body.input : '';
  const maxSteps = Number.isInteger(req.body?.maxSteps)
    ? Math.max(1, Math.min(req.body.maxSteps, 20000))
    : 5000;

  try {
    appendInput(session, input);

    let executedSteps = 0;
    let current = { snapshot: buildSnapshot(session, session.interpreter.lastTraceSnapshot || null) };

    while (executedSteps < maxSteps) {
      if (!session.interpreter.running && session.interpreter.pauseReason === 'halt') {
        break;
      }

      current = stepSession(session);
      if (!current.executed) {
        break;
      }
      executedSteps += 1;

      if (!session.interpreter.running) {
        break;
      }
    }

    touchSession(session);

    return res.json(
      tracePayload(session, current.snapshot, {
        executedSteps,
        maxStepsReached: executedSteps === maxSteps && session.interpreter.running
      })
    );
  } catch (error) {
    await removeTraceSession(session.id);
    return res.status(500).json({ error: String(error) });
  }
});

app.post('/api/trace/sessions/:sessionId/reset', async (req, res) => {
  const session = traceSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Trace session not found' });
  }

  const input = typeof req.body?.input === 'string' ? req.body.input : '';

  try {
    const interpreter = new Interpreter();
    interpreter.options = { pauseOnInput: true };
    interpreter.inputBuffer = input;
    interpreter.loadExecutableFile(session.executablePath);
    interpreter.traceHook = (snapshot) => {
      interpreter.lastTraceSnapshot = snapshot;
    };

    session.interpreter = interpreter;
    touchSession(session);

    const snapshot = buildSnapshot(session, null);
    return res.json(tracePayload(session, snapshot));
  } catch (error) {
    await removeTraceSession(session.id);
    return res.status(500).json({ error: String(error) });
  }
});

app.delete('/api/trace/sessions/:sessionId', async (req, res) => {
  const session = traceSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Trace session not found' });
  }

  await removeTraceSession(session.id);
  return res.status(204).send();
});

// Backward-compatible endpoint for existing clients.
app.post('/api/trace', async (req, res) => {
  const source = req.body?.source;
  if (!source || typeof source !== 'string') {
    return res.status(400).json({ error: 'Missing source' });
  }

  try {
    const session = await createCompiledSession(source, typeof req.body?.input === 'string' ? req.body.input : '');
    const steps = [];

    while (session.interpreter.running) {
      const current = stepSession(session);
      if (!current.executed) break;
      steps.push(current.snapshot);
      if (!session.interpreter.running) break;
    }

    const output = session.interpreter.output;
    const haltReason = session.interpreter.pauseReason || (session.interpreter.running ? 'unknown' : 'halt');

    await removeTraceSession(session.id);

    return res.json({ steps, output, haltReason });
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});

app.listen(port, () => {
  console.log(`WebLCC backend listening on http://localhost:${port}`);
});
