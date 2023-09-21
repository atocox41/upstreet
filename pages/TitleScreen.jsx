import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';

import {
  StoryUi,
} from './components/story-ui/StoryUi.jsx';
import {
  LoadingUi,
} from './components/loading-ui/LoadingUi.jsx';
import {
  MainMenu,
} from './components/main-menu/MainMenu.jsx';
import {
  UserAccountButton,
} from './components/user-account-button/UserAccountButton.jsx';
import {
  LoginProvider,
  LoginConsumer,
} from './components/login-provider/LoginProvider.jsx';
import {
  LocalStorageManager,
} from '../packages/engine/managers/localstorage/localstorage-manager.js';
import {
  EngineProvider,
} from '../packages/engine/clients/engine-client.js';

//

import styles from '../styles/TitleScreen.module.css';
import mainMenuStyles from '../styles/MainMenu.module.css';

//

const discordLink = `https://discord.gg/aZSKNXtgYm`;
const TitleScreenHeader = ({
  localStorageManager,
  supabaseClient,
}) => {

  return (
    <div className={styles.header}>
      <div className={styles.icons}>
        <a href={discordLink} className={styles.icon} onMouseDown={e => {
          // e.preventDefault();
          e.stopPropagation();
        }} onClick={e => {
          // e.preventDefault();
          e.stopPropagation();
        }}>
          <img className={classnames(
            styles.image,
            styles.invert,
          )} src='/images/discord-dark.png' />
        </a>
      </div>

      <div className={styles.buttons}>
        <UserAccountButton
          localStorageManager={localStorageManager}
          supabaseClient={supabaseClient}
        />
      </div>
    </div>
  );
};

//

