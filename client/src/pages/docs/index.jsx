/* LCC reference — rendered from src/data/isa.json (kept honest by isa.test.js). */
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import Page from '../../components/Page';
import ps from '../../components/Page.module.css';
import s from './Docs.module.css';
import isa from '../../data/isa.json';

/* Same encoding the editor's ?code= loader expects. */
const base64url = (code) =>
  btoa(encodeURIComponent(code)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function Docs() {
  return (
    <Page title="LCC reference" wide subtitle="Every instruction and directive the assembler accepts, with operand forms and the flags each one sets. Registers are 16 bits; memory is 65,536 words.">
      <div className={s.layout}>
        <nav className={s.nav} aria-label="Sections">
          <a href="#registers">Registers</a>
          <a href="#flags">Flags</a>
          <a href="#syntax">Syntax</a>
          <div className={s.navHead}>Instructions</div>
          {isa.groups.map((g) => <a key={g.title} href={`#${slug(g.title)}`}>{g.title}</a>)}
          <div className={s.navHead}>More</div>
          <a href="#directives">Directives</a>
          <a href="#examples">Examples</a>
        </nav>

        <div>
          <h2 id="registers" className={`${ps.h2} ${s.section}`} style={{ marginTop: 0 }}>Registers</h2>
          <div className={s.tableWrap}><table className={ps.table}>
            <thead><tr><th>Register</th><th>Alias</th><th>Purpose</th></tr></thead>
            <tbody>{isa.registers.map((r) => (
              <tr key={r.name}><td><code className={ps.code}>{r.name}</code></td><td>{r.alias && <code className={ps.code}>{r.alias}</code>}</td><td>{r.purpose}</td></tr>
            ))}</tbody>
          </table></div>

          <h2 id="flags" className={`${ps.h2} ${s.section}`}>Condition flags</h2>
          <p className={ps.p}>Four flags: <strong>N Z C V</strong>. Branches test them; most arithmetic sets them. Loads, stores, moves, push/pop and traps leave them alone.</p>
          <div className={s.tableWrap}><table className={ps.table}>
            <thead><tr><th>Flag</th><th>Meaning</th><th>Set by</th></tr></thead>
            <tbody>{isa.flags.map((f) => (
              <tr key={f.name}><td><code className={ps.code}>{f.name}</code></td><td>{f.meaning}</td><td className={ps.muted}>{f.setBy}</td></tr>
            ))}</tbody>
          </table></div>

          <h2 id="syntax" className={`${ps.h2} ${s.section}`}>Syntax</h2>
          <p className={ps.p}>
            A word in column 1 is a <strong>label</strong> (optionally followed by <code className={ps.code}>:</code>). Instructions must be indented. Comments start with <code className={ps.code}>;</code>.
            Immediates can be decimal, hex (<code className={ps.code}>0x1f</code>) or a character (<code className={ps.code}>'a'</code>). Registers may be written <code className={ps.code}>r0</code>–<code className={ps.code}>r7</code> or by alias (<code className={ps.code}>fp sp lr</code>).
            Operand column key: <code className={ps.code}>dr</code> destination, <code className={ps.code}>sr</code> source, <code className={ps.code}>baser</code> base register, <code className={ps.code}>immN</code> signed N-bit immediate, <code className={ps.code}>[x]</code> optional.
          </p>

          {isa.groups.map((g) => (
            <section key={g.title}>
              <h2 id={slug(g.title)} className={`${ps.h2} ${s.section}`}>{g.title}</h2>
              <div className={s.tableWrap}><table className={ps.table}>
                <thead><tr><th>Mnemonic</th><th>Operands</th><th>Description</th><th>Flags</th></tr></thead>
                <tbody>{g.instructions.map((i) => (
                  <tr key={i.mnemonic}>
                    <td><code className={ps.code}>{i.mnemonic}</code></td>
                    <td className={s.ops}>{i.operands || <span className={ps.muted}>—</span>}</td>
                    <td>{i.description}</td>
                    <td className={ps.muted}>{i.flags || '—'}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            </section>
          ))}

          <h2 id="directives" className={`${ps.h2} ${s.section}`}>Directives</h2>
          <div className={s.tableWrap}><table className={ps.table}>
            <thead><tr><th>Directive</th><th>Operands</th><th>Description</th></tr></thead>
            <tbody>{isa.directives.map((d) => (
              <tr key={d.name}><td><code className={ps.code}>{d.name}</code></td><td className={s.ops}>{d.operands}</td><td>{d.description}</td></tr>
            ))}</tbody>
          </table></div>
          <p className={`${ps.p} ${ps.small} ${ps.muted}`} style={{ marginTop: 10 }}>Put data after <code className={ps.code}>halt</code> — execution starts at address 0 and runs straight through memory.</p>

          <h2 id="examples" className={`${ps.h2} ${s.section}`}>Examples</h2>
          {isa.examples.map((ex) => (
            <div key={ex.title}>
              <div className={s.exHead}>
                <h3 className={ps.h3} style={{ margin: 0 }}>{ex.title}</h3>
                <Link className={ps.btn} to={'/?code=' + base64url(ex.code)}>Open in editor <ExternalLink size={13} /></Link>
              </div>
              <pre className={ps.pre}>{ex.code}</pre>
            </div>
          ))}
          <p className={`${ps.p} ${ps.small} ${ps.muted}`}>Stuck? See the <Link to="/faq">FAQ</Link>.</p>
        </div>
      </div>
    </Page>
  );
}
