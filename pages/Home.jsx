import * as THREE from 'three';
import {
  OrbitControls,
} from 'three/examples/jsm/controls/OrbitControls.js';
import React, {
  useState,
  useEffect,
  useRef,
  useContext,
} from 'react';
import classnames from 'classnames';

import {
  removeBackground,
} from '../packages/engine/clients/background-removal-client.js';

// import '../hack.js';

import characters from '../public/characters/characters.json';
import {
  charactersBaseUrl,
  discordInviteUrl,
  aiProxyHost,
} from '../packages/engine/endpoints.js';
import loaders from '../packages/engine/loaders.js';
import {
  addDefaultLights,
  blob2DataUrl,
  downloadFile,
  makeId,
  loadJson,
  nop,
} from '../packages/engine/util.js';

import {
  ChatUi,
} from './components/chat-ui/ChatUi.jsx';

import {
  LoginContext,
  LoginProvider,
  LoginConsumer,
  // LoginProfileContext,
  // LoginProfileProvider,
  // LoginProfileConsumer,
  // LoginStatsContext,
  // LoginStatsProvider,
  // LoginStatsConsumer,
} from './components/login-provider/LoginProvider.jsx';
// import {
//   UserBar,
// } from './components/user-bar/UserBar.jsx';
import {
  ProfileUi,
} from './components/profile-ui/ProfileUi.jsx';

import {
  PgSqlDatabaseClient,
} from '../packages/engine/clients/pgsql-database-client.js';
import {
  EngineProvider,
} from '../packages/engine/clients/engine-client.js';

import {
  nameGenerator,
  // descriptionGenerator,
  musicPromptGenerator,
  levelImagePromptGenerator,
  // itemGenerator,
  // itemImagePromptGenerator,
} from '../packages/engine/generators/llm/llm-generators.js';
import {
  characterModel,
  squareize,

  CharacterGenerator,
  generateCharacterFromPrompt,
  makeMaskCanvas,
} from '../packages/engine/generators/character/character-generator.js';

import {
  generateSkyboxFull,
  skyboxStyleNames,
  defaultSkyboxStyleName,
} from '../packages/engine/clients/blockade-labs-client.js';
import {
  getVoiceRequest,
} from '../packages/engine/audio/voice-output/voice-endpoint-voicer.js';
import {
  IoBusEventSource,
} from './components/io-bus/IoBusEventSource.jsx';
import {
  Skybox360Mesh,
} from '../packages/engine/meshes/Skybox360Mesh.js';
import {
  Frame360Mesh,
} from '../packages/engine/meshes/Frame360Mesh.js';
import {
  // generateImage,
  img2img,
  interrogateDeepBooru,
  setSdModel,
} from '../packages/engine/generate-image.js';

import {
  CharacterCardParser,
  LorebookParser,
} from '../packages/engine/character-card/card-parser.js';

import physicsManager from '../packages/engine/physics/physics-manager.js';

import {
  CharacterClient,
} from '../packages/engine/clients/character-client.js';
import {
  VrmClient,
} from '../packages/engine/clients/vrm-client.js';
import {
  CardClient,
} from '../packages/engine/clients/card-client.js';
import {
  LorebookClient,
} from '../packages/engine/clients/lorebook-client.js';
import {
  MusicClient,
} from '../packages/engine/clients/music-client.js';
import {
  SkyboxClient,
} from '../packages/engine/clients/skybox-client.js';
import {
  ItemsClient,
} from '../packages/engine/clients/items-client.js';
import {
  ScenesClient,
} from '../packages/engine/clients/scenes-client.js';

import {
  generateAudioFull,
} from '../packages/engine/dance-generation.js';
import {
  generate360Views,
  drawSlices,
} from '../packages/engine/clients/zero123-client.js';
import Simplex from '../packages/engine/simplex-noise.js';
import {
  RawAiClient,
} from '../packages/engine/clients/raw-ai-client.js';
import {
  Redirect,
} from './components/redirect/Redirect.jsx';
import {
  SupabaseClient,
} from '../packages/engine/clients/supabase-client.js';
import {
  SupabaseFsWorker,
} from '../packages/engine/supabase-fs-worker.js';
import {
  blob2img,
} from '../packages/gen/src/utils/convert-utils.js';

import {
  LocalStorageManager,
} from '../packages/engine/managers/localstorage/localstorage-manager.js';

import voiceModels from '../public/voice/voice_models.json';

import styles from '../styles/Home.module.css';
import topBarStyles from '../styles/TopBar.module.css';

//

const objectModel = 'objectArthemy_v10.safetensors';
const y180Quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

//

const allCharacters = characters.packs.flatMap(pack => pack.characters);

//

const makeGradientCanvas = (w, h) => {
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext('2d');

  maskCtx.fillStyle = '#FFF';
  maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

  const simplexR = new Simplex(Math.random());
  const simplexG = new Simplex(Math.random());
  const simplexB = new Simplex(Math.random());
  const simplexRate = 0.05;
  const centerPower = 0.25;

  // radial gradient via image data
  const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const j = i / 4;
    const x = (j % maskCanvas.width);
    const y = Math.floor(j / maskCanvas.width);

    const distanceToCenter = Math.sqrt(
      Math.pow(x - maskCanvas.width / 2, 2) +
      Math.pow(y - maskCanvas.height / 2, 2)
    );
    let centerFactor = distanceToCenter / (maskCanvas.width / 2);
    centerFactor = centerFactor ** centerPower;
    const centerFactorInv = 1 - centerFactor;

    const x2 = x * simplexRate;
    const y2 = y * simplexRate;

    const r = simplexR.noise2D(x2, y2) * 255;
    const g = simplexG.noise2D(x2, y2) * 255;
    const b = simplexB.noise2D(x2, y2) * 255;
    const a = 255;

    imageData.data[i + 0] = imageData.data[i + 0] * centerFactor + r * centerFactorInv;
    imageData.data[i + 1] = imageData.data[i + 1] * centerFactor + g * centerFactorInv;
    imageData.data[i + 2] = imageData.data[i + 2] * centerFactor + b * centerFactorInv;
    imageData.data[i + 3] = a;
  }
  maskCtx.putImageData(imageData, 0, 0);

  return maskCanvas;
};
const opacify = async blob => {
  const img = await blob2img(blob);

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');

  // blend image with alpha on top of white background
  // draw the white background
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // blend image on top
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(img, 0, 0);

  const opacifiedBlob = await new Promise((accept, reject) => {
    canvas.toBlob(accept, 'image/png');
  });
  return opacifiedBlob;
};

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector2D = new THREE.Vector2();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localRaycaster = new THREE.Raycaster();

// clients

const supabaseClient = new SupabaseClient();
const supabaseFsWorker = new SupabaseFsWorker({
  supabase: supabaseClient.supabase,
});
const characterClient = new CharacterClient({
  pgSqlDatabaseClient: new PgSqlDatabaseClient({
    supabase: supabaseClient.supabase,
    tableName: 'generations',
  }),
  supabaseFsWorker,
});
characterClient.waitForLoad();
const vrmClient = new VrmClient({
  pgSqlDatabaseClient: new PgSqlDatabaseClient({
    supabase: supabaseClient.supabase,
    tableName: 'generations',
  }),
  supabaseFsWorker,
});
vrmClient.waitForLoad();
const cardClient = new CardClient({
  pgSqlDatabaseClient: new PgSqlDatabaseClient({
    supabase: supabaseClient.supabase,
    tableName: 'generations',
  }),
  supabaseFsWorker,
});
cardClient.waitForLoad();
const lorebookClient = new LorebookClient({
  pgSqlDatabaseClient: new PgSqlDatabaseClient({
    supabase: supabaseClient.supabase,
    tableName: 'generations',
  }),
  supabaseFsWorker,
});
lorebookClient.waitForLoad();
const musicClient = new MusicClient({
  pgSqlDatabaseClient: new PgSqlDatabaseClient({
    supabase: supabaseClient.supabase,
    tableName: 'generations',
  }),
  supabaseFsWorker,
});
musicClient.waitForLoad();
const skyboxClient = new SkyboxClient({
  pgSqlDatabaseClient: new PgSqlDatabaseClient({
    supabase: supabaseClient.supabase,
    tableName: 'generations',
  }),
  supabaseFsWorker,
});
skyboxClient.waitForLoad();
const itemsClient = new ItemsClient({
  pgSqlDatabaseClient: new PgSqlDatabaseClient({
    supabase: supabaseClient.supabase,
    tableName: 'generations',
  }),
  supabaseFsWorker,
});
itemsClient.waitForLoad();
const scenesClient = new ScenesClient({
  pgSqlDatabaseClient: new PgSqlDatabaseClient({
    supabase: supabaseClient.supabase,
    tableName: 'generations',
  }),
  supabaseFsWorker,
});
scenesClient.waitForLoad();

//

const writeMirrorFile = async (fileName, blob) => {
  const userId = await supabaseFsWorker.getUserId();
  const id = makeId(8);
  const u = await supabaseFsWorker.writeFile([
    userId,
    id,
    fileName,
  ], blob);
  return u;
};
const copyFileToLocal = async (blob, ext) => {
  const fileName = `${makeId(8)}.${ext}`;
  return await writeMirrorFile(fileName, blob);
};

//

const getFileName = u => u.match(/[^\/]+$/)[0];
const copyBlockadeLabsFileToLocal = async (file_url, suffix = '') => {
  file_url = new URL(file_url);
  file_url.protocol = 'https:';
  file_url.host = aiProxyHost;
  file_url.pathname = '/api/ai/blockadelabs' + file_url.pathname;
  file_url = file_url.href;

  const res = await fetch(file_url);
  const blob = await res.blob();

  file_url = new URL(file_url);
  file_url.pathname += suffix;
  file_url = file_url.href;
  const fileName = getFileName(file_url);

  return await writeMirrorFile(fileName, blob);
};

// components

const HomeTopBar = ({
  selectedTab,
  setSelectedTab,
}) => {
  return (
    <div className={classnames(
      topBarStyles.topBar,
      styles.topBar,
    )}>
      <div className={topBarStyles.buttons}>
        <div className={classnames(
          topBarStyles.button,
          // nexting ? topBarStyles.disabled : null,
        )}>
          <div className={topBarStyles.background}>
            <input type='file' className={topBarStyles.file} value='' onChange={async e => {
              const file = e.target.files[0];

              console.log('got file', file, file.type);
              // XXX map import to client based on type
            }} />
          </div>
          <img className={classnames(
            topBarStyles.img,
            topBarStyles.small,
          )} src='/ui/assets/icons/plus.svg' />
          <div className={topBarStyles.text}>Import</div>
        </div>

        {/* <UserBar
          selected={selectedTab === 'profile'}
          onClick={e => {
            setSelectedTab('profile');
          }}
        /> */}
      </div>
    </div>
  );
};

const tabs = [
  'menu',
  'editor',
  'scenes',
  'characters',
  'vrms',
  'cards',
  'lorebooks',
  'skyboxes',
  'items',
  'music',
  'text',
  'voice',
  'profile',
];
const HomeHeader = ({
  // characterClient,
  // skyboxClient,
  // itemsClient,
  // musicClient,

  selectedTab,
  setSelectedTab,
}) => {
  return (
    <div className={styles.header}>
      <div className={styles.tabs}>
        {tabs.map(t => {
          return (
            <Tab
              tab={t}
              selected={selectedTab === t}
              setSelected={() => setSelectedTab(t)}
              key={t}
            />
          );
        })}
      </div>
    </div>
  );
};
const Tab = ({
  tab,
  selected,
  setSelected,
}) => {
  return (
    <div
      className={classnames(
        styles.tab,
        selected ? styles.selected : null,
      )}
      onClick={setSelected}
    >
      <div className={styles.background}></div>
      <div className={styles.text}>{tab}</div>
    </div>
  );
};

//

