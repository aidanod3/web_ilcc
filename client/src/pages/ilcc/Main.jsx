/* Main.jsx — Primary layout for the ILCC page.
 * Contains the two-column layout:
 *   Left:  Code Editor (top) + Terminal (bottom), vertically resizable
 *   Right: Debugger panels — CPU, Stack, Memory
 */

import styles from './Main.module.css';
import Editor from './panels/Editor';
import Terminal from './panels/Terminal';
import CPU from './panels/CPU';
import Stack from './panels/Stack';
import Memory from './panels/Memory';

export default function Main() {
  return (
    <div className={styles.layout}>

      {/* Left column: editor + terminal stacked vertically */}
      <div className={styles.leftColumn}>
        <div className={styles.editorPane}>
          <div className={styles.paneHeader}>Code Editor</div>
          <Editor />
        </div>
        <div className={styles.terminalPane}>
          <div className={styles.paneHeader}>Terminal</div>
          <Terminal />
        </div>
      </div>

      {/* Right column: debugger panels */}
      <div className={styles.rightColumn}>
        <div className={styles.paneHeader}>Debugger</div>
        <div className={styles.debugContent}>

          {/* Top row: CPU state + Stack side by side */}
          <div className={styles.debugUpper}>
            <div className={styles.cpuSection}>
              <div className={styles.sectionHeader}>CPU State</div>
              <CPU />
            </div>
            <div className={styles.stackSection}>
              <div className={styles.sectionHeader}>Stack</div>
              <Stack />
            </div>
          </div>

          {/* Bottom row: Memory viewer */}
          <div className={styles.debugLower}>
            <div className={styles.sectionHeader}>Memory</div>
            <Memory />
          </div>

        </div>
      </div>
    </div>
  );
}
