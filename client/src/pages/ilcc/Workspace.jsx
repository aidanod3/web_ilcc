/*
 * Workspace.jsx — Primary layout for the ILCC page.
 *
 * Vertical split (full width):
 *   Top panel (default 78%):
 *     Left column  (flex 3) — Code Editor (full height)
 *     Right column (flex 1) — CPU State + Stack/Memory side by side
 *   Bottom panel (default 22%) — Terminal, spanning full width
 *
 * The top/bottom split is draggable via react-resizable-panels.
 * The Stack/Memory card has its own internal draggable vertical split.
 */

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
  debugState, memoryMap, isDebugging,
  tabs, activeTabId, onSwitchTab, onNewTab, onCloseTab, onRenameTab,
}) {
  return (
    <div className={styles.workspaceOuter}>
      <Group orientation="vertical" className={styles.outerGroup}>

        {/* ── Top: editor (left) + debug panels (right) ── */}
        <Panel defaultSize={78} minSize={30}>
          <div className={styles.topRow}>

            {/* Left column: Code Editor full height */}
            <div className={styles.leftColumn}>
              <div className={styles.pane}>
                <div className={styles.paneHeader}>Code Editor</div>
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
            </div>

            {/* Right column: CPU State (fixed 40%) + Stack/Memory (rest) */}
            <div className={styles.rightColumn}>
              <div className={styles.rightGroup}>

                <div className={`${styles.debugCard} ${styles.cpuCard}`}>
                  <div className={styles.sectionHeader}>CPU State</div>
                  <CPU debugState={debugState} />
                </div>

                <div className={`${styles.debugCard} ${styles.stackMemCard}`}>
                  <Group orientation="vertical" className={styles.innerGroup}>

                    <Panel defaultSize={50} minSize={15}>
                      <div className={styles.debugSection}>
                        <div className={styles.sectionHeader}>Memory</div>
                        <Memory debugState={debugState} memoryMap={memoryMap} isDebugging={isDebugging} />
                      </div>
                    </Panel>

                    <Separator className={styles.resizeHandle} />

                    <Panel defaultSize={50} minSize={15}>
                      <div className={styles.debugSection}>
                        <div className={styles.sectionHeader}>Stack</div>
                        <Stack debugState={debugState} memoryMap={memoryMap} isDebugging={isDebugging} />
                      </div>
                    </Panel>

                  </Group>
                </div>

              </div>
            </div>

          </div>
        </Panel>

        <Separator className={styles.resizeHandle} />

        {/* ── Bottom: Terminal spanning full width ── */}
        <Panel defaultSize={40} minSize={8}>
          <div className={styles.bottomRow}>
            <div className={styles.pane}>
              <div className={styles.paneHeader}>Terminal</div>
              <Terminal output={output} inputMode={inputMode} onSendInput={onSendInput} />
            </div>
          </div>
        </Panel>

      </Group>
    </div>
  );
}