const HomeContent = ({
  characterClient,
  vrmClient,
  skyboxClient,
  itemsClient,
  scenesClient,
  musicClient,

  selectedTab,
  setSelectedTab,
}) => {
  const [engine, setEngine] = useState(null);
  const [objects, setObjects] = useState([]);
  const [playerSpec, setPlayerSpec] = useState(null);
  
  const [engineEnabled, setEngineEnabled] = useState(false);
  const [engineLoading, setEngineLoading] = useState(false);

  //

  // const loginProfileValue = useContext(LoginProfileContext);

  /* // player spec
  useEffect(() => {
    const abortController = new AbortController();
    const {signal} = abortController;

    const {character} = loginProfileValue;
    if (character) {
      (async () => {
        const match = character.match(/^id:(.*)/);
        if (match) {
          const id = match[1];

          await characterClient.waitForLoad();
          await vrmClient.waitForLoad();
          const item = characterClient.items.find(item => item.id === id) ??
            vrmClient.items.find(item => item.id === id);
          if (item.type === 'vrm') {
            const j = item.content;
            const {
              vrmUrl,
            } = j;
            const j2 = {
              avatarUrl: vrmUrl,
            };

            setPlayerSpec(j2);
          } else if (item.type === 'character360') {
            const j = item.content;
            const {
              character360ImageUrl,
              characterEmotionImageUrls,
              characterEmotionUrl,
            } = j;
            const j2 = {
              character360ImageUrl,
              characterEmotionImageUrls,
              characterEmotionUrl,
            };
            const avatarUrl = `data:application/character360,${encodeURIComponent(JSON.stringify(j2))}`;
            const j3 = {
              avatarUrl,
            };
            setPlayerSpec(j3);
          }
        } else {
          const j = await loadJson(character, {
            signal,
          });
          setPlayerSpec(j);
        }
      })();
    } else {
      // XXX
      setPlayerSpec(null);
    }

    return () => {
      abortController.abort();
    };
  }, [
    loginProfileValue,
  ]); */

  //

  return (
    <div className={styles.content}>
      {(() => {
        switch (selectedTab) {
          case 'menu': {
            return null;
            // return (
            //   <LoginConsumer>
            //     {loginValue => {
            //       return (
            //         <MainMenu loginValue={loginValue} />
            //       );
            //     }}
            //   </LoginConsumer>
            // );
          }
          case 'editor': {
            return (<EditorContent
              // worldsClient={worldsClient}
              skyboxClient={skyboxClient}
              characterClient={characterClient}
              itemsClient={itemsClient}
              scenesClient={scenesClient}
              musicClient={musicClient}

              engineEnabled={engineEnabled}
              setEngineEnabled={setEngineEnabled}
              engineLoading={engineLoading}
              setEngineLoading={setEngineLoading}
              engine={engine}
              setEngine={setEngine}
              objects={objects}
              setObjects={setObjects}
              playerSpec={playerSpec}
              setPlayerSpec={setPlayerSpec}
            />);
          }
          case 'scenes': {
            return (<ScenesContent
              scenesClient={scenesClient}

              setSelectedTab={setSelectedTab}
              objects={objects}
              setObjects={setObjects}
              engineEnabled={engineEnabled}
              setEngineEnabled={setEngineEnabled}
            />);
          }
          case 'characters': {
            return (<CharactersContent
              characterClient={characterClient}
            />);
          }
          case 'vrms': {
            return (<VrmsContent
              vrmClient={vrmClient}
            />);
          }
          case 'cards': {
            return (<CardsContent
              cardClient={cardClient}
            />);
          }
          case 'lorebooks': {
            return (<LorebooksContent
              lorebookClient={lorebookClient}
            />);
          }
          case 'skyboxes': {
            return (<SkyboxesContent
              skyboxClient={skyboxClient}
            />);
          }
          case 'items': {
            return (<ItemsContent
              itemsClient={itemsClient}
            />);
          }
          case 'music': {
            return (<MusicContent
              musicClient={musicClient}
            />);
          }
          case 'text': {
            return (<TextContent />);
          }
          case 'voice': {
            return (<VoiceContent />);
          }
          case 'profile': {
            return (<ProfileContent />);
          }
          default: {
            return null;
          }
        }
      })()}
    </div>
  );
};
const ScenesContentItems = [
  ({
    item,
    setSelectedTab,
    setObjects,
    setEngineEnabled,
  }) => {
    const {
      content,
    } = item;
    const {
      name,
      objects,
    } = content;
    return (<div className={styles.wrap}>
      <div className={styles.name}>{name}</div>
      <button className={styles.button} onClick={e => {
        const pathname = `/${encodeURIComponent(name)}`;
        window.location.pathname = pathname;
      }}>Enter</button>
      <button className={styles.button} onClick={async e => {
        setSelectedTab('editor');

        setObjects(objects);
        setEngineEnabled(true);
      }}>Edit</button>
    </div>);
  },

  ({
    item: {
      content: {
        previewUrl = '',
      },
    },
  }) => <div className={styles.wrap}>
    <img src={previewUrl} className={styles.img} />
  </div>,
  
  ({
    item: {
      content,
    },
  }) => <div className={styles.wrap}>
    <div className={styles.json}>{JSON.stringify(content, null, 2)}</div>
  </div>,

  ({
    item: {
      content,
    },
  }) => <div className={styles.wrap}>
    <label className={styles.label}>
      <div className={styles.text}>Multiplayer</div>
      <input type='checkbox' className={styles.checkbox} checked={!!content.multiplayer?.enabled} disabled />
    </label>
  </div>,

  ({
    item: {
      id,
    },
  }) => <div className={styles.wrap}>
    <nav className={styles.button} onClick={async (e) => {
      await scenesClient.deleteId(id);
    }}>
      <img src='/assets/icons/close.svg' />
    </nav>
    <button className={styles.button} onClick={async (e) => {
      const zipBlob = await scenesClient.exportId(id);
      downloadFile(zipBlob, 'scene.zip');
    }}>Export</button>
  </div>,
];
const ScenesContent = ({
  scenesClient,

  selectedTab,
  setSelectedTab,
  objects,
  setObjects,
  engineEnabled,
  setEngineEnabled,
}) => {
  const [scenes, setScenes] = useState([]);

  //

  useEffect(() => {
    const itemsupdate = e => {
      const {
        items,
      } = e.data;
      setScenes(items);
    };
    scenesClient.addEventListener('itemsupdate', itemsupdate);

    setScenes(scenesClient.items);

    return () => {
      scenesClient.removeEventListener('itemsupdate', itemsupdate);
    };
  }, []);

  //

  return (
    <ClientElements
      client={scenesClient}
      items={scenes}

      itemsClassName={styles.sceneItems}
      itemClassName={styles.sceneItem}

      panelElements={ScenesContentItems}

      selectedTab={selectedTab}
      setSelectedTab={setSelectedTab}

      objects={objects}
      setObjects={setObjects}

      engineEnabled={engineEnabled}
      setEngineEnabled={setEngineEnabled}
    />
  );
};

//

const ClientElements = ({
  client,
  items,

  itemsClassName,
  itemClassName,

  panelElements,

  selectedTab,
  setSelectedTab,

  objects,
  setObjects,

  engineEnabled,
  setEngineEnabled,
}) => {
  return (
    <div className={classnames(
      itemsClassName,
      styles.items,
    )}>
      {items.map((item, i) => {
        return (
          <div className={classnames(
            itemClassName,
            styles.item,
          )} key={i}>
            {panelElements.map((PanelElement, i) => {
              return (
                <PanelElement
                  item={item}
                  client={client}

                  selectedTab={selectedTab}
                  setSelectedTab={setSelectedTab}

                  objects={objects}
                  setObjects={setObjects}

                  engineEnabled={engineEnabled}
                  setEngineEnabled={setEngineEnabled}

                  key={i}
                />
              )
            })}
          </div>
        );
      })}
    </div>
  );
};
const CloseButton = ({
  onClick,
}) => {
  return (
    <nav className={styles.button} onClick={onClick}>
      <img src='/assets/icons/close.svg' />
    </nav>
  );
};
const ExportButton = ({
  onClick,
}) => {
  return (
    <button className={styles.button} onClick={onClick}>Export</button>
  );
};
const RefreshButton = ({
  onClick,
}) => {
  return (
    <nav className={classnames(
      styles.button,
      styles.cornerButton,
    )} onClick={onClick}>
      <img src='/images/refresh.svg' />
    </nav>
  );
};

//

const CharactersContentItems = [
  ({
    item,
  }) => {
    const [inView, setInView] = useState(false);
    const ref = useRef();

    // use IntersectionObserver to detect when the element is in view
    useEffect(() => {
      const observer = new IntersectionObserver(entries => {
        const entry = entries[0];
        setInView(entry.isIntersecting);
      });

      observer.observe(ref.current);

      return () => {
        observer.disconnect();
      };
    }, []);

    const {content} = item;
    if (!content) {
      return null;
    }
    const {
      character360ImageUrl = '',
      characterEmotionUrl = '',
    } = content;

    return (
      <div ref={ref} className={styles.wrap}>
        {inView ? <Frame360PreviewCanvas
          frame360ImageUrl={character360ImageUrl}
          frameAnimationImageUrl={characterEmotionUrl}
        /> : null}
      </div>
    );
  },

  ({
    item: {
      content,
    },
  }) => {
    if (!content) {
      return null;
    }
    const {
      name = '',
      description = '',
    } = content;
    return (
      <div className={styles.wrap}>
        <div className={styles.name}>{name}</div>
        <div className={styles.description}>{description}</div>
      </div>
    );
  },

  ({
    item: {
      content,
    },
  }) => {
    if (!content) {
      return null;
    }
    const {
      characterImageUrl = '',
    } = content;
    return (
      <div className={styles.wrap}>
        <img className={styles.img} src={characterImageUrl} />
      </div>
    );
  },

  ({
    item,
  }) => {
    const {
      // id,
      content,
    } = item;
    if (!content) {
      return null;
    }
    const {
      description = '',
      characterImageUrl = '',
      characterEmotionUrl = '',
    } = content;
    return (
      <div className={styles.wrap}>
        <RefreshButton
          onClick={async (e) => {
            const res = await fetch(characterImageUrl);
            const blob = await res.blob();

            const characterGenerator = new CharacterGenerator();
            const characterEmotionsBlob = await characterGenerator.generateEmotions({
              blob,
              prompt: description,
            });
            const characterEmotionUrl = await copyFileToLocal(characterEmotionsBlob, 'png');

            await item.setAttribute('characterEmotionUrl', characterEmotionUrl);
            console.log('done!');
          }}
        />
        <div className={styles.wrap}>
          <img className={styles.img} src={characterEmotionUrl} />
        </div>
      </div>
    );
  },

  ({
    item: {
      content,
    },
  }) => {
    if (!content) {
      return null;
    }
    const {
      character360ImageUrl = '',
    } = content;
    return (
      <div className={styles.wrap}>
        <img className={classnames(
          styles.img360,
        )} src={character360ImageUrl} />
      </div>
    );
  },

  ({
    item,
  }) => {
    const {
      id = '',
    } = item;

    return (
      <LoginConsumer>
        {loginValue => {
          const {supabase} = supabaseClient;

          const {
            sessionUserId,
          } = loginValue;

          return (
            <div className={styles.wrap}>
              <CloseButton
                onClick={async (e) => {
                  await characterClient.deleteId(id)
                }}
              />
              <button className={styles.button} onClick={async e => {
                // XXX set the item through the character client, so the update is propagated in the UI

                const {
                  data: account,
                } = await supabase
                  .from('accounts')
                  .select('*')
                  .eq('id', sessionUserId)
                  .maybeSingle();

                account.character = `id:${id}`;

                // update
                await supabase
                  .from('accounts')
                  .update(account)
                  .eq('id', sessionUserId);
              }}>Select</button>
              <ExportButton
                onClick={async (e) => {
                  const zipBlob = await characterClient.exportId(id);
                  downloadFile(zipBlob, 'character.zip');
                }}
              />
            </div>
          );
        }}
      </LoginConsumer>
    );
  },
];
const CharactersContent = ({
  characterClient,
}) => {
  const [characters, setCharacters] = useState([]);

  const [name, setName] = useState('');
  const [clothes, setClothes] = useState('');
  const [expression, setExpression] = useState('');
  const [gender, setGender] = useState('female');

  const [file, setFile] = useState('');

  const [generating, setGenerating] = useState(false);
  const [ideating, setIdeating] = useState(false);

  //

  useEffect(() => {
    const itemsupdate = e => {
      const {
        items,
      } = e.data;
      setCharacters(items);
    };
    characterClient.addEventListener('itemsupdate', itemsupdate);

    setCharacters(characterClient.items);

    return () => {
      characterClient.removeEventListener('itemsupdate', itemsupdate);
    };
  }, []);

  //

  const generate = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setGenerating(true);

    try {
      if (file) {
        console.log('generate character from file', {file});

        const blob = file;

        if (!['image/png', 'image/jpeg'].includes(blob.type)) {
          throw new Error('unsupported image type: ' + blob.type);
        }

        const boardTags = await interrogateDeepBooru(blob);
        console.log('got board tags', {boardTags});

        // const foregroundBlob = await removeBackground(blob);
        const size = 512;
        const paddingFactor = 0.1;
        const squareBlob = await squareize(blob, size, paddingFactor);
        const squareImage = await blob2img(squareBlob);
        squareImage.style.cssText = `\
          position: absolute;
          top: 0;
          left: 0;
          width: 512px;
          height: 512px;
          z-index: 1;
        `;
        document.body.appendChild(squareImage);

        const slices = await generate360Views(squareBlob, {
          debug: true,
        });
        const canvas = drawSlices(slices);

        // export frame canvas
        const item360Blob = await new Promise((accept, reject) => {
          canvas.toBlob(accept, 'image/png');
        });
        const item360ImageUrl = await blob2DataUrl(item360Blob);

        const itemImageUrl = await blob2DataUrl(squareBlob);

        const id = crypto.randomUUID();
        const description = boardTags;
        const itemItem = {
          id,
          name,
          content: {
            description,
            itemImageUrl,
            item360ImageUrl,
            scale: 1, // XXX compute the real scale via LLM
          },
        };
        await characterClient.addItem(itemItem);
      } else {
        const prompt = [
          gender === 'male' ? '1boy' : '1girl',
          clothes,
          expression,
          'white background',
        ].filter(s => !!s).join(', ');
        console.log('generate from prompt', {prompt});

        const {
          characterImageBlob,
          character360ImageBlob,
          characterEmotionBlob,
        } = await generateCharacterFromPrompt({
          prompt,
          gender,
        });

        const characterImageUrl = await blob2DataUrl(characterImageBlob);
        const character360ImageUrl = await blob2DataUrl(character360ImageBlob);
        const characterEmotionUrl = await blob2DataUrl(characterEmotionBlob);

        const id = crypto.randomUUID();
        const description = prompt;
        const itemItem = {
          id,
          name,
          content: {
            name,
            description,
            characterImageUrl,
            character360ImageUrl,
            characterEmotionUrl,
          },
        };
        await characterClient.addItem(itemItem);
      }
    } catch(err) {
      console.warn(err);
    } finally {
      setGenerating(false);
    }
  };

  //
  
  return (
    <div className={styles.characters}>
      <form className={styles.form}>
        <div className={styles.radios}>
          <label className={styles.label}>
            <span className={styles.text}>female</span>
            <input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={e => {
              setGender(e.target.value);
            }} />
          </label>
          <label className={styles.label}>
            <span className={styles.text}>male</span>
            <input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={e => {
              setGender(e.target.value);
            }} />
          </label>
        </div>
        <input type="text" className={styles.textInput} placeholder="name" value={name} disabled={generating} onChange={e => {
          setName(e.target.value);
        }} />
        <input type="text" className={styles.textInput} placeholder="clothes" value={clothes} disabled={generating} onChange={e => {
          setClothes(e.target.value);
        }} />
        <input type="text" className={styles.textInput} placeholder="expression" value={expression} disabled={generating} onChange={e => {
          setExpression(e.target.value);
        }} />

        <input type="file" className={styles.fileInput} placeholder="file" disabled={generating} onChange={e => {
          const file = e.target.files[0] || '';
          setFile(file);
        }} />
        
        <div className={styles.buttons}>
          <button className={styles.submitButton} onClick={async e => {
            e.preventDefault();
            e.stopPropagation();

            setIdeating(true);

            setIdeating(false);
          }} disabled={ideating || generating}>Idea</button>
          <button className={styles.button} onClick={generate} disabled={ideating || generating || !name}>Generate</button>
          <button className={styles.button} onClick={e => {
            e.preventDefault();
            e.stopPropagation();

            setName('');
            // setPrompt('');
          }}>Clear</button>
        </div>
      </form>

      <ClientElements
        client={characterClient}
        items={characters}

        itemsClassName={styles.characterItems}
        itemClassName={styles.characterItem}

        panelElements={CharactersContentItems}
      />
    </div>
  );
}

