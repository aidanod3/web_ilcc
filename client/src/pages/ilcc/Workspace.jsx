/*
 * Workspace.jsx — Primary layout for the ILCC page.
 *
 * Two-column layout that fills all space below the Header:
 *
 *   Left column (flex: 3):
 *     react-resizable-panels split (vertical):
 *       - Code Editor (88.5% default, min 20%)
 *       - Terminal     (rest, min 15%)
 *
 *   Right column (flex: 1):
 *     react-resizable-panels split (horizontal):
 *       - CPU State card     (40% default, min 20%)
 *       - Stack/Memory card  (60% default, min 25%)
 *           └─ inner split (vertical):
 *               - Stack  (50% default, min 15%) — virtual scroll, full 64K range
 *               - Memory (50% default, min 15%) — sparse, program-area writes
 *     Both inner panels have a jump-to-address bar.
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
    <div className={styles.layout}>

      {/* ── Left column: editor + terminal with a draggable resize handle ── */}
      <div className={styles.leftColumn}>
        <Group orientation="vertical">

          <Panel defaultSize={88.5} minSize={20}>
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
          </Panel>

          <Separator className={styles.resizeHandle} />

          <Panel defaultSize={30} minSize={15}>
            <div className={styles.pane}>
              <div className={styles.paneHeader}>Terminal</div>
              <Terminal output={output} inputMode={inputMode} onSendInput={onSendInput} />
            </div>
          </Panel>

        </Group>
      </div>

      {/* ── Right column: CPU State (left, fixed) + Stack/Memory (right, fixed) ── */}
      <div className={styles.rightColumn}>
        <div className={styles.rightGroup}>

          {/* CPU State card — fixed width */}
          <div className={`${styles.debugCard} ${styles.cpuCard}`}>
            <div className={styles.sectionHeader}>CPU State</div>
            <CPU debugState={debugState} />
          </div>

          {/* Stack / Memory card — fills remaining space, Memory on top */}
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
  );
}
