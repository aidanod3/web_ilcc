/*
 * Terminal.jsx — Output + input terminal panel.
 *
 * Renders program output in a <pre> block and, when the program hits a
 * SIN/DIN/AIN instruction and needs user input, shows an input row at the
 * bottom of the panel.
 *
 * Props:
 *   output      — accumulated output string from the program.
 *   inputMode   — true when the server is waiting for user input.
 *   onSendInput — called with the submitted string when the user hits Enter.
 */

import { useEffect, useRef, useState } from 'react';
import styles from './Terminal.module.css';

export default function Terminal({ output, inputMode, onSendInput }) {
  const [inputValue, setInputValue] = useState('');
  const outputRef  = useRef(null);
  const inputRef   = useRef(null);

  /* Scroll output to bottom whenever new text arrives. */
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  /* Auto-focus the input field whenever inputMode becomes true. */
  useEffect(() => {
    if (inputMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputMode]);

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      onSendInput?.(inputValue);
      setInputValue('');
    }
  }

  return (
    <div className={styles.terminal}>

      {/* Output area — scrollable, fills available space */}
      <pre ref={outputRef} className={styles.output}>
        {output || ''}
      </pre>

      {/* Input row — only visible when the program requests input */}
      {inputMode && (
        <div className={styles.inputRow}>
          <span className={styles.prompt}>&gt;</span>
          <input
            ref={inputRef}
            className={styles.input}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      )}

    </div>
  );
}
