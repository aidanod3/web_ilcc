import { useMemo } from 'react';
import styles from './MemoryPanel.module.css';
import sectionStyles from '../RightPanel.module.css';

export default function MemoryPanel({ stack }) {
  const memoryRows = useMemo(() => {
    const rows = [];
    for (let row = 0; row < 6; row += 1) {
      const addr = `0x${(0x4000 + row * 4).toString(16).padStart(4, '0')}`;
      const cells = [];
      for (let col = 0; col < 4; col += 1) {
        const index = row * 4 + col;
        const value = stack[index]?.value || '0x0000';
        cells.push(value);
      }
      rows.push({ addr, cells });
    }
    return rows;
  }, [stack]);

  return (
    <div className={sectionStyles.section}>
      <div className={sectionStyles.sectionHeader}>Memory</div>
      <div className={styles.grid}>
        <div className={styles.rowHead}>
          <span>Addr</span>
          <span>+0</span>
          <span>+1</span>
          <span>+2</span>
          <span>+3</span>
        </div>
        {memoryRows.map((row) => (
          <div key={row.addr} className={styles.row}>
            <span>{row.addr}</span>
            {row.cells.map((cell, index) => (
              <span key={`${row.addr}-${index}`}>{cell}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}