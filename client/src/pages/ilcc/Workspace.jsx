/*
 * Workspace.jsx — Primary layout for the ILCC page.
 *
 * Layout (outermost → innermost):
 *
 *   Outer horizontal PanelGroup
 *   ├─ Collapsible side panel  (resizable)
 *   └─ Right area
 *       Vertical PanelGroup
 *       ├─ Top row  [flex row, no PanelGroup]
 *       │   ├─ Code Editor           (flex: 1, absorbs all resize)
 *       │   └─ Debug card            (fixed 440 px, no resize handle)
 *       │       ├─ CPU State column  (CSS border divider — not resizable)
 *       │       └─ Memory + Stack column
 *       │           Vertical PanelGroup  (Memory / Stack still resizable)
 *       └─ Terminal  (resizable, spans editor + debug width)
 *
 * The debug card is toggled by the chevron on the right of the editor header.
 * The side panel is toggled by the chevron on the left of the editor header.
 */

import { useRef, useEffect, useState } from 'react';
import { Upload, Download, Link2, AlignLeft } from 'lucide-react';

// ── LCC Assembly Auto-Formatter ──────────────────────────────────────────────
function fmtSplitComment(line) {
  let inStr = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inStr = !inStr;
    if (!inStr && line[i] === ';') return { code: line.slice(0, i), comment: line.slice(i).trim() };
  }
  return { code: line, comment: '' };
}
function fmtInstrPart(instr) {
  const parts = instr.trim().split(/\s+/);
  const mnemonic = parts[0];
  if (parts.length === 1) return mnemonic;
  const operands = parts.slice(1).join(' ').replace(/\s*,\s*/g, ', ');
  return mnemonic.padEnd(Math.max(mnemonic.length + 1, 6)) + operands;
}
function formatLCCAssembly(source) {
  const INDENT = ' '.repeat(12);
  return source.split('\n').map(rawLine => {
    const trimmed = rawLine.trimEnd().trim();
    if (!trimmed) return '';
    if (trimmed.startsWith(';')) return trimmed;
    const { code, comment } = fmtSplitComment(trimmed);
    const c = code.trim();
    if (!c) return comment ? '; ' + comment.replace(/^;+\s*/, '') : '';
    const suffix = comment ? '  ' + comment : '';
    const lm = c.match(/^([A-Za-z_$.][A-Za-z0-9_$.]*):\s*(.*)/);
    if (lm) {
      const label = lm[1] + ':';
      const rest = lm[2].trim();
      if (!rest) return label + suffix;
      return label + ' '.repeat(Math.max(1, 12 - label.length)) + fmtInstrPart(rest) + suffix;
    }
    return INDENT + fmtInstrPart(c) + suffix;
  }).join('\n');
}
// ─────────────────────────────────────────────────────────────────────────────
import { Panel, Group, Separator } from 'react-resizable-panels';
import styles from './Workspace.module.css';
import Editor from './panels/Editor';
import TabBar from './panels/TabBar';
import Terminal from './panels/Terminal';
import CPU from './panels/CPU';
import Stack from './panels/Stack';
import Memory from './panels/Memory';

