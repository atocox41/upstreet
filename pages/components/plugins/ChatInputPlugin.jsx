import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import {
  ChatInput,
} from '../chat-input/ChatInput.jsx';

import {
  Io,
} from '../io-bus/Io.jsx';
import {
  IoBus,
} from '../io-bus/IoBus.js';

import styles from '../../../styles/ChatPlugin.module.css';

//

const _inputFocused = () => document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.nodeName);

//

export const ChatInputPlugin = ({
  ioBus,
}) => {
  const [open, setOpen] = useState('');
  const inputRef = useRef();

  useEffect(() => {
    const inputEl = inputRef.current;
    if (open && inputEl) {
      inputEl.focus();
    }
  }, [inputRef.current]);

  const keydown = e => {
    if (!_inputFocused()) {
      const {key} = e;

      switch (key) {
        case 'Enter': {
          if (!open) {
            setOpen('enter');
          }
          break;
        }
        case '/': {
          if (!open) {
            setOpen('slash');
          }
          break;
        }
      }
    }
  };

  return (
    <div className={styles.chatPlugin}>
      <Io
        fns={{
          keydown,
        }}
      />
      <ChatInput
        open={open}
        onClose={e => {
          setOpen(false);

          IoBus.request({
            contentWindow: globalThis.parent,
            method: 'requestPointerLock',
            args: {
              // type: 'click',
            },
          });
        }}
        ioBus={ioBus}
      />
    </div>
  );
};