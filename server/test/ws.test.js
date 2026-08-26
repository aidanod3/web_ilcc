import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';

let server, port;
beforeAll(async () => {
  ({ server } = require('../index.js'));
  if (!server.listening) await new Promise(r => server.listen(0, r));
  port = server.address().port;
});
afterAll(() => new Promise(r => server.close(r)));

function session(pathname, script) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}${pathname}`);
    const out = [];
    const t = setTimeout(() => { ws.terminate(); reject(new Error('ws timeout')); }, 5000);
    ws.on('open', () => script.onOpen?.(ws));
    ws.on('message', (m) => {
      const j = JSON.parse(m);
      out.push(j);
      script.onMessage?.(ws, j);
      if (j.type === 'done' || j.type === 'error') { clearTimeout(t); ws.close(); resolve(out); }
    });
    ws.on('error', (e) => { clearTimeout(t); resolve({ error: e }); });
  });
}
const outputOf = (msgs) => msgs.filter(m => m.type === 'output').map(m => m.text).join('');

describe('WS /api/run', () => {
  it('runs to completion', async () => {
    const msgs = await session('/api/run', {
      onOpen: ws => ws.send(JSON.stringify({ type: 'start', code: '    mov r0, 5\n    dout r0\n    nl\n    halt\n' })),
    });
    expect(outputOf(msgs)).toBe('5\n');
    expect(msgs.at(-1).type).toBe('done');
  });

  it('echoes typed input like a tty (browser path keeps echo ON)', async () => {
    const msgs = await session('/api/run', {
      onOpen: ws => ws.send(JSON.stringify({ type: 'start', code: '    din r0\n    add r0,r0,r0\n    dout r0\n    nl\n    halt\n' })),
      onMessage: (ws, j) => { if (j.type === 'input_request') ws.send(JSON.stringify({ type: 'input', text: '7' })); },
    });
    expect(msgs.some(m => m.type === 'input_request')).toBe(true);
    expect(outputOf(msgs)).toBe('7\n14\n');
  });

  it('assembly error → error message', async () => {
    const msgs = await session('/api/run', { onOpen: ws => ws.send(JSON.stringify({ type: 'start', code: '    bogus\n' })) });
    expect(msgs.at(-1).type).toBe('error');
  });

  it('rejects bad JSON gracefully', async () => {
    const msgs = await session('/api/run', { onOpen: ws => ws.send('not json') });
    expect(msgs[0]).toMatchObject({ type: 'error' });
  });
});

describe('WS /api/debug', () => {
  it('start → memory_init + line_map, then step returns a diff', async () => {
    let stepped = false;
    const msgs = await session('/api/debug', {
      onOpen: ws => ws.send(JSON.stringify({ type: 'start', code: '    mov r0, 5\n    dout r0\n    halt\n' })),
      onMessage: (ws, j) => {
        if (j.type === 'line_map' && !stepped) { stepped = true; ws.send(JSON.stringify({ type: 'step', n: 3 })); }
      },
    });
    const types = msgs.map(m => m.type);
    expect(types).toContain('memory_init');
    expect(types).toContain('line_map');
    expect(types).toContain('step_result');
    expect(outputOf(msgs)).toBe('5');
  });
});

describe('WS hardening', () => {
  it('unknown path is destroyed', async () => {
    const r = await session('/api/nope', {});
    expect(r.error).toBeTruthy();
  });

  it('oversized frame is rejected (maxPayload)', async () => {
    const big = 'x'.repeat(200 * 1024);
    const r = await new Promise(resolve => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/api/run`);
      ws.on('open', () => ws.send(JSON.stringify({ type: 'start', code: big })));
      ws.on('close', (code) => resolve(code));
      ws.on('error', () => {});
      setTimeout(() => resolve('timeout'), 3000);
    });
    expect(r).toBe(1009);   // message too big
  });
});
