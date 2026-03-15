import { useEffect, useMemo, useReducer, useRef, useState } from 'react';

const REG_NAMES = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5 (FP)', 'R6 (SP)', 'R7 (LR)', 'PC', 'IR'];
const FLAG_NAMES = ['N', 'Z', 'P', 'C', 'V'];

const THEME = {
  dark: {
    bg: '#0e0e0f',
    panel: '#18181b',
    panel2: '#1e1e22',
    border: '#2a2a2f',
    text: '#e2e2e5',
    mut: '#8a8a96',
    accent: '#f7a800',
    red: '#ff5f5f',
    green: '#3ddc84',
    orange: '#ffb457',
    yellow: '#ffd866',
    cyan: '#4fd8ff',
    activeLine: 'rgba(79,124,255,0.18)',
    activeLineFlashFwd: 'rgba(79,124,255,0.4)',
    activeLineFlashBack: 'rgba(255,180,87,0.35)'
  },
  light: {
    bg: '#f7f7f8',
    panel: '#ffffff',
    panel2: '#f2f2f5',
    border: '#dadbe2',
    text: '#1d1e23',
    mut: '#5b5f6a',
    accent: '#c98700',
    red: '#e03434',
    green: '#1a9e5c',
    orange: '#c9781d',
    yellow: '#9f7a00',
    cyan: '#0f7fa3',
    activeLine: 'rgba(58,99,232,0.12)',
    activeLineFlashFwd: 'rgba(58,99,232,0.3)',
    activeLineFlashBack: 'rgba(201,120,29,0.28)'
  }
};

const SAMPLE_CODE = `; Add two input numbers (LCC)\nstartup:    bl main\n            halt\n\nmain:       push lr\n            push fp\n            mov fp, sp\n\n            lea r0, promptA\n            sout r0\n            din r1\n\n            lea r0, promptB\n            sout r0\n            din r2\n\n            add r3, r1, r2\n            lea r0, sumMsg\n            sout r0\n            dout r3\n            nl\n\n            mov sp, fp\n            pop fp\n            pop lr\n            ret\n\npromptA:    .string \"Enter first number: \"\npromptB:    .string \"Enter second number: \"\nsumMsg:     .string \"Sum: \"\n`;
const SAMPLE_CODE_LOOP = `; Count from 1 to 5 (LCC)\nstartup:    bl main\n            halt\n\nmain:       mov r0, 1\nloopTop:    dout r0\n            nl\n            add r0, r0, 1\n            cmp r0, 6\n            brn loopTop\n            brz loopTop\n            ret\n`;

const SAMPLE_PROGRAMS = [
  { id: 'sample-main', name: 'Sample: Sum', source: SAMPLE_CODE },
  { id: 'sample-loop', name: 'Sample: Loop', source: SAMPLE_CODE_LOOP }
];

function toHex(value, width = 8) {
  const normalized = (value >>> 0).toString(16).toUpperCase();
  return `0x${normalized.padStart(width, '0')}`;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function normalizeAsmFileName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\.c$/i, '.a');
}

function parseNum(token) {
  const t = token.trim();
  if (/^0x[0-9a-f]+$/i.test(t)) return Number.parseInt(t, 16) >>> 0;
  if (/^-?\d+$/.test(t)) return Number.parseInt(t, 10) >>> 0;
  if (/^'.'$/.test(t)) return t.charCodeAt(1) >>> 0;
  return null;
}

function splitComment(line) {
  return line.split(';')[0].split('//')[0].trim();
}

function labelAndRest(line) {
  const m = line.match(/^\s*([A-Za-z_][\w]*):\s*(.*)$/);
  if (!m) return null;
  return { label: m[1], rest: m[2] || '' };
}

function buildContext(source) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const labelToLine = {};
  const labelAddress = {};
  const labelStrings = {};
  const lineInstruction = {};
  const execOrder = [];

  let dataAddr = 0x00401000;

  lines.forEach((raw, idx) => {
    const clean = splitComment(raw);
    if (!clean) return;

    const lr = labelAndRest(clean);
    let body = clean;

    if (lr) {
      labelToLine[lr.label] = idx;
      body = lr.rest.trim();
    }

    if (!body) return;

    const wordDecl = body.match(/^\.word\s+(.+)$/i);
    const byteDecl = body.match(/^\.byte\s+(.+)$/i);
    const strDecl = body.match(/^\.string\s+"([\s\S]*)"$/i);

    if (wordDecl && lr) {
      labelAddress[lr.label] = dataAddr >>> 0;
      dataAddr += 4;
      return;
    }

    if (byteDecl && lr) {
      labelAddress[lr.label] = dataAddr >>> 0;
      dataAddr += 1;
      return;
    }

    if (strDecl && lr) {
      labelAddress[lr.label] = dataAddr >>> 0;
      labelStrings[lr.label] = strDecl[1];
      dataAddr += strDecl[1].length + 1;
      return;
    }

    if (/^section\b/i.test(body)) return;

    lineInstruction[idx] = body;
    execOrder.push(idx);
  });

  const labelToExecIndex = {};
  Object.entries(labelToLine).forEach(([label, line]) => {
    const i = execOrder.indexOf(Number(line));
    if (i >= 0) labelToExecIndex[label] = i;
  });

  const initialMemory = {};
  lines.forEach((raw) => {
    const clean = splitComment(raw);
    if (!clean) return;
    const lr = labelAndRest(clean);
    if (!lr) return;

    const wordDecl = lr.rest.match(/^\.word\s+(.+)$/i);
    const byteDecl = lr.rest.match(/^\.byte\s+(.+)$/i);
    const strDecl = lr.rest.match(/^\.string\s+"([\s\S]*)"$/i);
    if (wordDecl) {
      const n = parseNum(wordDecl[1]) ?? 0;
      initialMemory[labelAddress[lr.label]] = n >>> 0;
    } else if (byteDecl) {
      const n = parseNum(byteDecl[1]) ?? 0;
      initialMemory[labelAddress[lr.label]] = n & 0xff;
    } else if (strDecl) {
      const base = labelAddress[lr.label];
      const s = strDecl[1];
      for (let i = 0; i < s.length; i += 1) {
        initialMemory[(base + i) >>> 0] = s.charCodeAt(i) & 0xff;
      }
      initialMemory[(base + s.length) >>> 0] = 0;
    }
  });

  return {
    lines,
    execOrder,
    lineInstruction,
    labelToLine,
    labelToExecIndex,
    labelAddress,
    labelStrings,
    initialMemory
  };
}

function createMachine(ctx) {
  const regs = {
    EAX: 0,
    EBX: 0,
    ECX: 0,
    EDX: 0,
    ESI: 0,
    EDI: 0,
    ESP: 0x7fffeffc,
    EBP: 0x7fffeffc,
    EIP: ctx.execOrder[0] ?? 0
  };
  const flags = { ZF: 0, SF: 0, CF: 0, OF: 0, PF: 0, AF: 0 };

  return {
    registers: regs,
    flags,
    memory: { ...ctx.initialMemory },
    touched: new Set(Object.keys(ctx.initialMemory).map((k) => Number(k))),
    pcExec: 0,
    halted: false,
    lastLeaLabel: null,
    poppedRows: []
  };
}

function cloneMachine(machine) {
  return {
    registers: { ...machine.registers },
    flags: { ...machine.flags },
    memory: { ...machine.memory },
    touched: new Set(machine.touched),
    pcExec: machine.pcExec,
    halted: machine.halted,
    lastLeaLabel: machine.lastLeaLabel,
    poppedRows: machine.poppedRows.map((r) => ({ ...r }))
  };
}

function isReg(token) {
  return REG_NAMES.includes(token.toUpperCase());
}

function resolveLabelAddress(token, ctx) {
  const name = token.replace(/\[|\]/g, '').trim();
  if (ctx.labelAddress[name] != null) return ctx.labelAddress[name] >>> 0;
  return null;
}

function readOperand(token, machine, ctx) {
  const t = token.trim();
  if (isReg(t)) return machine.registers[t.toUpperCase()] >>> 0;
  if (/^\[.+\]$/.test(t)) {
    const inner = t.slice(1, -1).trim();
    if (isReg(inner)) {
      const addr = machine.registers[inner.toUpperCase()] >>> 0;
      return machine.memory[addr] ?? 0;
    }
    const addrFromLabel = resolveLabelAddress(inner, ctx);
    if (addrFromLabel != null) return machine.memory[addrFromLabel] ?? 0;
    const n = parseNum(inner);
    if (n != null) return machine.memory[n >>> 0] ?? 0;
    return 0;
  }
  const lbl = resolveLabelAddress(t, ctx);
  if (lbl != null) return lbl;
  const n = parseNum(t);
  return n == null ? 0 : n >>> 0;
}

function writeOperand(token, value, machine, ctx) {
  const t = token.trim();
  if (isReg(t)) {
    machine.registers[t.toUpperCase()] = value >>> 0;
    return;
  }
  let addr = null;
  if (/^\[.+\]$/.test(t)) {
    const inner = t.slice(1, -1).trim();
    if (isReg(inner)) addr = machine.registers[inner.toUpperCase()] >>> 0;
    else if (resolveLabelAddress(inner, ctx) != null) addr = resolveLabelAddress(inner, ctx);
    else {
      const n = parseNum(inner);
      if (n != null) addr = n >>> 0;
    }
  } else if (resolveLabelAddress(t, ctx) != null) {
    addr = resolveLabelAddress(t, ctx);
  }

  if (addr != null) {
    machine.memory[addr] = value >>> 0;
    machine.touched.add(addr);
  }
}

function updateBasicFlags(machine, value) {
  const v = value >>> 0;
  machine.flags.ZF = v === 0 ? 1 : 0;
  machine.flags.SF = (v & 0x80000000) !== 0 ? 1 : 0;
  machine.flags.PF = (v & 1) === 0 ? 1 : 0;
}

function parseInstruction(line) {
  const [opRaw, ...rest] = line.trim().split(/\s+/);
  const op = opRaw.toLowerCase();
  const argsRaw = line.trim().slice(opRaw.length).trim();
  const args = argsRaw ? argsRaw.split(',').map((a) => a.trim()) : [];
  return { op, args, raw: line };
}

function explainInstructionLine(rawLine) {
  const clean = splitComment(rawLine || '');
  if (!clean) return '';

  const labeled = labelAndRest(clean);
  const body = (labeled ? labeled.rest : clean).trim();
  if (!body) {
    if (!labeled) return '';
    return `Label "${labeled.label}" marks this location for jumps/calls.`;
  }

  const { op, args } = parseInstruction(body);
  const a0 = args[0] || '';
  const a1 = args[1] || '';
  const a2 = args[2] || '';
  const src = a1.replace(/^\[/, '').replace(/\]$/, '');

  switch (op) {
    case 'push':
      return `Pushes ${a0} onto the stack (SP moves down).`;
    case 'pop':
      return `Pops the top stack value into ${a0} (SP moves up).`;
    case 'mov':
      return `Copies ${a1} into ${a0}.`;
    case 'lea':
      return `Loads the address of ${src} into ${a0}.`;
    case 'add':
      return a2 ? `Adds ${a1} + ${a2}, stores result in ${a0}.` : `Adds ${a1} into ${a0}.`;
    case 'sub':
      return a2 ? `Subtracts ${a2} from ${a1}, stores result in ${a0}.` : `Subtracts ${a1} from ${a0}.`;
    case 'cmp':
      return `Compares ${a0} and ${a1}, updates condition flags.`;
    case 'brn':
      return `Branches to ${a0} if the result is negative (N flag set).`;
    case 'brz':
      return `Branches to ${a0} if the result is zero (Z flag set).`;
    case 'brp':
      return `Branches to ${a0} if the result is positive.`;
    case 'jmp':
      return `Unconditionally jumps to ${a0}.`;
    case 'bl':
    case 'jsr':
      return `Calls ${a0} and stores return address in LR.`;
    case 'ret':
      return 'Returns to the caller using LR.';
    case 'halt':
      return 'Stops program execution.';
    case 'din':
      return `Reads a decimal number from terminal input into ${a0}.`;
    case 'ain':
      return `Reads one character from terminal input into ${a0}.`;
    case 'hin':
      return `Reads a hexadecimal number from terminal input into ${a0}.`;
    case 'sin':
      return `Reads a string from terminal input into memory pointed by ${a0}.`;
    case 'dout':
      return `Prints ${a0} as a decimal number to terminal output.`;
    case 'aout':
      return `Prints ${a0} as a character to terminal output.`;
    case 'hout':
      return `Prints ${a0} as a hexadecimal value to terminal output.`;
    case 'sout':
      return `Prints the string at the memory address in ${a0}.`;
    case 'nl':
      return 'Prints a newline.';
    default:
      return `Executes "${body}".`;
  }
}