//

const VrmPreviewCanvas = ({
  vrmUrl,
}) => {
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef();

  const size = 256;
  const dpr = window.devicePixelRatio;
  const effectiveSize = size * dpr;

  useEffect(() => {
    const canvas = canvasRef.current;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
    });
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xEEEEEE);
    scene.autoUpdate = false;

    const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    camera.position.set(0, 0, 1);
    camera.updateMatrixWorld();

    const controls = new OrbitControls(camera, renderer.domElement);

    //

    let live = true;

    (async () => {
      const srcUrl = vrmUrl;
      const res = await fetch(srcUrl);

      const {
        gltfLoader,
      } = loaders;
      const arrayBuffer = await res.arrayBuffer();
      const gltf = await new Promise((accept, reject) => {
        gltfLoader.parse(arrayBuffer, srcUrl, accept, reject);
      });
      if (!live) return;

      const headBone = gltf.userData.vrm.humanoid.humanBones.head.node;
      const position = new THREE.Vector3().setFromMatrixPosition(headBone.matrixWorld);
      const quaternion = new THREE.Quaternion().setFromRotationMatrix(headBone.matrixWorld);

      controls.object.position.copy(position)
        .add(
          new THREE.Vector3(0, 0, -0.4)
            .applyQuaternion(quaternion)
        );
      // controls.object.updateMatrixWorld();
      controls.target.copy(position);

      addDefaultLights(scene);
      scene.add(gltf.scene);
      gltf.scene.updateMatrixWorld();

      renderer.setAnimationLoop(() => {
        controls.update();
        camera.updateMatrixWorld();

        renderer.render(scene, camera);
      });

      setLoaded(true);
    })();

    //

    return () => {
      live = false;

      renderer.setAnimationLoop(null);
      renderer.forceContextLoss();
      renderer.dispose();
    };
  }, [canvasRef]);

  return (
    <canvas
      className={styles.skyboxPreviewCanvas}
      width={effectiveSize}
      height={effectiveSize}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        visibility: loaded ? null : 'hidden',
      }}
      ref={canvasRef}
    />
  );
};

//

const VrmsContentItems = [
  ({
    item,
  }) => {
    const {content} = item;
    const {
      vrmUrl = '',
    } = content;
    return (<VrmPreviewCanvas
      vrmUrl={vrmUrl}
    />);
  },

  ({
    item: {
      content: {
        name = '',
        description = '',
      },
    },
  }) => <div className={styles.wrap}>
    <div className={styles.name}>{name}</div>
    <div className={styles.description}>{description}</div>
  </div>,

  ({
    item,
    client: vrmClient,
  }) => {
    const {
      id = '',
    } = item;

    return (
      <LoginConsumer>
        {loginValue => {
          const {supabase} = supabaseClient;

          const {
            sessionUserId,
          } = loginValue;

          return (
            <div className={styles.wrap}>
              <CloseButton
                onClick={async (e) => {
                  await vrmClient.deleteId(id)
                }}
              />
              <button className={styles.button} onClick={async e => {
                // XXX set the item through the character client, so the update is propagated in the UI

                const {
                  data: account,
                } = await supabase
                  .from('accounts')
                  .select('*')
                  .eq('id', sessionUserId)
                  .maybeSingle();

                account.character = `id:${id}`;

                // update
                await supabase
                  .from('accounts')
                  .update(account)
                  .eq('id', sessionUserId);
              }}>Select</button>
              <ExportButton
                onClick={async (e) => {
                  const zipBlob = await vrmClient.exportId(id);
                  downloadFile(zipBlob, 'vrm.zip');
                }}
              />
            </div>
          );
        }}
      </LoginConsumer>
    );
  },
];
const VrmsContent = ({
  vrmClient,
}) => {
  const [vrms, setVrms] = useState([]);

  const [name, setName] = useState('');
  const [file, setFile] = useState('');
  const [uploading, setUploading] = useState(false);

  //

  useEffect(() => {
    const itemsupdate = e => {
      const {
        items,
      } = e.data;
      setVrms(items);
    };
    vrmClient.addEventListener('itemsupdate', itemsupdate);

    setVrms(vrmClient.items);

    return () => {
      vrmClient.removeEventListener('itemsupdate', itemsupdate);
    };
  }, []);

  //

  const loginValue = useContext(LoginContext);

  //

  const upload = async e => {
    e.preventDefault();
    e.stopPropagation();

    setUploading(true);

    try {
      const {
        sessionUserId: userId,
      } = loginValue;
      const id = crypto.randomUUID();
      const contentBlob = file;
      const vrmUrl = await supabaseFsWorker.writeFile([
        userId,
        id,
        contentBlob.name,
      ], contentBlob);

      const itemItem = {
        id,
        name,
        content: {
          name,
          vrmUrl,
        },
      };
      await vrmClient.addItem(itemItem);
    } catch(err) {
      console.warn(err);
    } finally {
      setUploading(false);
    }
  };

  //

  return (
    <div className={styles.vrms}>
      <form className={styles.form}>
        <input type="text" className={styles.textInput} placeholder="name" disabled={uploading} value={name} onChange={e => {
          setName(e.target.value);
        }} />

        <input type="file" className={styles.fileInput} placeholder="file" disabled={uploading} onChange={e => {
          const file = e.target.files[0] || '';
          setFile(file);
        }} />

        <button className={styles.button} onClick={upload} disabled={uploading || !name || !file || !/\.vrm$/.test(file.name)}>Upload</button>
      </form>

      <ClientElements
        client={vrmClient}
        items={vrms}

        itemsClassName={styles.vrmItems}
        itemClassName={styles.vrmItem}

        panelElements={VrmsContentItems}
      />
    </div>
  );
};

//

const CardsContentItems = [
  // image
  ({
    item,
  }) => {
    const {content} = item;
    const {
      cardImageUrl = '',
    } = content;
    return (
      <div className={styles.wrap}>
        <img className={styles.img} src={cardImageUrl} />
      </div>
    );
  },

  // json
  ({
    item,
  }) => {
    const [json, setJson] = useState('');
    const [scenario, setScenario] = useState('');
    const [firstMessage, setFirstMessage] = useState('');
    const [messageExample, setMessageExample] = useState('');

    //

    const {content} = item;
    const {
      name,
      description,
      cardImageUrl = '',
    } = content;

    // parse character card
    useEffect(() => {
      (async () => {
        const res = await fetch(cardImageUrl);
        const blob = await res.blob();
        blob.name = cardImageUrl;

        const characterCardParser = new CharacterCardParser();
        try {
          const j = await characterCardParser.parse(blob);
          setJson(j);

          const {
            data: {
              scenario,
              first_mes,
              mes_example,
            },
          } = j;
          setScenario(scenario);
          setFirstMessage(first_mes);
          setMessageExample(mes_example);
        } catch(err) {
          const j = {
            error: err.message,
          };
          setJson(j);
        }
      })();
    }, [cardImageUrl]);

    //

    return (<>
      <div className={styles.wrap}>
        <textarea
          className={styles.textarea}
          value={JSON.stringify(json, null, 2)}
          readOnly
        />
      </div>
      <div className={styles.wrap}>
        <div className={styles.name}>{name}</div>
        <div className={styles.description}>{description}</div>
      </div>
      <div className={styles.wrap}>
        <div className={styles.text}><b>Scenario</b>: {scenario}</div>
        <div className={styles.text}><b>First message</b>: {firstMessage}</div>
        <div className={styles.text}><b>Message example</b>: {messageExample}</div>
      </div>
    </>);
  },

  ({
    item,
    client: cardClient,
  }) => {
    const {
      id = '',
    } = item;

    return (
      <LoginConsumer>
        {loginValue => {
          const {supabase} = supabaseClient;

          const {
            sessionUserId,
          } = loginValue;

          return (
            <div className={styles.wrap}>
              <CloseButton
                onClick={async (e) => {
                  await cardClient.deleteId(id)
                }}
              />
              <button className={styles.button} onClick={async e => {
                // XXX set the item through the login client, so the update is propagated in the UI

                const {
                  data: account,
                } = await supabase
                  .from('accounts')
                  .select('*')
                  .eq('id', sessionUserId)
                  .maybeSingle();

                account.character = `id:${id}`;

                // update
                await supabase
                  .from('accounts')
                  .update(account)
                  .eq('id', sessionUserId);
              }}>Select</button>
              <ExportButton
                onClick={async (e) => {
                  const zipBlob = await cardClient.exportId(id);
                  downloadFile(zipBlob, 'card.zip');
                }}
              />
            </div>
          );
        }}
      </LoginConsumer>
    );
  },
];
const CardsContent = ({
  cardClient,
}) => {
  const [cards, setCards] = useState([]);

  const [file, setFile] = useState('');
  const [uploading, setUploading] = useState(false);

  //

  useEffect(() => {
    const itemsupdate = e => {
      const {
        items,
      } = e.data;
      setCards(items);
    };
    cardClient.addEventListener('itemsupdate', itemsupdate);

    setCards(cardClient.items);

    return () => {
      cardClient.removeEventListener('itemsupdate', itemsupdate);
    };
  }, []);

  //

  const loginValue = useContext(LoginContext);

  //

  const upload = async e => {
    e.preventDefault();
    e.stopPropagation();

    setUploading(true);

    try {
      // load character card
      const characterCardParser = new CharacterCardParser();
      const j = await characterCardParser.parse(file);
      const {
        data: {
          name,
          description,
          // scenario,
          // first_mes,
          // mes_example,
        },
      } = j;

      // upload character card
      const {
        sessionUserId: userId,
      } = loginValue;
      const id = crypto.randomUUID();
      const contentBlob = file;
      const cardImageUrl = await supabaseFsWorker.writeFile([
        userId,
        id,
        contentBlob.name,
      ], contentBlob);

      // set item
      const itemItem = {
        id,
        name,
        content: {
          name,
          description,
          cardImageUrl,
        },
      };
      await cardClient.addItem(itemItem);
    } catch(err) {
      console.warn(err);
    } finally {
      setUploading(false);
    }
  };

  //

  return (
    <div className={styles.cards}>
      <form className={styles.form}>
        <input type="file" className={styles.fileInput} placeholder="file" disabled={uploading} onChange={e => {
          const file = e.target.files[0] || '';
          setFile(file);
        }} />

        <button className={styles.button} onClick={upload} disabled={uploading || !file || !/\.png$/.test(file.name)}>Upload</button>
      </form>

      <ClientElements
        client={cardClient}
        items={cards}

        itemsClassName={styles.cardItems}
        itemClassName={styles.cardItem}

        panelElements={CardsContentItems}
      />
    </div>
  );
};

//

