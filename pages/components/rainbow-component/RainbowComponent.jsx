import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';

import {
  Toolbar,
  Button,
} from '../toolbar/Toolbar.jsx';
import {
  InputBar,
} from '../input-bar/InputBar.jsx';

import styles from '../../../styles/RainbowComponent.module.css'

//

const {
  electronIpc,
} = globalThis;

//

export const RainbowComponent = ({
  characterName,

  chatLocked,
  setChatLocked,
  
  settingsMode,
  setSettingsMode,

  devtoolsOpen,

  screenshotEnabled,
  setScreenshotEnabled,

  voiceInputEnabled,
  setVoiceInputEnabled,
  voiceInputLockEnabled,
  setVoiceInputLockEnabled,

  captureMode,
  setCaptureMode,

  aiAgentControllerRunning,
  setAiAgentControllerRunning,
}) => {
  const [spread, setSpread] = useState(false);
  const [mouseDown, setMouseDown] = useState(false);
  const [mouseDownStartTime, setMouseDownStartTime] = useState(null);

  const holdTime = 1000;
  useEffect(() => {
    const now = performance.now();
    const timeToWait = holdTime - (now - mouseDownStartTime);
    const timeout = setTimeout(() => {
      if (mouseDown) {
        setMouseDown(false);
        setMouseDownStartTime(null);

        setVoiceInputLockEnabled(true);

        setSpread(false);
      }
    }, timeToWait);

    return () => {
      clearTimeout(timeout);
    };
  }, [mouseDown, mouseDownStartTime]);

  const toggleSettingsMode = (newSettingsMode) => {
    if (settingsMode === newSettingsMode) {
      setSettingsMode(null);
    } else {
      setSettingsMode(newSettingsMode);
    }
  };

  /* const numSpreads = 8;
  const getNextSpreadStyle = (() => {
    let index = 0;
    return () => {
      const f = (index++) / (numSpreads - 1);
      const radius = 110;
      // cover the top-left corner
      const y = 30 - radius * Math.sin(f * Math.PI);
      const x = 130 - radius * Math.cos(f * Math.PI);
      const style = {
        top: `${y}px`,
        left: `${x}px`,
      };
      return style;
    };
  })(); */

  return (
    <div className={classnames(
      styles['rainbow-container-wrap'],
      voiceInputEnabled ? styles.open : null,
      spread ? styles.spread : null,
    )}>
      {(voiceInputEnabled && !voiceInputLockEnabled) ? (<div className={classnames(
        styles.prefix,
      )}>
        <span>Start speaking to {characterName}...</span>
        <hr />
        <span className={styles.dim}><b>hold</b> for lock</span>
        <span className={styles.dim}><b>flick</b> for options</span>
      </div>) : null}
      {spread ? (
        <InputBar
          chatEnabled={chatLocked}
          onChat={e => {
            setChatLocked(true);
            setVoiceInputEnabled(false);
            setSpread(false);
          }}

          // voiceEnabled={voiceInputEnabled}
          // onVoice={e => {
          //   setVoiceInputLockEnabled(!voiceInputLockEnabled);
          // }}

          videoEnabled={captureMode === 'facetime'}
          onVideo={e => {
            setCaptureMode(captureMode === 'facetime' ? 'auto' : 'facetime');
          }}
        />
      ) : null}

      {/* <div className={classnames(
        styles.toolbar,
      )}>
        {!electronIpc ? <SettingsButton
          icon="devTools"
          active={devtoolsOpen ? true : false}
          onClick={e => {
            electronIpc.toggleDevTools();
          }}
          className={styles.button}
          // style={getNextSpreadStyle()}
        /> : null}
        <SettingsButton
          icon="userSettings"
          active={settingsMode === 'companionSettings' ? true : false}
          onClick={e => {
            toggleSettingsMode('companionSettings');
          }}
          className={styles.button}
          // style={getNextSpreadStyle()}
        />
        <SettingsButton
          icon="party"
          active={settingsMode === 'avatarGallery' ? true : false}
          onClick={e => {
            toggleSettingsMode('avatarGallery');
          }}
          className={styles.button}
          // style={getNextSpreadStyle()}
        />
        <SettingsButton
          icon="chat"
          active={chatLocked ? true : false}
          onClick={e => {
            setChatLocked(!chatLocked);
          }}
          className={styles.button}
          // style={getNextSpreadStyle()}
        />

        <SettingsButton
          icon="memory"
          active={settingsMode === 'memoryViewer'}
          onClick={e => {
            toggleSettingsMode('memoryViewer');
          }}
          className={styles.button}
          // style={getNextSpreadStyle()}
        />
        <SettingsButton
          icon="screenshot"
          active={screenshotEnabled}
          onClick={e => {
            setScreenshotEnabled(!screenshotEnabled);
          }}
          className={styles.button}
          // style={getNextSpreadStyle()}
        />
        <SettingsButton
          icon="map"
          active={settingsMode === 'worlds'}
          onClick={e => {
            toggleSettingsMode('worlds');
          }}
          className={styles.button}
          // style={getNextSpreadStyle()}
        />
        <SettingsButton
          icon="generalSettings"
          active={settingsMode === 'settings'}
          onClick={e => {
            toggleSettingsMode('settings');
          }}
          className={styles.button}
          // style={getNextSpreadStyle()}
        />
      </div> */}

      <Toolbar
        className={classnames(
          !spread ? styles.hidden : null,
        )}
        iconSpecs={[
          electronIpc ? {
            icon: 'devTools',
            text: 'Devtools',
            active: devtoolsOpen,
            onClick: e => {
              electronIpc.toggleDevTools();

              setSpread(false);
            },
            className: styles.button,
          } : null,
          {
            icon: 'userSettings',
            text: 'Character',
            active: settingsMode === 'companionSettings',
            onClick: e => {
              toggleSettingsMode('companionSettings');
              
              setSpread(false);
            },
            className: styles.button,
          },
          {
            icon: 'party',
            text: 'Gallery',
            active: settingsMode === 'avatarGallery',
            onClick: e => {
              toggleSettingsMode('avatarGallery');

              setSpread(false);
            },
            className: styles.button,
          },
          // {
          //   icon: 'chat',
          //   text: 'Chat',
          //   active: chatLocked,
          //   onClick: e => {
          //     setChatLocked(!chatLocked);
          //   },
          //   className: styles.button,
          // },
          {
            icon: 'memory',
            text: 'Memory',
            active: settingsMode === 'memoryViewer',
            onClick: e => {
              toggleSettingsMode('memoryViewer');

              setSpread(false);
            },
            className: styles.button,
          },
          electronIpc ? {
            icon: 'screenshot',
            text: 'Screenshot',
            active: screenshotEnabled,
            onClick: e =>{ 
              setScreenshotEnabled(!screenshotEnabled);

              setSpread(false);
            },
            className: styles.button,
          } : null,
          {
            icon: 'map',
            text: 'Worlds',
            active: settingsMode === 'worlds',
            onClick: e => {
              toggleSettingsMode('worlds');

              setSpread(false);
            },
            className: styles.button,
          },
          {
            icon: 'generalSettings',
            text: 'Settings',
            active: settingsMode === 'settings',
            onClick: e => {
              toggleSettingsMode('settings');

              setSpread(false);
            },
            className: styles.button,
          },
        ]}
      />

      <div
        icon="lock"
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();

          if (voiceInputLockEnabled) {
            setVoiceInputLockEnabled(false);
          }
        }}
        className={classnames(
          styles.button,
          styles.big,
          styles.topRight,
          !voiceInputLockEnabled ? styles.hidden : null,
        )}
      >
        <img className={styles.img} src={`/ui/assets/icons/lock.svg`} />
      </div>
      <div
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();

          if (aiAgentControllerRunning) {
            setAiAgentControllerRunning(false);
          }
        }}
        className={classnames(
          styles.button,
          styles.big,
          styles.red,
          styles.bottomRight,
          !aiAgentControllerRunning ? styles.hidden : null,
        )}
      >
        <img className={styles.img} src={`/ui/assets/icons/quiet.svg`} />
      </div>

      <div
        className={classnames(
          styles['rainbow-container-wrap-outer'],
          mouseDown ? styles.active : null,
        )}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();

          setMouseDown(true);
          const now = performance.now();
          setMouseDownStartTime(now);
        }}
        onMouseLeave={e => {
          if (mouseDown) {
            setVoiceInputEnabled(false);
            setMouseDown(false);
            setMouseDownStartTime(null);
            setSpread(true);
          }
        }}
        onClick={e => {
          if (mouseDown) {
            setMouseDown(false);
            setMouseDownStartTime(null);

            if (voiceInputLockEnabled) {
              setVoiceInputLockEnabled(false);
            } else {
              if (spread) {
                setSpread(false);
              } else {
                setVoiceInputEnabled(!voiceInputEnabled);
              }
            }
          }
        }}
      >
        <div className={classnames(
          styles['rainbow-container-wrap-inner'],
        )}>
          <div className={styles['rainbow-container']}>
            <div className={styles.green} />
            <div className={styles.pink} />
            <div className={styles.blue} />
          </div>
        </div>
      </div>
    </div>
  );
};