function push32(machine, value) {
  machine.registers.ESP = (machine.registers.ESP - 4) >>> 0;
  machine.memory[machine.registers.ESP] = value >>> 0;
  machine.touched.add(machine.registers.ESP);
}

function pop32(machine) {
  const addr = machine.registers.ESP >>> 0;
  const value = machine.memory[addr] ?? 0;
  machine.poppedRows.push({ addr, val: value, expiresAt: Date.now() + 1000 });
  machine.registers.ESP = (machine.registers.ESP + 4) >>> 0;
  return value >>> 0;
}

function inferInputMeta(machine, ctx) {
  const label = machine.lastLeaLabel || 'input';
  const addr = ctx.labelAddress[label] ?? machine.registers.EAX ?? 0;
  return { addr: addr >>> 0, label, type: 'int' };
}

function readStringFromMemory(addr, machine) {
  let out = '';
  let p = addr >>> 0;
  for (let i = 0; i < 128; i += 1) {
    const ch = machine.memory[p] ?? 0;
    if (ch === 0) break;
    out += String.fromCharCode(ch & 0xff);
    p = (p + 1) >>> 0;
  }
  return out;
}

function stepMachine(machineInput, ctx) {
  const machine = cloneMachine(machineInput);
  if (machine.halted) {
    return { machine, halted: true };
  }

  if (machine.pcExec < 0 || machine.pcExec >= ctx.execOrder.length) {
    machine.halted = true;
    return { machine, halted: true };
  }

  const lineIndex = ctx.execOrder[machine.pcExec];
  const text = ctx.lineInstruction[lineIndex] || '';
  const { op, args } = parseInstruction(text);
  let nextPc = machine.pcExec + 1;
  let output = null;
  let awaitingInput = null;

  const a0 = args[0] || '';
  const a1 = args[1] || '';

  const binMath = (fn) => {
    const left = readOperand(a0, machine, ctx);
    const right = readOperand(a1, machine, ctx);
    const result = fn(left >>> 0, right >>> 0) >>> 0;
    writeOperand(a0, result, machine, ctx);
    updateBasicFlags(machine, result);
  };

  switch (op) {
    case 'mov':
      writeOperand(a0, readOperand(a1, machine, ctx), machine, ctx);
      break;
    case 'add':
      binMath((x, y) => (x + y) >>> 0);
      break;
    case 'sub':
      binMath((x, y) => (x - y) >>> 0);
      break;
    case 'mul':
    case 'imul':
      binMath((x, y) => Math.imul(x, y) >>> 0);
      break;
    case 'div':
    case 'idiv': {
      const x = readOperand(a0, machine, ctx);
      const y = readOperand(a1, machine, ctx) || 1;
      const result = Math.floor((x >>> 0) / (y >>> 0)) >>> 0;
      writeOperand(a0, result, machine, ctx);
      updateBasicFlags(machine, result);
      break;
    }
    case 'xor':
      binMath((x, y) => x ^ y);
      break;
    case 'and':
      binMath((x, y) => x & y);
      break;
    case 'or':
      binMath((x, y) => x | y);
      break;
    case 'not': {
      const x = readOperand(a0, machine, ctx);
      const result = (~x) >>> 0;
      writeOperand(a0, result, machine, ctx);
      updateBasicFlags(machine, result);
      break;
    }
    case 'neg': {
      const x = readOperand(a0, machine, ctx);
      const result = (-x) >>> 0;
      writeOperand(a0, result, machine, ctx);
      updateBasicFlags(machine, result);
      break;
    }
    case 'inc': {
      const x = readOperand(a0, machine, ctx);
      const result = (x + 1) >>> 0;
      writeOperand(a0, result, machine, ctx);
      updateBasicFlags(machine, result);
      break;
    }
    case 'dec': {
      const x = readOperand(a0, machine, ctx);
      const result = (x - 1) >>> 0;
      writeOperand(a0, result, machine, ctx);
      updateBasicFlags(machine, result);
      break;
    }
    case 'cmp': {
      const x = readOperand(a0, machine, ctx);
      const y = readOperand(a1, machine, ctx);
      const r = (x - y) >>> 0;
      updateBasicFlags(machine, r);
      break;
    }
    case 'test': {
      const x = readOperand(a0, machine, ctx);
      const y = readOperand(a1, machine, ctx);
      updateBasicFlags(machine, (x & y) >>> 0);
      break;
    }
    case 'push':
      push32(machine, readOperand(a0, machine, ctx));
      break;
    case 'pop': {
      const v = pop32(machine);
      writeOperand(a0, v, machine, ctx);
      break;
    }
    case 'lea': {
      const inner = a1.replace(/^\[/, '').replace(/\]$/, '').trim();
      const addr = resolveLabelAddress(inner, ctx) ?? readOperand(inner, machine, ctx);
      writeOperand(a0, addr >>> 0, machine, ctx);
      machine.lastLeaLabel = inner;
      break;
    }
    case 'jmp':
      if (ctx.labelToExecIndex[a0] != null) nextPc = ctx.labelToExecIndex[a0];
      break;
    case 'je':
    case 'jz':
      if (machine.flags.ZF === 1 && ctx.labelToExecIndex[a0] != null) nextPc = ctx.labelToExecIndex[a0];
      break;
    case 'jne':
    case 'jnz':
      if (machine.flags.ZF === 0 && ctx.labelToExecIndex[a0] != null) nextPc = ctx.labelToExecIndex[a0];
      break;
    case 'jg':
    case 'ja':
      if (machine.flags.ZF === 0 && machine.flags.SF === 0 && ctx.labelToExecIndex[a0] != null) nextPc = ctx.labelToExecIndex[a0];
      break;
    case 'jl':
    case 'jb':
      if (machine.flags.SF === 1 && ctx.labelToExecIndex[a0] != null) nextPc = ctx.labelToExecIndex[a0];
      break;
    case 'jge':
      if (machine.flags.SF === 0 && ctx.labelToExecIndex[a0] != null) nextPc = ctx.labelToExecIndex[a0];
      break;
    case 'jle':
      if ((machine.flags.SF === 1 || machine.flags.ZF === 1) && ctx.labelToExecIndex[a0] != null) nextPc = ctx.labelToExecIndex[a0];
      break;
    case 'loop': {
      machine.registers.ECX = (machine.registers.ECX - 1) >>> 0;
      if (machine.registers.ECX !== 0 && ctx.labelToExecIndex[a0] != null) nextPc = ctx.labelToExecIndex[a0];
      break;
    }
    case 'call': {
      const target = a0.toLowerCase();
      if (['scanf', 'read'].includes(target)) {
        awaitingInput = inferInputMeta(machine, ctx);
      } else if (['printf', 'puts', 'write'].includes(target)) {
        const label = machine.lastLeaLabel;
        const textOut = label && ctx.labelAddress[label] != null
          ? readStringFromMemory(ctx.labelAddress[label], machine)
          : `Value: ${toHex(machine.registers.EAX)}`;
        output = textOut;
      } else if (ctx.labelToExecIndex[a0] != null) {
        push32(machine, nextPc >>> 0);
        nextPc = ctx.labelToExecIndex[a0];
      }
      break;
    }
    case 'ret':
      nextPc = pop32(machine) >>> 0;
      if (nextPc >= ctx.execOrder.length) {
        machine.halted = true;
      }
      break;
    case 'int': {
      const iv = a0.toLowerCase();
      if (iv === '0x80') {
        if ((machine.registers.EAX >>> 0) === 3) {
          awaitingInput = inferInputMeta(machine, ctx);
        } else if ((machine.registers.EAX >>> 0) === 4) {
          const addr = machine.registers.ECX >>> 0;
          output = readStringFromMemory(addr, machine) || `0x${(machine.registers.EDX >>> 0).toString(16)}`;
        } else if ((machine.registers.EAX >>> 0) === 1) {
          machine.halted = true;
        }
      }
      break;
    }
    default:
      break;
  }

  if (nextPc < 0 || nextPc >= ctx.execOrder.length) {
    machine.halted = true;
  } else {
    machine.pcExec = nextPc;
  }

  machine.poppedRows = machine.poppedRows.filter((r) => r.expiresAt > Date.now());

  const pcLine = ctx.execOrder[clamp(machine.pcExec, 0, Math.max(0, ctx.execOrder.length - 1))] ?? 0;
  machine.registers.EIP = pcLine >>> 0;

  return {
    machine,
    lineIndex,
    output,
    awaitingInput,
    halted: machine.halted
  };
}

function buildMemoryEntries(machine, ctx) {
  const addresses = new Set();

  Object.values(ctx.labelAddress).forEach((a) => addresses.add(a >>> 0));
  machine.touched.forEach((a) => addresses.add(a >>> 0));

  const esp = machine.registers.ESP >>> 0;
  for (let i = 0; i < 16; i += 1) addresses.add((esp + i * 4) >>> 0);

  const rows = Array.from(addresses)
    .sort((a, b) => a - b)
    .slice(0, 120)
    .map((addr) => {
      const label = Object.entries(ctx.labelAddress).find(([, a]) => a === addr)?.[0] || '';
      return {
        addr,
        addrHex: toHex(addr),
        val: machine.memory[addr] ?? 0,
        valHex: toHex(machine.memory[addr] ?? 0),
        label
      };
    });

  return rows;
}

function buildStackEntries(machine) {
  const stack = [];
  const esp = machine.registers.ESP >>> 0;
  const ebp = machine.registers.EBP >>> 0;

  for (let i = 0; i < 14; i += 1) {
    const addr = (esp + i * 4) >>> 0;
    stack.push({
      addr,
      addrHex: toHex(addr),
      val: machine.memory[addr] ?? 0,
      valHex: toHex(machine.memory[addr] ?? 0),
      sp: addr === esp,
      fp: addr === ebp,
      faded: false,
      label: i === 0 ? '[top]' : ''
    });
  }

  machine.poppedRows.forEach((r) => {
    stack.unshift({
      addr: r.addr,
      addrHex: toHex(r.addr),
      val: r.val,
      valHex: toHex(r.val),
      sp: false,
      fp: false,
      faded: true,
      label: '[popped]'
    });
  });

  return stack;
}

function snapshotFromMachine(machine, ctx, stepIndex, lineIndex) {
  const registers = {};
  REG_NAMES.forEach((k) => {
    registers[k] = toHex(machine.registers[k] ?? 0);
  });

  return {
    stepIndex,
    pc: machine.pcExec,
    lineIndex: machine.registers.EIP ?? lineIndex ?? 0,
    machine,
    registers,
    memory: buildMemoryEntries(machine, ctx),
    flags: { ...machine.flags },
    stack: buildStackEntries(machine),
    changedRegisters: [],
    changedMemory: [],
    ts: Date.now()
  };
}

function diffSnapshots(prev, next) {
  const changedRegs = Object.keys(next.registers).filter((k) => next.registers[k] !== prev.registers[k]);

  const prevMap = new Map(prev.memory.map((m) => [m.addrHex, m.valHex]));
  const nextMap = new Map(next.memory.map((m) => [m.addrHex, m.valHex]));
  const changedMem = [];

  nextMap.forEach((v, addr) => {
    if ((prevMap.get(addr) ?? '0x00000000') !== v) changedMem.push(addr);
  });

  return { changedRegs, changedMem };
}

function buildRuntime(source) {
  const ctx = { lines: source.replace(/\r\n/g, '\n').split('\n') };
  const registers = {};
  REG_NAMES.forEach((k) => {
    registers[k] = '0x0000';
  });
  const initial = {
    stepIndex: 0,
    pc: 0,
    lineIndex: 0,
    machine: { halted: false },
    registers,
    memory: [],
    flags: { N: 0, Z: 0, P: 1, C: 0, V: 0 },
    stack: [],
    changedRegisters: [],
    changedMemory: [],
    ts: Date.now()
  };

  return {
    source,
    ctx,
    snapshots: [initial],
    currentStep: 0,
    previewOffset: 0,
    breakpoints: new Map(),
    transition: null,
    lastDirection: 'forward',
    editingBreakpoint: null,
    traceSessionId: null,
    traceStatus: {
      running: false,
      pauseReason: null,
      halted: false,
      waitingForInput: false
    },
    backendOutput: ''
  };
}

