import * as THREE from 'three';
import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';

import {
  chunkSize,
  segments,
  gridHeight,
  customChunkType,
} from '../packages/engine/managers/land/land-manager.js';

import {
  GameHeader,
} from './components/game-header/GameHeader.jsx';
import {
  HelperUi,
} from './components/helper-ui/HelperUi.jsx';

import {
  IoBusEventSource,
} from './components/io-bus/IoBusEventSource.jsx';
import {
  DragAndDrop,
} from './components/drag-and-drop/DragAndDrop.jsx';
import {
  handleDropFn,
} from './components/drag-and-drop/drop.js';
import {
  SpeechBubblePlugin,
} from './components/plugins/SpeechBubblePlugin.jsx';

import {
  LocalStorageManager,
} from '../packages/engine/managers/localstorage/localstorage-manager.js';

import {
  ChatUi,
} from './components/chat-ui/ChatUi.jsx';
import {
  StoryUi,
} from './components/story-ui/StoryUi.jsx';
import {
  CrosshairUi,
} from './components/crosshair-ui/CrosshairUi.jsx';
import {
  LoadingUi,
} from './components/loading-ui/LoadingUi.jsx';

import {
  MultiArray,
  MultiArraySubarray,
} from '../packages/engine/utils/array-utils.js';

import {
  exposeAgentInterface,
} from '../packages/engine/agent-interface.js';

import {
  multiplayerEndpointUrl,
} from '../packages/engine/endpoints.js';

import {
  EngineProvider,
} from '../packages/engine/clients/engine-client.js';

// import {
//   EmoteWheel,
// } from './components/emote-wheel/EmoteWheel.jsx';

import {
  LoginProvider,
  LoginConsumer,
} from './components/login-provider/LoginProvider.jsx';

import styles from '../styles/Adventure.module.css';

//

const getCoordsKey = coords => coords.join(':');

//

const LocationUi = ({
  engine,

  loaded,
}) => {
  const [coords, setCoords] = useState([0, 0]);

  // bind coordinate update
  useEffect(() => {
    if (engine) {
      const coordinateUpdateInterval = 1000;

      const localPlayer = engine.playersManager.getLocalPlayer();
      const interval = setInterval(() => {
        const {position} = localPlayer;
        const x = Math.floor(position.x / chunkSize);
        const z = Math.floor(position.z / chunkSize);

        if (x !== coords[0] || z !== coords[1]) {
          setCoords([x, z]);
        }
      }, coordinateUpdateInterval);

      return () => {
        clearInterval(interval);
      };
    }
  }, [
    engine,
    coords,
  ]);

  //

  return loaded ? (
    <div className={styles.locationUi}>
      <div className={styles.row}>
        <label className={styles.label}>
          <span className={styles.text}>Location</span>
        </label>

        <div className={styles.coords}>{coords[0]}, {coords[1]}</div>
      </div>
      
      <div className={styles.row}>
        <div className={styles.spacer} />
        <button className={styles.button} onClick={async e => {
          setDeploySpec({
            coords,
          });
        }}>
          <div className={styles.background} />
          <span className={styles.text}>Deploy</span>
        </button>
      </div>
    </div>
  ) : null;
};

//

