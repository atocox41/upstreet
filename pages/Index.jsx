import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';

import {
  mod,
} from '../packages/engine/util.js'

import {
  LoginProvider,
  LoginProfileProvider,
  LoginStatsProvider,
  LoginConsumer,
} from './components/login-provider/LoginProvider.jsx';
import {
  AuthUi,
} from './components/auth-ui/AuthUi.jsx';
import {
  Redirect,
} from './components/redirect/Redirect.jsx';

// import {
//   LightArrow,
// } from './components/light-arrow/LightArrow.jsx';

import styles from '../styles/Index.module.css';

//

// NOTE: Added so that the file didn't have undefined variables
const options = []
const optionHandlers = [];


export const Index = () => {
  const [cursorPosition, setCursorPosition] = useState(0);
  const [active, setActive] = useState(false);

  // key up/down handling
  useEffect(() => {
    const keydown = e => {
      switch (e.key) {
        case 'ArrowUp': {
          const nextCursorPosition = mod(cursorPosition - 1, options.length);
          setCursorPosition(nextCursorPosition);
          break;
        }
        case 'ArrowDown': {
          const nextCursorPosition = mod(cursorPosition + 1, options.length);
          setCursorPosition(nextCursorPosition);
          break;
        }
        case 'Enter': {
          setActive(true);
          break;
        }
      }
    };
    globalThis.addEventListener('keydown', keydown);
    const keyup = e => {
      switch (e.key) {
        case 'Enter': {
          setActive(false);
          select();
          break;
        }
      }
    };
    globalThis.addEventListener('keyup', keyup);

    return () => {
      globalThis.removeEventListener('keydown', keydown);
      globalThis.removeEventListener('keyup', keyup);
    };
  }, [cursorPosition]);

  const select = () => {
    // const selectedOption = options[cursorPosition];
    const handler = optionHandlers[cursorPosition];
    handler();
  };

  return (
    <LoginProvider>
      <LoginConsumer>
        {loginValue => {
          const {
            loaded,
            user,
          } = loginValue;

          return (
            <div className={styles.mainMenu}>
              <img className={styles.bg} src='/images/backgrounds/background7.png' />

              <div className={styles.wrap}>
                <div className={styles.header}>
                  <div className={styles.title}>
                    <div className={styles.background}></div>
                    <div className={styles.text}>Isekai.chat</div>
                  </div>
                  {/* <div className={styles.subtitle}>
                    <div className={styles.background}></div>
                    <div className={styles.text}>Generative metaverse</div>
                  </div> */}
                </div>

                {/* <img className={styles.logo} src='/images/logos/ic-logo62.png' /> */}

                {/* <ul className={styles.options}>
                  {options.map((option, i) => (
                    <Option
                      option={option}
                      selected={i === cursorPosition}
                      active={active}
                      setActive={setActive}
                      setSelected={e => {
                        setCursorPosition(i);
                      }}
                      submit={e => {
                        select();
                      }}
                      key={option}
                    />
                  ))}
                </ul> */}

                <div className={classnames(
                  styles.wrap,
                  styles.loginWrap,
                )}>
                  {loaded ? <>
                    {!user ?
                      <AuthUi />
                    :
                      <Redirect
                        url='/h/'
                      />
                    }
                  </> : null}
                </div>
              </div>

              {/* <div className={styles.subtitle}>
                Created by @avaer.
                <a href='/about'>Learn more</a>.
                <a href='/discord'>Discord</a>
              </div> */}
            </div>
          );
        }}
      </LoginConsumer>
    </LoginProvider>
  );
};