export default function Workspace({
  editorRef,
  output, inputMode, onSendInput,
  debugState, memoryMap, isDebugging, iteration,
  tabs, activeTabId, onSwitchTab, onNewTab, onCloseTab, onRenameTab,
  onImportFiles, onExport,
  debuggerLayout = 'classic',
}) {
  const sidePanelRef       = useRef(null);
  const fileInputRef       = useRef(null);
  const [formatDone, setFormatDone] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const handleFormat = () => {
    const code = editorRef.current?.getCode() ?? '';
    editorRef.current?.setCode(formatLCCAssembly(code));
    setFormatDone(true);
    setTimeout(() => setFormatDone(false), 2500);
  };

  const handleShare = () => {
    const code = editorRef.current?.getCode() ?? '';
    const encoded = btoa(encodeURIComponent(code)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const url = `${window.location.origin}${window.location.pathname}?code=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    });
  };
  const debuggerPanelRef   = useRef(null);
  const debugCardRef       = useRef(null);
  const prevLayoutRef      = useRef(debuggerLayout);
  const pendingResizeRef   = useRef(null);
  const savedDebuggerPxRef = useRef(null); // last user-set debugger pixel width

  /* Capture the resize target DURING render, before React commits the new
     props.  At this point the Panel library hasn't yet enforced the updated
     minSize, so getSize() still returns the genuine pre-change pixel width.
     The effect below applies the stored value after the commit. */
  if (debuggerLayout !== prevLayoutRef.current && debuggerPanelRef.current) {
    const { inPixels } = debuggerPanelRef.current.getSize();
    const prev = prevLayoutRef.current;
    if (debuggerLayout === 'compact' && prev === 'classic') {
      pendingResizeRef.current = Math.round(inPixels * 2 / 3);
    } else if (debuggerLayout === 'classic' && prev === 'compact') {
      pendingResizeRef.current = Math.round(inPixels * 3 / 2);
    }
  }

  useEffect(() => {
    prevLayoutRef.current = debuggerLayout;
    if (pendingResizeRef.current === null || !debuggerPanelRef.current) return;
    const target = pendingResizeRef.current;
    pendingResizeRef.current = null;
    const ref = debuggerPanelRef.current;
    // Defer to rAF so the Panel's useLayoutEffect has fully re-derived its
    // constraints from the new minSize before we call resize().  Without this,
    // resize(380) can be silently clamped by the stale minSize=570 that was
    // still in effect at the time the useEffect ran.
    requestAnimationFrame(() => {
      ref.resize(target);
      savedDebuggerPxRef.current = target;
    });
  }, [debuggerLayout]);

  /* Capture the debugger's pixel width on open; clear it on close. */
  useEffect(() => {
    if (!isDebugging) {
      savedDebuggerPxRef.current = null;
      return;
    }
    requestAnimationFrame(() => {
      if (debuggerPanelRef.current) {
        savedDebuggerPxRef.current = debuggerPanelRef.current.getSize().inPixels;
      }
    });
  }, [isDebugging]);

  /* When the window grows wider, pin the debugger back to its saved width so
     the editor absorbs all extra space instead of the debugger expanding. */
  useEffect(() => {
    if (!isDebugging) return;
    let lastWidth = window.innerWidth;

    function handleResize() {
      const newWidth = window.innerWidth;
      const grew = newWidth > lastWidth;
      lastWidth = newWidth;
      if (grew && savedDebuggerPxRef.current !== null && debuggerPanelRef.current) {
        requestAnimationFrame(() => {
          debuggerPanelRef.current?.resize(savedDebuggerPxRef.current);
        });
      }
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDebugging]);

  /* Horizontal trackpad scroll on the debug card.
     Inner elements (Panel divs, overflow containers) absorb wheel events
     before they naturally bubble up to .debugCard.  Listening in the CAPTURE
     phase guarantees we see every wheel event first.  We only steal it when
     the card actually has horizontal overflow to scroll; otherwise the event
     falls through untouched so vertical scrolling inside columns still works. */
  useEffect(() => {
    if (!isDebugging) return;
    const el = debugCardRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.deltaX === 0) return;
      if (el.scrollWidth <= el.clientWidth) return; // nothing to scroll — don't interfere
      el.scrollLeft += e.deltaX;
      e.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => el.removeEventListener('wheel', onWheel, { capture: true });
  }, [isDebugging]);

  return (
    <div className={styles.workspaceOuter}>

      {/* ── Outer horizontal split: side panel | right area ── */}
      <Group orientation="horizontal" className={styles.outerHGroup}>

        {/* Collapsible side panel — full height (commented out for now)
        <Panel
          ref={sidePanelRef}
          collapsible
          defaultSize={18}
          minSize={12}
        >
          <div className={styles.sidePanel}>
            <div className={styles.sectionHeader}>Panel</div>
          </div>
        </Panel>

        <Separator className={styles.resizeHandleV} />
        */}

        {/* Right area — vertical split: top row | terminal */}
        <Panel minSize={30}>
          <Group orientation="vertical" className={styles.mainVGroup}>

            {/* ── Top row: editor | debug card (resizable horizontal split) ── */}
            <Panel defaultSize={72} minSize={30}>
              <Group orientation="horizontal" className={styles.editorDebugGroup}>

                {/* Code Editor */}
                <Panel id="editor" minSize={300}>
                  <div className={styles.pane}>
                    {/* Hidden file input for importing .a files */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".a"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const files = Array.from(e.target.files);
                        if (files.length) onImportFiles(files);
                        e.target.value = '';
                      }}
                    />
                    <div className={styles.paneHeader}>
                      <span>Code</span>
                      <div className={styles.paneHeaderActions}>
                        <button
                          className={styles.paneActionBtn}
                          onClick={handleFormat}
                          title="Format code"
                        >
                          <AlignLeft size={14} />
                        </button>
                        <button
                          className={styles.paneActionBtn}
                          onClick={handleShare}
                          title="Share code via URL"
                          data-tour="share"
                        >
                          <Link2 size={14} />
                        </button>
                        <button
                          className={styles.paneActionBtn}
                          onClick={() => fileInputRef.current.click()}
                          title="Import .a files"
                        >
                          <Upload size={14} />
                        </button>
                        <button
                          className={styles.paneActionBtn}
                          onClick={onExport}
                          title="Export all tabs"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                    {formatDone && (
                      <div className={styles.shareBanner}>Code formatted!</div>
                    )}
                    {shareCopied && (
                      <div className={styles.shareBanner}>Link copied to clipboard!</div>
                    )}
                    <TabBar
                      tabs={tabs}
                      activeId={activeTabId}
                      onSwitch={onSwitchTab}
                      onNew={onNewTab}
                      onClose={onCloseTab}
                      onRename={onRenameTab}
                    />
                    <Editor ref={editorRef} />
                  </div>
                </Panel>

                {/* Debug card — only visible during an active debug session */}
                {isDebugging && <>
                  <Separator
                    className={styles.resizeHandleV}
                    onDragging={(isDragging) => {
                      if (!isDragging && debuggerPanelRef.current) {
                        savedDebuggerPxRef.current = debuggerPanelRef.current.getSize().inPixels;
                      }
                    }}
                  />
                  <Panel id="debugger" defaultSize={35} minSize={debuggerLayout === 'classic' ? 572 : 382} panelRef={debuggerPanelRef} className={styles.debuggerPanel}>
                    <div className={styles.debugCard} ref={debugCardRef}>

                      {/* CPU State — left column */}
                      <div className={styles.cpuColumn}>
                        <div className={styles.sectionHeader}>CPU State</div>
                        <CPU debugState={debugState} iteration={iteration} />
                      </div>

                      {debuggerLayout === 'classic' ? (

                        /* Classic: three equal-width columns, CSS borders only */
                        <>
                          <div className={styles.classicColumn}>
                            <div className={styles.sectionHeader} data-tour="memory">Memory</div>
                            <Memory debugState={debugState} memoryMap={memoryMap} isDebugging={isDebugging} />
                          </div>
                          <div className={`${styles.classicColumn} ${styles.classicDivider}`}>
                            <div className={styles.sectionHeader} data-tour="stack">Stack</div>
                            <Stack debugState={debugState} memoryMap={memoryMap} isDebugging={isDebugging} />
                          </div>
                        </>

                      ) : (

                        /* Compact (default): Memory over Stack in a resizable right column */
                        <div className={styles.memStackColumn}>
                          <Group orientation="vertical" className={styles.memStackGroup}>

                            <Panel defaultSize={50} minSize={15} className={styles.memStackPanel}>
                              <div className={styles.debugSection}>
                                <div className={styles.sectionHeader}>Memory</div>
                                <Memory debugState={debugState} memoryMap={memoryMap} isDebugging={isDebugging} />
                              </div>
                            </Panel>

                            <Separator className={styles.resizeHandle} />

                            <Panel defaultSize={50} minSize={10} className={styles.memStackPanel}>
                              <div className={styles.debugSection}>
                                <div className={styles.sectionHeader}>Stack</div>
                                <Stack debugState={debugState} memoryMap={memoryMap} isDebugging={isDebugging} />
                              </div>
                            </Panel>

                          </Group>
                        </div>

                      )}

                    </div>
                  </Panel>
                </>}

              </Group>
            </Panel>

            <Separator className={styles.resizeHandle} />

            {/* Terminal — spans editor + debug card width */}
            <Panel defaultSize={28} minSize={8}>
              <div className={styles.pane}>
                <div className={styles.paneHeader}>Terminal</div>
                <Terminal output={output} inputMode={inputMode} onSendInput={onSendInput} />
              </div>
            </Panel>

          </Group>
        </Panel>

      </Group>
    </div>
  );
}
