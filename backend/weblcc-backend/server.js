const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const port = process.env.PORT || 3001;

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

function formatHex(value) {
  const normalized = ((value % 0x10000) + 0x10000) % 0x10000;
  return `x${normalized.toString(16).padStart(4, '0')}`;
}

function parseImmediate(token) {
  if (!token) return null;
  const trimmed = token.trim();
  if (/^x[0-9a-f]+$/i.test(trimmed)) {
    return parseInt(trimmed.slice(1), 16);
  }
  if (/^#?-?\d+$/.test(trimmed)) {
    return parseInt(trimmed.replace('#', ''), 10);
  }
  return null;
}

function snapshotState(registers, stack) {
  return {
    registers: Object.entries(registers).map(([name, value]) => ({
      name,
      value: formatHex(value)
    })),
    stack: stack.map((value, index) => ({
      addr: formatHex(0x4000 - index),
      value: formatHex(value)
    }))
  };
}

function traceSource(source) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const registers = {
    r0: 0,
    r1: 0,
    r2: 0,
    r3: 0,
    r4: 0,
    r5: 0,
    r6: 0x4000,
    r7: 0
  };
  const stack = [];
  const steps = [];

  lines.forEach((rawLine, index) => {
    const commentStripped = rawLine.split(';')[0];
    if (!commentStripped.trim()) {
      return;
    }

    let action = 'Execute line';
    let opcode = '';
    let parts = [];
    let lineForParse = commentStripped.trim();

    if (lineForParse.includes(':')) {
      const [label, rest] = lineForParse.split(/:(.*)/s);
      const remainder = (rest || '').trim();
      if (!remainder) {
        steps.push({
          lineNumber: index + 1,
          code: rawLine,
          action: `Label ${label.trim()}`,
          ...snapshotState(registers, stack)
        });
        return;
      }
      lineForParse = remainder;
    }

    parts = lineForParse.split(/\s+/);
    opcode = parts[0].toLowerCase();

    if (opcode === 'push') {
      const value = parseImmediate(parts[1]) ?? 0;
      stack.unshift(value);
      registers.r6 = 0x4000 - stack.length;
      action = `push ${parts[1] || ''}`.trim();
    } else if (opcode === 'pop') {
      const target = (parts[1] || '').replace(',', '').toLowerCase();
      const popped = stack.shift() ?? 0;
      if (registers[target] !== undefined) {
        registers[target] = popped;
      }
      registers.r6 = 0x4000 - stack.length;
      action = `pop ${parts[1] || ''}`.trim();
    } else if (opcode === 'ld' || opcode === 'mov') {
      const target = (parts[1] || '').replace(',', '').toLowerCase();
      const value = parseImmediate(parts[2] || parts[1]);
      if (registers[target] !== undefined && value !== null) {
        registers[target] = value;
      }
      action = `load ${target}`;
    } else if (opcode === 'add' || opcode === 'sub' || opcode === 'and') {
      const target = (parts[1] || '').replace(',', '').toLowerCase();
      const left = (parts[2] || '').replace(',', '').toLowerCase();
      const rightToken = (parts[3] || '').replace(',', '');
      const rightImmediate = parseImmediate(rightToken);
      if (
        registers[target] !== undefined &&
        registers[left] !== undefined &&
        rightImmediate !== null
      ) {
        const base = registers[left];
        if (opcode === 'add') {
          registers[target] = base + rightImmediate;
        } else if (opcode === 'sub') {
          registers[target] = base - rightImmediate;
        } else {
          registers[target] = base & rightImmediate;
        }
      }
      action = `${opcode} ${target}`;
    } else if (opcode.startsWith('.')) {
      action = `directive ${opcode}`;
    } else if (opcode) {
      action = opcode;
    }

    steps.push({
      lineNumber: index + 1,
      code: rawLine,
      action,
      ...snapshotState(registers, stack)
    });
  });

  return steps;
}

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
      env: process.env
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

app.post('/api/trace', async (req, res) => {
  const source = req.body && req.body.source;
  if (!source || typeof source !== 'string') {
    return res.status(400).json({ error: 'Missing source' });
  }

  try {
    const steps = traceSource(source);
    return res.json({ steps });
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});


app.listen(port, () => {
  console.log(`WebLCC backend listening on http://localhost:${port}`);
});