const LorebookContentItems = [
  // image
  ({
    item,
  }) => {
    const {content} = item;
    const {
      lorebookImageUrl = '',
    } = content;
    return (
      <div className={styles.wrap}>
        <img className={styles.img} src={lorebookImageUrl} />
      </div>
    );
  },

  // json
  ({
    item,
  }) => {
    const [json, setJson] = useState('');

    //

    const {content} = item;
    const {
      lorebookImageUrl = '',
    } = content;

    // parse character card
    useEffect(() => {
      (async () => {
        const res = await fetch(lorebookImageUrl);
        const blob = await res.blob();
        blob.name = lorebookImageUrl;

        const lorebookParser = new LorebookParser();
        try {
          const j = await lorebookParser.parse(blob);
          setJson(j);
        } catch(err) {
          const j = {
            error: err.message,
          };
          setJson(j);
        }
      })();
    }, [lorebookImageUrl]);

    //

    return (
      <div className={styles.wrap}>
        <textarea
          className={styles.textarea}
          value={JSON.stringify(json, null, 2)}
          readOnly
        />
      </div>
    );
  },

  ({
    item: {
      content: {
        name = '',
        description = '',
      },
    },
  }) => <div className={styles.wrap}>
    <div className={styles.name}>{name}</div>
    <div className={styles.description}>{description}</div>
  </div>,

  ({
    item,
    client: cardClient,
  }) => {
    const {
      id = '',
    } = item;

    return (
      <LoginConsumer>
        {loginValue => {
          const {supabase} = supabaseClient;

          const {
            sessionUserId,
          } = loginValue;

          return (
            <div className={styles.wrap}>
              <CloseButton
                onClick={async (e) => {
                  await cardClient.deleteId(id)
                }}
              />
              <button className={styles.button} onClick={async e => {
                // XXX set the item through the character client, so the update is propagated in the UI

                const {
                  data: account,
                } = await supabase
                  .from('accounts')
                  .select('*')
                  .eq('id', sessionUserId)
                  .maybeSingle();

                account.character = `id:${id}`;

                // update
                await supabase
                  .from('accounts')
                  .update(account)
                  .eq('id', sessionUserId);
              }}>Select</button>
              <ExportButton
                onClick={async (e) => {
                  const zipBlob = await cardClient.exportId(id);
                  downloadFile(zipBlob, 'card.zip');
                }}
              />
            </div>
          );
        }}
      </LoginConsumer>
    );
  },
];
const LorebooksContent = ({
  lorebookClient,
}) => {
  const [lorebooks, setLorebooks] = useState([]);

  const [file, setFile] = useState('');
  const [uploading, setUploading] = useState(false);

  //

  useEffect(() => {
    const itemsupdate = e => {
      const {
        items,
      } = e.data;
      setLorebooks(items);
    };
    lorebookClient.addEventListener('itemsupdate', itemsupdate);

    setLorebooks(lorebookClient.items);

    return () => {
      cardClient.removeEventListener('itemsupdate', itemsupdate);
    };
  }, []);

  //

  const loginValue = useContext(LoginContext);

  //

  const upload = async e => {
    e.preventDefault();
    e.stopPropagation();

    setUploading(true);

    try {
      // parse the lorebook
      const lorebookParser = new LorebookParser();
      const j = await lorebookParser.parse(file);
      const {
        entries,
      } = j;
      const {
        displayName: name,
        text: description,
      } = entries[0];

      // upload the loarebook
      const id = crypto.randomUUID();
      const {
        sessionUserId: userId,
      } = loginValue;
      const contentBlob = file;
      const lorebookImageUrl = await supabaseFsWorker.writeFile([
        userId,
        id,
        contentBlob.name,
      ], contentBlob);

      // add the item
      const itemItem = {
        id,
        name,
        content: {
          name,
          description,
          lorebookImageUrl,
        },
      };
      await lorebookClient.addItem(itemItem);
    } catch(err) {
      console.warn(err);
    } finally {
      setUploading(false);
    }
  };

  //

  return (
    <div className={styles.lorebooks}>
      <form className={styles.form}>
        <input type="file" className={styles.fileInput} placeholder="file" disabled={uploading} onChange={e => {
          const file = e.target.files[0] || '';
          setFile(file);
        }} />

        <button className={styles.button} onClick={upload} disabled={uploading || !file || !/\.png$/.test(file.name)}>Upload</button>
      </form>

      <ClientElements
        client={lorebookClient}
        items={lorebooks}

        itemsClassName={styles.lorebookItems}
        itemClassName={styles.lorebookItem}

        panelElements={LorebookContentItems}
      />
    </div>
  );
}

//

