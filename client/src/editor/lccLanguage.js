/*
 * lccLanguage.js — CodeMirror 6 language mode for LCC assembly.
 * StreamLanguage tokenizer: comments, labels, mnemonics, registers,
 * directives, numbers, strings, chars. Extend KEYWORDS at runtime for
 * user-defined macros via `withCustomKeywords`.
 */
import { StreamLanguage } from '@codemirror/language';

export const MNEMONICS = new Set([
  // data movement
  'mov', 'mvi', 'mvr', 'ld', 'st', 'ldr', 'str', 'lea', 'cea',
  // arithmetic / logic
  'add', 'sub', 'mul', 'div', 'rem', 'and', 'or', 'xor', 'not', 'cmp', 'sext',
  'srl', 'sra', 'sll', 'rol', 'ror',
  // control
  'br', 'bral', 'brz', 'bre', 'brnz', 'brne', 'brn', 'brp', 'brlt', 'brgt', 'brc', 'brb',
  'jmp', 'bl', 'blr', 'jsr', 'jsrr', 'ret', 'push', 'pop',
  // traps
  'halt', 'nl', 'dout', 'udout', 'hout', 'aout', 'sout', 'din', 'hin', 'ain', 'sin',
  'm', 'r', 's', 'bp',
]);
export const DIRECTIVES = new Set(['.word', '.fill', '.zero', '.space', '.blkw', '.string', '.stringz', '.asciz', '.start', '.org', '.global', '.extern']);
export const REGISTERS = new Set(['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'fp', 'sp', 'lr', 'pc']);

function makeParser(extraKeywords = new Set()) {
  return {
    startState: () => ({ sol: true }),
    token(stream, state) {
      if (stream.sol()) state.sol = true;
      if (stream.eatSpace()) { state.sol = false; return null; }

      // comments
      if (stream.match(/;.*/) || stream.match(/\/\/.*/)) return 'comment';

      // strings / chars
      if (stream.match(/"(?:[^"\\]|\\.)*"?/)) return 'string';
      if (stream.match(/'(?:[^'\\]|\\.)'?/)) return 'string';

      // numbers: hex 0x.., decimal (signed), binary 0b..
      if (stream.match(/-?0x[0-9a-fA-F]+\b/) || stream.match(/-?0b[01]+\b/) || stream.match(/-?\d+\b/)) return 'number';

      // directives
      if (stream.match(/\.[a-zA-Z]+/)) {
        return DIRECTIVES.has(stream.current().toLowerCase()) ? 'keyword' : 'invalid';
      }

      // identifiers: label (with or without colon), mnemonic, register
      if (stream.match(/[@a-zA-Z_][\w@]*/)) {
        const word = stream.current();
        const lower = word.toLowerCase();
        const atSol = state.sol;
        state.sol = false;
        // "label:" anywhere, or a column-1 word (LCC rule: unindented = label)
        if (stream.match(/:/)) return 'labelName';
        if (atSol) return 'labelName';
        if (REGISTERS.has(lower)) return 'variableName';
        if (MNEMONICS.has(lower) || extraKeywords.has(lower)) return 'keyword';
        return 'name';
      }

      // punctuation
      if (stream.match(/[,+\-*]/)) return 'punctuation';

      stream.next();
      return null;
    },
    languageData: {
      commentTokens: { line: ';' },
    },
  };
}

export const lccStream = makeParser();

export function lccLanguage(customKeywords = []) {
  return StreamLanguage.define(makeParser(new Set(customKeywords.map(k => k.toLowerCase()))));
}

/* Rough but useful: count non-blank, non-comment, non-directive lines. */
export function countInstructions(source) {
  return String(source).split('\n').filter(l => {
    const s = l.replace(/;.*$/, '').trim();
    if (!s) return false;
    const w = s.replace(/^[@\w]+:\s*/, '').split(/\s+/)[0]?.toLowerCase();
    return w && !w.startsWith('.') && MNEMONICS.has(w);
  }).length;
}
