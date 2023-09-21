import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';
import {
  generateAudioFull,
  generateDanceFull,
} from '../packages/engine/dance-generation.js';
import {
  aiProxyHost,
  remoteFileServerUrl,
} from '../packages/engine/endpoints.js';
import {
  FileDatabaseClient,
} from '../packages/engine/clients/file-database-client.js';
import {
  RemoteFsWorker,
} from '../packages/engine/remote-fs-worker.js';
import {
  WorldsClient,
} from '../packages/engine/clients/worlds-client.js';

import {
  worldsDatabaseDataDirectoryName,
} from '../packages/engine/constants/client-constants.js';
import {
  // generateSkybox,
  // loadSkyboxImageSpecs,
  generateSkyboxFull,
} from '../packages/engine/clients/blockade-labs-client.js';
// import {
//   FBXLoader,
// } from '../packages/three/examples/jsm/loaders/FBXLoader.js';
import {
  generateImage,
  img2img,
} from '../packages/engine/generate-image.js';
import {
  nameGenerator,
  descriptionGenerator,
  musicPromptGenerator,
  levelImagePromptGenerator,
  itemGenerator,
  itemImagePromptGenerator,
  avatarGenerator,
} from '../packages/engine/generators/llm-generators.js';
// import {
//   WebaverseEngine,
// } from '../packages/engine/webaverse.js';
// import {
//   EngineContext,
// } from '../packages/engine/engine-context.js';
// import {
//   EngineRuntime,
// } from './engine-runtime.js';
import {
  makeId,
} from '../packages/engine/util.js';

//

import styles from '../styles/Levels.module.css';

//

const defaultAvatarUrl = '/public/avatars/Stevia_cl_a_1.03.vrm';

//

/* const worldIdentityToObject = (worldIdentity) => {
  const {
    images,
    source,
  } = worldIdentity.spec;
  const {id} = source;
  const {
    fileUrl,
    depthMapUrl,
  } = images;
  return {
    type: 'application/blockadelabsskybox',
    content: {
      id,
      fileUrl,
      depthMapUrl,
    },
  };
};
const worldIdentityToItems = (worldIdentity) => {
  const {
    source,
    items,
  } = worldIdentity.spec;
  const {
    id,
  } = source;
  return {
    id,
    items,
  };
}; */

//

const getFileName = u => u.match(/[^\/]+$/)[0];
const writeMirrorFile = async (fileName, blob) => {
  const u = `${remoteFileServerUrl}mirror/${fileName}`;
  const res2 = await fetch(u, {
    method: 'PUT',
    body: blob,
  });
  await res2.text();
  return u;
};
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
const copyFileToLocal = async (blob, ext) => {
  const fileName = `${makeId(8)}.${ext}`;
  return await writeMirrorFile(fileName, blob);
};

//

const fsWorker = new RemoteFsWorker({
  endpointUrl: remoteFileServerUrl,
});
const worldsDatabaseClient = new FileDatabaseClient({
  dataDirectoryName: worldsDatabaseDataDirectoryName,
  fsWorker,
});
const worldsClient = new WorldsClient({
  fileDatabaseClient: worldsDatabaseClient,
});

//

