import { describe, it, expect } from 'vitest';
import isa from './isa.json';

// Every mnemonic in the `switch` of handleInstruction() in
// server/src/web_ilcc/assembler.js. If the assembler grows, add here AND in isa.json.
const ASSEMBLER_MNEMONICS = [
  'br', 'bral', 'brz', 'bre', 'brnz', 'brne', 'brn', 'brp', 'brlt', 'brgt', 'brc',
  'add', 'sub', 'cmp', 'mov', 'mvi', 'mvr', 'push', 'pop',
  'srl', 'sra', 'sll', 'rol', 'ror', 'mul', 'div', 'rem', 'or', 'xor', 'sext',
  'ld', 'st', 'call', 'jsr', 'bl', 'jsrr', 'blr', 'and', 'ldr', 'str', 'jmp', 'ret',
  'not', 'lea', 'cea', 'halt', 'nl',
  'dout', 'udout', 'hout', 'aout', 'sout', 'din', 'hin', 'ain', 'sin',
  'm', 'r', 's', 'bp',
];

// Every directive in handleDirective().
const ASSEMBLER_DIRECTIVES = [
  '.start', '.org', '.global', '.extern', '.blkw', '.space', '.zero',
  '.fill', '.word', '.stringz', '.asciz', '.string',
];

const all = isa.groups.flatMap((g) => g.instructions);
const mnemonics = all.map((i) => i.mnemonic);

describe('isa.json', () => {
  it('has exactly the flags N Z C V', () => {
    expect(isa.flags.map((f) => f.name)).toEqual(['N', 'Z', 'C', 'V']);
  });

  it('has unique, lowercase mnemonics', () => {
    expect(new Set(mnemonics).size).toBe(mnemonics.length);
    for (const m of mnemonics) expect(m).toBe(m.toLowerCase());
  });

  it('uses only N Z C V in flags fields', () => {
    for (const i of all) expect(i.flags ?? '').toMatch(/^[NZCV]*$/);
  });

  it('documents every mnemonic the assembler accepts', () => {
    const missing = ASSEMBLER_MNEMONICS.filter((m) => !mnemonics.includes(m));
    expect(missing).toEqual([]);
  });

  it('documents only mnemonics the assembler accepts', () => {
    const extra = mnemonics.filter((m) => !ASSEMBLER_MNEMONICS.includes(m));
    expect(extra).toEqual([]);
  });

  it('documents every directive the assembler accepts', () => {
    const names = isa.directives.map((d) => d.name);
    expect(ASSEMBLER_DIRECTIVES.filter((d) => !names.includes(d))).toEqual([]);
  });

  it('has the required examples', () => {
    const titles = isa.examples.map((e) => e.title);
    expect(titles).toContain('Standard stack frame');
    expect(isa.examples.some((e) => /mov r0, 5\n\s*dout r0\n\s*nl\n\s*halt/.test(e.code))).toBe(true);
  });
});
