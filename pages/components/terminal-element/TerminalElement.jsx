import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import {
  Terminal,
} from 'xterm';
import 'xterm/css/xterm.css';
import {
  WebLinksAddon,
} from 'xterm-addon-web-links';
import {
  abortError,
} from '../../../packages/engine/lock-manager.js';
import {
  TerminalTaskManager,
} from './TerminalTaskManager.jsx';

import styles from '../../../styles/Companion.module.css';

//

export const TerminalElement = ({
  cols = 80,
  rows = 30,
}) => {
  const [terminal, setTerminal] = useState(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const divEl = contentRef.current;
    if (divEl) {
      const abortController = new AbortController();

      (async () => {
        const terminalWindow = await globalThis.electronIpc.createTerminalWindow({
          cols,
          rows,
        });
        const _closeTerminal = () => {
          globalThis.electronIpc.closeTerminalWindow({
            terminalId: terminalWindow.terminalId,
          });
        };
        if (abortController.signal.aborted) {
          _closeTerminal();
          return;
        }

        const {
          terminalId,
        } = terminalWindow;

        const terminal = new Terminal({
          cols,
          rows,
        });
        terminal.loadAddon(new WebLinksAddon());
        terminal.open(divEl);
        terminal.onData(data => {
          globalThis.electronIpc.terminalWrite({
            terminalId,
            data,
          });
        });
        terminal.terminalId = terminalId;
        setTerminal(terminal);

        abortController.signal.addEventListener('abort', () => {
          _closeTerminal();
          setTerminal(null);
        });
      })();

      return () => {
        abortController.abort(abortError);
      };
    }
  }, []);

  // listen for terminal read
  useEffect(() => {
    if (terminal) {
      const message = e => {
        const {
          method,
          data,
        } = e.data;
        // console.log('got message', e.data);
        if (method === 'terminal-read') {
          const {
            terminalId: localTerminalId,
          } = data;
          // console.log('companion got terminal read', data, terminalId);

          if (localTerminalId === terminal.terminalId) {
            const s = data.data;
            terminal.write(s);
          }
        }
      };
      globalThis.addEventListener('message', message);

      return () => {
        globalThis.removeEventListener('message', message);
      };
    }
  }, [terminal]);

  return (
    <div className={styles.terminal}>
      <div className={styles.terminalContent} ref={contentRef} />
      <TerminalTaskManager terminal={terminal} />
    </div>
  );
};