export const LevelsApp = () => {
  const [mode, setMode] = useState('list');

  const [tab, setTab] = useState('prompt');
  const [ideating, setIdeating] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState('');
  const [url, setUrl] = useState('');

  const [worlds, setWorlds] = useState([]);
  // const [currentWorldIds, setCurrentWorldIds] = useState([]);

  const [multiplayerEnabled, setMultiplayerEnabled] = useState(false);

  // worlds
  useEffect(() => {
    const worldidentitiesupdate = e => {
      const {
        worldIdentities,
      } = e.data;
      setWorlds(worldIdentities);
    };
    worldsClient.addEventListener('worldidentitiesupdate', worldidentitiesupdate);

    worldsClient.waitForLoad();

    return () => {
      worldsClient.removeEventListener('worldidentitiesupdate', worldidentitiesupdate);
    };
  }, []);

  //

  const generate = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setGenerating(true);

    try {
      switch (tab) {
        case 'prompt': {
          let danceFbxPromise = Promise.resolve(null);
          const [
            audioUrl,
            {
              source,
              fileUrl,
              depthMapUrl,
            },
            items,
            avatars,
          ] = await Promise.all([
            (async () => {
              let musicPrompt = await musicPromptGenerator(`${name}\n${prompt}`);
              const musicPromptPrefix = 'strong beat, ';
              musicPrompt = musicPromptPrefix + musicPrompt;
              const audioBlob = await generateAudioFull(musicPrompt);

              danceFbxPromise = generateDanceFull(audioBlob);

              const audioUrl = await copyFileToLocal(audioBlob, 'mp3');
              return audioUrl;
            })(),
            (async () => {
              const imagePrompt = await levelImagePromptGenerator(`${name}\n${prompt}`);
              console.log('got level image prompt', {imagePrompt});

              const {
                source,
                file_url,
                depth_map_url,
              } = generateSkyboxFull(imagePrompt);

              const [
                fileUrl,
                depthMapUrl,
              ] = await Promise.all([
                copyBlockadeLabsFileToLocal(file_url, '_diffuse'),
                copyBlockadeLabsFileToLocal(depth_map_url, '_depth'),
              ]);

              return {
                source,
                fileUrl,
                depthMapUrl,
              };
            })(),
            (async () => {
              const items = await itemGenerator(`${name}\n${prompt}`);

              for (let j = 0; j < items.length; j++) {
                const item = items[j];
                const {
                  name,
                  description,
                } = item;
                const prompt = await itemImagePromptGenerator(`${name}\n${description}`);
                item.prompt = prompt;

                const negativePrompt = `character, person, people, boy, girl, man, woman`;

                const blob = await generateImage({prompt, negativePrompt});
                const ext = 'png';
                const fileName = `${makeId(8)}.${ext}`;
                const u = await writeMirrorFile(fileName, blob);
                item.url = u;
              }
              return items;
            })(),
            (async () => {
              const avatars = await avatarGenerator(`${name}\n${prompt}`);
              for (let i = 0; i < avatars.length; i++) {
                avatars[i].url = defaultAvatarUrl;
              }
              return avatars;
            })(),
          ]);

          // console.log('waiting for dance to finish', danceFbxPromise);
          const danceFbxBlob = await danceFbxPromise;
          // console.log('dance finished', danceFbxBlob);
          const animationUrl = await copyFileToLocal(danceFbxBlob, 'fbx');

          await worldsClient.waitForLoad();

          await worldsClient.addWorld({
            source,

            name,
            description: prompt,
            images: {
              fileUrl,
              depthMapUrl,
            },
            audios: [
              audioUrl,
            ],
            dances: [
              animationUrl,
            ],
            avatars,
            items,

            // type: 'application/scn',
            // content: {
            //   objects: [
            //     {
            //       type: 'application/blockadelabsskybox',
            //       content: {
            //         fileUrl,
            //         depthMapUrl,
            //       },
            //     },
            //     {
            //       type: 'application/dance',
            //       content: {
            //         audioUrl,
            //         avatarUrl,
            //         animationUrl,
            //       },
            //     },
            //   ],
            // },
          });

          // console.log('got results 1', {
          //   audioUrl,
          // });

          // console.log('got results 2', {
          //   audioBlob,
          //   danceFbx,
          // });

          break;
        }
        case 'vrm': {
          break;
        }
        case 'glb': {
          break;
        }
        case 'music': {
          break;
        }
        case 'image': {
          break;
        }
        case 'youtube': {
          break;
        }
      }
    } finally {
      setGenerating(false);
    }
  };

  //

  return (
    <div className={styles.levelsApp}>
      <div className={styles.modes}>
        <nav className={classnames(
          styles.mode,
          mode === 'list' ? styles.selected : null,
        )} onClick={() => {
          setMode('list');
        }}>List</nav>
        <nav className={classnames(
          styles.mode,
          mode === 'generate' ? styles.selected : null,
        )} onClick={() => {
          setMode('generate');
        }}>Generate</nav>
        <nav className={classnames(
          styles.mode,
          mode === 'options' ? styles.selected : null,
        )} onClick={() => {
          setMode('options');
        }}>Options</nav>
      </div>
      {mode === 'list' ? <>
        <div className={styles.header}>
          <label className={styles.label}>
            <input type="checkbox" className={styles.checkbox} checked={multiplayerEnabled} onChange={e => {
              setMultiplayerEnabled(e.target.checked);
            }} />
            <span className={styles.text}>Multiplayer</span>
          </label>
        </div>
        <div className={styles.levels}>
          {worlds.map((worldIdentity, i) => {
            const {
              spec,
            } = worldIdentity;
            // console.log('got spec', spec);
            const {
              name,
              description,
              images,
              audios,
              dances,
              avatars,
            } = spec;
            const {
              fileUrl,
              depthMapUrl,
            } = images;
            // console.log('got images', images);
            const audioUrl = audios[0];
            // console.log('got audio', audioUrl);
            const animationUrl = dances[0];
            // console.log('got fbx', animationUrl);
            const avatar = avatars[0];
            const avatarUrl = avatar.url;
            // console.log('got avatar url', avatarUrl, avatars);

            return (<div
              className={styles.level}
              key={i}
            >
              <div className={styles.wrap}>
                <div className={styles.name}>{name}</div>
                <div className={styles.description}>{description}</div>
                <button className={styles.button} onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();

                  const u = `/${multiplayerEnabled ? 'm': 'w'}/` + worldIdentity.spec.source.id;
                  location.href = u;
                }}>Enter</button>
              </div>
              <img className={styles.img} src={fileUrl} />
              <img className={styles.img} src={depthMapUrl} />
              <audio className={styles.audio} src={audioUrl} controls />
              <a className={styles.link} href={animationUrl} target="_blank" rel="noreferrer">dance.fbx</a>
              <a className={styles.link} href={avatarUrl} target="_blank" rel="noreferrer">avatar.vrm</a>
              <nav className={styles.button} onClick={async (e) => {
                await worldsClient.deleteWorldId(worldIdentity.spec.source.id)
              }}>
                <img src='/assets/icons/close.svg' />
              </nav>
            </div>);
          })}
        </div>
      </>: null}
      {mode === 'generate' ? <div className={styles.generate}>
        {!generating ? <>
          <div className={styles.tabs}>
            <nav className={classnames(
              styles.tab,
              tab === 'prompt' ? styles.selected : null,
            )} onClick={() => {
              setTab('prompt');
            }}>Prompt</nav>
            <nav className={classnames(
              styles.tab,
              tab === 'vrm' ? styles.selected : null,
            )} onClick={() => {
              setTab('vrm');
            }}>VRM</nav>
            <nav className={classnames(
              styles.tab,
              tab === 'glb' ? styles.selected : null,
            )} onClick={() => {
              setTab('glb');
            }}>GLB</nav>
            <nav className={classnames(
              styles.tab,
              tab === 'music' ? styles.selected : null,
            )} onClick={() => {
              setTab('music');
            }}>Music</nav>
            <nav className={classnames(
              styles.tab,
              tab === 'image' ? styles.selected : null,
            )} onClick={() => {
              setTab('image');
            }}>Image</nav>
            <nav className={classnames(
              styles.tab,
              tab === 'youtube' ? styles.selected : null,
            )} onClick={() => {
              setTab('youtube');
            }}>YouTube</nav>
          </div>
          <div className={classnames(
            styles.generator,
          )}>
            {tab === 'prompt' ? <form className={styles.form}>
              <input type="text" className={styles.nameInput} placeholder="name" value={name} onChange={e => {
                setName(e.target.value);
              }} />
              <input type="text" className={styles.promptInput} placeholder="prompt" value={prompt} onChange={e => {
                setPrompt(e.target.value);
              }} />
              <button className={styles.submitButton} onClick={async e => {
                e.preventDefault();
                e.stopPropagation();

                setIdeating(true);

                let newName;
                if (!name) {
                  // const stream = await nameGenerator(prompt);
                  // await setStream(stream, value => {
                  //   console.log('set value 1', {value});
                  //   newName = value;
                  //   setName(newName);
                  // });
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
                  // const stream = await descriptionGenerator(newName);
                  // await setStream(stream, value => {
                  //   newPrompt = value;
                  //   setPrompt(newPrompt);
                  // });
                  const prompt = await descriptionGenerator(newName);
                  newPrompt = prompt;
                  setPrompt(newPrompt);
                } else {
                  newPrompt = prompt;
                }
                console.log('new prompt', {newPrompt});

                setIdeating(false);
              }} disabled={ideating || generating}>Idea</button>
              <button className={styles.button} onClick={generate} disabled={ideating || generating || !prompt}>Generate</button>
              <button className={styles.button} onClick={e => {
                e.preventDefault();
                e.stopPropagation();

                setName('');
                setPrompt('');
              }}>Clear</button>
            </form> : null}
            {tab === 'vrm' ? <form>
              <input type="text" className={styles.nameInput} placeholder="name" value={name} onChange={e => {
                setName(e.target.value);
              }} />
              <input type="file" className={styles.fileInput} value={file} onChange={e => {
                setFile(e.target.value);
              }} />
              <button className={styles.submitButton} onClick={generate}>Generate</button>
            </form> : null}
            {tab === 'glb' ? <form>
              <input type="text" className={styles.nameInput} placeholder="name" value={name} onChange={e => {
                setName(e.target.value);
              }} />
              <input type="file" className={styles.fileInput} value={file} onChange={e => {
                setFile(e.target.value);
              }} />
              <button className={styles.submitButton} onClick={generate}>Generate</button>
            </form> : null}
            {tab === 'music' ? <form>
              <input type="text" className={styles.nameInput} placeholder="name" value={name} onChange={e => {
                setName(e.target.value);
              }} />
              <input type="file" className={styles.fileInput} value={file} onChange={e => {
                setFile(e.target.value);
              }} />
              <button className={styles.submitButton} onClick={generate}>Generate</button>
            </form> : null}
            {tab === 'image' ? <form>
              <input type="text" className={styles.nameInput} placeholder="name" value={name} onChange={e => {
                setName(e.target.value);
              }} />
              <input type="file" className={styles.fileInput} value={file} onChange={e => {
                setFile(e.target.value);
              }} />
              <button className={styles.submitButton} onClick={generate}>Generate</button>
            </form> : null}
            {tab === 'youtube' ? <form>
              <input type="text" className={styles.urlInput} placeholder="https://youtube.url" value={url} onChange={e => {
                setUrl(e.target.value);
              }} />
              <button className={styles.submitButton} onClick={generate}>Generate</button>
            </form> : null}
          </div>
        </> : null}
        {generating ? <div className={styles.placeholder}>Generating...</div> : null}
      </div> : null}
      {mode === 'options' ? <div className={styles.options}>
        <button onClick={async e => {
          e.preventDefault();
          e.stopPropagation();

          await worldsClient.clearWorlds();
        }}>Clear worlds</button>
      </div> : null}
    </div>
  );
};