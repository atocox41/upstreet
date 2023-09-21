import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';

import {
  mod
} from '../../../packages/engine/util.js';

import {
  LightArrow,
} from '../light-arrow/LightArrow.jsx';

import styles from '../../../styles/MainMenu.module.css';

//

const Option = ({
  option,
  selected,
  setSelected,
  active,
  setActive,
  submit,
}) => {
  return (
    <li
      className={classnames(
        styles.option,
        selected ? styles.selected : null,
        (selected && active) ? styles.active : null,
      )}
      onMouseMove={setSelected}
      onMouseLeave={() => setActive(false)}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      onClick={submit}
    >
      <div className={styles.background}></div>
      {selected ? <LightArrow
        className={styles.lightArrow}
        direction='down'
      /> : null}
      <div className={styles.text}>{option}</div>
    </li>
  );
};

//

export const MainMenu = ({
  enabled = true,
  className,
  // loginValue,
  options,
  onCursorChange,
  onKeyPathChange,
  onSelect,
} = {}) => {
  const [cursorPosition, setCursorPosition] = useState(0);
  const [keyPath, setKeyPath] = useState([]);
  const [currentOptions, setCurrentOptions] = useState(() => options);
  const [active, setActive] = useState(false);

  // keyPath handling
  useEffect(() => {
    let result = options;
    for (let i = 0; i < keyPath.length; i++) {
      const key = keyPath[i];
      const nextOptions = result[key].options;
      if (nextOptions) {
        result = result[key].options;
      } else {
        break;
      }
    }
    setCurrentOptions(result);
  }, [
    keyPath,
    currentOptions,
  ]);

  // initialize cursor position
  useEffect(() => {
    if (enabled) {
      setCursorPosition(0);
    }
  }, [
    enabled,
  ]);

  // key up/down handling
  useEffect(() => {
    const keydown = e => {
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
        {
          const nextCursorPosition = mod(cursorPosition - 1, currentOptions.length);
          setCursorPosition(nextCursorPosition);
          onCursorChange && onCursorChange(nextCursorPosition);
          break;
        }
        case 'ArrowDown':
        case 'ArrowRight':
        {
          const nextCursorPosition = mod(cursorPosition + 1, currentOptions.length);
          setCursorPosition(nextCursorPosition);
          onCursorChange && onCursorChange(nextCursorPosition);
          break;
        }
        case 'Enter': {
          enabled && setActive(true);
          break;
        }
      }
    };
    globalThis.addEventListener('keydown', keydown);
    const keyup = e => {
      switch (e.key) {
        case 'Enter': {
          if (enabled) {
            setActive(false);
            select();
          }
          break;
        }
        case 'Escape':
        case 'Backspace':
        {
          if (keyPath.length > 0) {
            const newKeyPath = keyPath.slice(0, -1);
            setKeyPath(newKeyPath);
            onKeyPathChange && onKeyPathChange(newKeyPath);

            const nextCursorPosition = keyPath[keyPath.length - 1];
            setCursorPosition(nextCursorPosition);
            onCursorChange && onCursorChange(nextCursorPosition);
          }
          break;
        }
      }
    };
    globalThis.addEventListener('keyup', keyup);

    return () => {
      globalThis.removeEventListener('keydown', keydown);
      globalThis.removeEventListener('keyup', keyup);
    };
  }, [
    enabled,
    keyPath,
    currentOptions,
    cursorPosition,
  ]);

  const select = () => {
    onSelect && onSelect(cursorPosition);

    const currentOption = currentOptions[cursorPosition];
    const {
      handler,
      options: suboptions,
    } = currentOption;
    if (handler) {
      handler();
    } else if (suboptions) {
      const newKeyPath = [
        ...keyPath,
        cursorPosition,
      ];
      setKeyPath(newKeyPath);
      onKeyPathChange && onKeyPathChange(newKeyPath);

      setCursorPosition(0);
      onCursorChange && onCursorChange(0);
    } else {
      console.warn('invalid option spec', currentOption);
      throw new Error('invalid option spec');
    }
  };

  //

  return (
    <div className={classnames(
      styles.mainMenu,
      className,
    )}>
      <div className={styles.wrap}>
        <ul className={styles.options}>
          {currentOptions.map((option, i) => (
            <Option
              option={option.label}
              selected={i === cursorPosition}
              active={active}
              setActive={setActive}
              setSelected={e => {
                if (cursorPosition !== i) {
                  setCursorPosition(i);
                  onCursorChange && onCursorChange(i);
                }
              }}
              submit={e => {
                select();
              }}
              key={option.label}
            />
          ))}
        </ul>
      </div>
    </div>
  );
};