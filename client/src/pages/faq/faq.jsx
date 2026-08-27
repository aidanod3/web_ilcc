/* FAQ entries. `a` is JSX; the search box indexes q, tags and a's rendered text. */
import { Link } from 'react-router-dom';
import ps from '../../components/Page.module.css';

// eslint-disable-next-line react-refresh/only-export-components
const C = ({ children }) => <code className={ps.code}>{children}</code>;
const MAC_HELP = 'https://docs.lumu.io/portal/en/kb/articles/how-to-check-macos-processor';

export const FAQ = [
  {
    id: 'what-is-lcc', q: 'What is LCC?', tags: ['lcc', 'isa', 'registers', 'flags'],
    a: <>LCC is a small 16-bit teaching instruction set from the course textbook. It has 8 registers <C>r0</C>–<C>r7</C> (<C>r5</C> = <C>fp</C> frame pointer, <C>r6</C> = <C>sp</C> stack pointer, <C>r7</C> = <C>lr</C> link register) and four condition flags N, Z, C, V. <C>lcc</C> assembles and runs <C>.a</C> files; <C>ilcc</C> is the interactive debugger. See the <Link to="/docs">LCC reference</Link>.</>,
  },
  {
    id: 'install', q: 'How do I install the course software?', tags: ['setup', 'download', 'install'],
    a: <>Follow the <Link to="/setup">Setup page</Link>: pick the zip for your OS, unzip, run <C>./lcc a1test.a</C> and compare the output. Downloads require your SUNY New Paltz login.</>,
  },
  {
    id: 'mac-intel-or-arm', q: 'Is my Mac Intel or Apple Silicon?', tags: ['mac', 'm1', 'm2', 'arm', 'intel'],
    a: <>Apple menu → About This Mac. If “Chip” says Apple M1/M2/M3/M4 you need the Apple Silicon zip; if it says “Processor: Intel …” you need the Intel one. <a href={MAC_HELP} target="_blank" rel="noreferrer">Step-by-step guide</a>. Wrong zip → “Bad CPU type in executable”.</>,
  },
  {
    id: 'a1test-fails', q: 'a1test.a fails or prints something different', tags: ['a1test', 'verify', 'lst'],
    a: <>Compare against the <Link to="/setup#expected">expected output</Link>. If no <C>a1test.lst</C> appears, assembly failed — read the error printed above. If the program runs but output differs, you may have edited <C>a1test.a</C>; re-extract the zip. Still stuck? Ask your lab instructor.</>,
  },
  {
    id: 'permission-denied', q: '“Permission denied” when running lcc or ilcc', tags: ['chmod', 'mac', 'linux'],
    a: <>The zip lost the execute bit. Run <C>chmod +x lcc ilcc</C> in the unzipped folder.</>,
  },
  {
    id: 'developer-cannot-be-verified', q: '“cannot be opened because the developer cannot be verified” (macOS)', tags: ['gatekeeper', 'xattr', 'quarantine', 'mac'],
    a: <>Gatekeeper blocks unsigned downloads. Either run <C>xattr -d com.apple.quarantine lcc ilcc</C>, or open System Settings → Privacy &amp; Security and click <strong>Open Anyway</strong>.</>,
  },
  {
    id: 'windows-protected', q: '“Windows protected your PC”', tags: ['smartscreen', 'windows', 'defender'],
    a: <>Click <strong>More info → Run anyway</strong>. The exe isn't code-signed. If Defender quarantines <C>ilcc.exe</C>, add the folder as an exclusion in Windows Security.</>,
  },
  {
    id: 'browser-vs-local', q: 'Browser ILCC vs local install — which should I use?', tags: ['web', 'online', 'install'],
    a: <>Both run the same assembler and interpreter. The browser version needs no install and is great for quick experiments and sharing. The local install is what labs use, so you need it too. See <Link to="/setup">Setup</Link>.</>,
  },
  {
    id: 'label-error', q: 'My program says “label” error / everything is treated as a label', tags: ['label', 'indent', 'syntax', 'column'],
    a: <>In LCC, anything starting in column 1 is a <em>label</em>. Instructions must be indented (at least one space or tab). So <C>mov r0, 5</C> at the left margin is read as a label named <C>mov</C>. Indent your instructions; put labels flush-left, optionally followed by <C>:</C>.</>,
  },
  {
    id: 'data-executed', q: 'My data got executed / weird output after halt', tags: ['data', 'word', 'string', 'halt', 'layout'],
    a: <>The interpreter starts at address 0 and runs straight through memory. If <C>.word</C>, <C>.string</C> or <C>.zero</C> come before your code, their bits get executed as instructions. Put all data <em>after</em> <C>halt</C> (or use <C>.start</C> to name the entry label).</>,
  },
  {
    id: 'stdin', q: 'How do input instructions (din, sin, ain) work?', tags: ['input', 'stdin', 'din', 'sin', 'ain', 'hin'],
    a: <><C>din</C>, <C>hin</C>, <C>ain</C> and <C>sin</C> pause the program until you type something. Locally, type in the terminal. In the browser, type in the terminal row at the bottom of the output panel and press Enter — your input is echoed just like a real terminal.</>,
  },
  {
    id: 'share', q: 'How do I share my code?', tags: ['share', 'url', 'link'],
    a: <>Click <strong>Share</strong> in the editor. It gives you a URL with the code embedded, so whoever opens it sees exactly your program — no account needed.</>,
  },
  {
    id: 'submit', q: 'How do I submit to an assignment?', tags: ['submit', 'assignment', 'autograder', 'grade'],
    a: <>Sign in first. When an assignment is open, a <strong>Submit</strong> button appears in the editor; pick the assignment and submit. Past submissions and results are under <Link to="/my-submissions">My submissions</Link>.</>,
  },
  {
    id: 'textbook-slides', q: 'Where are the textbook and slides?', tags: ['textbook', 'slides', 'pdf', 'materials'],
    a: <>Sign in, then see <Link to="/materials">Materials</Link> for slides and <Link to="/downloads">Downloads</Link> for the textbook PDF and the software zip.</>,
  },
  {
    id: 'tour', q: 'How do I restart the tour?', tags: ['tour', 'help', 'tutorial'],
    a: <>Open <Link to="/?tour=basics">/?tour=basics</Link>, or use Help → <strong>Take the tour</strong>. For the debugger walkthrough use <Link to="/?tour=debug">/?tour=debug</Link>.</>,
  },
  {
    id: 'shortcuts', q: 'Keyboard shortcuts', tags: ['keyboard', 'hotkeys', 'run', 'debug', 'step'],
    a: <><C>Ctrl/⌘+Enter</C> run · <C>F5</C> debug · <C>F10</C> step · <C>Esc</C> stop.</>,
  },
  {
    id: 'contact', q: 'Who do I contact for help?', tags: ['help', 'contact', 'bug', 'instructor'],
    a: <>Your lab instructor is the first stop for course and install questions. For problems with the website itself, use Help → <strong>Report a bug</strong>.</>,
  },
];