function mapBackendSnapshot(snapshot, stepIndex = 0, status = null) {
  const registerMap = {};
  REG_NAMES.forEach((k) => {
    registerMap[k] = '0x0000';
  });
  (snapshot?.registers || []).forEach((reg) => {
    registerMap[String(reg.name || '').toUpperCase()] = reg.value || '0x0000';
  });
  (snapshot?.special || []).forEach((entry) => {
    registerMap[String(entry.name || '').toUpperCase()] = entry.value || '0x0000';
  });

  const memory = [];
  (snapshot?.memory || []).forEach((row) => {
    (row.cells || []).forEach((cell) => {
      memory.push({
        addrHex: cell.addr,
        valHex: cell.value,
        label: (cell.tags || []).join(', ')
      });
    });
  });

  const stack = (snapshot?.stack || []).map((item) => ({
    addrHex: item.addr,
    valHex: item.value,
    faded: false,
    label: (item.tags || []).join(' ')
  }));

  return {
    stepIndex,
    pc: stepIndex,
    lineIndex: Math.max(0, ((snapshot?.nextLineNumber || snapshot?.lineNumber || 1) - 1)),
    machine: { halted: Boolean(status?.halted) },
    registers: registerMap,
    memory,
    flags: snapshot?.flags || { N: 0, Z: 0, P: 1, C: 0, V: 0 },
    stack,
    changedRegisters: [],
    changedMemory: [],
    ts: Date.now(),
    traceAction: snapshot?.action || '',
    traceCode: snapshot?.code || '',
    waitingForInput: Boolean(status?.waitingForInput)
  };
}

function buildInitialState() {
  const tabs = [
    { id: 'tab-1', name: 'program.a', source: SAMPLE_CODE },
    { id: 'tab-2', name: 'sample-loop.a', source: SAMPLE_CODE_LOOP }
  ];
  const activeTabId = tabs[0].id;
  const runtime = buildRuntime(tabs[0].source);

  return {
    tabs,
    activeTabId,
    source: runtime.source,
    ctx: runtime.ctx,
    snapshots: runtime.snapshots,
    currentStep: runtime.currentStep,
    previewOffset: runtime.previewOffset,
    breakpoints: runtime.breakpoints,
      terminalState: {
        mode: 'command',
        pendingInputAddr: null,
        pendingInputLabel: null,
        pendingInputType: 'int',
        inputHistory: [{ kind: 'system', text: 'LCC ready. Backend emulator connected.' }],
        command: '',
        pendingBackendInput: null,
        autoContinueAfterInput: false
      },
    timelineState: {
      playing: false,
      speed: 5.0,
      loop: false,
      educationMode: false
    },
    transition: runtime.transition,
    lastDirection: runtime.lastDirection,
    theme: 'dark',
    editingBreakpoint: runtime.editingBreakpoint,
    watchList: ['R0', 'R1', 'R2', 'R3', 'PC'],
    traceSessionId: runtime.traceSessionId,
    traceStatus: runtime.traceStatus,
    backendOutput: runtime.backendOutput
  };
}

function stepForwardInternal(state, sourceTag = 'manual') {
  if (state.currentStep >= state.snapshots.length - 1) return state;
  const targetStep = state.currentStep + 1;
  const targetSnapshot = state.snapshots[targetStep];
  const nextHistory = Array.isArray(targetSnapshot?.terminalHistory)
    ? targetSnapshot.terminalHistory
    : state.terminalState.inputHistory;
  return {
    ...state,
    currentStep: targetStep,
    transition: {
      from: state.currentStep,
      to: targetStep,
      direction: 'forward',
      ts: Date.now()
    },
    lastDirection: 'forward',
    previewOffset: 0,
    terminalState: {
      ...state.terminalState,
      mode: targetSnapshot?.waitingForInput ? 'awaiting_input' : 'command',
      command: '',
      inputHistory: nextHistory
    }
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_CODE': {
      const source = action.source ?? state.source;
      const runtime = buildRuntime(source);
      const tabs = state.tabs.map((tab) => (
        tab.id === state.activeTabId ? { ...tab, source } : tab
      ));
      return {
        ...state,
        tabs,
        source: runtime.source,
        ctx: runtime.ctx,
        snapshots: runtime.snapshots,
        currentStep: runtime.currentStep,
        previewOffset: runtime.previewOffset,
        breakpoints: runtime.breakpoints,
        transition: runtime.transition,
        lastDirection: runtime.lastDirection,
        editingBreakpoint: runtime.editingBreakpoint,
        traceSessionId: runtime.traceSessionId,
        traceStatus: runtime.traceStatus,
        backendOutput: runtime.backendOutput
      };
    }
    case 'RESET':
      return buildInitialState();

    case 'UPDATE_SOURCE': {
      const source = action.source ?? state.source;
      const runtime = buildRuntime(source);
      return {
        ...state,
        tabs: state.tabs.map((tab) => (
          tab.id === state.activeTabId ? { ...tab, source } : tab
        )),
        source: runtime.source,
        ctx: runtime.ctx,
        snapshots: runtime.snapshots,
        currentStep: runtime.currentStep,
        previewOffset: runtime.previewOffset,
        breakpoints: runtime.breakpoints,
        transition: runtime.transition,
        lastDirection: runtime.lastDirection,
        editingBreakpoint: runtime.editingBreakpoint,
        traceSessionId: runtime.traceSessionId,
        traceStatus: runtime.traceStatus,
        backendOutput: runtime.backendOutput
      };
    }

    case 'ADD_TAB': {
      const nextIndex = state.tabs.length + 1;
      const source = action.source ?? '';
      const id = `tab-${Date.now()}-${nextIndex}`;
      const name = action.name ?? `program-${nextIndex}.a`;
      const runtime = buildRuntime(source);
      return {
        ...state,
        tabs: [...state.tabs, { id, name, source }],
        activeTabId: id,
        source: runtime.source,
        ctx: runtime.ctx,
        snapshots: runtime.snapshots,
        currentStep: runtime.currentStep,
        previewOffset: runtime.previewOffset,
        breakpoints: runtime.breakpoints,
        transition: runtime.transition,
        lastDirection: runtime.lastDirection,
        editingBreakpoint: runtime.editingBreakpoint,
        traceSessionId: runtime.traceSessionId,
        traceStatus: runtime.traceStatus,
        backendOutput: runtime.backendOutput
      };
    }

    case 'SWITCH_TAB': {
      const tabId = action.tabId;
      const target = state.tabs.find((t) => t.id === tabId);
      if (!target) return state;
      const runtime = buildRuntime(target.source);
      return {
        ...state,
        activeTabId: tabId,
        source: runtime.source,
        ctx: runtime.ctx,
        snapshots: runtime.snapshots,
        currentStep: runtime.currentStep,
        previewOffset: runtime.previewOffset,
        breakpoints: runtime.breakpoints,
        transition: runtime.transition,
        lastDirection: runtime.lastDirection,
        editingBreakpoint: runtime.editingBreakpoint,
        traceSessionId: runtime.traceSessionId,
        traceStatus: runtime.traceStatus,
        backendOutput: runtime.backendOutput
      };
    }

    case 'CLOSE_TAB': {
      const tabId = action.tabId;
      const existing = state.tabs.find((t) => t.id === tabId);
      if (!existing) return state;

      const remaining = state.tabs.filter((t) => t.id !== tabId);
      if (remaining.length === 0) {
        const fallback = { id: `tab-${Date.now()}-1`, name: 'program.a', source: '' };
        const runtime = buildRuntime(fallback.source);
        return {
          ...state,
          tabs: [fallback],
          activeTabId: fallback.id,
          source: runtime.source,
          ctx: runtime.ctx,
          snapshots: runtime.snapshots,
          currentStep: runtime.currentStep,
          previewOffset: runtime.previewOffset,
          breakpoints: runtime.breakpoints,
          transition: runtime.transition,
          lastDirection: runtime.lastDirection,
          editingBreakpoint: runtime.editingBreakpoint,
          traceSessionId: runtime.traceSessionId,
          traceStatus: runtime.traceStatus,
          backendOutput: runtime.backendOutput
        };
      }

      const nextActiveId = state.activeTabId === tabId ? remaining[0].id : state.activeTabId;
      const activeTab = remaining.find((t) => t.id === nextActiveId) || remaining[0];
      const runtime = buildRuntime(activeTab.source);

      return {
        ...state,
        tabs: remaining,
        activeTabId: activeTab.id,
        source: runtime.source,
        ctx: runtime.ctx,
        snapshots: runtime.snapshots,
        currentStep: runtime.currentStep,
        previewOffset: runtime.previewOffset,
        breakpoints: runtime.breakpoints,
        transition: runtime.transition,
        lastDirection: runtime.lastDirection,
        editingBreakpoint: runtime.editingBreakpoint,
        traceSessionId: runtime.traceSessionId,
        traceStatus: runtime.traceStatus,
        backendOutput: runtime.backendOutput
      };
    }

    case 'RENAME_TAB': {
      const tabId = action.tabId || state.activeTabId;
      const rawName = normalizeAsmFileName(action.name);
      if (!rawName) return state;
      const tabs = state.tabs.map((tab) => (
        tab.id === tabId ? { ...tab, name: rawName } : tab
      ));
      return {
        ...state,
        tabs
      };
    }

    case 'STEP_FORWARD':
      return stepForwardInternal(state, action.sourceTag || 'manual');

    case 'RUN_TO_PAUSE': {
      return state;
    }

    case 'RESET_FROM_BACKEND': {
      const runFile = action.runFileName || 'program.a';
      const initialHistory = [{ kind: 'system', text: `Run started from beginning on file (${runFile})` }];
      const initialSnapshot = {
        ...(action.snapshot || {}),
        waitingForInput: Boolean(action.status?.waitingForInput),
        terminalHistory: initialHistory
      };
      return {
        ...state,
        source: action.source ?? state.source,
        ctx: { lines: (action.source ?? state.source).replace(/\r\n/g, '\n').split('\n') },
        snapshots: [initialSnapshot],
        currentStep: 0,
        previewOffset: 0,
        transition: null,
        lastDirection: 'forward',
        traceSessionId: action.sessionId,
        traceStatus: action.status || state.traceStatus,
        backendOutput: action.output || '',
        terminalState: {
          ...state.terminalState,
          mode: action.status?.waitingForInput ? 'awaiting_input' : 'command',
          command: '',
          pendingBackendInput: null,
          autoContinueAfterInput: Boolean(action.autoContinue),
          inputHistory: initialHistory
        },
        timelineState: { ...state.timelineState, playing: false }
      };
    }

    case 'APPEND_BACKEND_SNAPSHOT': {
      const prev = state.snapshots[state.snapshots.length - 1];
      const nextSnapBase = action.snapshot;
      const diff = prev ? diffSnapshots(prev, nextSnapBase) : { changedRegs: [], changedMem: [] };
      const terminalEntries = ((action.terminalEntries || []).filter(Boolean));
      const nextTerminalHistory = [...state.terminalState.inputHistory, ...terminalEntries];
      const nextSnap = {
        ...nextSnapBase,
        changedRegisters: diff.changedRegs || [],
        changedMemory: diff.changedMem || [],
        waitingForInput: Boolean(action.status?.waitingForInput),
        terminalHistory: nextTerminalHistory,
        ts: Date.now()
      };
      const nextSnapshots = [...state.snapshots, nextSnap];
      const nextIndex = nextSnapshots.length - 1;
      return {
        ...state,
        snapshots: nextSnapshots,
        currentStep: nextIndex,
        transition: {
          from: state.currentStep,
          to: nextIndex,
          direction: 'forward',
          ts: Date.now()
        },
        lastDirection: 'forward',
        traceStatus: action.status || state.traceStatus,
        backendOutput: action.output ?? state.backendOutput,
        terminalState: {
          ...state.terminalState,
          mode: action.status?.waitingForInput ? 'awaiting_input' : 'command',
          inputHistory: nextTerminalHistory
        }
      };
    }

    case 'SET_AUTO_CONTINUE_AFTER_INPUT':
      return {
        ...state,
        terminalState: {
          ...state.terminalState,
          autoContinueAfterInput: Boolean(action.value)
        }
      };

    case 'SET_TRACE_SESSION':
      return { ...state, traceSessionId: action.sessionId || null, traceStatus: action.status || state.traceStatus };

    case 'APPEND_TERMINAL_HISTORY':
      return {
        ...state,
        terminalState: {
          ...state.terminalState,
          inputHistory: [...state.terminalState.inputHistory, ...((action.entries || []).filter(Boolean))]
        }
      };

    case 'CLEAR_PENDING_BACKEND_INPUT':
      return {
        ...state,
        terminalState: {
          ...state.terminalState,
          pendingBackendInput: null
        }
      };

    case 'STEP_BACKWARD': {
      if (state.currentStep <= 0) return state;
      const targetStep = state.currentStep - 1;
      const targetSnapshot = state.snapshots[targetStep];
      const nextHistory = Array.isArray(targetSnapshot?.terminalHistory)
        ? targetSnapshot.terminalHistory
        : state.terminalState.inputHistory;
      return {
        ...state,
        currentStep: targetStep,
        transition: {
          from: state.currentStep,
          to: targetStep,
          direction: 'backward',
          ts: Date.now()
        },
        lastDirection: 'backward',
        previewOffset: 0,
        timelineState: { ...state.timelineState, playing: false },
        terminalState: {
          ...state.terminalState,
          mode: targetSnapshot?.waitingForInput ? 'awaiting_input' : 'command',
          command: '',
          inputHistory: nextHistory
        }
      };
    }

    case 'JUMP_TO_LINE': {
      const idx = clamp(action.stepIndex ?? state.currentStep, 0, state.snapshots.length - 1);
      const targetSnapshot = state.snapshots[idx];
      const nextHistory = Array.isArray(targetSnapshot?.terminalHistory)
        ? targetSnapshot.terminalHistory
        : state.terminalState.inputHistory;
      return {
        ...state,
        currentStep: idx,
        transition: {
          from: state.currentStep,
          to: idx,
          direction: idx >= state.currentStep ? 'forward' : 'backward',
          ts: Date.now()
        },
        terminalState: {
          ...state.terminalState,
          mode: targetSnapshot?.waitingForInput ? 'awaiting_input' : 'command',
          command: '',
          inputHistory: nextHistory
        }
      };
    }

    case 'SET_PREVIEW_OFFSET':
      return { ...state, previewOffset: action.offset ?? 0 };

    case 'CLEAR_PREVIEW':
      return { ...state, previewOffset: 0 };

    case 'SET_BREAKPOINT': {
      const bp = new Map(state.breakpoints);
      bp.set(action.line, { enabled: true, description: '' });
      return { ...state, breakpoints: bp };
    }

    case 'REMOVE_BREAKPOINT': {
      const bp = new Map(state.breakpoints);
      bp.delete(action.line);
      return { ...state, breakpoints: bp };
    }

    case 'UPDATE_BREAKPOINT_DESC': {
      const bp = new Map(state.breakpoints);
      const prev = bp.get(action.line) || { enabled: true, description: '' };
      bp.set(action.line, { ...prev, description: action.description ?? '' });
      return { ...state, breakpoints: bp, editingBreakpoint: null };
    }

    case 'TOGGLE_BREAKPOINT': {
      const bp = new Map(state.breakpoints);
      const prev = bp.get(action.line);
      if (!prev) return state;
      bp.set(action.line, { ...prev, enabled: !prev.enabled });
      return { ...state, breakpoints: bp };
    }

    case 'TERMINAL_COMMAND_TEXT':
      return {
        ...state,
        terminalState: { ...state.terminalState, command: action.text }
      };

    case 'CLEAR_TERMINAL':
      return {
        ...state,
        terminalState: {
          ...state.terminalState,
          inputHistory: []
        }
      };

    case 'TERMINAL_INPUT_SUBMIT': {
      const value = action.text ?? '';
      if (state.terminalState.mode === 'awaiting_input') {
        return {
          ...state,
          terminalState: {
            ...state.terminalState,
            mode: 'command',
            pendingInputAddr: null,
            pendingInputLabel: null,
            pendingInputType: 'int',
            command: '',
            inputHistory: [
              ...state.terminalState.inputHistory,
              { kind: 'input', text: value }
            ]
          }
        };
      }

      const txt = value.trim();
      let next = {
        ...state,
        terminalState: {
          ...state.terminalState,
          command: '',
          inputHistory: [...state.terminalState.inputHistory, { kind: 'input', text: txt }]
        }
      };

      const peekMatch = txt.match(/^peek\s+(-?\d+)$/i);
      if (peekMatch) {
        const offset = Number.parseInt(peekMatch[1], 10);
        if (offset === 0) {
          next.previewOffset = 0;
          next.terminalState.inputHistory = [...next.terminalState.inputHistory, { kind: 'system', text: 'Preview cleared.' }];
        } else {
          next.terminalState.inputHistory = [
            ...next.terminalState.inputHistory,
            { kind: 'warn', text: 'peek preview is disabled while using backend trace mode.' }
          ];
        }
      }

      return next;
    }

    case 'TERMINAL_INPUT_CAPTURE':
      return {
        ...state,
        terminalState: {
          ...state.terminalState,
          mode: 'command',
          pendingInputAddr: null,
          pendingInputLabel: null,
          pendingInputType: 'int',
          command: '',
          inputHistory: [
            ...state.terminalState.inputHistory,
            { kind: 'input', text: action.text ?? '' }
          ]
        }
      };

    case 'TIMELINE_PLAY':
      return { ...state, timelineState: { ...state.timelineState, playing: true } };

    case 'TIMELINE_PAUSE':
      return { ...state, timelineState: { ...state.timelineState, playing: false } };

    case 'TIMELINE_STOP':
      return {
        ...state,
        timelineState: { ...state.timelineState, playing: false },
        currentStep: 0,
        transition: { from: state.currentStep, to: 0, direction: 'backward', ts: Date.now() }
      };

    case 'TIMELINE_SET_SPEED':
      return {
        ...state,
        timelineState: {
          ...state.timelineState,
          speed: clamp(Number(action.speed) || 5, 0.1, 30.0)
        }
      };

    case 'TIMELINE_SET_LOOP':
      return {
        ...state,
        timelineState: { ...state.timelineState, loop: Boolean(action.value) }
      };

    case 'TIMELINE_SET_EDUCATION_MODE':
      return {
        ...state,
        timelineState: { ...state.timelineState, educationMode: Boolean(action.value) }
      };

    case 'STOP_DEBUGGER_VIEW':
      return {
        ...state,
        currentStep: 0,
        previewOffset: 0,
        transition: { from: state.currentStep, to: 0, direction: 'backward', ts: Date.now() },
        timelineState: { ...state.timelineState, playing: false },
        terminalState: {
          ...state.terminalState,
          mode: 'command',
          command: ''
        },
        traceStatus: {
          ...state.traceStatus,
          waitingForInput: false
        }
      };

    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' };

    case 'SET_EDITING_BREAKPOINT':
      return { ...state, editingBreakpoint: action.line ?? null };

    default:
      return state;
  }
}