const TransformControls = ({
  engine,
  app,
  setApp,
}) => {
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [positionZ, setPositionZ] = useState(0);
  const [eulerX, setEulerX] = useState(0);
  const [eulerY, setEulerY] = useState(0);
  const [eulerZ, setEulerZ] = useState(0);
  const [eulerOrder, setEulerOrder] = useState('YXZ');
  const [scaleX, setScaleX] = useState(1);  
  const [scaleY, setScaleY] = useState(1);
  const [scaleZ, setScaleZ] = useState(1);

  //

  useEffect(() => {
    if (app) {
      setPositionX(app.position.x);
      setPositionY(app.position.y);
      setPositionZ(app.position.z);

      localEuler.setFromQuaternion(app.quaternion, eulerOrder);
      setEulerX(localEuler.x);
      setEulerY(localEuler.y);
      setEulerZ(localEuler.z);

      setScaleX(app.scale.x);
      setScaleY(app.scale.y);
      setScaleZ(app.scale.z);
    }
  }, [app]);

  //

  const _updateAppPhysics = app => {
    const physicsScene = physicsManager.getScene();
    const {physicsTracker} = engine;

    const physicsObjects = physicsTracker.getAppPhysicsObjects(app);
    for (const physicsObject of physicsObjects) {
      physicsTracker.syncPhysicsObjectTransformToApp(physicsObject);
      physicsScene.setTransform(physicsObject);
    }
  };

  //

  // if (!app) {
  //   return null;
  // }

  return (
    <div className={styles.transformControls}>
      <label className={styles.label}>
        <span className={styles.text}>p.x</span>
        <input type='number' step={0.1} value={positionX} onChange={e => {
          const value = parseFloat(e.target.value);
          app.position.x = value;
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setPositionX(value);
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>p.y</span>
        <input type='number' step={0.1} value={positionY} onChange={e => {
          const value = parseFloat(e.target.value);
          app.position.y = value;
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setPositionY(value);
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>p.z</span>
        <input type='number' step={0.1} value={positionZ} onChange={e => {
          const value = parseFloat(e.target.value);
          app.position.z = value;
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setPositionZ(value);
        }} />
      </label>

      <hr/>

      <label className={styles.label}>
        <span className={styles.text}>r.x</span>
        <input type='number' step={0.1} value={eulerX} onChange={e => {
          const value = parseFloat(e.target.value);
          localEuler.set(value, eulerY, eulerZ, eulerOrder);
          app.quaternion.setFromEuler(localEuler);
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setEulerX(value);
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>r.y</span>
        <input type='number' step={0.1} value={eulerY} onChange={e => {
          const value = parseFloat(e.target.value);
          localEuler.set(eulerX, value, eulerZ, eulerOrder);
          app.quaternion.setFromEuler(localEuler);
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setEulerY(value);
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>r.z</span>
        <input type='number' step={0.1} value={eulerZ} onChange={e => {
          const value = parseFloat(e.target.value);
          localEuler.set(eulerX, eulerY, value, eulerOrder);
          app.quaternion.setFromEuler(localEuler);
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setEulerZ(value);
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>r.order</span>
        <select value={eulerOrder} onChange={e => {
          const value = e.target.value;
          
          localEuler.set(eulerX, eulerY, eulerZ, eulerOrder);

          setEulerOrder(value);

          localEuler.reorder(value);
          setEulerX(localEuler.x);
          setEulerY(localEuler.y);
          setEulerZ(localEuler.z);
        }}>
          <option value='XYZ'>XYZ</option>
          <option value='YZX'>YZX</option>
          <option value='ZXY'>ZXY</option>
          <option value='XZY'>XZY</option>
          <option value='YXZ'>YXZ</option>
          <option value='ZYX'>ZYX</option>
        </select>
      </label>

      <hr/>

      <label className={styles.label}>
        <span className={styles.text}>s.x</span>
        <input type='number' step={0.1} value={scaleX} onChange={e => {
          const value = parseFloat(e.target.value);
          app.scale.x = value;
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setScaleX(value);
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>s.y</span>
        <input type='number' step={0.1} value={scaleY} onChange={e => {
          const value = parseFloat(e.target.value);
          app.scale.y = value;
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setScaleY(value);
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>s.z</span>
        <input type='number' step={0.1} value={scaleZ} onChange={e => {
          const value = parseFloat(e.target.value);
          app.scale.z = value;
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setScaleZ(value);
        }} />
      </label>

      <hr/>

      <button className={styles.button} onClick={e => {
        setApp(null);

        const appManager = engine.getAppManager();
        appManager.removeApp(app);
      }}>Remove</button>
    </div>
  );
};
const SceneEditor = ({
  engine,
  setSidebarMode,
}) => {
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);

  //

  useEffect(() => {
    if (engine) {
      const appManager = engine.getAppManager();
      setApps(appManager.children);

      const appadd = e => {
        setApps(appManager.children);
      }
      appManager.addEventListener('appadd', appadd);
      const appremove = e => {
        setApps(appManager.children);
      };
      appManager.addEventListener('appremove', appremove);
      
      return () => {
        appManager.removeEventListener('appadd', appadd);
      };
    } else {
      setApps([]);
    }
  }, [engine]);

  //

  return (
    <div className={styles.sceneEditor}>
      {(() => {
        if (selectedApp) {
          return (
            <>
              <div className={styles.subheader}>
                <div className={styles.backButton} onClick={e => {
                  setSelectedApp(null);
                }}>
                  <img className={styles.img} src='/images/chevron.svg' />
                </div>
                <span className={styles.text}>Edit object</span>
              </div>
              <div className={styles.selectedApp}>
                <div className={styles.wrap}>
                  <div className={styles.type}>{selectedApp.appType}</div>
                  <div className={styles.name}>{selectedApp.name}</div>
                  <div className={styles.description}>{selectedApp.description}</div>
                </div>
                <TransformControls
                  engine={engine}
                  app={selectedApp}
                  setApp={setSelectedApp}
                />
              </div>
            </>
          );
        } else {
          return (
            <>
              <div className={styles.subheader}>
                <div className={styles.backButton} onClick={e => {
                  setSidebarMode('');
                }}>
                  <img className={styles.img} src='/images/chevron.svg' />
                </div>
                <span className={styles.text}>Edit scene</span>
              </div>
              <div className={styles.objects}>
                {apps.map((app, i) => {
                  return (
                    <div className={styles.objectsObject} onClick={e => {
                      setSelectedApp(app);
                    }} key={i}>
                      <div className={styles.type}>{app.appType}</div>
                      <div className={styles.name}>{app.name}</div>
                      <div className={styles.description}>{app.description}</div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        }
      })()}
    </div>
  );
};

const LoreEditor = ({
  engine,
  setSidebarMode,
}) => {
  const [loreString, setLoreString] = useState('');

  //

  useEffect(() => {
    if (engine) {
      const loreManager = engine.loreManager;
      console.log('got lore manager', loreManager);

      const updateLore = () => {
        const lore = loreManager.getLore();
        const loreJson = lore.toJSON();
        const loreString = JSON.stringify(loreJson, null, 2);
        setLoreString(loreString);
      };
      updateLore();

      const update = e => {
        updateLore();
      };
      loreManager.addEventListener('update', update);

      return () => {
        loreManager.removeEventListener('update', update);
      };
    }
  }, []);

  //

  return (
    <div className={styles.loreEditor}>
      <div className={styles.subheader}>
        <div className={styles.backButton} onClick={e => {
          setSidebarMode('');
        }}>
          <img className={styles.img} src='/images/chevron.svg' />
        </div>
        <span className={styles.text}>Edit lore</span>
      </div>
      <div className={styles.loreWrap}>
        <textarea
          className={styles.textarea}
          placeholder='Lore'
          value={loreString}
          readOnly
        />
      </div>
    </div>
  );
};

//

/* const CameraIcon = () => (
  <img className={topBarStyles.img} src='/images/ui/camera.svg' />
); */

//

const paletteTabNames = [
  'skyboxes',
  'characters',
  'items',
  'musics',
  'misc',
];
const EditorContent = ({
  skyboxClient,
  characterClient,
  itemsClient,
  scenesClient,
  musicClient,

  engineEnabled,
  setEngineEnabled,
  engineLoading,
  setEngineLoading,
  engine,
  setEngine,
  objects,
  setObjects,
  playerSpec,
}) => {
  // ui
  const [sidebarMode, setSidebarMode] = useState('');
  const [paletteTab, setPaletteTab] = useState(paletteTabNames[0]);
  // palette
  const [skyboxItemsLoading, setSkyboxItemsLoading] = useState(false);
  const [skyboxItemsLoaded, setSkyboxItemsLoaded] = useState(false);
  const [skyboxItems, setSkyboxItems] = useState([]);

  const [characterItemsLoading, setCharacterItemsLoading] = useState(false);
  const [characterItemsLoaded, setCharacterItemsLoaded] = useState(false);
  const [characterItems, setCharacterItems] = useState([]);

  const [itemItemsLoading, setItemItemsLoading] = useState(false);
  const [itemItemsLoaded, setItemItemsLoaded] = useState(false);
  const [itemItems, setItemItems] = useState([]);

  const [musicItemsLoading, setMusicItemsLoading] = useState(false);
  const [musicItemsLoaded, setMusicItemsLoaded] = useState(false);
  const [musicItems, setMusicItems] = useState([]);
  // publish
  const [publishName, setPublishName] = useState('');
  const [publishDescription, setPublishDescription] = useState('');
  const [publishMultiplayer, setPublishMultiplayer] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState('');
  const [publishStatusErrorText, setPublishStatusErrorText] = useState('');

  const [miscItems, setMiscItems] = useState([]);

  const canvasRef = useRef();
  const [canvas, setCavas] = useState(null);

  const ioBus = engine?.ioBus;

  //

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      setCavas(canvas);
    }
  }, [canvasRef.current]);

  //

  // misc items
  useEffect(() => {
    if (skyboxItems.length > 0) {
      const newMiscItems = [
        {
          id: 'portal',
          name: 'Portal',
          description: 'A destination',
          type: 'application/portal',
          content: {
            id: 'portal',
            objects: [
              {
                type: 'application/blockadelabsskybox',
                content: skyboxClient.items[0].content,
              },
            ],
          },
          positionOffset: [0, 1, 0],
        },
        {
          id: 'adventure-camera',
          name: 'Adventure camera',
          description: 'A camera for adventure games',
          start_url: '/core-modules/cameras/adventure-camera.js',
        },
        {
          id: 'adventure-cursor',
          name: 'Adventure cursor',
          description: 'A cursor for adventure games',
          start_url: '/core-modules/cursors/adventure-cursor.js',
        },
        {
          id: 'inspect-cursor',
          name: 'Inspect cursor',
          description: 'AI world inspect cursor',
          start_url: '/core-modules/cursors/inspect-cursor.js',
        },
      ];
      setMiscItems(newMiscItems);
    }
   }, [skyboxItems]);

  //

  const cameraModes = [
    'firstperson',
    'thirdperson',
    'adventure',
  ];
  const [cameraMode, setCameraMode] = useState(cameraModes[0]);

  const pushObject = (args, e) => {
    if (objects.length > 0) {
      const {
        positionOffset,
        quaternionOffset,
      } = args;
      const {
        clientX,
        clientY,
      } = e;

      const rect = engine.engineRenderer.renderer.domElement.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;

      localRaycaster.setFromCamera(
        localVector2D.set(x * 2 - 1, -y * 2 + 1),
        engine.engineRenderer.camera,
      );

      const position = localRaycaster.ray.origin;
      const quaternion = localQuaternion.setFromUnitVectors(
        localVector.set(0, 0, -1),
        localRaycaster.ray.direction,
      );

      const physicsScene = physicsManager.getScene();
      const result = physicsScene.raycast(position, quaternion);
      if (result) {
        const {
          point,
        } = result;

        const dropPosition = localVector.fromArray(point);
        if (positionOffset) {
          dropPosition.add(localVector2.fromArray(positionOffset));
        }
        
        localEuler.setFromQuaternion(quaternion, 'YXZ');
        localEuler.x = 0;
        localEuler.z = 0;
        const dropQuaternion = localQuaternion.setFromEuler(localEuler);
        if (quaternionOffset) {
          dropQuaternion.premultiply(localQuaternion2.fromArray(quaternionOffset));
        }

        const object = {
          ...args,
          position: dropPosition.toArray(),
          quaternion: dropQuaternion.toArray(),
        };
        const newObjects = [
          ...objects,
          object,
        ];
        setObjects(newObjects);
        setEngineEnabled(true);
      }
    } else {
      const newObjects = [
        ...objects,
        args,
      ];
      setObjects(newObjects);
      setEngineEnabled(true);
    }
  };

  //

  // load items
  useEffect(() => {
    (async () => {
      if (sidebarMode === 'palette') {
        if (paletteTab === 'skyboxes' && !skyboxItemsLoaded && !skyboxItemsLoading) {
          setSkyboxItemsLoading(true);

          await skyboxClient.waitForLoad();
          setSkyboxItems(skyboxClient.items);

          setSkyboxItemsLoaded(true);
          setSkyboxItemsLoading(false);
        }
        if (paletteTab === 'characters' && !characterItemsLoaded && !characterItemsLoading) {
          setCharacterItemsLoading(true);

          await characterClient.waitForLoad();
          setCharacterItems(characterClient.items);

          setCharacterItemsLoaded(true);
          setCharacterItemsLoading(false);
        }
        if (paletteTab === 'items' && !itemItemsLoaded && !itemItemsLoading) {
          setItemItemsLoading(true);

          await itemsClient.waitForLoad();
          setItemItems(itemsClient.items);

          setItemItemsLoaded(true);
          setItemItemsLoading(false);
        }
        if (paletteTab === 'musics' && !musicItemsLoaded && !musicItemsLoading) {
          setMusicItemsLoading(true);

          await musicClient.waitForLoad();
          setMusicItems(musicClient.items);

          setMusicItemsLoaded(true);
          setMusicItemsLoading(false);
        }
      }
    })();
  }, [
    sidebarMode,
    paletteTab,

    skyboxItemsLoading,
    skyboxItemsLoaded,

    characterItemsLoading,
    characterItemsLoaded,

    itemItemsLoading,
    itemItemsLoaded,

    musicItemsLoading,
    musicItemsLoaded,
  ]);

  // controls manager
  useEffect(() => {
    if (engine) {
      const modechange = e => {
        const {
          mode,
        } = e.data;
        setCameraMode(mode);
      };
      engine.controlsManager.addEventListener('modechange', modechange);

      return () => {
        engine.controlsManager.removeEventListener('modechange', modechange);
      };
    }
  }, [
    engine,
  ]);

  //

  return (
    <div className={styles.editorContent}>
      <div className={styles.render}>
         <canvas className={classnames(
          styles.canvas,
        )} ref={canvasRef} />
        <IoBusEventSource engine={engine} />

        {(() => {
          if (engine) {
            /* return (
              <GameScene
                className={styles.gameScene}
                engine={engine}
                onJsonAdd={async (json, e) => {
                  const {
                    method,
                    args,
                  } = json;
                  if (method === 'addApp') {
                    pushObject(args, e);
                  }
                }}
                onFilesAdd={async (files, e) => {
                  console.log('files add', {files, e});
                  debugger;
                }}
              />
            ); */
            return null;
          }

          if (engineLoading) {
            return (
              <div className={styles.canvasPlaceholder}>
                <div className={styles.canvasPlaceholderWrap}>
                  <img className={styles.img} src='/images/hourglass.svg' />
                  <div className={styles.text}>Loading...</div>  
                </div>
              </div>
            );
          }

          return (
            <div
              className={styles.canvasPlaceholder}
              onDragEnter={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragOver={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={async e => {
                // read the application/json data transfer
                const jsonString = e.dataTransfer.getData('application/json');
                if (jsonString) {
                  const data = JSON.parse(jsonString);
                  if (data.method === 'addApp') {
                    const {args} = data;
                    pushObject(args);
                  }
                }
              }}
            >
              <div className={styles.canvasPlaceholderWrap}>
                <img className={styles.img} src='/images/metaverse-space.svg' />
                <div className={styles.text}>Empty scene</div>  
                <div className={styles.subtext}>Add an object</div>
              </div>
            </div>
          );
        })()}
        {(engineEnabled && canvas) ? (
          <EngineProvider
            canvas={canvas}

            objects={objects}
            playerSpec={playerSpec}

            engine={engine}
            setEngine={setEngine}
            engineLoading={engineLoading}
            setEngineLoading={setEngineLoading}
            multiplayer={null}
            setMultiplayer={nop}
          />
        ) : null}
      </div>
      {(() => {
        switch (sidebarMode) {
          case '': {
            return (
              <div className={topBarStyles.topBar}>
                <div className={topBarStyles.buttons}>
                  <div className={topBarStyles.button} onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();

                    setSidebarMode('palette');
                    setPaletteTab(paletteTabNames[0]);
                  }}>
                    <div className={topBarStyles.background} />
                    <img className={classnames(topBarStyles.img, topBarStyles.small)} src='/ui/assets/icons/plus.svg' />
                    <div className={topBarStyles.text}>Add</div>
                  </div>
                  <div className={topBarStyles.button} onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();

                    setSidebarMode('scene');
                  }}>
                    <div className={topBarStyles.background} />
                    <img className={topBarStyles.img} src='/images/metaverse-link.svg' />
                    <div className={topBarStyles.text}>Edit</div>
                  </div>
                  {/* <Select
                    Icon={CameraIcon}
                    options={cameraModes}
                    selectedOption={cameraMode}
                    setSelectedOption={cameraMode => {
                      engine.controlsManager.setMode(cameraMode);
                    }}
                    disabled={!engine}
                  /> */}
                  <div className={topBarStyles.button} onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();

                    setSidebarMode('chat');
                  }}>
                    <div className={topBarStyles.background} />
                    <img className={topBarStyles.img} src='/images/chat.svg' />
                    <div className={topBarStyles.text}>Chat</div>
                  </div>
                  <div className={topBarStyles.button} onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();

                    setSidebarMode('lore');
                  }}>
                    <div className={topBarStyles.background} />
                    <img className={topBarStyles.img} src='/images/lore.svg' />
                    <div className={topBarStyles.text}>Lore</div>
                  </div>
                  <div className={topBarStyles.button} onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (engine) {
                      const j = engine.save();
                      // console.log('save', j);
                      const s = JSON.stringify(j, null, 2);
                      const blob = new Blob([s], {
                        type: 'application/json',
                      });
                      downloadFile(blob, 'scene.json');
                    } else {
                      console.warn('no scene');
                    }
                  }}>
                    <div className={topBarStyles.background} />
                    <img className={topBarStyles.img} src='/images/save.svg' />
                  </div>
                  <div className={topBarStyles.button}>
                    <div className={topBarStyles.background}>
                      <input type='file' className={topBarStyles.file} value='' onChange={async e => {
                        const file = e.target.files[0];
                        if (file.type === 'application/json') {
                          const j = await new Promise((accept, reject) => {
                            const reader = new FileReader();
                            reader.addEventListener('load', e => {
                              const j = JSON.parse(e.target.result);
                              accept(j);
                            });
                            reader.addEventListener('error', reject);
                            reader.readAsText(file);
                          });

                          setObjects(j.objects);
                          setEngineEnabled(true);
                        }
                      }} />
                    </div>
                    <img className={topBarStyles.img} src='/images/load.svg' />
                  </div>
                  <div className={topBarStyles.button} onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();

                    setSidebarMode('publish');
                  }}>
                    <div className={topBarStyles.background} />
                    <img className={topBarStyles.img} src='/images/metaverse-ground.svg' />
                    <div className={topBarStyles.text}>Publish</div>
                  </div>
                </div>
              </div>
            );
          }
          default: {
            return null;
          }
        }
      })()}
      {sidebarMode !== '' ? <div
        className={styles.sidebar}
        onClick={e => {
          e.stopPropagation();
        }}
      >
        {(() => {
          switch (sidebarMode) {
            case 'palette': {
              return (
                <div className={styles.palette}>
                  <div className={styles.subheader}>
                    <div className={styles.backButton} onClick={e => {
                      setSidebarMode('');
                    }}>
                      <img className={styles.img} src='/images/chevron.svg' />
                    </div>
                    <span className={styles.text}>Add object</span>
                  </div>
                  <div className={styles.paletteTabs}>
                    {paletteTabNames.map((paletteTabName, i) => {
                      return (
                        <div className={classnames(
                          styles.paletteTab,
                          paletteTab === paletteTabName ? styles.selected : null,
                        )} key={i} onClick={e => {
                          setPaletteTab(paletteTabName);
                        }}>
                          {paletteTabName}
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    switch (paletteTab) {
                      case 'skyboxes': {
                        if (skyboxItemsLoading) {
                          return (
                            <div
                              className={styles.paletteItemsPlaceholder}
                            >Loading...</div>
                          );
                        } else {
                          return (
                            <div className={styles.paletteItems}>
                              {skyboxItems.map((item, i) => {
                                const {id} = item;
                                const {
                                  name,
                                  description,
                                  fileUrl,
                                  depthMapUrl,
                                } = item.content;
                                return (
                                  <div className={classnames(
                                    styles.paletteItem,
                                    styles.skyboxItem,
                                    styles.rare,
                                  )} draggable onDragStart={e => {
                                    e.dataTransfer.setData('application/json', JSON.stringify({
                                      method: 'addApp',
                                      args: {
                                        type: 'application/blockadelabsskybox',
                                        content: {
                                          id,
                                          name,
                                          description,
                                          fileUrl,
                                          depthMapUrl,
                                        }
                                      },
                                    }));
                                  }} key={item.id}>
                                    <div className={styles.background} />
                                    <div className={styles.imgWrap}>
                                      <img className={styles.img} src={fileUrl} />
                                    </div>
                                    <div className={styles.name}>{name || description}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                      }
                      case 'characters': {
                        if (characterItemsLoading) {
                          return (
                            <div
                              className={styles.paletteItemsPlaceholder}
                            >Loading...</div>
                          );
                        } else {
                          return (
                            <div className={styles.paletteItems}>
                              {characterItems.map((item, i) => {
                                const {id} = item;
                                const {
                                  name,
                                  description,
                                  characterImageUrl,
                                  character360ImageUrl,
                                  characterEmotionUrl,
                                } = item.content;
                                return (
                                  <div className={classnames(
                                    styles.paletteItem,
                                    styles.characterItem,
                                    styles.rare,
                                  )} draggable onDragStart={e => {
                                    const character360Json = {
                                      id,
                                      name,
                                      description,
                                      characterImageUrl,
                                      character360ImageUrl,
                                      characterEmotionUrl,
                                    };
                                    const character360JsonDataUrl = `data:application/character360,${encodeURIComponent(JSON.stringify(character360Json))}`;
                                    const npcJson = {
                                      "name": name,
                                      "avatarUrl": character360JsonDataUrl,
                                      "voice": "Uni",
                                      "voicePack": "ShiShi voice pack",
                                      "class": "Unicorn Master",
                                      "bio": "1girl, unicorn hoodie, white background"
                                    };
                                    e.dataTransfer.setData('application/json', JSON.stringify({
                                      method: 'addApp',
                                      args: {
                                        type: 'application/npc',
                                        content: npcJson,
                                        quaternionOffset: y180Quaternion.toArray(),
                                      },
                                    }));
                                  }} key={item.id}>
                                    <div className={styles.background} />
                                    <div className={classnames(
                                      styles.imgWrap,
                                      styles.img360Wrap,
                                    )}>
                                      <img className={classnames(
                                        styles.img,
                                        // styles.img360,
                                      )} src={item.content.character360ImageUrl} />
                                    </div>
                                    <div className={styles.name}>{item.content.name || item.content.description || '?'}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                      }
                      case 'items': {
                        if (itemItemsLoading) {
                          return (
                            <div
                              className={styles.paletteItemsPlaceholder}
                            >Loading...</div>
                          );
                        } else {
                          return (
                            <div className={styles.paletteItems}>
                              {itemItems.map((item, i) => {
                                const {id} = item;
                                const {
                                  name,
                                  description,
                                  itemImageUrl,
                                  item360ImageUrl,
                                } = item.content;
                                return (
                                  <div className={classnames(
                                    styles.paletteItem,
                                    styles.itemItem,
                                    styles.rare,
                                  )} draggable onDragStart={e => {
                                    e.dataTransfer.setData('application/json', JSON.stringify({
                                      method: 'addApp',
                                      args: {
                                        type: 'application/item360',
                                        content: {
                                          id,
                                          name,
                                          description,
                                          itemImageUrl,
                                          item360ImageUrl,
                                        },
                                        quaternionOffset: y180Quaternion.toArray(),
                                      },
                                    }));
                                  }} key={item.id}>
                                    <div className={styles.background} />
                                    <div className={classnames(
                                      styles.imgWrap,
                                      styles.img360Wrap,
                                    )}>
                                      <img className={classnames(
                                        styles.img,
                                        // styles.img360,
                                      )} src={item.content.item360ImageUrl} />
                                    </div>
                                    <div className={styles.name}>{item.content.name || item.content.description || '?'}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                      }
                      case 'musics': {
                        if (musicItemsLoading) {
                          return (
                            <div
                              className={styles.paletteItemsPlaceholder}
                            >Loading...</div>
                          );
                        } else {
                          return (
                            <div className={styles.paletteItems}>
                              {musicItems.map((item, i) => {
                                const {id} = item;
                                const {
                                  name,
                                  description,
                                  audioUrl,
                                } = item.content;
                                return (
                                  <div className={classnames(
                                    styles.paletteItem,
                                    styles.musicItem,
                                    styles.rare,
                                  )} draggable onDragStart={e => {
                                    e.dataTransfer.setData('application/json', JSON.stringify({
                                      method: 'addApp',
                                      args: {
                                        type: 'application/audio',
                                        content: {
                                          id,
                                          name,
                                          description,
                                          audioUrl,
                                        },
                                      },
                                    }));
                                  }} key={item.id}>
                                    <div className={styles.background} />
                                    <audio className={styles.audio} src={item.content.audioUrl} />
                                    <div className={styles.name}>{item.content.name || item.content.description || '?'}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                      }
                      case 'misc': {
                        return (
                          <div className={styles.paletteItems}>
                            {miscItems.map((item, i) => {
                              return (
                                <div className={classnames(
                                  styles.paletteItem,
                                  styles.itemItem,
                                  styles.rare,
                                )} draggable onDragStart={e => {
                                  const args = {
                                    ...item,
                                  };
                                  const positionOffset = [0, 1, 0];
                                  args.positionOffset = positionOffset;
                                  e.dataTransfer.setData('application/json', JSON.stringify({
                                    method: 'addApp',
                                    args,
                                  }));
                                }} key={item.id}>
                                  <div className={styles.background} />
                                  <div className={classnames(
                                    styles.imgWrap,
                                  )}>
                                    <img className={classnames(
                                      styles.img,
                                    )} src={''} />
                                  </div>
                                  <div className={styles.name}>{item.name || item.description || '?'}</div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                      default: {
                        return null;
                      }
                    }
                  })()}
                </div>
              );
            }
            case 'scene': {
              return (
                <SceneEditor
                  engine={engine}
                  setSidebarMode={setSidebarMode}
                />
              );
            }
            case 'chat': {
              return (
                <ChatUi
                  engine={engine}
                  onClose={() => {
                    setSidebarMode('');
                  }}
                />
              );
            }
            case 'lore': {
              return (
                <LoreEditor
                  engine={engine}
                  setSidebarMode={setSidebarMode}
                />
              );
            }
            case 'publish': {
              return (
                <div className={styles.publish}>
                  <div className={styles.subheader}>
                    <div className={styles.backButton} onClick={e => {
                      setSidebarMode('');
                    }}>
                      <img className={styles.img} src='/images/chevron.svg' />
                    </div>
                    <span className={styles.text}>Publish</span>
                  </div>
                  <form className={styles.form}>
                    <label className={styles.label}>
                      <span className={styles.text}>Name</span>
                      <input className={styles.input} type='text' value={publishName} onChange={e => {
                        setPublishName(e.target.value);
                      }} />
                    </label>
                    <div className={styles.text}>Description</div>
                    <textarea className={styles.textarea} value={publishDescription} onChange={e => {
                      setPublishDescription(e.target.value);
                    }} />
                    <label className={styles.label}>
                      <span className={styles.text}>Multiplayer</span>
                      <input className={styles.checkbox} type='checkbox' checked={publishMultiplayer} onChange={e => {
                        setPublishMultiplayer(e.target.checked);
                      }} />
                    </label>
                    <input type='button' value='Publish' disabled={!/[a-zA-Z0-9\-]{3,}$/.test(publishName) || publishing} className={styles.button} onClick={async e => {
                      if (engine) {
                        setPublishing(true);
                        setPublishStatus('');

                        try {
                          await scenesClient.waitForLoad();

                          const content = engine.save();
                          content.name = publishName;
                          content.description = publishDescription;
                          content.multiplayer = {
                            enabled: publishMultiplayer,
                          };

                          let previewUrl = '';
                          content.objects.some(o => {
                            switch (o.type) {
                              case 'application/blockadelabsskybox': {
                                previewUrl = o.content.fileUrl;
                                return true;
                              }
                              case 'application/character360': {
                                previewUrl = o.content.characterImageUrl;
                                return true;
                              }
                              case 'application/item360': {
                                previewUrl = o.content.itemImageUrl;
                                return true;
                              }
                              default: {
                                return false;
                              }
                            }
                          });
                          if (!previewUrl) {
                            throw new Error('no preview url');
                          }
                          content.previewUrl = previewUrl;

                          const id = crypto.randomUUID();
                          const sceneItem = {
                            id,
                            name: publishName,
                            content,
                          };
                          await scenesClient.addItem(sceneItem);

                          setPublishStatus('ok');
                          setPublishStatusErrorText('');
                        } catch(err) {
                          setPublishStatus('error');
                          setPublishStatusErrorText(err.stack);
                        } finally {
                          setPublishing(false);
                        }
                      } else {
                        console.warn('no scene');
                      }
                    }} />
                    {(() => {
                      switch (publishStatus) {
                        case 'ok': {
                          return (
                            <div className={classnames(
                              styles.publishStatus,
                              styles.publishStatusOk,
                            )}>
                              <span className={styles.text}>Publish success!</span>
                              <a className={styles.link} href={`/${publishName}`}>Visit world</a>
                            </div>
                          );
                        }
                        case 'error': {
                          return (
                            <div className={classnames(
                              styles.publishStatus,
                              styles.publishStatusError,
                            )}>
                              <span className={styles.text}>
                                Error publishing:
                                {publishStatusErrorText}
                              </span>
                            </div>
                          );
                        }
                        case '': {
                          return null;
                        }
                      }
                    })()}
                  </form>
                </div>
              );
            }
            default: {
              return null;
            }
          }
        })()}
      </div> : null}
    </div>
  );
}

//

const SkyboxPreviewCanvas = ({
  fileUrl,
  depthMapUrl,
}) => {
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef();

  const size = 256;
  const dpr = window.devicePixelRatio;
  const effectiveSize = size * dpr;

  useEffect(() => {
    const canvas = canvasRef.current;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      // alpha: true,
    });
    
    const scene = new THREE.Scene();
    scene.autoUpdate = false;

    const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    camera.position.set(0, 10, 10);
    camera.updateMatrixWorld();

    const controls = new OrbitControls(camera, renderer.domElement);

    //

    let live = true;
    const mesh = new Skybox360Mesh();
    (async () => {
      await mesh.load({
        fileUrl,
        depthMapUrl,
      });
      if (!live) return;

      scene.add(mesh);
      mesh.updateMatrixWorld();

      renderer.setAnimationLoop(() => {
        controls.update();
        camera.updateMatrixWorld();
        renderer.render(scene, camera);
      });

      setLoaded(true);
    })();

    //

    return () => {
      live = false;

      renderer.setAnimationLoop(null);
      renderer.forceContextLoss();
      renderer.dispose();
    };
  }, [canvasRef]);

  return (
    <canvas
      className={styles.skyboxPreviewCanvas}
      width={effectiveSize}
      height={effectiveSize}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        visibility: loaded ? null : 'hidden',
      }}
      ref={canvasRef}
    />
  );
};
const objectFitContainImage = async (blob, w, h) => {
  const img = new Image();
  await new Promise((accept, reject) => {
    img.onload = () => {
      accept();
    };
    img.onerror = err => {
      reject(err);
    };
    img.src = URL.createObjectURL(blob);
  });

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.style.cssText = `\
    position: absolute;
    top: 0;
    left: 0;
  `;
  const ctx = canvas.getContext('2d');
  document.body.appendChild(canvas);

  // scale the image to the canvas, same as CSS object-fit: contain
  const scale = Math.min(w / img.width, h / img.height);
  const sw = img.width * scale;
  const sh = img.height * scale;
  const sx = (w - sw) / 2;
  const sy = (h - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh);

  const blob2 = await new Promise((accept, reject) => {
    canvas.toBlob(accept, 'image/png');
  });
  return blob2;
}
const SkyboxesContentItems = [
  ({
    item: {
      content: {
        fileUrl,
        depthMapUrl,
      },
    },
  }) => <SkyboxPreviewCanvas
    fileUrl={fileUrl}
    depthMapUrl={depthMapUrl}
  />,
  
  ({
    item: {
      content: {
        name,
        description,
      },
    },
  }) => <div className={styles.wrap}>
    <div className={styles.name}>{name}</div>
    <div className={styles.description}>{description}</div>
  </div>,
  
  ({
    item: {
      content: {
        fileUrl,
        depthMapUrl,
      },
    },
  }) => <div className={styles.wrap}>
    <img className={styles.img} src={fileUrl} />
    <img className={styles.img} src={depthMapUrl} />
  </div>,

  ({
    item: {
      id,
    },
  }) => <div className={styles.wrap}>
    <nav className={styles.button} onClick={async (e) => {
      await skyboxClient.deleteId(id);
    }}>
      <img src='/assets/icons/close.svg' />
    </nav>
    <button className={styles.button} onClick={async (e) => {
      const zipBlob = await skyboxClient.exportId(id);
      downloadFile(zipBlob, 'skybox.zip');
    }}>Export</button>
  </div>,
];
const SkyboxesContent = ({
  skyboxClient,
}) => {
  const [skyboxes, setSkyboxes] = useState([]);

  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [skyboxStyleName, setSkyboxStyleName] = useState(defaultSkyboxStyleName);

  const [generating, setGenerating] = useState(false);
  const [ideating, setIdeating] = useState(false);

  //

  useEffect(() => {
    const itemsupdate = e => {
      const {
        items,
      } = e.data;
      setSkyboxes(items);
    };
    skyboxClient.addEventListener('itemsupdate', itemsupdate);

    setSkyboxes(skyboxClient.items);

    return () => {
      skyboxClient.removeEventListener('itemsupdate', itemsupdate);
    };
  }, []);

  //

  const generate = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setGenerating(true);

    try {
      const imagePrompt = await levelImagePromptGenerator(`${name}\n${prompt}`);
      console.log('got level image prompt', {imagePrompt});

      const skyboxResult = await generateSkyboxFull(imagePrompt);
      // console.log('got skybox result', skyboxResult);
      const {
        source,
        file_url,
        depth_map_url,
      } = skyboxResult;

      const [
        fileUrl,
        depthMapUrl,
      ] = await Promise.all([
        copyBlockadeLabsFileToLocal(file_url, '_diffuse'),
        copyBlockadeLabsFileToLocal(depth_map_url, '_depth'),
      ]);

      const {
        id,
      } = source;
      const skyboxItem = {
        id,
        description: prompt,
        source,
        fileUrl,
        depthMapUrl,
      };
      await skyboxClient.addItem(skyboxItem);
    } finally {
      setGenerating(false);
    }
  };

  //
  
  return (
    <>
      <form className={styles.form}>
        <input type="text" className={styles.textInput} placeholder="name" value={name} disabled={generating} onChange={e => {
          setName(e.target.value);
        }} />
        <textarea className={styles.textarea} placeholder="prompt" value={prompt} disabled={generating} onChange={e => {
          setPrompt(e.target.value);
        }} />
        <select className={styles.select} value={skyboxStyleName} disabled={generating} onChange={e => {
          setSkyboxStyleName(e.target.value);
        }}>
          {skyboxStyleNames.map(skyboxStyleName => {
            return (
              <option key={skyboxStyleName} value={skyboxStyleName}>{skyboxStyleName}</option>
            );
          })}
        </select>
        
        <div className={styles.buttons}>
          <button className={styles.submitButton} onClick={async e => {
            e.preventDefault();
            e.stopPropagation();

            setIdeating(true);

            let newName;
            if (!name) {
              const name = await nameGenerator(prompt);
              newName = name;
              setName(newName);
            } else {
              newName = name;
            }
            console.log('new name', {newName});

            let newPrompt;
            if (!prompt) {
              const prompt = await levelImagePromptGenerator(newName);
              newPrompt = prompt;
              setPrompt(newPrompt);
            } else {
              newPrompt = prompt;
            }
            console.log('new prompt', {newPrompt});

            setIdeating(false);
          }} disabled={ideating || generating}>Idea</button>
          <button className={styles.button} onClick={generate} disabled={ideating || generating || !name || !prompt}>Generate</button>
          <button className={styles.button} onClick={e => {
            e.preventDefault();
            e.stopPropagation();

            setName('');
            setPrompt('');
          }}>Clear</button>
        </div>
      </form>

      <ClientElements
        client={skyboxClient}
        items={skyboxes}

        itemsClassName={styles.skyboxes}
        itemClassName={styles.skybox}

        panelElements={SkyboxesContentItems}
      />
    </>
  );
};

//

const Frame360PreviewCanvas = ({
  frame360ImageUrl,
  frameAnimationImageUrl,
}) => {
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef();

  const size = 256;
  const dpr = window.devicePixelRatio;
  const effectiveSize = size * dpr;

  useEffect(() => {
    const canvas = canvasRef.current;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
    });
    
    const scene = new THREE.Scene();
    scene.autoUpdate = false;

    const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    camera.position.set(0, 0, 1);
    camera.updateMatrixWorld();

    const controls = new OrbitControls(camera, renderer.domElement);

    //

    let live = true;
    const object = new THREE.Object3D();
    const mesh = new Frame360Mesh();
    object.add(mesh);
    object.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

    (async () => {
      await mesh.load({
        frame360ImageUrl,
        frameAnimationImageUrl,
      });
      if (!live) return;

      scene.add(object);
      object.updateMatrixWorld();

      renderer.setAnimationLoop(() => {
        controls.update();
        camera.updateMatrixWorld();

        renderer.render(scene, camera);
      });

      setLoaded(true);
    })();

    //

    return () => {
      live = false;

      renderer.setAnimationLoop(null);
      renderer.forceContextLoss();
      renderer.dispose();
    };
  }, [canvasRef]);

  return (
    <canvas
      className={styles.skyboxPreviewCanvas}
      width={effectiveSize}
      height={effectiveSize}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        visibility: loaded ? null : 'hidden',
      }}
      ref={canvasRef}
    />
  );
};
const ItemsContentItems = [
  ({
    item: {
      content,
    },
  }) => {
    if (!content) {
      return null;
    }
    const {
      item360ImageUrl,
    } = content;
    return (
      <Frame360PreviewCanvas
        frame360ImageUrl={item360ImageUrl}
      />
    );
  },

  ({
    item: {
      content,
    },
  }) => {
    if (!content) {
      return null;
    }
    const {
      name,
      description,
    } = content;
    return (
      <div className={styles.wrap}>
        <div className={styles.name}>{name}</div>
        <div className={styles.description}>{description}</div>
      </div>
    );
  },

  ({
    item: {
      content,
    },
  }) => {
    if (!content) {
      return null;
    }
    const {
      itemImageUrl,
    } = content;
    return (
      <div className={styles.wrap}>
        <img className={styles.img} src={itemImageUrl} />
      </div>
    );
  },

  ({
    item: {
      content,
    },
  }) => {
    if (!content) {
      return null;
    }
    const {
      item360ImageUrl,
    } = content;
    return (
      <div className={styles.wrap}>
        <img className={classnames(
          styles.img360,
        )} src={item360ImageUrl} />
      </div>
    );
  },

  ({
    item: {
      id,
    },
  }) => <div className={styles.wrap}>
    <nav className={styles.button} onClick={async (e) => {
      await itemsClient.deleteId(id)
    }}>
      <img src='/assets/icons/close.svg' />
    </nav>
    <button className={styles.button} onClick={async (e) => {
      const zipBlob = await itemsClient.exportId(id);
      downloadFile(zipBlob, 'item.zip');
    }}>Export</button>
  </div>,
];
const ItemsContent = ({
  itemsClient,
}) => {
  const [items, setItems] = useState([]);

  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState('');

  const [generating, setGenerating] = useState(false);
  const [ideating, setIdeating] = useState(false);

  //

  useEffect(() => {
    const itemsupdate = e => {
      const {
        items,
      } = e.data;
      setItems(items);
    };
    itemsClient.addEventListener('itemsupdate', itemsupdate);

    setItems(itemsClient.items);

    return () => {
      itemsClient.removeEventListener('itemsupdate', itemsupdate);
    };
  }, []);

  //

  const generate = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setGenerating(true);

    try {
      if (file) {
        console.log('generate item from file', file);

        const blob = file;

        let containBlob = await removeBackground(blob);
        containBlob = await objectFitContainImage(containBlob, 512, 512);

        const [
          itemImageUrl,
          item360ImageUrl,
        ] = await Promise.all([
          blob2DataUrl(containBlob),
          (async () => {
            const slices = await generate360Views(containBlob, {
              debug: true,
            });
            const canvas = drawSlices(slices);

            // export frame canvas
            const blob3 = await new Promise((accept, reject) => {
              canvas.toBlob(accept, 'image/png');
            });
            const item360ImageUrl = await blob2DataUrl(blob3);
            return item360ImageUrl;
          })(),
        ]);

        await itemsClient.waitForLoad();

        const id = crypto.randomUUID();
        const itemItem = {
          id,
          name,
          description: prompt,
          itemImageUrl,
          item360ImageUrl,
        };
        await itemsClient.addItem(itemItem);
      } else {
        const fullPrompt = `${prompt}, anime style rpg item concept, asymmetric, white background`;
        const negativePrompt = `monochrome, symmetric`;

        const size = 512;

        console.log('generate item from prompt', name, fullPrompt);

        const gradientCanvas = makeGradientCanvas(size, size);
        const image = gradientCanvas.toDataURL('image/png');
        gradientCanvas.style.cssText = `\
          position: absolute;
          top: 0;
          left: 0;
          width: 512px;
          height: 512px;
          z-index: 1;
        `;
        document.body.appendChild(gradientCanvas);
        // debugger;

        const maskCanvas = makeMaskCanvas(size, size, 0, 0, size, size, false);
        const mask = maskCanvas.toDataURL('image/png');

        await setSdModel(objectModel);
        const itemImageBlob = await img2img({
          prompt: fullPrompt,
          negativePrompt,
      
          width: size,
          height: size,
          
          image,
          mask,

          // steps: 100,
        });
        const itemImage = await blob2img(itemImageBlob);
        itemImage.style.cssText = `\
          position: absolute;
          top: 0;
          left: 0;
          width: 512px;
          height: 512px;
          z-index: 1;
        `;
        document.body.appendChild(itemImage);

        const foregroundItemImageBlob = await removeBackground(itemImageBlob);
        const foregroundItemOpaqueImageBlob = await opacify(foregroundItemImageBlob);
        const foregroundItemOpaqueImage = await blob2img(foregroundItemOpaqueImageBlob);
        foregroundItemOpaqueImage.style.cssText = `\
          position: absolute;
          top: 0;
          left: 512px;
          width: 512px;
          height: 512px;
          z-index: 1;
        `;
        document.body.appendChild(foregroundItemOpaqueImage);

        const slices = await generate360Views(foregroundItemOpaqueImageBlob, {
          debug: true,
        });
        const canvas = drawSlices(slices);
        const item360ImageBlob = await new Promise((accept, reject) => {
          canvas.toBlob(accept, 'image/png');
        });
        const item360ImageUrl = await blob2DataUrl(item360ImageBlob);

        const itemImageUrl = await blob2DataUrl(foregroundItemImageBlob);

        const id = crypto.randomUUID();
        const itemItem = {
          id,
          name,
          description: prompt,
          itemImageUrl,
          item360ImageUrl,
        };
        await itemsClient.addItem(itemItem);
      }
    } finally {
      setGenerating(false);
    }
  };

  //
  
  return (
    <>
      <form className={styles.form}>
        <input type="file" className={styles.fileInput} placeholder="file" disabled={generating} onChange={e => {
          const file = e.target.files[0] || '';
          setFile(file);
        }} />
        <input type="text" className={styles.textInput} placeholder="name" value={name} disabled={generating} onChange={e => {
          setName(e.target.value);
        }} />
        <textarea className={styles.textarea} placeholder="prompt" value={prompt} disabled={generating} onChange={e => {
          setPrompt(e.target.value);
        }} />
        
        <div className={styles.buttons}>
          <button className={styles.submitButton} onClick={async e => {
            e.preventDefault();
            e.stopPropagation();

            setIdeating(true);

            let newName;
            if (!name) {
              const name = await nameGenerator(prompt);
              newName = name;
              setName(newName);
            } else {
              console.log('set value 2', {name});
              newName = name;
            }
            console.log('new name', {newName});

            let newPrompt;
            if (!prompt) {
              const prompt = await musicPromptGenerator(newName);
              newPrompt = prompt;
              setPrompt(newPrompt);
            } else {
              newPrompt = prompt;
            }
            console.log('new prompt', {newPrompt});

            setIdeating(false);
          }} disabled={ideating || generating}>Idea</button>
          <button className={styles.button} onClick={generate} disabled={ideating || generating || !name || !(prompt || file)}>Generate</button>
          <button className={styles.button} onClick={e => {
            e.preventDefault();
            e.stopPropagation();

            setName('');
            setPrompt('');
          }}>Clear</button>
        </div>
      </form>

      <ClientElements
        client={itemsClient}
        items={items}

        itemsClassName={styles.itemItems}
        itemClassName={styles.itemItem}

        panelElements={ItemsContentItems}
      />
    </>
  );
}
const MusicContentItems = [
  ({
    item: {
      content: {
        name,
        description,
      },
    },
  }) => <div className={styles.wrap}>
    <div className={styles.name}>{name}</div>
    <div className={styles.description}>{description}</div>
  </div>,
  
  ({
    item: {
      content: {
        audioUrl,
      },
    },
  }) => <audio className={styles.audio} src={audioUrl} controls />,
  
  ({
    item: {
      id,
    },
  }) => <div className={styles.wrap}>
    <nav className={styles.button} onClick={async (e) => {
      await musicClient.deleteId(id);
    }}>
      <img src='/assets/icons/close.svg' />
    </nav>
    <button className={styles.button} onClick={async (e) => {
      const zipBlob = await musicClient.exportId(id);
      downloadFile(zipBlob, 'music.zip');
    }}>Export</button>
  </div>,
];
const MusicContent = ({
  musicClient,
}) => {
  const [musics, setMusics] = useState([]);

  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(120);

  const [generating, setGenerating] = useState(false);
  const [ideating, setIdeating] = useState(false);

  //

  useEffect(() => {
    const itemsupdate = e => {
      const {
        items,
      } = e.data;
      setMusics(items);
    };
    musicClient.addEventListener('itemsupdate', itemsupdate);

    setMusics(musicClient.items);

    return () => {
      musicClient.removeEventListener('itemsupdate', itemsupdate);
    };
  }, []);

  //

  const generate = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setGenerating(true);

    try {
      const [
        audioUrl,
      ] = await Promise.all([
        (async () => {
          // let musicPrompt = await musicPromptGenerator(`${name}\n${prompt}`);
          const audioBlob = await generateAudioFull(prompt, {
            duration,
          });

          // console.log('copy file to local 1', {
          //   audioBlob,
          // });
          const audioUrl = await copyFileToLocal(audioBlob, 'mp3');
          // console.log('copy file to local 2', {
          //   audioUrl,
          // });
          return audioUrl;
        })(),
      ]);

      await musicClient.waitForLoad();

      const id = crypto.randomUUID();
      const musicItem = {
        id,
        name,
        description: prompt,
        audioUrl,
      };
      await musicClient.addItem(musicItem);
    } finally {
      setGenerating(false);
    }
  };

  //
  
  return (
    <>
      <form className={styles.form}>
        <input type="text" className={styles.textInput} placeholder="name" value={name} disabled={generating} onChange={e => {
          setName(e.target.value);
        }} />
        <textarea className={styles.textarea} placeholder="prompt" value={prompt} disabled={generating} onChange={e => {
          setPrompt(e.target.value);
        }} />
        <label className={styles.label}>
          <span className={styles.text}>Duration</span>
          <input type="range" className={styles.rangeInput} value={duration} min={5} max={300} disabled={generating} onChange={e => {
            setDuration(e.target.value);
          }} />
          <span className={styles.value}>{duration}</span>
        </label>
        
        <div className={styles.buttons}>
          <button className={styles.submitButton} onClick={async e => {
            e.preventDefault();
            e.stopPropagation();

            setIdeating(true);

            let newName;
            if (!name) {
              const name = await nameGenerator(prompt);
              newName = name;
              setName(newName);
            } else {
              console.log('set value 2', {name});
              newName = name;
            }
            console.log('new name', {newName});

            let newPrompt;
            if (!prompt) {
              const prompt = await musicPromptGenerator(newName);
              newPrompt = prompt;
              setPrompt(newPrompt);
            } else {
              newPrompt = prompt;
            }
            console.log('new prompt', {newPrompt});

            setIdeating(false);
          }} disabled={ideating || generating}>Idea</button>
          <button className={styles.button} onClick={generate} disabled={ideating || generating || !name || !prompt}>Generate</button>
          <button className={styles.button} onClick={e => {
            e.preventDefault();
            e.stopPropagation();

            setName('');
            setPrompt('');
          }}>Clear</button>
        </div>
      </form>

      <ClientElements
        client={scenesClient}
        items={musics}

        itemsClassName={styles.musics}
        itemClassName={styles.music}

        panelElements={MusicContentItems}
      />
    </>
  );
};
const TextContent = () => {
  const [text, setText] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.1);
  const [maxNewTokens, setMaxNewTokens] = useState(250);
  // const [repetitionPenalty, setRepetitionPenalty] = useState(1.18);
  const [repetitionPenalty, setRepetitionPenalty] = useState(1.5);
  const [stop, setStop] = useState('');

  const [abortController, setAbortController] = useState(null);

  //

  return (
    <div className={styles.textContent}>
      <textarea
        className={styles.textareaInput}
        value={text}
        onChange={async e => {
          setText(e.target.value);
        }}
      />
      <label className={styles.label}>
        <span className={styles.text}>Temperature</span>
        <input type='number' className={styles.numberInput} placeholder='temperature' value={temperature} step={0.01} onChange={e => {
          setTemperature(e.target.value);
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>Top P</span>
        <input type='number' className={styles.numberInput} placeholder='top p' value={topP} step={0.01} onChange={e => {
          setTopP(e.target.value);
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>Repetition Penalty</span>
        <input type='number' className={styles.numberInput} placeholder='repetition penalty' value={repetitionPenalty} step={0.01} onChange={e => {
          setRepetitionPenalty(e.target.value);
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>Max New Tokens</span>
        <input type='number' className={styles.numberInput} placeholder='max new tokens' value={maxNewTokens} step={1} onChange={e => {
          setMaxNewTokens(e.target.value);
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>Stop</span>
        <input type='text' className={styles.textInput} placeholder='stop (json)' value={stop} onChange={e => {
          setStop(e.target.value);
        }} />
      </label>
      {!abortController ?
        (<button className={styles.button} onClick={async e => {
          e.preventDefault();
          e.stopPropagation();

          const newAbortController = new AbortController();
          const {signal} = newAbortController;
          setAbortController(newAbortController);

          const options = {};
          if (temperature) {
            const _temperature = parseFloat(temperature);
            if (!isNaN(_temperature)) {
              options.temperature = _temperature;
            }
          }
          if (topP) {
            const _topP = parseFloat(topP);
            if (!isNaN(_topP)) {
              options.top_p = _topP;
            }
          }
          if (maxNewTokens) {
            const _maxNewTokens = parseInt(maxNewTokens, 10);
            if (!isNaN(_maxNewTokens)) {
              options.max_new_tokens = _maxNewTokens;
            }
          }
          if (repetitionPenalty) {
            const _repetitionPenalty = parseFloat(repetitionPenalty);
            if (!isNaN(_repetitionPenalty)) {
              options.repetition_penalty = _repetitionPenalty;
            }
          }
          if (stop) {
            options.stops = [stop];
          }

          const rawAiClient = new RawAiClient();
          const stream = rawAiClient.createStream(text, options);
          signal.addEventListener('abort', async () => {
            await reader.cancel();
            reader.releaseLock();
            await stream.cancel();
          });

          const reader = stream.getReader();
          let newText = text;
          for (;;) {
            const {
              value,
              done,
            } = await reader.read();
            if (signal.aborted) return;

            if (!done) {
              newText += value;
              setText(newText);
            } else {
              break;
            }
          }

          setAbortController(null);
        }}>Generate</button>)
      :
        (<button className={styles.button} onClick={async e => {
          e.preventDefault();
          e.stopPropagation();

          abortController.abort();
          setAbortController(null);
        }}>Stop</button>)
      }
    </div>
  );
};
const defaultVoiceName = 'tiktalknet:Sweetie Belle';
const VoiceContent = () => {
  const [text, setText] = useState('');
  const [voiceName, setVoiceName] = useState(defaultVoiceName);
  const [audioUrl, setAudioUrl] = useState('');

  //

  return (
    <div className={styles.voiceContent}>
      <textarea className={styles.textareaInput} value={text} onChange={e => {
        setText(e.target.value);
      }} />
      <select className={styles.select} value={voiceName} onChange={e => {
        setVoiceName(e.target.value);
      }}>
        {voiceModels.tiktalknet.map((voice) => {
          const {
            name,
          } = voice;
          const value = `tiktalknet:${name}`;
          return (
            <option value={value} key={value}>{value}</option>
          );
        })}
        {voiceModels.elevenlabs.map((voice) => {
          const {
            name,
          } = voice;
          const value = `elevenlabs:${name}`;
          return (
            <option value={value} key={value}>{value}</option>
          );
        })}
      </select>
      <button className={styles.button} onClick={async e => {
        e.preventDefault();
        e.stopPropagation();

        const match = voiceName.match(/^(.+?):(.+?)$/);
        if (!match) {
          console.warn('could not parse voice name', voiceName);
          debugger;
        }
        const [, _voiceModelName, _voiceName] = match;

        const voiceId = voiceModels[_voiceModelName].find(v => v.name === _voiceName).voiceId;
        if (!voiceId) {
          console.warn('no voice id for voice name', voiceName);
          debugger;
        }
        const res = await getVoiceRequest[_voiceModelName]({
          text,
          voiceId,
        });
        const blob = await res.blob();
        const dataUrl = await new Promise((accept, reject) => {
          const reader = new FileReader();
          reader.addEventListener('load', () => {
            accept(reader.result);
          });
          reader.addEventListener('error', reject);
          reader.readAsDataURL(blob);
        });

        setAudioUrl(dataUrl);

        // console.log('generate audio', {
        //   textarea,
        // });
      }}>Generate</button>
      {audioUrl ? (
        <audio
          className={styles.audio}
          src={audioUrl}
          controls
        />
      ) : null}
    </div>
  );
};

const AccountUi = () => {
  const loginValue = useContext(LoginContext);
  const loginProfileValue = useContext(LoginProfileContext);

  //

  const [sessionUserId, setSessionUserId] = useState('');
  
  //

  const [name, setName] = useState('');
  const [character, setCharacter] = useState(allCharacters[0]);

  //

  const [lastName, setLastName] = useState(name);
  const [lastCharacter, setLastCharacter] = useState(character);

  const [changed, setChanged] = useState(false);

  //

  const {supabase} = supabaseClient;

  //

  useEffect(() => {
    if (loginValue) {
      setSessionUserId(loginValue.sessionUserId);
    }
  }, [
    loginValue,
  ]);

  useEffect(() => {
    if (loginProfileValue) {
      const {
        name,
        character,
      } = loginProfileValue;

      setName(name);
      setLastName(name);

      setCharacter(character);
      setLastCharacter(character);

      setChanged(false);
    }
  }, [
    loginProfileValue,
  ]);

  useEffect(() => {
    if (
      name !== lastName ||
      character !== lastCharacter
    ) {
      setChanged(true);
    }
  }, [
    name,
    character,
  ]);

  //

  console.log('got char', character);
  const localCharacters = [...allCharacters];
  if (!localCharacters.includes(character)) {
    localCharacters.push(character);
  }

  //

  return (
    <form className={styles.form} onSubmit={async e => {
      e.preventDefault();
      e.stopPropagation();

      if (changed) {
        const o = {};
        if (name !== lastName) {
          o.name = name;
        }
        if (character !== lastCharacter) {
          o.character = character;
        }
        await supabase
          .from('accounts')
          .update(o)
          .eq('id', sessionUserId);
        
        setChanged(false);
        setLastName(name);
        setLastCharacter(character);

        LoginProfileProvider.refresh();
      }
    }}>
      <h1>Update</h1>
      <input type='text' className={styles.textInput} placeholder='name' value={name} onChange={e => {
        setName(e.target.value);
      }} />

      <label className={styles.label}>
        <div className={styles.text}>Character</div>
        <select className={styles.select} value={character} onChange={e => {
          setCharacter(e.target.value);
        }}>
          {localCharacters.map(character => {
            let value;
            if (/^id:/.test(character)) {
              value = character;
            } else {
              value = charactersBaseUrl + character;
            }

            return (
              <option key={character} value={value}>{character}</option>
            );
          })}
        </select>
      </label>

      <input type='submit' className={styles.button} value='Save' disabled={!changed} />
    </form>
  );
}

const ProfileContent = () => {
  const [sessionUserId, setSessionUserId] = useState('');

  //

  const loginValue = useContext(LoginContext);
  // const loginStats = useContext(LoginStatsContext);

  //

  useEffect(() => {
    if (loginValue) {
      setSessionUserId(loginValue.sessionUserId);
    }
  }, [
    loginValue,
  ]);

  //

  return (
    <div className={styles.profileContent}>
      <ProfileUi
        loginValue={loginValue}
        
        // loginStats={loginStats}
        // setLoginStats={value => {
        //   LoginStatsProvider.setValue(value);
        // }}
        // refreshLoginStats={() => {
        //   LoginStatsProvider.refresh();
        // }}
      />

      <AccountUi />
    </div>
  );
};

//

const Blocker = () => {
  return (
    <div className={styles.blocker}>
      <img className={styles.bg} src='/images/backgrounds/background7.png' />
      <div className={styles.wrap}>
        <div className={styles.background} />
        <h1>You're on the waitlist!!</h1>
        <p>
          <a href={discordInviteUrl} target='_blank' rel="noreferrer">Chill in Discord</a>
        </p>
      </div>
    </div>
  );
};

// main component

export const HomeApp = () => {
  const [selectedTab, setSelectedTab] = useState('menu');
  const [localStorageManager, setLocalStorageManager] = useState(() => new LocalStorageManager());

  //

  if (!localStorage.getItem('unlock')) {
    return (
      <div className={styles.homeApp}>
        <Blocker />
      </div>
    );
  }

  return (
    <LoginProvider
      localStorageManager={localStorageManager}
    >
      {/* <LoginProfileProvider> */}
        {/* <LoginStatsProvider> */}
          <LoginConsumer>
            {loginValue => {
              const {
                loaded,
                user,
              } = loginValue;
              if (loaded) {
                if (!user) {
                  return (
                    <Redirect
                      url='/'
                    />
                  );
                } else {
                  return null;
                }
              } else {
                return null;
              }
            }}
          </LoginConsumer>
          <div className={styles.homeApp}>
            <HomeTopBar
              characterClient={characterClient}
              skyboxClient={skyboxClient}
              itemsClient={itemsClient}
              musicClient={musicClient}

              selectedTab={selectedTab}
              setSelectedTab={setSelectedTab}
            />

            <HomeHeader
              // characterClient={characterClient}
              // skyboxClient={skyboxClient}
              // itemsClient={itemsClient}
              // musicClient={musicClient}

              selectedTab={selectedTab}
              setSelectedTab={setSelectedTab}
            />
            <HomeContent
              characterClient={characterClient}
              vrmClient={vrmClient}
              // worldsClient={worldsClient}
              skyboxClient={skyboxClient}
              itemsClient={itemsClient}
              scenesClient={scenesClient}
              musicClient={musicClient}

              selectedTab={selectedTab}
              setSelectedTab={setSelectedTab}
            />
          </div>
        {/* </LoginStatsProvider> */}
      {/* </LoginProfileProvider> */}
    </LoginProvider>
  );
};