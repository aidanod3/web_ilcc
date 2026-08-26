/*
 * Setup — download, install and verify the course software (lcc + ilcc).
 * Public route; the download links themselves are behind SAML forward-auth.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Copy, Check, Info, AlertTriangle, ExternalLink, Play } from 'lucide-react';
import Page from '../../components/Page';
import ps from '../../components/Page.module.css';
import s from './Setup.module.css';
import { api, fmtBytes } from '../../lib/api';
import useMe from '../../hooks/useMe';

const BASE = import.meta.env.BASE_URL;
const dlUrl = (file) => `${BASE}api/downloads/${file}`;

const PLATFORMS = [
  { id: 'linux', label: 'Linux' },
  { id: 'mac-intel', label: 'macOS Intel' },
  { id: 'mac-arm', label: 'macOS Apple Silicon' },
  { id: 'windows', label: 'Windows' },
];
const OS_OF = { linux: 'linux', 'mac-intel': 'mac', 'mac-arm': 'mac', windows: 'windows' };
const MAC_HELP = 'https://docs.lumu.io/portal/en/kb/articles/how-to-check-macos-processor';

/* ---- platform detection ---- */
function detectPlatform() {
  const uad = navigator.userAgentData?.platform || '';
  const ua = navigator.userAgent || '';
  const p = (uad || ua).toLowerCase();
  if (/win/.test(p) && !/darwin/.test(p)) return { id: 'windows', sure: true };
  if (/mac|darwin/.test(p) && !/iphone|ipad/.test(ua.toLowerCase())) {
    // Apple Silicon vs Intel: WebGL renderer is the only reliable browser hint.
    let renderer = '';
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      const ext = gl?.getExtension('WEBGL_debug_renderer_info');
      if (gl && ext) renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '';
    } catch { /* ignore */ }
    if (/apple/i.test(renderer)) return { id: 'mac-arm', sure: true };
    if (/intel|amd|radeon|nvidia/i.test(renderer)) return { id: 'mac-intel', sure: true };
    return { id: 'mac-arm', sure: false };
  }
  if (/linux|x11|cros/.test(p) && !/android/.test(ua.toLowerCase())) return { id: 'linux', sure: true };
  return { id: 'linux', sure: false };
}

/* ---- small helpers ---- */
function useCopy() {
  const [done, setDone] = useState(null);
  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setDone(key);
    setTimeout(() => setDone((d) => (d === key ? null : d)), 1500);
  };
  return [done, copy];
}

function Pre({ children, copyKey }) {
  const [done, copy] = useCopy();
  return (
    <pre className={ps.pre}>
      {children}
      <button type="button" className={ps.copyBtn} onClick={() => copy(children, copyKey || children)}>
        {done ? 'Copied' : 'Copy'}
      </button>
    </pre>
  );
}

function Step({ cmd, why, children }) {
  return (
    <div className={s.step}>
      {children && <p className={ps.p}>{children}</p>}
      {cmd && <Pre>{cmd}</Pre>}
      {why && <p className={s.why}><em>Why:</em> {why}</p>}
    </div>
  );
}

