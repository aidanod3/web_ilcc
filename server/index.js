const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');

/* Make fatalExit() throw instead of process.exit() throughout the
   assembler and interpreter when running inside the web server. */
global.it = function () {};

const { handleRunSocket }   = require('./src/routes/run');
const { handleDebugSocket } = require('./src/routes/debug');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* Returns every .a file in src/demos as [{ name, content }] */
app.get('/api/demos', (req, res) => {
  const demosDir = path.join(__dirname, 'src', 'demos');
  try {
    const files = fs.readdirSync(demosDir)
      .filter(f => f.endsWith('.a'))
      .sort();
    const demos = files.map(name => ({
      name,
      content: fs.readFileSync(path.join(demosDir, name), 'utf8'),
    }));
    res.json(demos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read demos directory' });
  }
});

/* ── WebSocket server ──
   noServer: true means we handle the HTTP upgrade ourselves,
   which lets us route different paths to different handlers. */
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const { url } = request;

  if (url === '/api/run') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      handleRunSocket(ws);
    });
  } else if (url === '/api/debug') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      handleDebugSocket(ws);
    });
  } else {
    /* Reject unknown WebSocket paths. */
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
