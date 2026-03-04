import styles from './dashboard.module.css';
import CodeEditor from './CodeEditor.jsx';
import Terminal from './Terminal';
import StackPanel from './StackPanel';
import CPUPanel from './CPUPanel';
import MemoryPanel from './MemoryPanel';
import { Group, Panel, Separator } from "react-resizable-panels";
import Pane from '../shared/Pane';
import PaneHeader from '../shared/PaneHeader';

export default function Dashboard({
    source,
    setSource,
    onDownload,
    onClearTerminal,
    output,
    studentMode,
    registers,
    previousRegisters,
    flags,
    previousFlags,
    special,
    stack,
    previousStack,
    memoryRows,
    previousMemoryRows,
    eventLabel,
    traceInfo
}) {
    return (
        <div className={studentMode ? `${styles.dashboardContent} ${styles.studentMode}` : styles.dashboardContent}>
            <div className={styles.leftColumn}>
                <Group orientation="vertical">
                    <Panel defaultSize={70} minSize={37}>
                        <Pane>
                            <PaneHeader>Code Editor</PaneHeader>
                            <CodeEditor 
                                source={source}
                                setSource={setSource}
                                onDownload={onDownload}
                            />
                        </Pane>
                    </Panel>
                    <Separator className={styles.resizeHandle} />
                    <Panel defaultSize={30} minSize={37}>
                        <Pane>
                            <PaneHeader>Terminal</PaneHeader>
                            <Terminal 
                                output = {output}
                                traceInfo={traceInfo}
                                studentMode={studentMode}
                                onClear={onClearTerminal}
                            />
                        </Pane>
                    </Panel>
                </Group>
            </div>
            <div className={styles.rightColumn}>
                <Pane>
                    <PaneHeader>Debugger</PaneHeader>
                    <div className={styles.rightPanelContent}>
                        <div className={styles.rightPanelUpper}>
                            <div className={styles.cpuSection}>
                                <div className={styles.sectionHeader}>CPU State</div>
                                <CPUPanel
                                    registers={registers}
                                    previousRegisters={previousRegisters}
                                    flags={flags}
                                    previousFlags={previousFlags}
                                    special={special}
                                    studentMode={studentMode}
                                />
                            </div>
                            <div className={styles.stackSection}>
                                <div className={styles.sectionHeader}>Stack</div>
                                <StackPanel
                                    stack={stack}
                                    previousStack={previousStack}
                                    eventLabel={eventLabel}
                                    studentMode={studentMode}
                                />
                            </div>
                        </div>
                        <div className={styles.rightPanelLower}>
                            <div className={styles.sectionHeader}>Memory</div>
                            <MemoryPanel
                                memoryRows={memoryRows}
                                previousMemoryRows={previousMemoryRows}
                                studentMode={studentMode}
                            />
                        </div>
                    </div>
                </Pane>
            </div>
        </div>
    );
}