function DownloadCard({ f, recommended, isSignedIn }) {
  const [done, copy] = useCopy();
  return (
    <div className={`${ps.card} ${s.dlCard} ${recommended ? s.recommended : ''}`}>
      <div className={s.dlTitle}>
        {f.title || f.file}
        {recommended && <span className={ps.badge}>Recommended</span>}
      </div>
      {f.description && <p className={`${ps.p} ${ps.small}`} style={{ margin: 0 }}>{f.description}</p>}
      <div className={s.dlMeta}>
        <span>{f.file}</span>
        {f.size != null && <span>{fmtBytes(f.size)}</span>}
        {f.sha256 && (
          <span className={s.hash} title={f.sha256}>
            sha256 {f.sha256.slice(0, 12)}…
            <button type="button" className={s.iconBtn} onClick={() => copy(f.sha256, 'h')} title="Copy full sha256">
              {done ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </span>
        )}
      </div>
      <div>
        <a className={recommended ? ps.btnPrimary : ps.btn} href={dlUrl(f.file)}>
          <Download size={14} /> {isSignedIn ? 'Download' : 'Sign in to download'}
        </a>
      </div>
    </div>
  );
}

const EXPECTED = `Starting assembly pass 1
Starting assembly pass 2
Starting interpretation of a1test.e
lst file = a1test.lst
bst file = a1test.bst
====================================================== Output
1
2
3
4
5
6
7
8
-9
-10
-11
-12`;

export default function Setup() {
  const { isSignedIn } = useMe();
  const [manifest, setManifest] = useState(null);
  const [err, setErr] = useState(null);
  const detected = useMemo(() => detectPlatform(), []);
  const [platform, setPlatform] = useState(detected.id);
  const [os, setOs] = useState(OS_OF[detected.id]);

  useEffect(() => {
    api('/downloads/manifest').then(setManifest).catch((e) => setErr(e.message));
  }, []);

  const files = manifest?.files || [];
  const byPlat = (p) => files.filter((f) => f.platform === p);
  const perOs = byPlat(platform);
  const unified = byPlat('all');
  const textbook = byPlat('textbook');
  const ilccOnly = files.filter((f) => /^executables/i.test(f.file));
  const shown = new Set([...perOs, ...unified, ...textbook, ...ilccOnly].map((f) => f.file));
  const bothMacs = !detected.sure && platform.startsWith('mac')
    ? files.filter((f) => f.platform.startsWith('mac') && f.platform !== platform) : [];

  const choose = (id) => { setPlatform(id); setOs(OS_OF[id]); };

  return (
    <Page title="Setup" subtitle="Download the course software package, unzip it, and verify it runs. The package is required for the course and used extensively; the first lab walks through installing and checking it. Please download and unzip the package for your machine before the first lab.">

      {/* 1. Which package */}
      <h2 className={ps.h2}>1. Which package?</h2>
      <p className={ps.p}>
        We think you're on <strong>{PLATFORMS.find((p) => p.id === detected.id)?.label}</strong>
        {!detected.sure && ' (not certain)'}. Change it if that's wrong:
      </p>
      <div className={s.seg} role="radiogroup" aria-label="Platform">
        {PLATFORMS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={platform === p.id}
            className={`${s.segBtn} ${platform === p.id ? s.segOn : ''}`} onClick={() => choose(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      <p className={`${ps.p} ${ps.small} ${ps.muted}`}>
        Not sure whether your Mac is Intel or Apple Silicon?{' '}
        <a href={MAC_HELP} target="_blank" rel="noreferrer">How to check which Mac you have <ExternalLink size={11} /></a>
      </p>

      {/* 2. Download */}
      <h2 className={ps.h2}>2. Download</h2>
      {!isSignedIn && (
        <div className={ps.callout}><Info size={16} className={ps.calloutIcon} />
          <span>Requires your SUNY New Paltz login. Clicking a download button will send you through single sign-on and then start the download.</span>
        </div>
      )}
      {err && <div className={ps.calloutWarn + ' ' + ps.callout}><AlertTriangle size={16} className={ps.calloutIcon} /><span>Couldn't load the download list: {err}</span></div>}
      {manifest && files.length === 0 && <div className={ps.empty}>No downloads are available right now.</div>}
      <div className={ps.grid}>
        {perOs.map((f) => <DownloadCard key={f.file} f={f} recommended isSignedIn={isSignedIn} />)}
        {bothMacs.map((f) => <DownloadCard key={f.file} f={f} isSignedIn={isSignedIn} />)}
        {unified.map((f) => (
          <DownloadCard key={f.file} isSignedIn={isSignedIn}
            f={{ ...f, title: f.title || 'One zip for every machine', description: (f.description ? f.description + ' ' : '') + 'Contains binaries for all four platforms, so it is larger than the per-OS zips.' }} />
        ))}
        {ilccOnly.map((f) => <DownloadCard key={f.file} f={{ ...f, title: f.title || 'ilcc debugger only' }} isSignedIn={isSignedIn} />)}
        {textbook.map((f) => <DownloadCard key={f.file} f={{ ...f, title: f.title || 'Textbook (PDF)' }} isSignedIn={isSignedIn} />)}
        {files.filter((f) => !shown.has(f.file) && !f.platform.startsWith('mac') && f.platform !== 'linux' && f.platform !== 'windows')
          .map((f) => <DownloadCard key={f.file} f={f} isSignedIn={isSignedIn} />)}
      </div>

      {/* 3. Contents */}
      <h2 className={ps.h2}>3. What's in the zip?</h2>
      <table className={ps.table}>
        <thead><tr><th>File</th><th>What it is</th></tr></thead>
        <tbody>
          <tr><td><code className={ps.code}>lcc</code></td><td>Assembler + interpreter command-line tool (~140 KB, native). Assembles <code className={ps.code}>x.a</code> → <code className={ps.code}>x.e</code> and runs it; also writes <code className={ps.code}>x.lst</code> (listing) and <code className={ps.code}>x.bst</code>.</td></tr>
          <tr><td><code className={ps.code}>ilcc</code></td><td>Interactive debugger (~60–120 MB, a bundled Node app). Does the same as <code className={ps.code}>lcc</code> but lets you step and shows registers.</td></tr>
          <tr><td><code className={ps.code}>a1test.a</code></td><td>The verification program used below.</td></tr>
          <tr><td><code className={ps.code}>.c .cpp .cn .cpn .a .an</code></td><td>Textbook sample programs by chapter. <code className={ps.code}>.cn</code>/<code className={ps.code}>.an</code> are line-numbered copies, as printed in the book.</td></tr>
          <tr><td><code className={ps.code}>slidescuh/</code></td><td>Lecture slides (also viewable at <Link to="/materials">Materials</Link>).</td></tr>
          <tr><td><code className={ps.code}>*.pdf</code></td><td>Reference sheets.</td></tr>
        </tbody>
      </table>
      <p className={`${ps.p} ${ps.small} ${ps.muted}`} style={{ marginTop: 10 }}>
        The unified <code className={ps.code}>cuh63.zip</code> adds <code className={ps.code}>bin/{'{'}linux-x64,macos-x64,macos-arm64,win-x64{'}'}/</code> plus top-level <code className={ps.code}>lcc</code> / <code className={ps.code}>ilcc</code> launcher scripts (and <code className={ps.code}>.cmd</code> versions for Windows) that pick the right binary for you.
      </p>

      {/* 4. Unzip & verify */}
      <h2 className={ps.h2}>4. Unzip &amp; verify</h2>
      <div className={ps.tabs} role="tablist">
        {[['mac', 'macOS'], ['linux', 'Linux'], ['windows', 'Windows']].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={os === id}
            className={`${ps.tab} ${os === id ? ps.tabActive : ''}`} onClick={() => setOs(id)}>{label}</button>
        ))}
      </div>
      <div className={ps.tabPanel}>
        {os === 'mac' && (<>
          <Step>Double-click the zip in Finder to unzip it, then open Terminal and go into the folder:</Step>
          <Step cmd={'cd ~/Downloads/cuh63*'} />
          <Step cmd={'chmod +x lcc ilcc'} why="zip files don't reliably keep the Unix execute bit." />
          <Step cmd={'xattr -d com.apple.quarantine lcc ilcc'}
            why={<>Safari/Chrome tag downloads and Gatekeeper blocks unsigned binaries (“cannot be opened because the developer cannot be verified”). Alternative: System Settings → Privacy &amp; Security → <strong>Open Anyway</strong>.</>} />
          <div className={`${ps.callout} ${ps.calloutWarn}`}><AlertTriangle size={16} className={ps.calloutIcon} />
            <span>If you see <strong>“Bad CPU type in executable”</strong>, you downloaded the zip for the other kind of Mac — grab the other one above.</span></div>
          <Step cmd={'./lcc a1test.a'} why={<>the <code className={ps.code}>./</code> is needed because the current folder isn't on your PATH.</>} />
          <Step cmd={'./ilcc a1test.a -n'} />
        </>)}
        {os === 'linux' && (<>
          <Step cmd={'unzip cuh63Linux.zip && cd cuh63Linux'} />
          <Step cmd={'chmod +x lcc ilcc'} why="zip files don't reliably keep the Unix execute bit." />
          <Step cmd={'./lcc a1test.a'} why={<>the <code className={ps.code}>./</code> is needed because the current folder isn't on your PATH.</>} />
          <Step cmd={'./ilcc a1test.a -n'} />
          <div className={ps.callout}><Info size={16} className={ps.calloutIcon} />
            <span>The binaries are x86-64 / glibc. On WSL, use this Linux zip, not the Windows one.</span></div>
        </>)}
        {os === 'windows' && (<>
          <Step>Right-click the zip → <strong>Extract All</strong>. Open the extracted folder, then Shift+right-click an empty spot → <strong>Open PowerShell window here</strong>.</Step>
          <Step cmd={'.\\lcc.exe a1test.a'} why={<>PowerShell doesn't run programs from the current directory without <code className={ps.code}>.\</code>.</>} />
          <Step cmd={'.\\ilcc.exe a1test.a -n'} />
          <div className={`${ps.callout} ${ps.calloutWarn}`}><AlertTriangle size={16} className={ps.calloutIcon} />
            <span>SmartScreen says <strong>“Windows protected your PC”</strong>? Click <strong>More info → Run anyway</strong>. The exe isn't code-signed, that's all. If Defender quarantines <code className={ps.code}>ilcc.exe</code>, add the folder as an exclusion in Windows Security.</span></div>
        </>)}
        <div className={ps.callout}><Info size={16} className={ps.calloutIcon} />
          <span>Using the unified <code className={ps.code}>cuh63.zip</code>? Just run <code className={ps.code}>./lcc a1test.a</code> (Windows: <code className={ps.code}>.\lcc a1test.a</code>) — the launcher script handles the chmod, quarantine and architecture selection for you.</span></div>
      </div>

      {/* 5. Expected output */}
      <h2 id="expected" className={ps.h2} style={{ scrollMarginTop: 64 }}>5. Expected output</h2>
      <p className={ps.p}>You'll be prompted for your name first — it's written to <code className={ps.code}>name.nnn</code> and used for grading, so use your real name. Then you should see:</p>
      <Pre>{EXPECTED}</Pre>

      {/* 6. Troubleshooting */}
      <h2 className={ps.h2}>6. Troubleshooting</h2>
      {[
        ['“Permission denied”', <>The execute bit got lost in the zip. Run <code className={ps.code}>chmod +x lcc ilcc</code> in the folder and try again.</>],
        ['“cannot be opened because the developer cannot be verified” (macOS Gatekeeper)', <>Run <code className={ps.code}>xattr -d com.apple.quarantine lcc ilcc</code>, or go to System Settings → Privacy &amp; Security and click <strong>Open Anyway</strong> next to the blocked app.</>],
        ['“Bad CPU type in executable” (macOS)', <>You have the zip for the other Mac architecture. Intel Macs need <code className={ps.code}>cuh63MacIntel.zip</code>; Apple Silicon (M1/M2/M3/M4) needs <code className={ps.code}>cuh63MacArm.zip</code>. <a href={MAC_HELP} target="_blank" rel="noreferrer">Check which one you have.</a></>],
        ['“command not found” / “lcc is not recognized”', <>The current folder isn't on your PATH. Type <code className={ps.code}>./lcc a1test.a</code> (macOS/Linux) or <code className={ps.code}>.\lcc.exe a1test.a</code> (PowerShell) — note the <code className={ps.code}>./</code> or <code className={ps.code}>.\</code>. Also make sure you <code className={ps.code}>cd</code>'d into the unzipped folder.</>],
        ['“Windows protected your PC” (SmartScreen)', <>Click <strong>More info</strong>, then <strong>Run anyway</strong>. The program isn't code-signed, which is all SmartScreen is complaining about.</>],
        ['Defender quarantined ilcc.exe', <>Open Windows Security → Virus &amp; threat protection → Manage settings → Exclusions, and add the unzipped folder. Then re-extract the zip to restore the file.</>],
        ['a1test.lst was not produced', <>That means assembly failed before anything ran. Scroll up — the assembler prints the error (with the line number) just above. Usually a typo in <code className={ps.code}>a1test.a</code> or running from the wrong folder.</>],
      ].map(([q, a]) => (
        <details key={q} className={s.details}><summary>{q}</summary><div>{a}</div></details>
      ))}
      <p className={ps.p} style={{ marginTop: 12 }}>If you're still stuck, your lab instructor will know how to fix it.</p>

      {/* 7. CTA */}
      <div className={`${ps.card} ${s.cta}`}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Or skip installing — ILCC runs in your browser.</div>
          <div className={`${ps.small} ${ps.muted}`}>Same assembler, same debugger, nothing to download. Labs still use the local install, so do both.</div>
        </div>
        <Link to="/?tour=basics" className={ps.btnPrimary}><Play size={14} /> Open the editor</Link>
      </div>
    </Page>
  );
}