/* const CameraTargetUi = ({
  engine,
}) => {
  const [app, setApp] = useState(null);
  const [object, setObject] = useState(null);

  // bind focusupdate
  useEffect(() => {
    if (engine) {
      const {cameraTargetingManager} = engine;
      const focusupdate = e => {
        const {
          app,
          object,
        } = e;
        setApp(app);
        setObject(object);
      };
      cameraTargetingManager.addEventListener('focusupdate', focusupdate);

      return () => {
        cameraTargetingManager.removeEventListener('focusupdate', focusupdate);
      };
    }
  }, [
    engine,
  ]);

  // bind keys
  useEffect(() => {
    if (engine) {
      const {playersManager} = engine;
      const localPlayer = playersManager.getLocalPlayer();

      const keydown = e => {
        switch (e.key) {
          case 'g': {
            if (object) {
              e.preventDefault();
              e.stopPropagation();

              const targetObject = object;
              const targetPosition = targetObject.position;
              const bbox2 = targetObject.physicsMesh ?
                new THREE.Box3()
                  .setFromBufferAttribute(targetObject.physicsMesh.geometry.attributes.position)
                  .applyMatrix4(targetObject.physicsMesh.matrixWorld)
              :
                null;

              const timestamp = performance.now();
              localPlayer.characterBehavior.clearWaypointActions();
              localPlayer.characterBehavior.addWaypointAction(
                targetPosition,
                timestamp,
                {
                  boundingBox: bbox2,
                },
              );
            }
            break;
          }
        }
      };
      globalThis.addEventListener('keydown', keydown);
      const click = e => {
        const {
          pointerLockManager,
          storyManager,
        } = engine;
        if (
          object &&
          pointerLockManager.pointerLockElement &&
          !storyManager.getConversation()
        ) {
          storyManager.inspectPhysicsId(object.physicsId);
        }
      };
      globalThis.addEventListener('click', click);

      return () => {
        globalThis.removeEventListener('keydown', keydown);
        globalThis.removeEventListener('click', click);
      };
    }
  }, [
    engine,
    app,
    object,
  ]);

  //

  return object ? (
    <div className={styles.cameraTargetUi}>
      <div className={styles.name}>{object.name}</div>
      <div className={styles.description}>{object.description}</div>
    </div>
  ) : null;
}; */

//

const LocationUrlTracker = ({
  engine,
}) => {
  // bind coordinate update
  useEffect(() => {
    if (engine) {
      const coordinateUpdateInterval = 1000;

      const localPlayer = engine.playersManager.getLocalPlayer();
      const interval = setInterval(() => {
        const {position} = localPlayer;
        const x = Math.floor(position.x);
        const z = Math.floor(position.z);

        const u = new URL(window.location);
        u.hash = `#${x},${z}`;
        window.history.replaceState({}, '', u.toString());
      }, coordinateUpdateInterval);

      return () => {
        clearInterval(interval);
      };
    }
  }, [
    engine,
  ]);

  return (
    <></>
  );
};

//