function computePreview(state) {
  const offset = state.previewOffset;
  if (!offset) return null;

  const current = state.snapshots[state.currentStep];
  if (!current) return null;

  if (offset < 0) {
    const idx = clamp(state.currentStep + offset, 0, state.snapshots.length - 1);
    const past = state.snapshots[idx];
    const regs = {};
    Object.keys(current.registers).forEach((k) => {
      if (current.registers[k] !== past.registers[k]) regs[k] = past.registers[k];
    });
    const memCurrent = new Map(current.memory.map((m) => [m.addrHex, m.valHex]));
    const memPast = new Map(past.memory.map((m) => [m.addrHex, m.valHex]));
    const mem = {};
    memPast.forEach((v, addr) => {
      if ((memCurrent.get(addr) ?? '0x00000000') !== v) mem[addr] = v;
    });
    return { offset, regs, mem };
  }

  let sim = cloneMachine(current.machine);
  for (let i = 0; i < offset; i += 1) {
    const res = stepMachine(sim, state.ctx);
    sim = res.machine;
    if (res.awaitingInput || res.halted) break;
  }
  const future = snapshotFromMachine(sim, state.ctx, -1, sim.registers.EIP ?? 0);
  const regs = {};
  Object.keys(current.registers).forEach((k) => {
    if (current.registers[k] !== future.registers[k]) regs[k] = future.registers[k];
  });
  const memCurrent = new Map(current.memory.map((m) => [m.addrHex, m.valHex]));
  const memFuture = new Map(future.memory.map((m) => [m.addrHex, m.valHex]));
  const mem = {};
  memFuture.forEach((v, addr) => {
    if ((memCurrent.get(addr) ?? '0x00000000') !== v) mem[addr] = v;
  });

  return { offset, regs, mem };
}

