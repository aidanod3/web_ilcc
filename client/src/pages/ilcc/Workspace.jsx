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
}) {
  const sidePanelRef  = useRef(null);
  const fileInputRef  = useRef(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [formatDone, setFormatDone] = useState(false);

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

            {/* ── Top row: editor + debug card (plain flex, no PanelGroup) ── */}
            {/* ── Top row: editor | resizable debug panels ── */}
<Panel defaultSize={72} minSize={30}>
  <Group orientation="horizontal" className={styles.editorDebugGroup}>

    {/* Code Editor — resizable against debug panel */}
    <Panel defaultSize={isDebugging ? 62 : 100} minSize={35}>
      <div className={styles.editorWrapper}>
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

          {shareCopied && (
            <div className={styles.shareBanner}>
              Link copied to clipboard!
            </div>
          )}
          {formatDone && (
            <div className={styles.shareBanner}>
              Code formatted!
            </div>
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
      </div>
    </Panel>

    {/* Resizable boundary between editor and debug panels */}
    {isDebugging && <Separator className={styles.resizeHandleV} />}

    {/* Debug panels — vertical side-by-side, scrollable, and resizable */}
{isDebugging && (
  <Panel defaultSize={45} minSize={35}>
    <div className={styles.debugCard}>
      <Group orientation="horizontal" className={styles.debugHGroup}>

        <Panel defaultSize={34} minSize={20}>
          <div className={styles.debugSection}>
            <div className={styles.sectionHeader}>CPU State</div>
            <div className={styles.debugScroll}>
              <CPU debugState={debugState} iteration={iteration} />
            </div>
          </div>
        </Panel>

        <Separator className={styles.resizeHandleV} />

        <Panel defaultSize={33} minSize={20}>
          <div className={styles.debugSection}>
            <div className={styles.sectionHeader}>Memory</div>
            <div className={styles.debugScroll}>
              <Memory
                debugState={debugState}
                memoryMap={memoryMap}
                isDebugging={isDebugging}
              />
            </div>
          </div>
        </Panel>

        <Separator className={styles.resizeHandleV} />

        <Panel defaultSize={33} minSize={20}>
          <div className={styles.debugSection}>
            <div className={styles.sectionHeader}>Stack</div>
            <div className={styles.debugScroll}>
              <Stack
                debugState={debugState}
                memoryMap={memoryMap}
                isDebugging={isDebugging}
              />
            </div>
          </div>
        </Panel>

      </Group>
    </div>
  </Panel>
)}

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
