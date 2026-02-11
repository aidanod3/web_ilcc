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

app.listen(port, () => {
  console.log(`WebLCC backend listening on http://localhost:${port}`);
});