function formatEta(linesLeft, speed) {
  const totalSeconds = Math.max(0, Math.round(linesLeft * speed));
  if (totalSeconds < 60) return `${totalSeconds}s left`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s}s left`;
}

async function readApiJson(response) {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    const cleaned = raw.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
    return cleaned ? JSON.parse(cleaned) : {};
  }
}

const MNEMONIC_SET = new Set([
  'mov', 'lea', 'add', 'sub', 'mul', 'div', 'cmp', 'and', 'or', 'xor', 'not',
  'push', 'pop', 'bl', 'ret', 'br', 'brz', 'brn', 'brp', 'brnz', 'brne',
  'halt', 'din', 'ain', 'hin', 'sin', 'dout', 'aout', 'hout', 'sout', 'nl',
  'ld', 'st', 'ldr', 'str', 'jmp', 'jsr', 'jsrr'
]);

function getTokenColor(token, theme) {
  const lower = token.toLowerCase();
  if (MNEMONIC_SET.has(lower)) return theme.orange;
  if (/^r[0-7]$/i.test(token) || /^(sp|fp|lr|pc|ir)$/i.test(token)) return theme.green;
  if (/^[A-Za-z_]\w*:$/i.test(token)) return theme.accent;
  if (/^\.[A-Za-z_]\w*$/i.test(token)) return theme.cyan;
  if (/^0x[0-9a-f]+$/i.test(token) || /^-?\d+$/.test(token)) return theme.cyan;
  if (/^".*"$/.test(token)) return '#d19a66';
  return null;
}

function renderHighlightedLine(line, theme, keyPrefix) {
  const commentIndex = line.indexOf(';');
  const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
  const commentPart = commentIndex >= 0 ? line.slice(commentIndex) : '';
  const parts = [];
  const tokens = codePart.match(/[A-Za-z_]\w*:?|0x[0-9a-fA-F]+|-?\d+|"(?:[^"\\]|\\.)*"|[^\s]/g) || [];
  let cursor = 0;

  tokens.forEach((token, idx) => {
    const pos = codePart.indexOf(token, cursor);
    if (pos > cursor) {
      parts.push(<span key={`${keyPrefix}-ws-${idx}`}>{codePart.slice(cursor, pos)}</span>);
    }
    const color = getTokenColor(token, theme);
    parts.push(
      <span key={`${keyPrefix}-tk-${idx}`} style={color ? { color, fontWeight: /^[A-Za-z_]\w*:$/i.test(token) ? 600 : 500 } : undefined}>
        {token}
      </span>
    );
    cursor = pos + token.length;
  });
  if (cursor < codePart.length) {
    parts.push(<span key={`${keyPrefix}-tail`}>{codePart.slice(cursor)}</span>);
  }
  if (commentPart) {
    parts.push(<span key={`${keyPrefix}-comment`} style={{ color: theme.mut, fontStyle: 'italic' }}>{commentPart}</span>);
  }
  if (parts.length === 0) return <span>{' '}</span>;
  return parts;
}

function Ilcc() {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  const [isBackendBusy, setIsBackendBusy] = useState(false);
  const [editorTerminalSplit, setEditorTerminalSplit] = useState(62);
  const [rightPanelWidth, setRightPanelWidth] = useState(420);
  const [collapsed, setCollapsed] = useState({
    stack: false,
    editor: false,
    terminal: false,
    registers: false,
    flags: false,
    memory: false
  });
  const lineRefs = useRef([]);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const t = THEME[state.theme];
  const current = state.snapshots[state.currentStep];
  const prev = state.currentStep > 0 ? state.snapshots[state.currentStep - 1] : null;
  const next = state.currentStep < state.snapshots.length - 1 ? state.snapshots[state.currentStep + 1] : null;
  const debuggerActive = state.currentStep > 0 || state.terminalState.mode === 'awaiting_input';
  const focusLineIndex = current?.lineIndex ?? 0;
  const beginEditorTerminalDrag = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startSplit = editorTerminalSplit;
    const dragHeight = Math.max(420, window.innerHeight - 140);
    const onMove = (evt) => {
      const dy = startY - evt.clientY;
      const deltaPct = (dy / dragHeight) * 100;
      setEditorTerminalSplit(clamp(startSplit + deltaPct, 20, 80));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };
  const beginRightPanelDrag = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startRight = rightPanelWidth;
    const onMove = (evt) => {
      const dx = evt.clientX - startX;
      const maxRight = Math.max(320, window.innerWidth - 520);
      setRightPanelWidth(clamp(startRight - dx, 300, maxRight));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };
  const preview = useMemo(() => computePreview(state), [state.previewOffset, state.currentStep, state.snapshots, state.ctx]);

  useEffect(() => {
    const ref = lineRefs.current[focusLineIndex];
    if (ref && typeof ref.scrollIntoView === 'function') {
      ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusLineIndex]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (state.timelineState.playing) dispatch({ type: 'TIMELINE_PAUSE' });
      } else if (e.key === 'Escape') {
        dispatch({ type: 'TIMELINE_STOP' });
        dispatch({ type: 'CLEAR_PREVIEW' });
      } else if (e.key === 'ArrowLeft' && e.shiftKey) {
        for (let i = 0; i < 5; i += 1) dispatch({ type: 'STEP_BACKWARD' });
      } else if (e.key === 'ArrowRight' && e.shiftKey) {
        for (let i = 0; i < 5; i += 1) void handleStepForward('manual');
      } else if (e.key === 'ArrowLeft') {
        dispatch({ type: 'STEP_BACKWARD' });
      } else if (e.key === 'ArrowRight') {
        void handleStepForward('manual');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.timelineState.playing, isBackendBusy]);

  const canForward = state.terminalState.mode !== 'awaiting_input' && !isBackendBusy;

  const addOutputEntries = (previousOutput, nextOutput) => {
    if (!nextOutput || nextOutput === previousOutput) return [];
    const delta = nextOutput.startsWith(previousOutput) ? nextOutput.slice(previousOutput.length) : nextOutput;
    return delta
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0)
      .map((line) => ({ kind: 'output', text: `[OUTPUT] ${line}` }));
  };

  const deleteTraceSession = async (sessionId) => {
    if (!sessionId) return;
    try {
      await fetch(`/api/trace/sessions/${sessionId}`, { method: 'DELETE' });
    } catch {
      // best effort cleanup
    }
  };

  useEffect(() => () => {
    void deleteTraceSession(stateRef.current.traceSessionId);
  }, []);

  const createTraceSession = async (source, input = '') => {
    const response = await fetch('/api/trace/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, input })
    });
    const data = await readApiJson(response);
    if (!response.ok) throw new Error(data.error || 'Failed to create trace session');
    return data;
  };

  const stepTraceSession = async (sessionId, input = '') => {
    const response = await fetch(`/api/trace/sessions/${sessionId}/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 1, input })
    });
    const data = await readApiJson(response);
    if (!response.ok) throw new Error(data.error || 'Failed to step trace session');
    return data;
  };

  const continueTraceSession = async (sessionId, input = '', maxSteps = 20000) => {
    const response = await fetch(`/api/trace/sessions/${sessionId}/continue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, maxSteps })
    });
    const data = await readApiJson(response);
    if (!response.ok) throw new Error(data.error || 'Failed to continue trace session');
    return data;
  };

  const handleStepForward = async (sourceTag = 'manual') => {
    const live = stateRef.current;
    if (isBackendBusy) return false;
    dispatch({ type: 'SET_AUTO_CONTINUE_AFTER_INPUT', value: false });
    if (live.currentStep < live.snapshots.length - 1) {
      dispatch({ type: 'STEP_FORWARD', sourceTag });
      return true;
    }

    setIsBackendBusy(true);
    try {
      let sessionId = live.traceSessionId;
      if (!sessionId) {
        const created = await createTraceSession(live.source);
        sessionId = created.sessionId;
        dispatch({ type: 'SET_TRACE_SESSION', sessionId, status: created.status });
        const initial = mapBackendSnapshot(created.snapshot, 0, created.status);
        dispatch({
          type: 'RESET_FROM_BACKEND',
          sessionId,
          source: live.source,
          snapshot: initial,
          status: created.status,
          output: created.output || ''
        });
      }

      const stepped = await stepTraceSession(sessionId);
      const currentLive = stateRef.current;
      const mapped = mapBackendSnapshot(stepped.snapshot, currentLive.snapshots.length, stepped.status);

      const outputEntries = addOutputEntries(currentLive.backendOutput || '', stepped.output || '');
      const terminalEntries = [...outputEntries];

      if (stepped.status?.waitingForInput) {
        terminalEntries.push({ kind: 'warn', text: '[INPUT REQUIRED] Enter value and press Enter:' });
      }

      dispatch({
        type: 'APPEND_BACKEND_SNAPSHOT',
        snapshot: mapped,
        status: stepped.status,
        output: stepped.output || '',
        terminalEntries
      });

      if (stepped.status?.waitingForInput) {
        return false;
      }
      return true;
    } catch (error) {
      dispatch({ type: 'APPEND_TERMINAL_HISTORY', entries: [{ kind: 'warn', text: String(error) }] });
      return false;
    } finally {
      setIsBackendBusy(false);
    }
  };

  const handleTerminalSubmit = async (rawText) => {
    const text = rawText ?? '';
    const live = stateRef.current;

    if (live.terminalState.mode === 'awaiting_input') {
      const entered = text.trim();
      if (!entered) return;
      dispatch({ type: 'TERMINAL_INPUT_CAPTURE', text: entered });
      if (!live.traceSessionId || isBackendBusy) return;

      setIsBackendBusy(true);
      try {
        const beforeOutput = stateRef.current.backendOutput || '';
        const stepped = await stepTraceSession(live.traceSessionId, `${entered}\n`);
        const mappedStep = mapBackendSnapshot(stepped.snapshot, stateRef.current.snapshots.length, stepped.status);
        const stepOutputEntries = addOutputEntries(beforeOutput, stepped.output || '');
        const stepTerminalEntries = [...stepOutputEntries];
        if (stepped.status?.waitingForInput) {
          stepTerminalEntries.push({ kind: 'warn', text: '[INPUT REQUIRED] Enter value and press Enter:' });
        }
        dispatch({
          type: 'APPEND_BACKEND_SNAPSHOT',
          snapshot: mappedStep,
          status: stepped.status,
          output: stepped.output || '',
          terminalEntries: stepTerminalEntries
        });

        let finalStatus = stepped.status;
        let finalOutput = stepped.output || '';
        if (!stepped.status?.waitingForInput && !stepped.status?.halted) {
          const continued = await continueTraceSession(live.traceSessionId, '', 20000);
          const mappedCont = mapBackendSnapshot(continued.snapshot, stateRef.current.snapshots.length, continued.status);
          const contOutputEntries = addOutputEntries(finalOutput, continued.output || '');
          const contTerminalEntries = [...contOutputEntries];
          if (continued.status?.waitingForInput) {
            contTerminalEntries.push({ kind: 'warn', text: '[INPUT REQUIRED] Enter value and press Enter:' });
          }
          dispatch({
            type: 'APPEND_BACKEND_SNAPSHOT',
            snapshot: mappedCont,
            status: continued.status,
            output: continued.output || '',
            terminalEntries: contTerminalEntries
          });
          finalStatus = continued.status;
          finalOutput = continued.output || '';
        }

        if (finalStatus?.halted) {
          dispatch({ type: 'SET_AUTO_CONTINUE_AFTER_INPUT', value: false });
        }
      } catch (error) {
        dispatch({ type: 'APPEND_TERMINAL_HISTORY', entries: [{ kind: 'warn', text: String(error) }] });
      } finally {
        setIsBackendBusy(false);
      }
      return;
    }

    dispatch({ type: 'TERMINAL_INPUT_SUBMIT', text });
  };

  const activeDiff = useMemo(() => {
    if (!state.transition) return { regs: new Set(), mem: new Set(), backward: false };
    const age = Date.now() - state.transition.ts;
    if (age > 2500) return { regs: new Set(), mem: new Set(), backward: state.transition.direction === 'backward' };

    if (state.transition.direction === 'forward') {
      const from = state.snapshots[state.transition.from];
      const to = state.snapshots[state.transition.to];
      if (!from || !to) return { regs: new Set(), mem: new Set(), backward: false };
      const d = diffSnapshots(from, to);
      return { regs: new Set(d.changedRegs), mem: new Set(d.changedMem), backward: false };
    }

    const from = state.snapshots[state.transition.from];
    const to = state.snapshots[state.transition.to];
    if (!from || !to) return { regs: new Set(), mem: new Set(), backward: true };
    const d = diffSnapshots(to, from);
    return { regs: new Set(d.changedRegs), mem: new Set(d.changedMem), backward: true };
  }, [state.transition, state.snapshots]);

  const onImport = async (file) => {
    const txt = await file.text();
    dispatch({ type: 'ADD_TAB', source: txt, name: file.name || 'imported.a' });
  };

  const onExport = () => {
    const blob = new Blob([state.source], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'program.a';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onRunProgram = async () => {
    if (isBackendBusy) return;
    setIsBackendBusy(true);
    try {
      await deleteTraceSession(stateRef.current.traceSessionId);
      const created = await createTraceSession(stateRef.current.source);
      const initial = mapBackendSnapshot(created.snapshot, 0, created.status);
      const activeTabName = stateRef.current.tabs.find((t) => t.id === stateRef.current.activeTabId)?.name || 'program.a';
      dispatch({
        type: 'RESET_FROM_BACKEND',
        sessionId: created.sessionId,
        source: stateRef.current.source,
        runFileName: activeTabName,
        snapshot: initial,
        status: created.status,
        output: created.output || '',
        autoContinue: true
      });
      const continued = await continueTraceSession(created.sessionId, '', 20000);
      const mapped = mapBackendSnapshot(continued.snapshot, stateRef.current.snapshots.length, continued.status);
      const outputEntries = addOutputEntries(created.output || '', continued.output || '');
      const terminalEntries = [...outputEntries];
      if (continued.status?.waitingForInput) {
        terminalEntries.push({ kind: 'warn', text: '[INPUT REQUIRED] Enter value and press Enter:' });
      }
      dispatch({
        type: 'APPEND_BACKEND_SNAPSHOT',
        snapshot: mapped,
        status: continued.status,
        output: continued.output || '',
        terminalEntries
      });
    } catch (error) {
      dispatch({ type: 'APPEND_TERMINAL_HISTORY', entries: [{ kind: 'warn', text: String(error) }] });
    } finally {
      setIsBackendBusy(false);
    }
  };

  const onSelectSample = (sampleId) => {
    const sample = SAMPLE_PROGRAMS.find((s) => s.id === sampleId);
    if (!sample) return;
    dispatch({ type: 'ADD_TAB', source: sample.source, name: `${sample.name.toLowerCase().replace(/\\s+/g, '-')}.a` });
  };

  const setLineBreakpoint = (line) => {
    if (state.breakpoints.has(line + 1)) dispatch({ type: 'REMOVE_BREAKPOINT', line: line + 1 });
    else dispatch({ type: 'SET_BREAKPOINT', line: line + 1 });
  };

  return (
    <div
      style={{
        height: '100vh',
        backgroundColor: t.bg,
        backgroundImage: `
          linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%),
          linear-gradient(-45deg, rgba(255,255,255,0.04) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.04) 75%),
          linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.04) 75%)
        `,
        backgroundSize: '24px 24px',
        backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0',
        color: t.text,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <style>{`
        .asm-btn { border: 1px solid ${t.border}; background: ${t.panel2}; color: ${t.text}; border-radius: 6px; padding: 6px 10px; cursor: pointer; }
        .asm-btn:hover { border-color: ${t.accent}; }
        .asm-btn-gold { background: linear-gradient(135deg, #f7a800, #ffbf33); color:#1a1204; border-color: transparent; }
        .asm-panel { background: ${t.panel}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; }
        .asm-splitter { position: relative; cursor: ns-resize; user-select: none; }
        .asm-splitter-line { position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: transparent; transform: translateY(-50%); transition: background 120ms ease, height 120ms ease; }
        .asm-splitter:hover .asm-splitter-line { background: ${t.accent}; height: 2px; }
        .asm-vsplitter { position: relative; cursor: ew-resize; user-select: none; }
        .asm-vsplitter-line { position: absolute; top: 0; bottom: 0; left: 50%; width: 1px; background: transparent; transform: translateX(-50%); transition: background 120ms ease, width 120ms ease; }
        .asm-vsplitter:hover .asm-vsplitter-line { background: ${t.accent}; width: 2px; }
        .diff-flash { animation: fadeDiff 2.5s ease-out forwards; }
        .line-flash-forward { animation: flashForward 400ms ease-out; }
        .line-flash-backward { animation: flashBackward 400ms ease-out; }
        .stack-faded { opacity: 0.45; text-decoration: line-through; transition: opacity 1s ease; }
        @keyframes fadeDiff { 0% { box-shadow: inset 3px 0 0 ${t.green}, 0 0 14px rgba(61,220,132,.45); background: rgba(61,220,132,.15);} 100% { box-shadow: inset 3px 0 0 rgba(0,0,0,0); background: transparent; } }
        @keyframes flashForward { from { background:${t.activeLineFlashFwd}; } to { background:${t.activeLine}; } }
        @keyframes flashBackward { from { background:${t.activeLineFlashBack}; } to { background:${t.activeLine}; } }
      `}</style>

      <TopBar
        state={state}
        dispatch={dispatch}
        onImport={onImport}
        onExport={onExport}
        onSelectSample={onSelectSample}
        onStepForward={() => handleStepForward('manual')}
        backendBusy={isBackendBusy}
        canForward={canForward}
        debuggerActive={debuggerActive}
      />

      {!debuggerActive ? (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'stretch', padding: 14 }}>
          <div style={{ width: 'min(1300px, 100%)', minHeight: 0, display: 'grid', gridTemplateRows: `${collapsed.editor ? '42px' : `minmax(220px, ${editorTerminalSplit}fr)`} ${collapsed.editor || collapsed.terminal ? '0px' : '8px'} ${collapsed.terminal ? '42px' : `minmax(140px, ${100 - editorTerminalSplit}fr)`}`, gap: 12 }}>
            <EditorPane
              state={state}
              dispatch={dispatch}
              current={current}
              focusLineIndex={focusLineIndex}
              lineRefs={lineRefs}
              setLineBreakpoint={setLineBreakpoint}
              activeDiff={activeDiff}
              preview={preview}
              onRunProgram={onRunProgram}
              onStopDebug={() => dispatch({ type: 'STOP_DEBUGGER_VIEW' })}
              backendBusy={isBackendBusy}
              showFocusZoom={false}
              collapsed={collapsed.editor}
              onToggle={() => setCollapsed((c) => ({ ...c, editor: !c.editor }))}
            />
            {collapsed.editor || collapsed.terminal ? (
              <div />
            ) : (
              <div className="asm-splitter" onMouseDown={beginEditorTerminalDrag}>
                <div className="asm-splitter-line" />
              </div>
            )}
            <Terminal
              state={state}
              dispatch={dispatch}
              onSubmitCommand={handleTerminalSubmit}
              collapsed={collapsed.terminal}
              onToggle={() => setCollapsed((c) => ({ ...c, terminal: !c.terminal }))}
            />
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: `minmax(520px, 1fr) 8px ${rightPanelWidth}px`, gap: 8, padding: 10 }}>
          <div style={{ minHeight: 0, display: 'grid', gridTemplateRows: `${collapsed.editor ? '42px' : `minmax(220px, ${editorTerminalSplit}fr)`} ${collapsed.editor || collapsed.terminal ? '0px' : '8px'} ${collapsed.terminal ? '42px' : `minmax(140px, ${100 - editorTerminalSplit}fr)`}`, gap: 10 }}>
            <EditorPane
              state={state}
              dispatch={dispatch}
              current={current}
              focusLineIndex={focusLineIndex}
              lineRefs={lineRefs}
              setLineBreakpoint={setLineBreakpoint}
              activeDiff={activeDiff}
              preview={preview}
              onRunProgram={onRunProgram}
              onStopDebug={() => dispatch({ type: 'STOP_DEBUGGER_VIEW' })}
              backendBusy={isBackendBusy}
              showFocusZoom
              collapsed={collapsed.editor}
              onToggle={() => setCollapsed((c) => ({ ...c, editor: !c.editor }))}
            />
            {collapsed.editor || collapsed.terminal ? (
              <div />
            ) : (
              <div className="asm-splitter" onMouseDown={beginEditorTerminalDrag}>
                <div className="asm-splitter-line" />
              </div>
            )}

            <Terminal
              state={state}
              dispatch={dispatch}
              onSubmitCommand={handleTerminalSubmit}
              collapsed={collapsed.terminal}
              onToggle={() => setCollapsed((c) => ({ ...c, terminal: !c.terminal }))}
            />
          </div>
          <div className="asm-vsplitter" onMouseDown={beginRightPanelDrag}>
            <div className="asm-vsplitter-line" />
          </div>
          <div style={{ minHeight: 0, display: 'grid', gridTemplateRows: 'minmax(180px, .8fr) minmax(170px, .9fr) minmax(260px, 1.8fr)', gap: 10 }}>
            <StackPanel state={state} current={current} theme={t} collapsed={collapsed.stack} onToggle={() => setCollapsed((c) => ({ ...c, stack: !c.stack }))} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, minHeight: 0 }}>
              <RegistersPanel state={state} current={current} prev={prev} next={next} activeDiff={activeDiff} preview={preview} theme={t} collapsed={collapsed.registers} onToggle={() => setCollapsed((c) => ({ ...c, registers: !c.registers }))} />
              <FlagsPanel current={current} theme={t} collapsed={collapsed.flags} onToggle={() => setCollapsed((c) => ({ ...c, flags: !c.flags }))} />
            </div>
            <MemoryPanel state={state} current={current} prev={prev} next={next} activeDiff={activeDiff} preview={preview} theme={t} collapsed={collapsed.memory} onToggle={() => setCollapsed((c) => ({ ...c, memory: !c.memory }))} />
          </div>
        </div>
      )}
    </div>
  );
}

function TopBar({ state, dispatch, onImport, onExport, onSelectSample, onStepForward, backendBusy, canForward, debuggerActive }) {
  const fileRef = useRef(null);
  const [sampleChoice, setSampleChoice] = useState('');
  const [jumpCount, setJumpCount] = useState(5);

  return (
    <div style={{ height: 48, borderBottom: `1px solid ${THEME[state.theme].border}`, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '0 10px', columnGap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <strong style={{ letterSpacing: '.04em' }}>CPS340 | LCC</strong>
        <select
          value={sampleChoice}
          onChange={(e) => {
            const sampleId = e.target.value;
            setSampleChoice(sampleId);
            if (sampleId) {
              onSelectSample(sampleId);
              setSampleChoice('');
            }
          }}
          style={{ height: 30, borderRadius: 6, border: `1px solid ${THEME[state.theme].border}`, background: THEME[state.theme].panel2, color: THEME[state.theme].text, padding: '0 8px' }}
        >
          <option value="">Program Samples</option>
          {SAMPLE_PROGRAMS.map((sample) => (
            <option key={sample.id} value={sample.id}>{sample.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {debuggerActive ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 36,
              padding: '0 8px',
              borderRadius: 999,
              border: `1px solid ${THEME[state.theme].border}`,
              background: state.theme === 'dark' ? '#111217' : '#eef0f6',
              boxShadow: state.theme === 'dark' ? 'inset 0 0 0 1px rgba(255,255,255,.03)' : 'inset 0 0 0 1px rgba(0,0,0,.03)'
            }}
          >
            <button className="asm-btn" title="Step Back 1" onClick={() => dispatch({ type: 'STEP_BACKWARD' })}>-1</button>
            <button className="asm-btn" title="Step Forward 1" onClick={() => { if (canForward) void onStepForward(); }} disabled={!canForward}>+1</button>
            <button className="asm-btn" title="Stop / Reset" onClick={() => dispatch({ type: 'TIMELINE_STOP' })}>Stop</button>
            <button
              className="asm-btn"
              title="Step Back N"
              onClick={() => {
                const n = Math.max(1, Number(jumpCount) || 1);
                for (let i = 0; i < n; i += 1) dispatch({ type: 'STEP_BACKWARD' });
              }}
            >
              -N
            </button>
            <input
              type="number"
              min={1}
              step={1}
              value={jumpCount}
              onChange={(e) => setJumpCount(clamp(Number(e.target.value) || 1, 1, 999))}
              style={{ width: 58, height: 28, borderRadius: 6, border: `1px solid ${THEME[state.theme].border}`, background: THEME[state.theme].panel2, color: THEME[state.theme].text, padding: '0 8px' }}
            />
            <button
              className="asm-btn"
              title="Step Forward N"
              onClick={async () => {
                const n = Math.max(1, Number(jumpCount) || 1);
                for (let i = 0; i < n; i += 1) {
                  const ok = await onStepForward();
                  if (!ok) break;
                }
              }}
              disabled={!canForward}
            >
              +N
            </button>
            <button
              className="asm-btn"
              onClick={() => dispatch({ type: 'TIMELINE_SET_EDUCATION_MODE', value: !state.timelineState.educationMode })}
            >
              {state.timelineState.educationMode ? 'Education: ON' : 'Education: OFF'}
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
        <input ref={fileRef} type="file" accept=".a,.asm,.txt,text/plain" style={{ display: 'none' }} onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          if (f) onImport(f);
          e.target.value = '';
        }} />
        <button className="asm-btn" onClick={() => fileRef.current && fileRef.current.click()}>Import</button>
        <button className="asm-btn" onClick={onExport}>Export</button>
        <button className="asm-btn" onClick={() => dispatch({ type: 'TOGGLE_THEME' })}>{state.theme === 'dark' ? 'Light' : 'Dark'}</button>
        <img
          src="/newpaltz_logo_dark.webp"
          alt="New Paltz State University of New York"
          style={{
            height: 34,
            width: 'auto',
            maxWidth: 220,
            objectFit: 'contain',
            borderRadius: 4
          }}
        />
      </div>
    </div>
  );
}

function EditorPane({ state, dispatch, current, focusLineIndex, lineRefs, setLineBreakpoint, onRunProgram, onStopDebug, backendBusy, showFocusZoom, collapsed, onToggle }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [fileNameDraft, setFileNameDraft] = useState('');
  const wrapperRef = useRef(null);
  const gutterRef = useRef(null);
  const highlightRef = useRef(null);

  useEffect(() => {
    const onFs = () => setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const lines = state.source.replace(/\r\n/g, '\n').split('\n');
  const activeLine = clamp(focusLineIndex ?? current?.lineIndex ?? 0, 0, Math.max(0, lines.length - 1));
  const focusedLineText = lines[activeLine] || '';
  const focusedLineExplanation = explainInstructionLine(focusedLineText);
  const transition = state.transition;
  const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);

  useEffect(() => {
    setShowFileMenu(false);
    setIsEditingFileName(false);
    setFileNameDraft(activeTab?.name || '');
  }, [activeTab?.id, activeTab?.name]);

  const saveFileName = () => {
    const nextName = fileNameDraft.trim();
    if (!nextName || !activeTab) {
      setIsEditingFileName(false);
      return;
    }
    dispatch({ type: 'RENAME_TAB', tabId: activeTab.id, name: nextName });
    setIsEditingFileName(false);
    setShowFileMenu(false);
  };

  return (
    <div className="asm-panel" ref={wrapperRef} style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PanelHeader
        title={`Code Editor${activeTab ? ` - ${activeTab.name}` : ''}`}
        theme={THEME[state.theme]}
        right={(
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="asm-btn asm-btn-gold" onClick={onRunProgram} disabled={backendBusy}>Run</button>
            <button className="asm-btn" onClick={onStopDebug} disabled={backendBusy}>Stop</button>
            <button className="asm-btn" onClick={() => dispatch({ type: 'ADD_TAB' })}>+</button>
            <button className="asm-btn" onClick={async () => {
              if (!wrapperRef.current) return;
              if (document.fullscreenElement === wrapperRef.current) await document.exitFullscreen();
              else await wrapperRef.current.requestFullscreen();
            }}>{isFullscreen ? '🗗' : '⛶'}</button>
            <div style={{ position: 'relative' }}>
              <button
                className="asm-btn"
                onClick={() => setShowFileMenu((v) => !v)}
                title="File options"
                aria-label="File options"
              >
                ⋯
              </button>
              {showFileMenu ? (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 34,
                    zIndex: 20,
                    minWidth: 150,
                    border: `1px solid ${THEME[state.theme].border}`,
                    borderRadius: 8,
                    background: THEME[state.theme].panel,
                    boxShadow: state.theme === 'dark' ? '0 8px 20px rgba(0,0,0,.35)' : '0 8px 20px rgba(0,0,0,.12)',
                    overflow: 'hidden'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingFileName(true);
                      setShowFileMenu(false);
                      setFileNameDraft(activeTab?.name || '');
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'transparent',
                      color: THEME[state.theme].text,
                      border: 'none',
                      padding: '8px 10px',
                      cursor: 'pointer'
                    }}
                  >
                    Edit file name
                  </button>
                </div>
              ) : null}
            </div>
            <button className="asm-btn" onClick={onToggle}>{collapsed ? '▸' : '▾'}</button>
          </div>
        )}
      />

      {!collapsed ? (
        <>
          {isEditingFileName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: `1px solid ${THEME[state.theme].border}`, background: state.theme === 'dark' ? '#141418' : '#f5f5f9' }}>
              <span style={{ fontSize: 12, color: THEME[state.theme].mut }}>Edit file name</span>
              <input
                value={fileNameDraft}
                onChange={(e) => setFileNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveFileName();
                  if (e.key === 'Escape') setIsEditingFileName(false);
                }}
                autoFocus
                spellCheck={false}
                style={{
                  flex: 1,
                  height: 30,
                  borderRadius: 6,
                  border: `1px solid ${THEME[state.theme].border}`,
                  background: THEME[state.theme].panel2,
                  color: THEME[state.theme].text,
                  padding: '0 10px'
                }}
              />
              <button className="asm-btn" onClick={saveFileName}>Save</button>
              <button className="asm-btn" onClick={() => setIsEditingFileName(false)}>Cancel</button>
            </div>
          ) : null}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', borderBottom: `1px solid ${THEME[state.theme].border}`, padding: '6px 8px', background: state.theme === 'dark' ? '#141418' : '#f5f5f9' }}>
            {state.tabs.map((tab) => (
              <div
                key={tab.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: tab.id === state.activeTabId ? THEME[state.theme].accent : THEME[state.theme].panel2,
                  color: tab.id === state.activeTabId ? '#1a1204' : THEME[state.theme].text,
                  border: `1px solid ${tab.id === state.activeTabId ? 'transparent' : THEME[state.theme].border}`,
                  borderRadius: 6,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden'
                }}
              >
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SWITCH_TAB', tabId: tab.id })}
                  style={{
                    background: 'transparent',
                    color: 'inherit',
                    border: 'none',
                    padding: '6px 10px',
                    cursor: 'pointer'
                  }}
                >
                  {tab.name}
                </button>
                <button
                  type="button"
                  title={`Close ${tab.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'CLOSE_TAB', tabId: tab.id });
                  }}
                  style={{
                    background: 'transparent',
                    color: 'inherit',
                    border: 'none',
                    borderLeft: `1px solid ${tab.id === state.activeTabId ? 'rgba(26,18,4,.2)' : THEME[state.theme].border}`,
                    padding: '6px 8px',
                    cursor: 'pointer'
                  }}
                >
                  X
                </button>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '56px 1fr' }}>
            <div
              ref={gutterRef}
              style={{
                overflow: 'hidden',
                borderRight: `1px solid ${THEME[state.theme].border}`,
                background: state.theme === 'dark' ? '#141418' : '#f5f5f9'
              }}
            >
              {lines.map((line, idx) => {
                const lineNo = idx + 1;
                const bp = state.breakpoints.get(lineNo);
                const isActive = activeLine === idx;
                const flashClass = isActive && transition && Date.now() - transition.ts < 450
                  ? transition.direction === 'backward' ? 'line-flash-backward' : 'line-flash-forward'
                  : '';
                return (
                  <button
                    key={`gutter-${lineNo}-${line}`}
                    ref={(el) => { lineRefs.current[idx] = el; }}
                    type="button"
                    className={flashClass}
                    title={bp?.description ? `● Line ${lineNo}: ${bp.description}` : undefined}
                    onClick={() => setLineBreakpoint(idx)}
                    style={{
                      width: '100%',
                      height: 20,
                      userSelect: 'none',
                      cursor: 'pointer',
                      color: isActive ? THEME[state.theme].accent : THEME[state.theme].mut,
                      fontWeight: isActive ? 700 : 500,
                      fontSize: isActive ? 13 : 11,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '0 8px',
                      textAlign: 'left',
                      background: isActive ? THEME[state.theme].activeLine : 'transparent',
                      border: 'none',
                      borderLeft: isActive ? `3px solid ${THEME[state.theme].accent}` : '3px solid transparent'
                    }}
                  >
                    <span style={{ color: isActive ? THEME[state.theme].accent : 'transparent' }}>▶</span>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: bp ? (bp.enabled ? '#ef4444' : 'transparent') : 'transparent',
                      border: bp ? `1px solid ${bp.enabled ? '#ef4444' : '#999'}` : '1px solid transparent'
                    }} />
                    <span>{lineNo}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ position: 'relative', minHeight: 0 }}>
              <pre
                ref={highlightRef}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  margin: 0,
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  padding: 8,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 13,
                  lineHeight: '20px',
                  whiteSpace: 'pre'
                }}
              >
                {lines.map((line, idx) => (
                  <div key={`hl-${idx}`}>{renderHighlightedLine(line, THEME[state.theme], `hl-${idx}`)}</div>
                ))}
              </pre>
              <textarea
                value={state.source}
                onChange={(e) => dispatch({ type: 'UPDATE_SOURCE', source: e.target.value })}
                onScroll={(e) => {
                  if (gutterRef.current) {
                    gutterRef.current.scrollTop = e.currentTarget.scrollTop;
                  }
                  if (highlightRef.current) {
                    highlightRef.current.scrollTop = e.currentTarget.scrollTop;
                    highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
                  }
                }}
                spellCheck={false}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  background: state.theme === 'dark' ? '#151518' : '#f9f9fb',
                  color: 'transparent',
                  caretColor: THEME[state.theme].text,
                  padding: 8,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 13,
                  lineHeight: '20px',
                  resize: 'none'
                }}
              />
            </div>
          </div>

          {showFocusZoom ? (
            <div
              style={{
                borderTop: `1px solid ${THEME[state.theme].border}`,
                background: state.theme === 'dark'
                  ? 'linear-gradient(180deg, rgba(247,168,0,.10), rgba(24,24,27,.88))'
                  : 'linear-gradient(180deg, rgba(201,135,0,.10), rgba(255,255,255,.92))',
                padding: '8px 12px'
              }}
            >
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 17,
                  lineHeight: '1.45',
                  color: THEME[state.theme].text,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  borderLeft: `3px solid ${THEME[state.theme].accent}`,
                  paddingLeft: 10
                }}
              >
                {`${activeLine + 1}: ${focusedLineText || ''}`}
              </div>
              {state.timelineState.educationMode && focusedLineExplanation ? (
                <div
                  style={{
                    marginTop: 8,
                    color: THEME[state.theme].yellow,
                    fontSize: 12,
                    lineHeight: 1.4,
                    paddingLeft: 13
                  }}
                >
                  {focusedLineExplanation}
                </div>
              ) : null}
            </div>
          ) : null}

        </>
      ) : null}
    </div>
  );
}