const Slides = ({
  className,
  keyPath,
  slideIndex,
  slides,
}) => {
  for (let i = 0; i < keyPath.length; i++) {
    const key = keyPath[i];
    slides = slides[key].children;
    if (!slides) {
      debugger;
    }
  }

  return (
    <div className={classnames(
      styles.slides,
      className,
    )}>
      {slides.map((slide, i) => {
        const {
          imgSrc,
          Description,
        } = slide;
        return (
          <div className={classnames(
            styles.slide,
            slideIndex === i ? styles.active : null,
            i < slideIndex ? styles.left : null,
            i > slideIndex ? styles.right : null,
          )} key={i}>
            <div className={styles.wrap}>
              <img className={styles.img} src={imgSrc} />
              <div className={styles.text}>
                <Description />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
const mainMenuSlides = [
  {
    imgSrc: `/images/singleplayer-512.jpg`,
    Description: () => {
      return (
<div className={styles.paragraph}>
  <ul>
    <li>Try running around a procedurally generated world!</li>
    <li>Take cool screenshots of the landscape with your avatar.</li>
    <li>Fast to load.</li>
  </ul>
</div>
      );
    },
    children: [
      {
        imgSrc: '/images/easy.jpg',
        Description: () => {
          return (
<div className={styles.paragraph}>
  <ul>
    <li>Easy mode has no aggro enemies.</li>
    <li>Have fun and enjoy.</li>
  </ul>
</div>
          );
        },
      },
      {
        imgSrc: '/images/hard.jpg',
        Description: () => {
          return (
<div className={styles.paragraph}>
  <ul>
    <li>Blood will flow in the name of the Monster.</li>
    <li>Enjoyable for some people only..</li>
  </ul>
</div>
          );
        },
      },
    ],
  },
  {
    imgSrc: `/images/multiplayer-512.jpg`,
    Description: () => {
      return (
<div className={styles.paragraph}>
  <ul>
    <li>Test out the infinite multiplayer tech!</li>
    <li>Paste the URL to a friend and let them join your quest.</li>
    <li>Make sure to try the real-time voice chat!</li>
  </ul>
</div>
      );
    },
    children: [
      {
        imgSrc: '/images/land-1.jpg',
        Description: () => {
          return (
<div className={styles.paragraph}>
  <ul>
    <li>Show 1 land at a time</li>
    <li>Cheapest option for your GPU.</li>
  </ul>
</div>
          );
        },
      },
      {
        imgSrc: '/images/land-2.jpg',
        Description: () => {
          return (
<div className={styles.paragraph}>
  <ul>
    <li>Show 2 nearest lands</li>
    <li>Medium performance option.</li>
  </ul>
</div>
          );
        },
      },
      {
        imgSrc: '/images/land-3.jpg',
        Description: () => {
          return (
<div className={styles.paragraph}>
  <ul>
    <li>Show 3 nearest lands</li>
    <li>Better have a battlestation..</li>
  </ul>
</div>
          );
        },
      },
    ],
  },
  {
    imgSrc: `/images/gang-512.jpg`,
    Description: () => {
      return (
<div className={styles.paragraph}>
  <ul>
    <li>Run AI agents in world with our SDK!</li>
    <li>Talk to other player's buggy AIs.</li>
    <li>Only a human would trust this place...</li>
  </ul>
</div>
      );
    },
  },
  {
    imgSrc: `/images/indev-512.jpg`,
    Description: () => {
      return (
<div className={styles.paragraph}>
  <ul>
    <li>Try the latest AI features in development.</li>
    <li>Chat with AIs!</li>
    <li>Watch out for bugs, watch out of the Lisk!</li>
  </ul>
</div>
      );
    },
  },
];

//

export const TitleScreenApp = () => {
  const [engine, setEngine] = useState(null);
  const [loadingManager, setLoadingManager] = useState(null);
  const [videoActive, setVideoActive] = useState(false);
  const [objects, setObjects] = useState(() => {
    const a = [
      {
        start_url: '/core-modules/webaverse-terrain/index.js',
        components: [
          {
            key: 'layers',
            value: [],
          },
          {
            key: 'timeRate',
            value: 15000,
          },
        ],
      },
      {
        start_url: '/core-modules/cinematic-camera/index.js',
      },
      {
        start_url: '/audio/soundscape-robust-summer-after.mp3',
        components: [
          {key: 'volume', value: 1},
        ],
      },
      {
        start_url: '/audio/calm-jrpg-style-demo2.mp3',
        components: [
          {key: 'volume', value: 0.05},
        ],
      },
    ];
    return a;
  });
  const playerSpec = null;
  const [engineLoading, setEngineLoading] = useState(false);
  const [loadingDone, setLoadingDone] = useState(false);
  const [sounds, setSounds] = useState(null);
  const [startPressed, setStartPressed] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [keyPath, setKeyPath] = useState([]);
  const [localStorageManager, setLocalStorageManager] = useState(() => new LocalStorageManager());

  const [canvas, setCanvas] = useState(null);
  const canvasRef = useRef();
  // const ioBus = engine?.ioBus;

  // bind canvas
  useEffect(() => {
    if (canvasRef.current) {
      setCanvas(canvasRef.current);
    }
  }, [canvasRef]);

  // bind context
  useEffect(() => {
    if (loadingManager) {
      const finish = e => {
        setLoadingDone(true);
      };
      loadingManager.addEventListener('finish', finish, {
        once: true,
      });
    }
  }, [
    loadingManager,
  ]);

  // bind engine
  useEffect(() => {
    if (engine) {
      (async () => {
        const newSounds = engine.sounds;
        await newSounds.waitForLoad();
        setSounds(newSounds);
      })();
    }
  }, [
    engine,
  ]);

  //

  // keyboard controls
  useEffect(() => {
    const keyup = e => {
      switch (e.key) {
        case 'Enter': {
          if (!startPressed) {
            setStartPressed(true);
            sounds && sounds.playSoundName('menuSelect');
          }
          break;
        }
        case 'Backspace':
        case 'Escape':
        {
          if (keyPath.length === 0 && startPressed) {
            setStartPressed(false);
            sounds && sounds.playSoundName('menuBack');
          }
          break;
        }
      }
    };
    globalThis.addEventListener('keyup', keyup);

    return () => {
      globalThis.removeEventListener('keyup', keyup);
    };
  }, [
    sounds,
    startPressed,
    keyPath,
  ]);

  //

  return (
    <LoginProvider
      localStorageManager={localStorageManager}
    >
      <LoginConsumer>
        {value => {
          const {
            supabaseClient,
          } = value;

          return (
            <div
              className={styles.titleScreenApp}
            >
              <LoadingUi
                loadingManager={loadingManager}
              />

              <div className={classnames(
                styles.videoWrap,
                videoActive ? styles.active : null,
                startPressed ? styles.startPressed : null,
              )} onMouseDown={e => {
                setVideoActive(true);
              }} onMouseUp={e => {
                setVideoActive(false);
              }} onClick={e => {
                if (!startPressed) {
                  setStartPressed(true);

                  sounds && sounds.playSoundName('menuSweepIn');
                }
              }}>
                {loadingDone ?
                  <>
                    <video className={styles.video} src='/videos/upstreet.webm' autoPlay muted loop playsInline preload="metadata" />

                    <TitleScreenHeader
                      localStorageManager={localStorageManager}
                      supabaseClient={supabaseClient}
                    />

                    <div className={styles.versionWrap}>
                      <div className={classnames(
                        styles.version,
                      )}>BETA r.0.7</div>
                    </div>

                    <div className={classnames(
                      styles.caption,
                      startPressed ? styles.startPressed : null,
                    )}>
                      Press Start
                    </div>
                  </>
                : null}

                <MainMenu
                  enabled={startPressed}
                  className={classnames(
                    mainMenuStyles.needsStartPressed,
                    startPressed ? mainMenuStyles.startPressed : null,
                  )}
                  options={[
                    {
                      label: 'Singleplayer Mode',
                      handler() {
                        location.href = '/adventure/';
                      },
                      /* options: [
                        {
                          label: 'Peaceful',
                          handler() {
                            location.href = '/adventure/?difficulty=peaceful';
                          },
                        },
                        {
                          label: 'Hard',
                          handler() {
                            location.href = '/adventure/?difficulty=combat';
                          },
                        },
                      ], */
                    },
                    {
                      label: 'Multiplayer Mode',
                      handler() {
                        location.href = '/creative/?multiplayer=1';
                      },
                      /* options: [
                        {
                          label: 'Small (Range 1)',
                          handler() {
                            location.href = '/creative/?range=1';
                          },
                        },
                        {
                          label: 'Medium (Range 2)',
                          handler() {
                            location.href = '/creative/?range=2';
                          },
                        },
                        {
                          label: 'Large (Range 3)',
                          handler() {
                            location.href = '/creative/?range=3';
                          },
                        },
                      ], */
                    },
                    {
                      label: 'Generative Agents',
                      handler() {
                        location.href = `https://github.com/M3-org/upstreet-sdk`;
                      },
                    },
                    {
                      label: 'InDev',
                      handler() {
                        location.href = '/indev/';
                      },
                    },
                  ]}
                  onCursorChange={cursorPosition => {
                    setCursorPosition(cursorPosition);
                    sounds && sounds.playSoundName('menuClick');
                  }}
                  onKeyPathChange={keyPath => {
                    setKeyPath(keyPath);
                  }}
                  onSelect={cursorPosition => {
                    sounds && sounds.playSoundName('menuBoop');
                  }}
                />

                <Slides
                  className={classnames(
                    startPressed ? styles.startPressed : null,
                  )}
                  keyPath={keyPath}
                  slideIndex={cursorPosition}
                  slides={mainMenuSlides}
                />

                <div className={styles.spacer} />

                {loadingDone ? <div className={classnames(
                  styles.footer,
                  startPressed ? styles.startPressed : null,
                )}>
                  <div className={styles.background} />
                  <div className={styles.text}>
                    An <b>M3</b> production
                  </div>
                </div> : null}
              </div>

              <canvas className={classnames(
                styles.canvas,
              )} ref={canvasRef} />
              {/* <IoBusEventSource engine={engine} /> */}

              {engine ? <StoryUi
                engine={engine}
              /> : null}

              {canvas ? <EngineProvider
                canvas={canvas}
                objects={objects}
                playerSpec={playerSpec}

                engine={engine}
                setEngine={setEngine}

                engineLoading={engineLoading}
                setEngineLoading={setEngineLoading}

                onContext={context => {
                  setLoadingManager(context.loadingManager);
                }}
              /> : null}
            </div>
          );
        }}
      </LoginConsumer>
    </LoginProvider>
  );
};