const DeployUi = ({
  engine,

  deploySpec,
  setDeploySpec,

  supabaseClient,
  sessionUserId,
}) => {
  const {
    coords,
  } = deploySpec;

  //

  const [json, setJson] = useState(null);
  const [sceneJsonString, setSceneJsonString] = useState(() => JSON.stringify({
    objects: [],
  }));

  // parse the json
  useEffect(() => {
    if (sceneJsonString) {
      try {
        const v = JSON.parse(sceneJsonString);
        setJson(v);
      } catch(err) {
        console.warn(err);
      }
    } else {
      setJson(null);
    }
  }, [
    sceneJsonString,
  ]);

  //

  return (
    <div className={styles.deployUi}>
      <div className={styles.row}>
        <div className={styles.label}>Deploy to LAND [{coords.join(',')}]</div>
        <nav className={styles.icon} onClick={e => {
          setDeploySpec(null);
        }}>
          <img className={styles.img} src='/assets/x.svg' draggable={false} />
        </nav>
      </div>

      <textarea
        className={styles.textarea}
        value={sceneJsonString}
        onChange={e => {
          const v = e.target.value;
          setSceneJsonString(v);
        }}
      ></textarea>

      <button className={styles.button} onClick={async e => {
        const land = await engine.landManager.deployCoord(
          coords,
          json,
          {
            supabaseClient,
            userId: sessionUserId,
          },
        );

        setDeploySpec(null);
      }}>Deploy</button>

      <button className={styles.button} onClick={async e => {
        const terrainApp = engine.appTracker.findApp(/terrain/i);
        // XXX this entire call can be replaced with terrainApp.getChunkSpec
        // XXX that also means that customChunkType can be made internal to terrainApp
        const chunk = await terrainApp.createChunk(coords[0], coords[1], customChunkType);
        let {
          elevations,
        } = chunk;
        elevations = elevations.slice();
        terrainApp.destroyChunk(chunk);

        // const halfSegments = Math.floor(segments / 2);
        const worldCoordToElevationCoord = v => Math.floor(v / chunkSize * segments);
        const getElevationIndex = (x, z) => (z * segments) + x;

        const cx = chunkSize / 2;
        const cz = chunkSize / 2;
        const cxe = worldCoordToElevationCoord(cx);
        const cze = worldCoordToElevationCoord(cz);
        const centerElevationIndex = getElevationIndex(cxe, cze);
        const centerElevation = elevations[centerElevationIndex];
        
        const swordX = cx;
        const swordZ = cz - 5;
        const swordXE = worldCoordToElevationCoord(swordX);
        const swordZE = worldCoordToElevationCoord(swordZ);
        const swordElevationIndex = getElevationIndex(swordXE, swordZE);
        const swordElevation = elevations[swordElevationIndex];

        const dreadnoughtX = cx;
        const dreadnoughtZ = cz - 50;
        const dreadnoughtElevation = 150;

        const s = JSON.stringify({
          objects: [
            {
              start_url: '/core-modules/silsword/index.js',
              position: [
                cx,
                centerElevation + 0.5,
                cz,
              ],
            },
            {
              start_url: '/core-modules/ruins/Ruin_Rock_1_dream.glb',
              position: [
                swordX,
                swordElevation,
                swordZ,
              ],
            },
            {
              start_url: '/core-modules/dreadnought/dreadnought.glb',
              position: [
                dreadnoughtX,
                dreadnoughtElevation,
                dreadnoughtZ,
              ],
              quaternion: [0, 0.7071067811865475, 0, 0.7071067811865476],
            },
          ],
        }, null, 2);
        setSceneJsonString(s);
      }}>Idea</button>
    </div>
  );
};

//

const mapObjectsToChunkCoords = (objects, coords) => {
  objects = structuredClone(objects);
  for (let i = 0; i < objects.length; i++) {
    const object = objects[i];
    const {
      position,
    } = object;
    position[0] += coords[0] * chunkSize;
    position[2] += coords[1] * chunkSize;
  }
  return objects;
};

//

const LandUpdateBinding = ({
  engine,
  supabaseClient,

  objects,
  setObjects,

  range,
}) => {
  const [tracker, setTracker] = useState(null);
  const [landCoordToSubArrayIdMap, setLandCoordToSubArrayIdMap] = useState(() => new Map());

  //

  useEffect(() => {
    const hashchange = e => {
      location.reload();
    };
    globalThis.addEventListener('hashchange', hashchange);

    return () => {
      globalThis.removeEventListener('hashchange', hashchange);
    };
  }, []);

  //

  // bind land tracker
  useEffect(() => {
    if (engine && typeof range === 'number' && range > 0) {
      const {landManager} = engine;

      const tracker = landManager.createLandTracker({
        supabaseClient,
        range,
      });
      setTracker(tracker);

      let frame;
      const _recurse = () => {
        frame = requestAnimationFrame(_recurse);

        tracker.update();
      };
      frame = requestAnimationFrame(_recurse);

      return () => {
        cancel();
        cancelAnimationFrame(frame);
      };
    }
  }, [
    engine,
  ]);

  // bind land tracker events
  useEffect(() => {
    if (tracker) {
      let localObjects = objects;

      const landAdd = e => {
        // console.log('land add', e.data);
        let {
          land: {
            coords,
            objects: addObjects,
          },
        } = e.data;

        const newObjects = mapObjectsToChunkCoords(addObjects, coords);

        localObjects = localObjects.clone();
        const subArray2 = localObjects.addSubArray();
        for (const object of newObjects) {
          subArray2.push(object);
        }
        setObjects(localObjects);

        const key = getCoordsKey(coords);
        landCoordToSubArrayIdMap.set(key, subArray2.id);
      };
      tracker.addEventListener('landadd', landAdd);
      const landRemove = e => {
        // console.log('land remove', e.data);
        const {
          key,
        } = e.data;

        const subArrayId = landCoordToSubArrayIdMap.get(key);

        localObjects = localObjects.clone();
        const subArray2 = localObjects.subArrays.find(sa => {
          return sa.id === subArrayId;
        });

        localObjects.removeSubArray(subArray2);
        setObjects(localObjects);
      }
      tracker.addEventListener('landremove', landRemove);

      return () => {
        tracker.removeEventListener('landadd', landAdd);
        tracker.removeEventListener('landremove', landRemove);
      };
    }
  }, [
    engine,
    tracker,
  ]);

  //

  return (
    <></>
  );
};

