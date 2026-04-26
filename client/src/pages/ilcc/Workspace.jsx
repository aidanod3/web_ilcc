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

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
}) {
  const sidePanelRef = useRef(null);
  const [sideCollapsed, setSideCollapsed] = useState(false);

  const toggleSidePanel = () => {
    if (sidePanelRef.current?.isCollapsed()) {
      sidePanelRef.current.expand();
    } else {
      sidePanelRef.current.collapse();
    }
  };

  return (
    <div className={styles.workspaceOuter}>

      {/* ── Outer horizontal split: side panel | right area ── */}
      <Group orientation="horizontal" className={styles.outerHGroup}>

        {/* Collapsible side panel — full height */}
        <Panel
          ref={sidePanelRef}
          collapsible
          defaultSize={18}
          minSize={12}
          onCollapse={() => setSideCollapsed(true)}
          onExpand={() => setSideCollapsed(false)}
        >
          <div className={styles.sidePanel}>
            <div className={styles.sectionHeader}>Panel</div>
          </div>
        </Panel>

        <Separator className={styles.resizeHandleV} />

        {/* Right area — vertical split: top row | terminal */}
        <Panel minSize={30}>
          <Group orientation="vertical" className={styles.mainVGroup}>

            {/* ── Top row: editor + debug card (plain flex, no PanelGroup) ── */}
            <Panel defaultSize={72} minSize={30}>
              <div className={styles.editorDebugRow}>

                {/* Code Editor — absorbs all available width */}
                <div className={styles.editorWrapper}>
                  <div className={styles.pane}>
                    <div className={styles.paneHeader}>
                      <button
                        className={styles.panelToggle}
                        onClick={toggleSidePanel}
                        title={sideCollapsed ? 'Open side panel' : 'Close side panel'}
                      >
                        {sideCollapsed
                          ? <ChevronRight size={14} />
                          : <ChevronLeft  size={14} />}
                      </button>
                      Code Editor
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
                </div>

                {/* Debug card — only visible during an active debug session */}
                {isDebugging && (
                  <div className={styles.debugCard}>

                    {/* CPU State — left column */}
                    <div className={styles.cpuColumn}>
                      <div className={styles.sectionHeader}>CPU State</div>
                      <CPU debugState={debugState} iteration={iteration} />
                    </div>

                    {/* Memory + Stack — right column, vertically resizable */}
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

                  </div>
                )}

              </div>
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
