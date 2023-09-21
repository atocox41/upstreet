import React, {useState, useEffect, useRef, useContext} from 'react';
import classnames from 'classnames';

// import {
//   mod,
//   blob2img,
// } from '../../../packages/engine/util.js';
// import {
//   capitalize,
// } from '../../../packages/engine/util.js';

import styles from './ChatInputText.module.css';

//

const stopPropagation = (e) => {
  e.stopPropagation();
};

//

export const ChatInputText = ({
  text,
  setText,
  // open,
  // setOpen,
  onSubmit,
}) => {
  const [open, setOpen] = useState(false);
  const inputRef = useRef();

  const focus = () => {
    const input = inputRef.current;
    setOpen(true);
    requestAnimationFrame(() => {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      input.selectionStart = input.selectionEnd = input.value.length;
    });
  };
  const blur = e => {
    setOpen(false);
    // if (open) {
    //   close();
    // }
  };

  // listen for enter
  useEffect(() => {
    const keydown = e => {
      if (e.key === 'Enter') {
        if (document.pointerLockElement) {
          const input = inputRef.current;
          input.focus();
        }
      }
    };
    globalThis.addEventListener('keydown', keydown);

    return () => {
      globalThis.removeEventListener('keydown', keydown);
    };
  }, []);

  // handle open change
  useEffect(() => {
    setText('');
    if (open) {
      focus();
    }
  }, [open]);

  // focus on load
  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      if (open) {
        input.focus();
      } else {
        input.blur();
      }
    }
  }, [inputRef, open]);

  const commitValue = text => {
    if (text) {
      onSubmit(text);
      setText('');
      return true;
    } else {
      return false;
    }
  };

  // event handlers
  const keydown = e => {
    stopPropagation(e);

    if (e.repeat) return;

    switch (e.key) {
      case 'Enter': {
        // if (open) {
          if (text) {
            if (!commitValue(text)) {
              close();
            }
          } else {
            close();
          }
        // }
        break;
      }
      case 'Escape': {
        if (open) {
          close();
        }
        break;
      }
    }
  };
  const keyup = e => {
    stopPropagation(e);

    /* if (e.repeat) return;

    switch (e.key) {
      case 'Enter':
      {
        break;
      }
      default: {
        break;
      }
    } */
  }
  const change = e => {
    setText(e.target.value);
  };
  const close = () => {
    setText('');
    setOpen(false);
  };

  return (
    <div className={classnames(
      styles.chatInputText,
      open ? styles.open : null,
    )}>
      <div className={styles.inputs}>
        <div className={styles.backdrop} />
        <img src="/images/webpencil.svg" className={styles.background} />
        <input
          type='text'
          className={styles.input}
          value={text}
          onChange={change}
          onKeyDown={keydown}
          onKeyUp={keyup}
          // onKeyPress={stopPropagation}
          onMouseDown={stopPropagation}
          onMouseUp={stopPropagation}
          onClick={stopPropagation}
          onDoubleClick={stopPropagation}
          onFocus={focus}
          onBlur={blur}
          ref={inputRef}
        />
      </div>
    </div>
  );
};