//

// bind the player's profile, which contains their avatar
export const ProfileBinding = ({
  localStorageManager,

  playerSpec,
  setPlayerSpec,
}) => {
  // bind account manager updates to player spec
  useEffect(() => {
    const playerspecupdate = e => {
      const {
        playerSpec,
      } = e.data;
      setPlayerSpec(playerSpec);
    };
    localStorageManager.addEventListener('playerspecupdate', playerspecupdate);

    // bind
    setPlayerSpec(localStorageManager.getPlayerSpec());

    return () => {
      localStorageManager.removeEventListener('playerspecupdate', playerspecupdate);
    };
  }, [
    localStorageManager,
  ]);
};

//

export const AdventureApp = ({
  // difficulty,
  range,
  multiplayer,
  beta,
  agent,
  hidable,
  debug,
}) => {
  const [engine, setEngine] = useState(null);
  const [context, setContext] = useState(null);
  const [localStorageManager, setLocalStorageManager] = useState(() => new LocalStorageManager());
  const [objects, setObjects] = useState(() => {
    const a = new MultiArray([
      {
        type: 'application/spawnpoint',
        content: (() => {
          const u = new URL(location.href);
          // match #x,z
          const hash = u.hash.slice(1);
          const match = hash.match(/^(-?\d+),(-?\d+)$/);
          const x = match ? parseInt(match[1], 10) : 0;
          const z = match ? parseInt(match[2], 10) : 0;

          return {
            position: [x, gridHeight, z],
          };
        })(),
      },
      {
        start_url: '/core-modules/webaverse-terrain/index.js',
        components: beta ? [
          {
            key: 'layers',
            value: {
              avatar: true,
              object: true,
              mob: true,
            },
          },
        ] : [],
      },
      {
        type: 'application/wind',
        content: {
          windType: 'directional',
          direction: [-1, 0, 0],
          windForce: 0.5,
          noiseScale: 1,
          windFrequency: 1
        }
      },
      {
        start_url: '/audio/soundscape-robust-summer-after.mp3',
        components: [
          {key: 'volume', value: 0.2},
        ],
      },
      {
        start_url: '/audio/calm-jrpg-style-demo2.mp3',
        components: [
          {key: 'volume', value: 0.01},
        ],
      },

      // testing
      /*
      {
        position: [0, 12, -3],
        quaternion: [0, 1, 0, 0],
        start_url: '/characters/solarwitch.npc',
      },
      {
        position: [0, 10, -3],
        start_url: '/core-modules/silk/index.js',
      },
      {
        position: [0, 10, -2],
        start_url: '/core-modules/ores/index.js',
      },
      {
        position: [0, 10, -5],
        start_url: '/core-modules/title-deed/title-deed.item',
      },
      {
        position: [0, 10, -6],
        start_url: '/core-modules/button/index.js',
      },
      {
        position: [20.683387756347656, 26.5, -100.8043441772461],
        quaternion: [0, 0, 0, 1],
        start_url: '/models/The_Basilik_v3.glb',
      }, */
    ].concat(beta ? [
      {
        position: [0, 70, 0],
        quaternion: [0, 0.7071067811865475, 0, 0.7071067811865476],
        start_url: '/core-modules/floating-treehouse/index.js',
      },
      {
        position: [0, 0, 0],
        start_url: '/core-modules/lisk/index.js',
      },
      {
        position: [-69.12263488769531, 36.84118765592575, -19.192594528198242],
        quaternion: [0.37533027751786524, 0.07465783405034258, -0.9061274463528878, -0.1802399555017369],
        start_url: '/core-modules/silsword/index.js',
      },
      {
        position: [32.683387756347656, 30.6351997256279, -94.8043441772461],
        quaternion: [0, 0, 0, 1],
        start_url: '/core-modules/origin-tablet/Origin_Tablets_Pillar_V2_avaer_hax.glb',
      },
      {
        position: [-69.12263488769531, 30.84118765592575, -19.192594528198242],
        quaternion: [0, 0, 0, 1],
        start_url: '/core-modules/street-green/index.js',
      },
      {
        position: [-69.12263488769531, 30.84118765592575, -3.192594528198242],
        quaternion: [0, 0, 0, 1],
        start_url: '/core-modules/hovercraft/hovercraft.glb',
      },
    ] : [
      {
        start_url: '/audio/calm-jrpg-style-demo2.mp3',
        components: [
          {key: 'volume', value: 0.1},
        ],
      },
      {
        position: [chunkSize/2, 70, 0],
        quaternion: [0, 0, 0, 1],
        start_url: '/core-modules/street-green/index.js',
      },
    ]));
    return a;
  });
  const [playerSpec, setPlayerSpec] = useState(null);
  const [engineLoading, setEngineLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [titleScreenEntered, setTitleScreenEntered] = useState(false);

  const [mode, setMode] = useState('play');
  const [deploySpec, setDeploySpec] = useState(null);

  const [editorOpen, setEditorOpen] = useState(false);

  const [canvas, setCanvas] = useState(null);
  const canvasRef = useRef();

  // bind canvas
  useEffect(() => {
    if (canvasRef.current) {
      setCanvas(canvasRef.current);
    }
  }, [canvasRef]);

  // bind mode
  useEffect(() => {
    if (engine) {
      const {landManager} = engine;
      landManager.setMode(mode);

      if (mode === 'map') {
        const {playersManager} = engine;
        const localPlayer = playersManager.getLocalPlayer();

        landManager.setMapOffset(
          new THREE.Vector3(
            localPlayer.position.x,
            300,
            localPlayer.position.z,
          ),
        );
      }
    }
  }, [
    engine,
    mode,
  ]);

  // initialize multiplayer
  useEffect(() => {
    if (engine && multiplayer) {
      const roomName = typeof multiplayer === 'string' ?
        multiplayer
      :
        'multiplayer'
      ;

      (async () => {
        const newMultiplayer = engine.createMultiplayer();
        
        await newMultiplayer.connectMultiplayer({
          endpoint_url: multiplayerEndpointUrl,
        });
        const tracker = newMultiplayer.createTracker({
          getKeySpec: () => {
            const {
              playersManager,
            } = engine;
            const localPlayer = playersManager.getLocalPlayer();
            const position = localPlayer.position;

            const {x, y, z} = position;
            const realmsKeys = [];
            let rootRealmKey;
            for (let dx = -1; dx <= 1; dx++) {
              for (let dz = -1; dz <= 1; dz++) {
                const key = `${roomName}:${Math.floor((x + dx * chunkSize) / chunkSize)},${Math.floor((z + dz * chunkSize) / chunkSize)}`;
                realmsKeys.push(key);

                if (dx === 0 && dz === 0) {
                  rootRealmKey = key;
                }
              }
            }
            return {
              realmsKeys,
              rootRealmKey,
            };
          },
        });
      })();
    }
  }, [engine]);

  // bind title screen controls
  useEffect(() => {
    if (engine) {
      const pointerlockchange = e => {
        const {
          pointerLockElement,
        } = e.data;
        !titleScreenEntered && pointerLockElement && setTitleScreenEntered(true);
      };
      engine.pointerLockManager.addEventListener('pointerlockchange', pointerlockchange);

      return () => {
        engine.pointerLockManager.removeEventListener('pointerlockchange', pointerlockchange);
      };
    }
  }, [engine]);

  // bind loading manager
  useEffect(() => {
    if (engine) {
      (async () => {
        await engine.engineRenderer.waitForRender();
        setLoaded(true);
      })();
    }
  }, [
    engine,
  ]);

  // expose the agent interface
  useEffect(() => {
    if (engine && agent) {
      const {
        playersManager,
        chatManager,
        loreManager,
      } = engine;
      exposeAgentInterface({
        playersManager,
        chatManager,
        loreManager,
      });
    }
  }, [
    engine,
  ]);

  //

  return (
    <LoginProvider
      localStorageManager={localStorageManager}
    >
      <LoginConsumer>
        {loginValue => {
          const {
            supabaseClient,
            sessionUserId,
            address,
          } = loginValue;

          return (
            <div
              className={styles.adventureApp}
            >
              <LoadingUi
                loadingManager={context?.loadingManager}
              />

              <canvas className={classnames(
                styles.canvas,
              )} ref={canvasRef} />
              <IoBusEventSource engine={engine} />

              <GameHeader
                localStorageManager={localStorageManager}
                supabaseClient={supabaseClient}

                sessionUserId={sessionUserId}
                address={address}

                engine={engine}

                mode={mode}
                setMode={setMode}

                deploySpec={deploySpec}
                setDeploySpec={setDeploySpec}

                editorOpen={editorOpen}
                setEditorOpen={setEditorOpen}

                editable={debug}
                hidable={hidable}
                debug={debug}

                loaded={loaded}
              >
                {debug && mode === 'land' && <LocationUi
                  engine={engine}

                  deploySpec={deploySpec}
                  setDeploySpec={setDeploySpec}
                    
                  loaded={loaded}
                />}
              </GameHeader>

              {engine ? <CrosshairUi
                engine={engine}
              /> : null}

              <HelperUi
                localStorageManager={localStorageManager}

                loaded={loaded}
              />
              {/* <CameraTargetUi
                engine={engine}
              /> */}

              <ChatUi
                engine={engine}
                onClose={() => {}}
              />

              <LocationUrlTracker
                engine={engine}
              />

              {deploySpec ? <DeployUi
                engine={engine}

                deploySpec={deploySpec}
                setDeploySpec={setDeploySpec}

                objects={objects}
                setObjects={setObjects}

                supabaseClient={supabaseClient}
                sessionUserId={sessionUserId}
              /> : null}

              <DragAndDrop
                localStorageManager={localStorageManager}
                supabaseClient={supabaseClient}

                onDrop={handleDropFn({
                  engine,
                  supabaseClient,
                  sessionUserId,
                })}
              />

              <LandUpdateBinding
                engine={engine}
                supabaseClient={supabaseClient}

                objects={objects}
                setObjects={setObjects}

                range={range}
              />

              {engine ? <StoryUi
                engine={engine}
              /> : null}

              <SpeechBubblePlugin
                engine={engine}
              />

              <ProfileBinding
                localStorageManager={localStorageManager}

                playerSpec={playerSpec}
                setPlayerSpec={setPlayerSpec}
              />

              {canvas ? <EngineProvider
                canvas={canvas}
                objects={objects}
                playerSpec={playerSpec}

                engine={engine}
                setEngine={setEngine}

                engineLoading={engineLoading}
                setEngineLoading={setEngineLoading}

                onContext={context => {
                  setContext(context);
                }}
              /> : null}
            </div>
          );
        }}
      </LoginConsumer>
    </LoginProvider>
  );
};