function RegistersPanel({ state, current, prev, next, activeDiff, preview, theme, collapsed, onToggle }) {
  const showBanner = preview && preview.offset !== 0;

  const oldSnapshot = activeDiff.backward ? next : prev;

  return (
    <div className="asm-panel" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PanelHeader title="Registers" theme={theme} right={<button className="asm-btn" onClick={onToggle}>{collapsed ? '▸' : '▾'}</button>} />
      {collapsed ? null : (
        <>
      {showBanner ? (
        <div style={{ padding: '6px 8px', color: theme.yellow, fontSize: 12, borderBottom: `1px solid ${theme.border}` }}>
          Previewing {preview.offset > 0 ? `+${preview.offset}` : preview.offset} steps {preview.offset > 0 ? 'ahead' : 'back'} — not executed
        </div>
      ) : null}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {REG_NAMES.map((reg) => {
          const currentVal = current.registers[reg];
          const oldVal = oldSnapshot?.registers?.[reg] ?? currentVal;
          const changed = activeDiff.regs.has(reg);
          const backward = activeDiff.backward;

          return (
            <div key={reg} className={changed ? 'diff-flash' : ''} style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 8, padding: '5px 8px', borderBottom: `1px solid ${theme.border}` }}>
              <div style={{ color: theme.mut }}>{reg}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                {changed ? (
                  <>
                    <span style={{ color: backward ? theme.green : theme.red, textDecoration: 'line-through', fontSize: 11 }}>{oldVal}</span>
                    <span style={{ color: theme.mut }}>→</span>
                    <span style={{ color: backward ? theme.red : theme.green, fontWeight: 700 }}>{currentVal}</span>
                  </>
                ) : (
                  <span>{currentVal}</span>
                )}

                {preview?.regs?.[reg] ? (
                  <span style={{ marginLeft: 'auto', opacity: 0.7, fontStyle: 'italic', color: preview.offset > 0 ? theme.green : theme.orange, fontSize: 12 }}>
                    {preview.offset > 0 ? `⏱+${preview.offset}` : `↩${preview.offset}`} → {preview.regs[reg]}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}
    </div>
  );
}

function FlagsPanel({ current, theme, collapsed, onToggle }) {
  return (
    <div className="asm-panel" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PanelHeader title="Flags" theme={theme} right={<button className="asm-btn" onClick={onToggle}>{collapsed ? '▸' : '▾'}</button>} />
      {collapsed ? null : (
        <div style={{ padding: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {FLAG_NAMES.map((f) => (
            <div key={f} style={{ border: `1px solid ${theme.border}`, borderRadius: 8, padding: 8, textAlign: 'center' }}>
              <div style={{ color: theme.mut, fontSize: 11 }}>{f}</div>
              <div style={{ fontWeight: 700 }}>{current.flags[f] ?? 0}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MemoryPanel({ state, current, prev, next, activeDiff, preview, theme, collapsed, onToggle }) {
  const oldSnapshot = activeDiff.backward ? next : prev;
  const oldMap = new Map((oldSnapshot?.memory || []).map((m) => [m.addrHex, m.valHex]));

  return (
    <div className="asm-panel" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PanelHeader title="Memory" theme={theme} right={<button className="asm-btn" onClick={onToggle}>{collapsed ? '▸' : '▾'}</button>} />
      {collapsed ? null : (
        <>
          {preview ? (
            <div style={{ padding: '6px 8px', color: theme.yellow, fontSize: 12, borderBottom: `1px solid ${theme.border}` }}>
              Previewing {preview.offset > 0 ? `+${preview.offset}` : preview.offset} steps {preview.offset > 0 ? 'ahead' : 'back'} — not executed
            </div>
          ) : null}
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {current.memory.map((m) => {
              const changed = activeDiff.mem.has(m.addrHex);
              const backward = activeDiff.backward;
              const oldVal = oldMap.get(m.addrHex) || '0x00000000';

              return (
                <div key={m.addrHex} className={changed ? 'diff-flash' : ''} style={{ display: 'grid', gridTemplateColumns: '95px 1fr', padding: '4px 8px', borderBottom: `1px solid ${theme.border}`, gap: 8 }}>
                  <div style={{ color: theme.mut }}>{m.addrHex}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    {changed ? (
                      <>
                        <span style={{ color: backward ? theme.green : theme.red, textDecoration: 'line-through', fontSize: 11 }}>{oldVal}</span>
                        <span style={{ color: theme.mut }}>→</span>
                        <span style={{ color: backward ? theme.red : theme.green, fontWeight: 700 }}>{m.valHex}</span>
                      </>
                    ) : (
                      <span>{m.valHex}</span>
                    )}

                    {m.label ? <span style={{ color: theme.mut, fontStyle: 'italic' }}>{m.label}</span> : null}

                    {preview?.mem?.[m.addrHex] ? (
                      <span style={{ marginLeft: 'auto', opacity: 0.7, fontStyle: 'italic', color: preview.offset > 0 ? theme.green : theme.orange, fontSize: 12 }}>
                        {preview.offset > 0 ? `⏱+${preview.offset}` : `↩${preview.offset}`} → {preview.mem[m.addrHex]}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function StackPanel({ state, current, theme, collapsed, onToggle }) {
  const sp = current.registers['R6 (SP)'];
  const fp = current.registers['R5 (FP)'];

  return (
    <div className="asm-panel" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PanelHeader title="Stack" theme={theme} right={<button className="asm-btn" onClick={onToggle}>{collapsed ? '▸' : '▾'}</button>} />
      {collapsed ? null : (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '66px 110px 110px 1fr', gap: 8, padding: '6px 8px', color: theme.mut, borderBottom: `1px solid ${theme.border}` }}>
            <div>Arrow</div><div>Address</div><div>Value</div><div>Label</div>
          </div>
          {current.stack.map((r) => {
            const arrowItems = [];
            if (r.addrHex === sp) arrowItems.push({ text: '▶ SP', color: theme.green });
            if (r.addrHex === fp) arrowItems.push({ text: '▶ FP', color: theme.orange });

            return (
              <div key={`${r.addrHex}-${r.label}`} className={r.faded ? 'stack-faded' : ''} style={{
                display: 'grid',
                gridTemplateColumns: '66px 110px 110px 1fr',
                gap: 8,
                padding: '4px 8px',
                borderBottom: `1px solid ${theme.border}`,
                borderLeft: r.addrHex === sp ? `3px solid ${theme.green}` : (r.addrHex === fp ? `3px solid ${theme.orange}` : '3px solid transparent')
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, transition: 'transform 300ms ease' }}>
                  {arrowItems.length === 0 ? <span style={{ color: theme.mut }}>·</span> : arrowItems.map((a) => <span key={a.text} style={{ color: a.color }}>{a.text}</span>)}
                </div>
                <div>{r.addrHex}</div>
                <div>{r.valHex}</div>
                <div style={{ color: theme.mut }}>{r.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BreakpointsPanel({ state, dispatch, bpDraft, setBpDraft, collapsed, onToggle }) {
  const entries = Array.from(state.breakpoints.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div className="asm-panel" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PanelHeader title="Breakpoints" theme={THEME[state.theme]} right={<button className="asm-btn" onClick={onToggle}>{collapsed ? '▸' : '▾'}</button>} />
      {collapsed ? null : (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {entries.length === 0 ? <div style={{ padding: 8, opacity: 0.7 }}>No breakpoints.</div> : null}
          {entries.map(([line, bp]) => {
            const isEditing = state.editingBreakpoint === line;
            return (
              <div key={line} style={{ borderBottom: '1px solid rgba(255,255,255,.08)', padding: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr auto auto', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: bp.enabled ? '#ef4444' : 'transparent',
                    border: `1px solid ${bp.enabled ? '#ef4444' : '#9ca3af'}`
                  }} />
                  <div>Line {line}</div>
                  <label style={{ fontSize: 12, opacity: 0.8 }}>
                    <input type="checkbox" checked={bp.enabled} onChange={() => dispatch({ type: 'TOGGLE_BREAKPOINT', line })} /> on
                  </label>
                  <button className="asm-btn" onClick={() => {
                    dispatch({ type: 'SET_EDITING_BREAKPOINT', line });
                    setBpDraft(bp.description || '');
                  }}>✎</button>
                </div>

                {isEditing ? (
                  <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                    <input value={bpDraft} onChange={(e) => setBpDraft(e.target.value)} placeholder="Breakpoint note..." style={{ flex: 1 }} />
                    <button className="asm-btn" onClick={() => dispatch({ type: 'UPDATE_BREAKPOINT_DESC', line, description: bpDraft })}>Save</button>
                  </div>
                ) : bp.description ? <div style={{ marginTop: 4, fontStyle: 'italic', opacity: 0.8 }}>"{bp.description}"</div> : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WatchPanel({ state, current, collapsed, onToggle }) {
  return (
    <div className="asm-panel" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PanelHeader title="Watch / Stats" theme={THEME[state.theme]} right={<button className="asm-btn" onClick={onToggle}>{collapsed ? '▸' : '▾'}</button>} />
      {collapsed ? null : (
        <div style={{ padding: 8, fontSize: 12 }}>
          <div style={{ marginBottom: 6, opacity: 0.8 }}>Current step: {state.currentStep} / {state.snapshots.length - 1}</div>
          {state.watchList.map((w) => (
            <div key={w} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.08)', padding: '3px 0' }}>
              <span>{w}</span>
              <strong>{current.registers[w] || '-'}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Terminal({ state, dispatch, onSubmitCommand, collapsed, onToggle }) {
  const term = state.terminalState;
  const inputRef = useRef(null);
  const historyRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [term.mode]);
  useEffect(() => {
    if (!historyRef.current) return;
    historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [term.inputHistory, term.command, collapsed]);

  return (
    <div className="asm-panel" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PanelHeader
        title="Terminal"
        theme={THEME[state.theme]}
        right={(
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="asm-btn" onClick={() => dispatch({ type: 'CLEAR_TERMINAL' })}>⌫</button>
            <button className="asm-btn" onClick={onToggle}>{collapsed ? '▸' : '▾'}</button>
          </div>
        )}
      />
      {collapsed ? null : (
        <>
          <div ref={historyRef} style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
            {term.inputHistory.map((entry, idx) => {
              let color = 'inherit';
              if (entry.kind === 'warn') color = THEME[state.theme].yellow;
              if (entry.kind === 'output') color = THEME[state.theme].cyan;
              if (entry.kind === 'input') color = THEME[state.theme].accent;
              return <div key={`h-${idx}`} style={{ color }}>{entry.kind === 'input' ? `> ${entry.text}` : entry.text}</div>;
            })}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const txt = term.command.trim();
                if (!txt && term.mode === 'command') return;
                void onSubmitCommand(term.command);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}
            >
              <span style={{ color: THEME[state.theme].accent }}>
                {term.mode === 'awaiting_input' ? 'input>' : '>'}
              </span>
              <input
                ref={inputRef}
                value={term.command}
                onChange={(e) => dispatch({ type: 'TERMINAL_COMMAND_TEXT', text: e.target.value })}
                placeholder={term.mode === 'awaiting_input' ? '' : ''}
                spellCheck={false}
                style={{
                  flex: 1,
                  background: 'transparent',
                  color: THEME[state.theme].text,
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  padding: 0
                }}
              />
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function TimelinePanel({ state, dispatch, current, timelineVisualLine, trackRef, playheadProgress, onTrackClick, onSetTimelineLine, onTogglePlay, collapsed, onToggle }) {
  const total = Math.max(1, state.ctx.lines.length - 1);
  const currentIndex = clamp(timelineVisualLine ?? 0, 0, total);
  const complete = Math.round((currentIndex / total) * 100);
  const speed = state.timelineState.speed;
  const resetTimeline = () => {
    dispatch({ type: 'TIMELINE_STOP' });
    onSetTimelineLine(0);
  };

  const startDrag = (e) => {
    onTrackClick(e.clientX);
    const onMove = (evt) => onTrackClick(evt.clientX);
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const playheadPercent = ((currentIndex + playheadProgress) / Math.max(1, total)) * 100;

  return (
    <div className="asm-panel" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PanelHeader title="▶ TIMELINE" theme={THEME[state.theme]} right={<button className="asm-btn" onClick={onToggle}>{collapsed ? '▸' : '▾'}</button>} />
      {collapsed ? null : (
        <div style={{ padding: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12 }}>Speed:</span>
              <input
                type="number"
                min={0.1}
                max={30}
                step={0.1}
                value={speed}
                onChange={(e) => dispatch({ type: 'TIMELINE_SET_SPEED', speed: e.target.value })}
                style={{
                  width: 86,
                  height: 30,
                  borderRadius: 8,
                  border: `1px solid ${THEME[state.theme].border}`,
                  background: state.theme === 'dark' ? '#121216' : '#ffffff',
                  color: THEME[state.theme].text,
                  padding: '0 10px',
                  fontWeight: 600,
                  boxShadow: state.theme === 'dark' ? 'inset 0 0 0 1px rgba(255,255,255,.03)' : 'inset 0 0 0 1px rgba(0,0,0,.03)'
                }}
              />
              <span style={{ fontSize: 12 }}>s/line</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="asm-btn" onClick={onTogglePlay}>{state.timelineState.playing ? '⏸' : '▶'}</button>
              <button className="asm-btn" onClick={resetTimeline}>■</button>
              <button className="asm-btn" onClick={resetTimeline}>Reset</button>
              <button className="asm-btn" onClick={() => dispatch({ type: 'TIMELINE_SET_LOOP', value: !state.timelineState.loop })}>{state.timelineState.loop ? 'Loop: ON' : 'Loop'}</button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'TIMELINE_SET_EDUCATION_MODE', value: !state.timelineState.educationMode })}
                role="switch"
                aria-checked={state.timelineState.educationMode}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 30,
                  padding: '0 10px',
                  borderRadius: 999,
                  border: `1px solid ${state.timelineState.educationMode ? THEME[state.theme].accent : THEME[state.theme].border}`,
                  background: state.timelineState.educationMode
                    ? 'linear-gradient(135deg, rgba(247,168,0,.22), rgba(247,168,0,.08))'
                    : THEME[state.theme].panel2,
                  color: THEME[state.theme].text,
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>Education Mode</span>
                <span
                  style={{
                    position: 'relative',
                    width: 38,
                    height: 20,
                    borderRadius: 999,
                    background: state.timelineState.educationMode
                      ? 'rgba(247,168,0,.55)'
                      : (state.theme === 'dark' ? '#2f3036' : '#d5d7e1'),
                    transition: 'background 180ms ease'
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: 2,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: state.timelineState.educationMode ? '#fff4d3' : '#ffffff',
                      boxShadow: state.timelineState.educationMode
                        ? '0 0 8px rgba(247,168,0,.45)'
                        : '0 1px 2px rgba(0,0,0,.22)',
                      transform: state.timelineState.educationMode ? 'translateX(18px)' : 'translateX(0)',
                      transition: 'transform 180ms ease, box-shadow 180ms ease'
                    }}
                  />
                </span>
              </button>
            </div>
          </div>

          <div
            ref={trackRef}
            onMouseDown={startDrag}
            role="button"
            aria-label="Timeline position"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') onSetTimelineLine((v) => clamp((typeof v === 'number' ? v : currentIndex) - 1, 0, total));
              if (e.key === 'ArrowRight') onSetTimelineLine((v) => clamp((typeof v === 'number' ? v : currentIndex) + 1, 0, total));
            }}
            style={{ position: 'relative', height: 48, borderRadius: 8, border: `1px solid ${THEME[state.theme].border}`, overflow: 'hidden', cursor: 'pointer', background: state.theme === 'dark' ? '#111214' : '#eceef3' }}
          >
            <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: 10, background: 'linear-gradient(90deg, rgba(79,124,255,.65), rgba(79,124,255,.2))', width: `${playheadPercent}%`, transition: state.timelineState.playing ? 'none' : 'width 200ms ease' }} />
            <div style={{ position: 'absolute', left: 0, top: 12, right: 0, height: 14, display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, total + 1)}, 1fr)` }}>
              {Array.from({ length: total + 1 }).map((_, i) => {
                const isExec = i <= currentIndex;
                return (
                  <div key={`tick-${i}`} style={{ borderRight: `1px solid ${isExec ? 'rgba(79,124,255,.45)' : 'rgba(127,127,127,.2)'}`, height: i === currentIndex ? 14 : 10, alignSelf: 'end', background: i === currentIndex ? 'rgba(79,124,255,.9)' : 'transparent' }} />
                );
              })}
            </div>
            <div style={{ position: 'absolute', left: `${playheadPercent}%`, top: 0, bottom: 0, width: 2, background: '#7ea3ff', transform: 'translateX(-1px)' }}>
              <div style={{ position: 'absolute', top: -2, left: -4, width: 10, height: 10, borderRadius: '50%', background: '#7ea3ff', boxShadow: '0 0 10px rgba(126,163,255,.75)' }} />
            </div>

            {Array.from(state.breakpoints.entries()).map(([line, bp]) => {
              if (!bp.enabled) return null;
              const idx = clamp(line - 1, 0, total);
              const x = (idx / total) * 100;
              return <div key={`bp-${line}`} style={{ position: 'absolute', left: `${x}%`, bottom: 4, width: 8, height: 8, borderRadius: '50%', background: '#ef4444', transform: 'translateX(-50%)' }} />;
            })}
          </div>

          <div style={{ marginTop: 6, fontSize: 12, color: THEME[state.theme].mut }}>
            Line {currentIndex + 1} of {state.ctx.lines.length} | PC: {current?.registers?.PC || '0x00000000'} | {complete}% complete | Est: {formatEta(Math.max(0, total - currentIndex), speed)}
          </div>
        </div>
      )}
    </div>
  );
}

function PanelHeader({ title, right, theme }) {
  return (
    <div style={{ height: 34, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', borderBottom: `1px solid ${theme?.border || 'rgba(255,255,255,.08)'}`, fontSize: 12, letterSpacing: '.04em' }}>
      <strong>{title}</strong>
      {right || null}
    </div>
  );
}

export default Ilcc;
