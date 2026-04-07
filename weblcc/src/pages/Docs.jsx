import { useNavigate } from 'react-router-dom';

const INSTRUCTIONS = [
  { cat: 'Data Transfer', items: [
    { mnem: 'mov Rd, Rs', desc: 'Copy Rs into Rd' },
    { mnem: 'mov Rd, #imm', desc: 'Load immediate value into Rd' },
    { mnem: 'lea Rd, label', desc: 'Load effective address of label into Rd' },
    { mnem: 'ld Rd, Rs', desc: 'Load memory[Rs] into Rd' },
    { mnem: 'st Rs, Rd', desc: 'Store Rs into memory[Rd]' },
    { mnem: 'ldr Rd, Rs, #off', desc: 'Load memory[Rs + off] into Rd' },
    { mnem: 'str Rs, Rd, #off', desc: 'Store Rs into memory[Rd + off]' },
  ]},
  { cat: 'Arithmetic', items: [
    { mnem: 'add Rd, Rs, Rt', desc: 'Rd = Rs + Rt' },
    { mnem: 'sub Rd, Rs, Rt', desc: 'Rd = Rs − Rt' },
    { mnem: 'mul Rd, Rs, Rt', desc: 'Rd = Rs × Rt' },
    { mnem: 'div Rd, Rs, Rt', desc: 'Rd = Rs ÷ Rt' },
    { mnem: 'cmp Rs, Rt', desc: 'Set flags based on Rs − Rt (no result stored)' },
  ]},
  { cat: 'Logic', items: [
    { mnem: 'and Rd, Rs, Rt', desc: 'Rd = Rs AND Rt' },
    { mnem: 'or  Rd, Rs, Rt', desc: 'Rd = Rs OR Rt' },
    { mnem: 'xor Rd, Rs, Rt', desc: 'Rd = Rs XOR Rt' },
    { mnem: 'not Rd, Rs', desc: 'Rd = bitwise NOT of Rs' },
  ]},
  { cat: 'Branches', items: [
    { mnem: 'br  label', desc: 'Unconditional branch to label' },
    { mnem: 'brz label', desc: 'Branch if Z flag set (result = 0)' },
    { mnem: 'brn label', desc: 'Branch if N flag set (result < 0)' },
    { mnem: 'brp label', desc: 'Branch if P flag set (result > 0)' },
    { mnem: 'brnz label', desc: 'Branch if N or Z (result ≤ 0)' },
    { mnem: 'brne label', desc: 'Branch if not Z (result ≠ 0)' },
    { mnem: 'bl  label', desc: 'Branch and link — saves PC to LR (R7), then jumps' },
    { mnem: 'ret', desc: 'Return — jump to address in LR (R7)' },
    { mnem: 'halt', desc: 'Stop execution' },
  ]},
  { cat: 'Stack', items: [
    { mnem: 'push Rs', desc: 'Decrement SP, store Rs at memory[SP]' },
    { mnem: 'pop Rd', desc: 'Load memory[SP] into Rd, increment SP' },
  ]},
  { cat: 'I/O', items: [
    { mnem: 'din  Rd', desc: 'Read decimal integer from input into Rd' },
    { mnem: 'dout Rs', desc: 'Print Rs as decimal integer' },
    { mnem: 'ain  Rd', desc: 'Read ASCII character into Rd' },
    { mnem: 'aout Rs', desc: 'Print Rs as ASCII character' },
    { mnem: 'hin  Rd', desc: 'Read hex integer into Rd' },
    { mnem: 'hout Rs', desc: 'Print Rs as hex integer' },
    { mnem: 'sin  Rd', desc: 'Read string starting at address in Rd' },
    { mnem: 'sout Rs', desc: 'Print null-terminated string at address in Rs' },
    { mnem: 'nl', desc: 'Print a newline character' },
  ]},
  { cat: 'Directives', items: [
    { mnem: '.string "text"', desc: 'Declare a null-terminated string constant' },
    { mnem: '.blkw n', desc: 'Reserve n words of memory (initialized to 0)' },
    { mnem: '.fill #n', desc: 'Declare a word initialized to n' },
  ]},
];

