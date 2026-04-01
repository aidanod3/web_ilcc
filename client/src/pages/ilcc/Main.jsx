/*
 * Main.jsx — Primary layout for the ILCC page.
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
 *     Fixed layout (no resizing) split into:
 *       - Top:    CPU State (registers, flags, pointers) + Stack, side by side
 *       - Bottom: Memory viewer table
 *
 * TODO: Wire props from index.jsx once editor source and debug state
 *       are connected (code, setCode, debugState, output, etc.).
 */

import { Panel, Group, Separator } from 'react-resizable-panels';
import styles from './Main.module.css';
import Editor from './panels/Editor';
import Terminal from './panels/Terminal';
import CPU from './panels/CPU';
import Stack from './panels/Stack';
import Memory from './panels/Memory';

export default function Main() {
  return (
    <div className={styles.layout}>

      {/* ── Left column: editor + terminal with a draggable resize handle ── */}
      <div className={styles.leftColumn}>
        <Group orientation="vertical">

          {/* Code editor panel — 70% of the left column by default */}
          <Panel defaultSize={70} minSize={20}>
            <div className={styles.pane}>
              <div className={styles.paneHeader}>Code Editor</div>
              <Editor />
            </div>
          </Panel>

          {/* Draggable separator between editor and terminal */}
          <Separator className={styles.resizeHandle} />

          {/* Terminal panel — 30% of the left column by default */}
          <Panel defaultSize={30} minSize={15}>
            <div className={styles.pane}>
              <div className={styles.paneHeader}>Terminal</div>
              <Terminal />
            </div>
          </Panel>

        </Group>
      </div>

      {/* ── Right column: debugger panels ── */}
      <div className={styles.rightColumn}>
        <div className={styles.paneHeader}>Debugger</div>
        <div className={styles.debugContent}>

          {/* Top row: CPU state and Stack side by side */}
          <div className={styles.debugUpper}>

            {/* CPU section: registers, condition codes, pointers */}
            <div className={styles.cpuSection}>
              <div className={styles.sectionHeader}>CPU State</div>
              <CPU />
            </div>

            {/* Stack section: call stack viewer */}
            <div className={styles.stackSection}>
              <div className={styles.sectionHeader}>Stack</div>
              <Stack />
            </div>

          </div>

          {/* Bottom row: memory viewer */}
          <div className={styles.debugLower}>
            <div className={styles.sectionHeader}>Memory</div>
            <Memory />
          </div>

        </div>
      </div>

    </div>
  );
}
