/*
 * index.jsx — ILCC page root component.
 *
 * This is the top-level component for the /ilcc route. It owns all
 * application state and orchestrates the two main workflows:
 *
 *   1. Run  — assemble + execute the code to completion (useRunProgram).
 *   2. Debug — step through execution interactively (useDebugSession).
 *
 * State flows downward via props:
 *   - Header receives control callbacks (onRun, onDebug, onStep, etc.)
 *     and status flags (isRunning, isDebugging, canStepBack, etc.).
 *   - Main receives nothing yet — panels will be wired up once we
 *     connect the editor's source code and the debug state diffs.
 *
 * The root div uses flex column + height 100% so the Header takes its
 * natural height and Main fills the remaining viewport space.
 */

import { useRef, useEffect, useState } from 'react';
import Header from './Header';
import Workspace from './Workspace';
import Drawer from './Drawer';
import useRunProgram from '../../hooks/useRunProgram';
import useDebugSession from '../../hooks/useDebugSession';

export default function Ilcc() {
  /* Ref to the CodeMirror editor — call editorRef.current.getCode()
     to read the document contents on demand (run/debug). */
  const editorRef = useRef(null);

  /* ── Tab state ──────────────────────────────────────────────────────────
     Each tab:  { id: string, name: string, content: string }
     content is the last-saved snapshot; the live text lives in CodeMirror
     and is flushed into the tab record on every switch / close. */
  const tabCounterRef = useRef(1);
  const initialTabId  = useRef(`tab-${Date.now()}`).current;

  const [tabs,        setTabs]        = useState([{ id: initialTabId, name: 'untitled-1.a', content: '' }]);
  const [activeTabId, setActiveTabId] = useState(initialTabId);

  /* Flush the current CodeMirror content back into the active tab record. */
  const flushActiveTab = () => {
    const content = editorRef.current?.getCode() ?? '';
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content } : t));
    return content;
  };

  const handleSwitchTab = (id) => {
    if (id === activeTabId) return;
    flushActiveTab();
    setActiveTabId(id);
    const target = tabs.find(t => t.id === id);
    editorRef.current?.setCode(target?.content ?? '');
  };

  const handleNewTab = () => {
    flushActiveTab();
    tabCounterRef.current += 1;
    const id   = `tab-${Date.now()}`;
    const name = `untitled-${tabCounterRef.current}.a`;
    setTabs(prev => [...prev, { id, name, content: '' }]);
    setActiveTabId(id);
    editorRef.current?.setCode('');
  };

  const handleCloseTab = (id) => {
    if (tabs.length <= 1) return;
    const idx       = tabs.findIndex(t => t.id === id);
    const remaining = tabs.filter(t => t.id !== id);
    if (id === activeTabId) {
      /* Activate the nearest surviving tab without flushing (we're discarding this one). */
      const next = remaining[Math.min(idx, remaining.length - 1)];
      setActiveTabId(next.id);
      editorRef.current?.setCode(next.content ?? '');
    }
    setTabs(remaining);
  };

  const handleRenameTab = (id, name) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, name } : t));
  };

  /* ── Drawer (problems panel) state ── */
  const [menuOpen, setMenuOpen] = useState(false);

  /* Hook for the "Run" workflow: assemble + execute to completion */
  const runner = useRunProgram();

  /* Hook for the "Debug" workflow: interactive stepping with diffs */
  const debug_session = useDebugSession();

  /* Helper to read the editor contents at the moment of action */
  const getCode = () => editorRef.current?.getCode() ?? '';

  /* Keep the editor's debug-line highlight in sync with the current PC.
     When currentLine is null (session stopped / halted / error) the
     highlight is cleared. */
  useEffect(() => {
    if (debug_session.currentLine != null) {
      editorRef.current?.highlightLine(debug_session.currentLine);
    } else {
      editorRef.current?.clearHighlight();
    }
  }, [debug_session.currentLine]);

  /* ── Handler: Run button ──
     Reads the editor and sends to POST /api/run. */
  const handleRun = () => runner.run(getCode());

  /* ── Handler: Debug button ──
     Reads the editor and starts an interactive debug session. */
  const handleDebug = async () => {
    try {
      await debug_session.start(getCode());
    } catch (err) {
      // TODO: surface error to user (e.g. assembly errors)
    }
  };

  /* ── Handler: Stop button ──
     Ends whichever mode is active (run or debug). */
  const handleStop = () => {
    runner.reset();
    debug_session.stop();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Full-height slide-in problems drawer */}
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Top toolbar: run/debug/step/stop buttons */}
      <Header
        isRunning={runner.isRunning}
        isDebugging={debug_session.isDebugging}
        onRun={handleRun}
        onDebug={handleDebug}
        onStep={(n) => debug_session.step(n)}
        onStop={handleStop}
        canStepForward={debug_session.isDebugging && !debug_session.programDone && !debug_session.inputMode}
        onMenuOpen={() => setMenuOpen(true)}
      />

      {/* Workspace: editor, terminal, and debugger panels */}
      <Workspace
        editorRef={editorRef}
        output={debug_session.isDebugging ? debug_session.output : runner.output}
        inputMode={debug_session.isDebugging ? debug_session.inputMode : runner.inputMode}
        onSendInput={debug_session.isDebugging ? debug_session.sendInput : runner.sendInput}
        debugState={debug_session.debugState}
        memoryMap={debug_session.memoryMap}
        isDebugging={debug_session.isDebugging}
        iteration={debug_session.iteration}
        tabs={tabs}
        activeTabId={activeTabId}
        onSwitchTab={handleSwitchTab}
        onNewTab={handleNewTab}
        onCloseTab={handleCloseTab}
        onRenameTab={handleRenameTab}
      />

    </div>
  );
}
