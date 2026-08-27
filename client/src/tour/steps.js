/*
 * Tour copy. Targets are data-tour attributes (CSS Modules hash class names,
 * so those aren't usable) plus two library-stable selectors: .cm-editor and
 * [data-panel-id="debugger"].
 */
const code = (s) => `<code>${s}</code>`;

export const STEPS = {
  basics: [
    {
      first: true,
      element: '[data-tour="brand"]',
      title: 'Welcome to ILCC',
      description: `An assembler and debugger for the <b>LCC</b> — the 16-bit teaching computer from your architecture textbook. Write assembly, run it, then step through it one instruction at a time. Takes about a minute.`,
      side: 'bottom', align: 'start',
    },
    {
      element: '.cm-editor',
      title: 'Your editor',
      description: `Two rules that trip everyone up:<br>• <b>Indent every instruction.</b> A word in column 1 is a <i>label</i>, not code.<br>• <b>Put data after ${code('halt')}.</b> Otherwise the CPU tries to execute it.`,
      side: 'right', align: 'start',
    },
    {
      element: '[data-tour="templates"]',
      title: 'Start from a template',
      description: `Rather than a blank file, open <b>Code Templates</b> and pick ${code('demoA.a')} — four instructions: ${code('mov')}, ${code('dout')}, ${code('nl')}, ${code('halt')}.`,
      side: 'bottom', align: 'start',
    },
    {
      element: '[data-tour="run"]',
      title: 'Run',
      description: `Assembles your program and executes it to completion. Errors show up in the <b>Problems</b> panel (☰, top-left).`,
      side: 'bottom', align: 'center',
    },
    {
      element: '[data-tour="terminal"]',
      title: 'Terminal',
      description: `Output lands here. ${code('dout')} prints a signed decimal, ${code('nl')} a newline, ${code('sout')} a whole string, ${code('aout')} one character.`,
      side: 'top', align: 'start',
    },
    {
      element: '[data-tour="stdin"]',
      optional: true,
      title: 'Input',
      description: `When your program hits ${code('din')}, ${code('sin')}, or ${code('ain')} it pauses here. Type a value and press Enter.`,
      side: 'top', align: 'start',
    },
    {
      element: '[data-tour="share"]',
      title: 'Format, share, tabs',
      description: `<b>Format</b> tidies indentation. <b>Share</b> copies a URL containing your code. Use <b>+</b> on the tab strip for more files; import/export ${code('.a')} files with the arrows.`,
      side: 'bottom', align: 'end',
    },
    {
      element: '[data-tour="debug"]',
      title: 'Now the good part',
      description: `<b>Debug</b> loads the program but doesn't run it. You step through it and watch every register and memory cell change. Click <b>Start debugging</b> to continue the tour there.`,
      side: 'bottom', align: 'center',
    },
  ],

  debug: [
    {
      first: true,
      element: '[data-tour="step"]',
      title: 'Step',
      description: `Executes one instruction. The next line to run is highlighted in the editor. Bump the number beside it to jump several at once.`,
      side: 'bottom', align: 'center',
    },
    {
      element: '[data-tour="cpu"]',
      title: 'Registers',
      description: `${code('r0')}–${code('r7')} plus ${code('pc')} and ${code('ir')}, in hex. By convention ${code('r5')} is the frame pointer, ${code('r6')} the stack pointer, ${code('r7')} the link register. Anything that changed on the last step is highlighted.`,
      side: 'left', align: 'start',
    },
    {
      element: '[data-tour="flags"]',
      title: 'Flags',
      description: `<b>N</b> negative, <b>Z</b> zero, <b>C</b> carry, <b>V</b> overflow. Set by ${code('add')}, ${code('sub')}, ${code('cmp')} — they're what ${code('brz')}, ${code('brlt')}, ${code('brn')} and friends branch on.`,
      side: 'left', align: 'start',
    },
    {
      element: '[data-tour="memory"]',
      title: 'Memory',
      description: `Program-area cells that have been written. Type a hex address in the jump bar to look anywhere.`,
      side: 'left', align: 'start',
    },
    {
      element: '[data-tour="stack"]',
      optional: true,
      title: 'Stack',
      description: `Tracks ${code('sp')} and ${code('fp')} near the top of memory. ${code('push')}, ${code('pop')}, ${code('bl')}, ${code('ret')} all move it.`,
      side: 'left', align: 'start',
    },
    {
      element: '[data-tour="stop"]',
      title: 'Stop',
      description: `Ends the session. Run or Debug again any time.`,
      side: 'bottom', align: 'center',
    },
    {
      element: '[data-tour="guide"]',
      title: "That's it",
      description: `Reopen either tour from <b>Help</b>, along with the LCC reference, setup guide, slides, and FAQ. Keyboard: <kbd>Ctrl/⌘+Enter</kbd> run, <kbd>F5</kbd> debug, <kbd>F10</kbd> step, <kbd>Esc</kbd> stop.`,
      side: 'bottom', align: 'end',
    },
  ],
};
