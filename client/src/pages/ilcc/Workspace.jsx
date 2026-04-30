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

import { useRef, useEffect } from 'react';
import { Upload, Download } from 'lucide-react';
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
  debuggerLayout = 'compact',
}) {
  const sidePanelRef     = useRef(null);
  const fileInputRef     = useRef(null);
  const debuggerPanelRef = useRef(null);
  const prevLayoutRef    = useRef(debuggerLayout);
  const pendingResizeRef = useRef(null);

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
    requestAnimationFrame(() => ref.resize(target));
  }, [debuggerLayout]);

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
                  <Separator className={styles.resizeHandleV} />
                  <Panel id="debugger" defaultSize={35} minSize={debuggerLayout === 'classic' ? 570 : 380} panelRef={debuggerPanelRef} className={styles.debuggerPanel}>
                    <div className={styles.debugCard}>

                      {/* CPU State — left column */}
                      <div className={styles.cpuColumn}>
                        <div className={styles.sectionHeader}>CPU State</div>
                        <CPU debugState={debugState} iteration={iteration} />
                      </div>

                      {debuggerLayout === 'classic' ? (

                        /* Classic: three equal-width columns, CSS borders only */
                        <>
                          <div className={styles.classicColumn}>
                            <div className={styles.sectionHeader}>Memory</div>
                            <Memory debugState={debugState} memoryMap={memoryMap} isDebugging={isDebugging} />
                          </div>
                          <div className={`${styles.classicColumn} ${styles.classicDivider}`}>
                            <div className={styles.sectionHeader}>Stack</div>
                            <Stack debugState={debugState} memoryMap={memoryMap} isDebugging={isDebugging} />
                          </div>
                        </>

                      ) : (

                        /* Compact (default): Memory over Stack in a resizable right column */
                        <div className={styles.memStackColumn}>
                          <Group orientation="vertical" className={styles.memStackGroup}>

                            <Panel defaultSize={50} minSize={15}>
                              <div className={styles.debugSection}>
                                <div className={styles.sectionHeader}>Memory</div>
                                <Memory debugState={debugState} memoryMap={memoryMap} isDebugging={isDebugging} />
                              </div>
                            </Panel>

                            <Separator className={styles.resizeHandle} />

                            <Panel defaultSize={50} minSize={10}>
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
