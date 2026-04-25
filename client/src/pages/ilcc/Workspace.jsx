/*
 * Workspace.jsx — Primary layout for the ILCC page.
 *
 * Two-column layout that fills all space below the Header:
 *
 *   Left column (flex: 2):
 *     Uses react-resizable-panels to split vertically between:
 *       - Code Editor (70% default, min 20%)
 *       - Terminal     (30% default, min 15%)
 *     The user can drag the separator to resize them.
 *
 *   Right column (flex: 1):
 *     Single card with no top-level header. Interior is split into:
 *       - Top row:    CPU State + Stack side by side, each with its own header
 *       - Bottom row: Memory with its own header
 *
 * TODO: Wire props from index.jsx once editor source and debug state
 *       are connected (code, setCode, debugState, output, etc.).
 */

import { Panel, Group, Separator } from 'react-resizable-panels';
import styles from './Workspace.module.css';
import Editor from './panels/Editor';
import Terminal from './panels/Terminal';
import CPU from './panels/CPU';
import Stack from './panels/Stack';
import Memory from './panels/Memory';

export default function Workspace({ editorRef, output, inputMode, onSendInput, debugState, memoryMap, isDebugging }) {
  return (
    <div className={styles.layout}>

      {/* ── Left column: editor + terminal with a draggable resize handle ── */}
      <div className={styles.leftColumn}>
        <Group orientation="vertical">

          {/* Code editor panel — 70% of the left column by default */}
          <Panel defaultSize={88.5} minSize={20}>
            <div className={styles.pane}>
              <div className={styles.paneHeader}>Code Editor</div>
              <Editor ref={editorRef} />
            </div>
          </Panel>

          {/* Draggable separator between editor and terminal */}
          <Separator className={styles.resizeHandle} />

          {/* Terminal panel — 30% of the left column by default */}
          <Panel defaultSize={30} minSize={15}>
            <div className={styles.pane}>
              <div className={styles.paneHeader}>Terminal</div>
              <Terminal output={output} inputMode={inputMode} onSendInput={onSendInput} />
            </div>
          </Panel>

        </Group>
      </div>

      {/* ── Right column: single debugger card with internal sections ── */}
      <div className={styles.rightColumn}>
        <div className={styles.debugCard}>

          {/* Top row: CPU State + Stack side by side */}
          <div className={styles.debugUpper}>
            <div className={styles.debugSection}>
              <div className={styles.sectionHeader}>CPU State</div>
              <CPU debugState={debugState} />
            </div>

            {/* Vertical divider between CPU and Stack */}
            <div className={styles.debugDividerV} />

            <div className={styles.debugSection}>
              <div className={styles.sectionHeader}>Stack</div>
              <Stack debugState={debugState} memoryMap={memoryMap} />
            </div>
          </div>

          {/* Horizontal divider between top row and memory */}
          <div className={styles.debugDividerH} />

          {/* Bottom row: Memory viewer */}
          <div className={styles.debugSection}>
            <div className={styles.sectionHeader}>Memory</div>
            <Memory debugState={debugState} memoryMap={memoryMap} />
          </div>

        </div>
      </div>

    </div>
  );
}