const REGISTERS = [
  { name: 'R0–R5', desc: 'General-purpose registers' },
  { name: 'R5 / FP', desc: 'Frame pointer (by convention)' },
  { name: 'R6 / SP', desc: 'Stack pointer — points to top of stack' },
  { name: 'R7 / LR', desc: 'Link register — stores return address on bl' },
  { name: 'PC', desc: 'Program counter — address of next instruction' },
  { name: 'IR', desc: 'Instruction register — current instruction word' },
];

const FLAGS = [
  { name: 'N', desc: 'Negative — last result < 0' },
  { name: 'Z', desc: 'Zero — last result = 0' },
  { name: 'P', desc: 'Positive — last result > 0' },
  { name: 'C', desc: 'Carry — unsigned overflow' },
  { name: 'V', desc: 'Overflow — signed overflow' },
];

export default function Docs() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b0d11',
      color: '#e2e2e5',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 28px', borderBottom: '1px solid rgba(255,255,255,.07)',
        position: 'sticky', top: 0, background: '#0b0d11', zIndex: 10,
      }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#8a8a96', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0, fontFamily: 'inherit' }}>←</button>
        <span style={{ fontWeight: 700, fontSize: 15 }}>LCC Documentation</span>
        <button onClick={() => navigate('/ilcc')} style={{ marginLeft: 'auto', background: 'rgba(247,168,0,.12)', border: '1px solid rgba(247,168,0,.25)', borderRadius: 7, padding: '6px 16px', color: '#f7a800', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Open Editor</button>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px' }}>
        {/* Registers */}
        <Section title="Registers">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              <th style={th}>Name</th>
              <th style={th}>Description</th>
            </tr></thead>
            <tbody>
              {REGISTERS.map(r => (
                <tr key={r.name} style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <td style={{ ...td, color: '#3ddc84', fontWeight: 600 }}>{r.name}</td>
                  <td style={{ ...td, color: '#8a8a96' }}>{r.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Flags */}
        <Section title="Condition Flags">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {FLAGS.map(f => (
              <div key={f.name} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: '10px 14px', flex: '1 1 140px' }}>
                <div style={{ color: '#4fd8ff', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{f.name}</div>
                <div style={{ color: '#8a8a96', fontSize: 12 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Instruction set */}
        {INSTRUCTIONS.map(group => (
          <Section key={group.cat} title={group.cat}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>
                <th style={{ ...th, width: '38%' }}>Instruction</th>
                <th style={th}>Description</th>
              </tr></thead>
              <tbody>
                {group.items.map(item => (
                  <tr key={item.mnem} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                    <td style={{ ...td, color: '#ffb457', fontFamily: 'inherit' }}>{item.mnem}</td>
                    <td style={{ ...td, color: '#8a8a96' }}>{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        ))}

        {/* Stack frame convention */}
        <Section title="Standard Stack Frame">
          <pre style={{ color: '#8a8a96', fontSize: 12, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>{`; Callee setup
func:       push lr          ; save return address
            push fp          ; save caller's frame pointer
            mov  fp, sp      ; set our frame pointer

            ; ... function body ...

            mov  sp, fp      ; restore stack pointer
            pop  fp          ; restore frame pointer
            pop  lr          ; restore return address
            ret              ; return to caller`}</pre>
        </Section>
      </div>
    </div>
  );
}

const th = { textAlign: 'left', padding: '8px 12px', color: '#5b5f6a', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid rgba(255,255,255,.07)' };
const td = { padding: '9px 12px', verticalAlign: 'top' };

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#e2e2e5', marginBottom: 14, letterSpacing: '.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,.07)', paddingBottom: 10 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
