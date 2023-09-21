import React, {
  useState,
  useEffect,
} from 'react';
// import * as THREE from 'three';
import classnames from 'classnames';

import voiceModels from '../../../public/voice/voice_models.json';

import {
  QueueManager,
} from '../../../packages/engine/managers/queue/queue-manager.js';
import {
  createClient,
} from '../../../packages/engine/clients/alchemy-client.js';

import {
  SupabaseFsWorker,
} from '../../../packages/engine/supabase-fs-worker.js';

import {
  importFileType,
} from '../../../pages/components/drag-and-drop/drop.js';
import {
  dragStartType,
} from '../../../pages/components/drag-and-drop/dragstart.js';

import {
  characterCardGenerator,
} from '../../../packages/engine/generators/llm/character-card-generator.js';

import {
  resolveIpfsUrl,
} from '../../../packages/engine/util.js';

import styles from '../../../styles/InventoryUi.module.css';

//

// const localVector = new THREE.Vector3();
// const localVector2D = new THREE.Vector2();
// const localQuaternion = new THREE.Quaternion();
// const localMatrix = new THREE.Matrix4();
// const localRaycaster = new THREE.Raycaster();

// const zeroVector = new THREE.Vector3();
// const upVector = new THREE.Vector3(0, 1, 0);

//

const VrmButtons = ({
  item,
  // contentPath,
  setContentPath,
  wearItem,

  debug,
}) => {
  return (
    <>
      {debug && <nav className={styles.btn} onClick={async e => {
        e.preventDefault();
        e.stopPropagation();

        const newContentPath = [
          {
            type: 'npc',
          },
          {
            type: 'createNpc',
            item: {
              name: item.name,
              avatar: item,
            },
          },
        ];
        setContentPath(newContentPath);
      }}>
        <span>Create NPC</span>
        <img className={styles.chevron} src='/images/chevron.png' draggable={false} />
      </nav>}

      <nav className={styles.btn} onClick={async e => {
        e.preventDefault();
        e.stopPropagation();

        wearItem(item);
      }}>
        <span>Wear</span>
        <img className={styles.chevron} src='/images/chevron.png' draggable={false} />
      </nav>
    </>
  );
};

//

const getProxyUrl = u => `https://cors-proxy.upstreet.ai/${u}`;

const loadNftItems = async ({
  signal,
  supabaseClient,
  address,
}) => {
  const alchemy = createClient();

  const ownedNfts = await (async () => {
    const ownedNfts = [];
    let pageKey;
    let first = true;
    for (;;) {
      const o = await alchemy.nft.getNftsForOwner(
        address,
        {
          pageKey,
        },
      );
      let {
        ownedNfts: _ownedNfts,
        pageKey: _pageKey,
      } = o;
      if (_ownedNfts.length > 0 || first) {
        _ownedNfts = _ownedNfts.filter(nft => {
          return whitelistedContractAddresses.includes(nft?.contract?.address) &&
            !nft?.spamInfo?.isSpam;
        });

        ownedNfts.push.apply(ownedNfts, _ownedNfts);
        pageKey = _pageKey;
        first = false;

        if (!pageKey) {
          break;
        }
      } else {
        break;
      }
    }
    return ownedNfts;
  })();
  if (signal.aborted) return;

  const nfts = [];
  const maxNfts = 20;
  for (let i = 0; i < ownedNfts.length && i < maxNfts; i++) {
    const ownedNft = ownedNfts[i];
    // console.log('got nft', ownedNft);
    const {
      contract,
      tokenId,
      title,
      description,
      media,
      tokenUri,
    } = ownedNft;
    const {
      address: contractAddress,
      name: contractName,
      openSea: contractOpenSea,
    } = contract;
    const name = title;
    const collection = contractName || contractOpenSea?.collectionName;

    if (tokenUri) {
      const {
        gateway,
      } = tokenUri;

      const json = await (async () => {
        try {
          const gateway2 = getProxyUrl(gateway);
          const res = await fetch(gateway2);
          if (signal.aborted) return;

          if (res.ok) {
            const j = await res.json();
            if (signal.aborted) return;
            // console.log('got json', j);

            return j;
          } else {
            console.warn('got bad response status code: ' + res.status);
            return null;
          }
        } catch(err) {
          console.warn(err);
          return null;
        }
      })();
      if (signal.aborted) return;

      if (json !== null) {
        let {image} = json;
        if (image) {
          image = resolveIpfsUrl(image);

          nfts.push({
            id: gateway,
            name,
            collection,
            preview_url: image,
          });
        } else {
          console.warn('no image for nft; skipping', json);
        }
      }
    } else {
      console.warn('no tokenUri for nft; skipping', ownedNft);
    }
  }
  // console.log('got all nfts', nfts);
  return nfts;
};
const loadItemsType = type => async ({
  signal,
  supabaseClient,
  sessionUserId,
}) => {
  const result = await supabaseClient.supabase
    .from('assets')
    .select('*')
    .eq('user_id', sessionUserId)
    .eq('type', type);
  const {data} = result;
  return data;
};
const loadWorlds = async ({
  signal,
  supabaseClient,
  sessionUserId,
}) => {
  const result = await supabaseClient.supabase
    .from('worlds')
    .select('*')
    .eq('user_id', sessionUserId);
  const {data} = result;
  return data;
};

//

const VrmAssetContent = ({
  supabaseClient,
  sessionUserId,

  contentPath,
  setContentPath,

  wearItem,

  epoch,
  setEpoch,

  Buttons,
  removable,
  onClick,

  debug,
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadQueue, setLoadQueue] = useState(() => new QueueManager());

  //

  if (!Buttons) {
    Buttons = () => null;
  }

  //

  const refreshItems = () => {
    setEpoch(epoch + 1);
  };

  //

  useEffect(() => {
    const abortController = new AbortController();
    const {signal} = abortController;

    loadQueue.waitForTurn(async () => {
      setLoading(true);

      try {
        const newItems = await loadItemsType('vrm')({
          signal,
          supabaseClient,
          sessionUserId,
        });
        if (signal.aborted) return;

        setItems(newItems);
      } catch(err) {
        throw err;
      } finally {
        setLoading(false);
      }
    });

    return () => {
      abortController.abort();
    };
  }, [
    epoch,
  ]);

  //

  return (
    <>
      {loading && <div className={styles.placeholder}>
        Loading...
      </div>}
      {!loading && <div className={styles.item} onClick={e => {
        e.preventDefault();
        e.stopPropagation();

        // choose from input[type=file]
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.vrm';
        input.addEventListener('change', async e => {
          const f = e.target.files[0];

          await importFileType('vrm')(f, supabaseClient, sessionUserId);
          refreshItems();
        });
        input.click();
      }}>
        <img src='/assets/icons/plus.svg' className={classnames(
          styles.previewImg,
          styles.placeholderImg,
        )} draggable={false} />
        <div className={styles.name}>Add VRM</div>
      </div>}

      {!loading && items.map(item => {
        return (
          <div className={styles.item} onClick={e => {
            e.preventDefault();
            e.stopPropagation();

            onClick && onClick(item);
          }} onDoubleClick={e => {
            e.preventDefault();
            e.stopPropagation();

            wearItem && wearItem(item);
          }} key={item.id}>
            <img src={item.preview_url} className={styles.previewImg} draggable={false} />
            <div className={styles.name}>{item.name}</div>
            
            <Buttons
              item={item}
              contentPath={contentPath}
              setContentPath={setContentPath}
              wearItem={wearItem}

              debug={debug}
            />
            
            {removable && <nav className={styles.iconBtn} onClick={async e => {
              e.preventDefault();
              e.stopPropagation();

              // remove item
              const result = await supabaseClient.supabase
                .from('assets')
                .delete()
                .eq('id', item.id);
              
              refreshItems();
            }}>
              <img className={styles.img} src='/assets/x.svg' draggable={false} />
            </nav>}
          </div>
        );
      })}

      {!loading && items.length === 0 && <div className={styles.placeholder}>
        No assets
      </div>}
    </>
  );
};
const GlbAssetContent = ({
  supabaseClient,
  sessionUserId,

  // wearItem,

  epoch,
  setEpoch,

  removable,
  onClick,
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadQueue, setLoadQueue] = useState(() => new QueueManager());

  //

  const refreshItems = () => {
    setEpoch(epoch + 1);
  };

  //

  useEffect(() => {
    const abortController = new AbortController();
    const {signal} = abortController;

    loadQueue.waitForTurn(async () => {
      setLoading(true);

      try {
        const newItems = await loadItemsType('glb')({
          signal,
          supabaseClient,
          sessionUserId,
        });
        if (signal.aborted) return;

        setItems(newItems);
      } catch(err) {
        throw err;
      } finally {
        setLoading(false);
      }
    });

    return () => {
      abortController.abort();
    };
  }, [
    epoch,
  ]);

  //

  return (
    <>
      {loading && <div className={styles.placeholder}>
        Loading...
      </div>}
      {!loading && <div className={styles.item} onClick={e => {
        e.preventDefault();
        e.stopPropagation();

        // choose from input[type=file]
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.glb';
        input.addEventListener('change', async e => {
          const f = e.target.files[0];

          await importFileType('glb')(f, supabaseClient, sessionUserId);
          refreshItems();
        });
        input.click();
      }}>
        <img src='/assets/icons/plus.svg' className={classnames(
          styles.previewImg,
          styles.placeholderImg,
        )} draggable={false} />
        <div className={styles.name}>Add GLB</div>
      </div>}

      {!loading && items.map(item => {
        return (
          <div className={styles.item} onDragStart={e => {
            dragStartType('npc')(e, item);
          }} onClick={e => {
            e.preventDefault();
            e.stopPropagation();

            onClick && onClick(item);
          }} onDoubleClick={e => {
            e.preventDefault();
            e.stopPropagation();

            console.log('wear item', item);
            // wearItem && wearItem(item);
          }} draggable key={item.id}>
            <img src={item.preview_url} className={styles.previewImg} draggable={false} />
            <div className={styles.name}>{item.name}</div>
            
            {removable && <nav className={styles.iconBtn} onClick={async e => {
              e.preventDefault();
              e.stopPropagation();

              // remove item
              const result = await supabaseClient.supabase
                .from('assets')
                .delete()
                .eq('id', item.id);
              
              refreshItems();
            }}>
              <img className={styles.img} src='/assets/x.svg' draggable={false} />
            </nav>}
          </div>
        );
      })}

      {!loading && items.length === 0 && <div className={styles.placeholder}>
        No assets
      </div>}
    </>
  );
};
const WorldAssetContent = ({
  // localStorageManager,
  supabaseClient,
  sessionUserId,

  contentPath,
  setContentPath,

  epoch,
  setEpoch,

  // contentPathElement,
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadQueue, setLoadQueue] = useState(() => new QueueManager());

  //

  const refreshItems = () => {
    setEpoch(epoch + 1);
  };

  //

  useEffect(() => {
    const abortController = new AbortController();
    const {signal} = abortController;

    loadQueue.waitForTurn(async () => {
      setLoading(true);

      try {
        const newItems = await loadWorlds({
          signal,
          supabaseClient,
          sessionUserId,
        });
        if (signal.aborted) return;

        setItems(newItems);
      } catch(err) {
        throw err;
      } finally {
        setLoading(false);
      }
    });

    return () => {
      abortController.abort();
    };
  }, [
    epoch,
  ]);

  //

  return (
    <>
      {loading && <div className={styles.placeholder}>
        Loading...
      </div>}
      {!loading && <div className={styles.item} onClick={e => {
        e.preventDefault();
        e.stopPropagation();

        const newContentPath = [
          ...contentPath,
          {
            type: 'createWorld',
          },
        ];
        setContentPath(newContentPath);
      }}>
        <img src='/assets/icons/plus.svg' className={classnames(
          styles.previewImg,
          styles.placeholderImg,
        )} draggable={false} />
        <div className={styles.name}>Create World</div>
      </div>}

      {!loading && items.map(item => {
        return (
          <div className={styles.item} onClick={e => {
            e.preventDefault();
            e.stopPropagation();

            location.href = `/world/${item.name}`;
          }} key={item.id}>
            <img src='/public/images/metaverse-core.svg' className={styles.previewIcon} />
            <div className={styles.name}>{item.name}</div>
            
            <nav className={styles.iconBtn} onClick={async e => {
              e.preventDefault();
              e.stopPropagation();

              // remove item
              const result = await supabaseClient.supabase
                .from('worlds')
                .delete()
                .eq('id', item.id);
              
              refreshItems();
            }}>
              <img className={styles.img} src='/assets/x.svg' draggable={false} />
            </nav>
          </div>
        );
      })}

      {!loading && items.length === 0 && <div className={styles.placeholder}>
        No assets
      </div>}
    </>
  );
};
const NpcAssetContent = ({
  supabaseClient,
  sessionUserId,
  contentPath,
  setContentPath,
  wearItem,
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadQueue, setLoadQueue] = useState(() => new QueueManager());
  const [epoch, setEpoch] = useState(0);

  //

  useEffect(() => {
    const abortController = new AbortController();
    const {signal} = abortController;

    loadQueue.waitForTurn(async () => {
      setLoading(true);

      try {
        const newItems = await loadItemsType('npc')({
          signal,
          supabaseClient,
          sessionUserId,
        });
        if (signal.aborted) return;

        setItems(newItems);
      } catch(err) {
        throw err;
      } finally {
        setLoading(false);
      }
    });

    return () => {
      abortController.abort();
    };
  }, [
    epoch,
  ]);

  //

  return (
    <>
      {loading && <div className={styles.placeholder}>
        Loading...
      </div>}
      {!loading && <div className={styles.item} onClick={e => {
        e.preventDefault();
        e.stopPropagation();

        // setCreating(true);
        const newContentPath = [
          ...contentPath,
          {
            type: 'createNpc',
          },
        ];
        setContentPath(newContentPath);
      }}>
        <img src='/assets/icons/plus.svg' className={classnames(
          styles.previewImg,
          styles.placeholderImg,
        )} draggable={false} />
        <div className={styles.name}>Create NPC</div>
      </div>}

      {!loading && items.map(item => {
        return (
          <div className={styles.item} onDragStart={e => {
            dragStartType('glb')(e, item);
          }} onDoubleClick={e => {
            e.preventDefault();
            e.stopPropagation();

            wearItem();
          }} draggable key={item.id}>
            <img src={item.preview_url} className={styles.previewImg} draggable={false} />
            <div className={styles.name}>{item.name}</div>
          </div>
        );
      })}

      {!loading && items.length === 0 && <div className={styles.placeholder}>
        No assets
      </div>}
    </>
  );
};
const CreateNpcContent = ({
  localStorageManager,
  supabaseClient,
  sessionUserId,

  wearItem,

  contentPath,
  setContentPath,
  contentPathElement,

  setEpoch,
}) => {
  const {
    item = null,
  } = contentPathElement;

  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [personality, setPersonality] = useState(item?.personality || '');
  const [scenario, setScenario] = useState(item?.scenario || '');
  const [firstMessage, setFirstMessage] = useState(item?.firstMessage || '');
  const [messageExample, setMessageExample] = useState(item?.messageExample || '');
  const [avatar, setAvatar] = useState(item?.avatar || null);
  const firstVoiceCategory = Object.keys(voiceModels)[0];
  const [voice, setVoice] = useState(item?.voice || `${firstVoiceCategory}:${voiceModels[firstVoiceCategory][0].name}`);

  //

  // bind change setters
  useEffect(() => {
    const _name = item?.name || '';
    if (_name !== name) {
      setName(_name);
    }
    const _description = item?.description || '';
    if (_description !== description) {
      setDescription(_description);
    }
    const _personality = item?.personality || '';
    if (_personality !== personality) {
      setPersonality(_personality);
    }
    const _scenario = item?.scenario || '';
    if (_scenario !== scenario) {
      setScenario(_scenario);
    }
    const _firstMessage = item?.firstMessage || '';
    if (_firstMessage !== firstMessage) {
      setFirstMessage(_firstMessage);
    }
    const _messageExample = item?.messageExample || '';
    if (_messageExample !== messageExample) {
      setMessageExample(_messageExample);
    }
    const _avatar = item?.avatar || null;
    if (_avatar !== avatar) {
      setAvatar(_avatar);
    }
    const _voice = item?.voice || `${firstVoiceCategory}:${voiceModels[firstVoiceCategory][0].name}`;
    if (_voice !== voice) {
      setVoice(_voice);
    }
  }, [
    item,
  ]);

  // bind change setters
  const setItemKeyValueChange = (key, value) => {
    const contentElementIndex = contentPath.indexOf(contentPathElement);
    const oldContentElement = contentPathElement;
    const newContentElement = {
      ...oldContentElement,
      item: {
        ...item,
        [key]: value,
      },
    };
    const newContentPath = [
      ...contentPath.slice(0, contentElementIndex),
      newContentElement,
      ...contentPath.slice(contentElementIndex + 1),
    ];
    setContentPath(newContentPath);
  };
  const setItemObjectChange = (item) => {
    const contentElementIndex = contentPath.indexOf(contentPathElement);
    const oldContentElement = contentPathElement;
    const newContentElement = {
      ...oldContentElement,
      item,
    };
    const newContentPath = [
      ...contentPath.slice(0, contentElementIndex),
      newContentElement,
      ...contentPath.slice(contentElementIndex + 1),
    ];
    setContentPath(newContentPath);
  };
  /* const itemProperties = [
    ['name', name],
    ['description', description],
    ['personality', personality],
    ['scenario', scenario],
    ['firstMessage', firstMessage],
    ['messageExample', messageExample],
    ['avatar', avatar],
    ['voice', voice],
  ];
  for (const [key, value] of itemProperties) {
    useEffect(() => {
      const contentElementIndex = contentPath.indexOf(contentPathElement);
      const oldContentElement = contentPathElement;
      const newContentElement = {
        ...oldContentElement,
        item: {
          ...item,
          [key]: value,
        },
      };
      const newContentPath = [
        ...contentPath.slice(0, contentElementIndex),
        newContentElement,
        ...contentPath.slice(contentElementIndex + 1),
      ];
      setContentPath(newContentPath);
    }, [
      value,
    ].concat(
      itemProperties.filter(([k, v]) => k !== key).map(([k, v]) => v)
    ));
  } */

  //

  return (
    <div className={styles.createUi}>
      <div className={classnames(
        styles.row,
        styles.middle,
      )}>
        <nav className={styles.backButton} onClick={e => {
          const newContentPath = contentPath.slice(0, -1);
          setContentPath(newContentPath);
        }}>
          <img className={styles.img} src='/images/chevron.png' draggable={false} />
        </nav>

        <button className={styles.button} onClick={async e => {
          const avatarName = avatar?.name || '';

          const oldCharacter = {
            avatarName,
            name,
            description,
            personality,
            scenario,
            firstMessage,
            messageExample,
          };
          const newCharacter = await characterCardGenerator(oldCharacter);
          setItemObjectChange(newCharacter);
          
          // console.log('got character generator', newCharacter);
          // for (const k in oldCharacter) {
          //   if (!oldCharacter[k]) {
          //     const v = newCharacter[k];
          //     /* switch (k) {
          //       case 'name': {
          //         setName(v);
          //         break;
          //       }
          //       case 'description': {
          //         setDescription(v);
          //         break;
          //       }
          //       case 'personality': {
          //         setPersonality(v);
          //         break;
          //       }
          //       case 'scenario': {
          //         setScenario(v);
          //         break;
          //       }
          //       case 'firstMessage': {
          //         setFirstMessage(v);
          //         break;
          //       }
          //       case 'messageExample': {
          //         setMessageExample(v);
          //         break;
          //       }
          //       default: {
          //         throw new Error('invalid character key: ' + k);
          //       }
          //     } */
          //   }
          // }
        }}>
          <div className={styles.background} />
          <span className={styles.text}>Idea</span>
        </button>
      </div>

      <label className={styles.label}>
        <div className={styles.text}>Name</div>
        <input type='text' className={styles.input} value={name} onChange={e => {
          // setName(e.target.value);
          setItemKeyValueChange('name', e.target.value);
        }} placeholder='Enter a name' />
      </label>

      <label className={styles.label}>
        {!avatar ? <>
          <div className={styles.text}>Avatar</div>
          <div className={styles.item} onClick={e => {
            e.preventDefault();
            e.stopPropagation();
  
            // setChoosingAvatar(true);
            const newContentPath = [
              ...contentPath,
              {
                type: 'chooseAvatar',
              },
            ];
            setContentPath(newContentPath);
          }}>
            <img src='/assets/icons/plus.svg' className={classnames(
              styles.chooseImg,
              styles.placeholderImg,
            )} />
            <div className={styles.name}>Choose avatar</div>
          </div>
        </> : <>
          <div className={styles.text}>Avatar</div>
          <div className={styles.name} onClick={e => {
            // setChoosingAvatar(true);
            // setSelectedAvatar(null);

            const oldNpc = contentPath[contentPath.length - 1];
            const newNpc = {
              ...oldNpc,
              item: {
                ...oldNpc.item,
                avatar: null,
              },
            };
            const newContentPath = [
              ...contentPath.slice(0, -1),
              newNpc,
            ];
            setContentPath(newContentPath);
          }}>
            {avatar.name}
          </div>
        </>}
      </label>

      <label className={styles.label}>
        <div className={styles.text}>Voices</div>
        <select className={styles.select} value={voice} onChange={e => {
          // setVoice(e.target.value);
          setItemKeyValueChange('voice', e.target.value);
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
      </label>

      <label className={styles.label}>
        <div className={styles.text}>Description</div>
        <textarea className={styles.textarea} value={description} onChange={e => {
          // setDescription(e.target.value);
          setItemKeyValueChange('description', e.target.value);
        }}></textarea>
      </label>

      <label className={styles.label}>
        <div className={styles.text}>Personality</div>
        <textarea className={styles.textarea} value={personality} onChange={e => {
          // setPersonality(e.target.value);
          setItemKeyValueChange('personality', e.target.value);
        }}></textarea>
      </label>

      <label className={styles.label}>
        <div className={styles.text}>Scenario</div>
        <textarea className={styles.textarea} value={scenario} onChange={e => {
          // setScenario(e.target.value);
          setItemKeyValueChange('scenario', e.target.value);
        }}></textarea>
      </label>

      <label className={styles.label}>
        <div className={styles.text}>First message</div>
        <textarea className={styles.textarea} value={firstMessage} onChange={e => {
          // setFirstMessage(e.target.value);
          setItemKeyValueChange('firstMessage', e.target.value);
        }}></textarea>
      </label>

      <label className={styles.label}>
        <div className={styles.text}>Message example</div>
        <textarea className={styles.textarea} value={messageExample} onChange={e => {
          // setMessageExample(e.target.value);
          setItemKeyValueChange('messageExample', e.target.value);
        }}></textarea>
      </label>

      <button className={styles.button} onClick={async e => {
        if (
          name &&
          avatar &&
          voice &&
          description &&
          personality &&
          scenario &&
          firstMessage &&
          messageExample
        ) {
          const className = 'avatar';
          const avatarUrl = avatar.start_url;
          const npc = {
            name,
            bio: description,
            class: className,
            avatarUrl,
            voiceEndpoint: voice,
          };

          //

          const supabaseFsWorker = new SupabaseFsWorker({
            supabase: supabaseClient.supabase,
            bucketName: 'public',
          });

          //

          const uuid = crypto.randomUUID();
          const keyPath = ['assets', `${uuid}.npc`];
          const s = JSON.stringify(npc, null, 2);
          const start_url = await supabaseFsWorker.writeFile(keyPath, s);

          const id = crypto.randomUUID();
          const characterAsset = {
            id,
            name,
            type: 'npc',
            start_url,
            preview_url: avatar.preview_url,
            user_id: sessionUserId,
          };
          const result = await supabaseClient.supabase
            .from('assets')
            .upsert(characterAsset);

          setEpoch(epoch + 1);
        }
      }}>Create</button>
    </div>
  );
};
const CreateWorldContent = ({
  // localStorageManager,
  supabaseClient,
  sessionUserId,

  contentPath,
  setContentPath,
  contentPathElement,

  epoch,
  setEpoch,
}) => {
  const {
    item = null,
  } = contentPathElement;

  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');

  //

  // bind change setters
  useEffect(() => {
    const _name = item?.name || '';
    if (_name !== name) {
      setName(_name);
    }
    const _description = item?.description || '';
    if (_description !== description) {
      setDescription(_description);
    }
  }, [
    item,
  ]);

  // bind change setters
  const setItemKeyValueChange = (key, value) => {
    const contentElementIndex = contentPath.indexOf(contentPathElement);
    const oldContentElement = contentPathElement;
    const newContentElement = {
      ...oldContentElement,
      item: {
        ...item,
        [key]: value,
      },
    };
    const newContentPath = [
      ...contentPath.slice(0, contentElementIndex),
      newContentElement,
      ...contentPath.slice(contentElementIndex + 1),
    ];
    setContentPath(newContentPath);
  };

  //

  return (
    <div className={styles.createUi}>
      <div className={classnames(
        styles.row,
        styles.middle,
      )}>
        <nav className={styles.backButton} onClick={e => {
          const newContentPath = contentPath.slice(0, -1);
          setContentPath(newContentPath);
        }}>
          <img className={styles.img} src='/images/chevron.png' draggable={false} />
        </nav>
      </div>

      <label className={styles.label}>
        <div className={styles.text}>Name</div>
        <input type='text' className={styles.input} value={name} onChange={e => {
          setItemKeyValueChange('name', e.target.value);
        }} placeholder='Enter a name' />
      </label>

      <label className={styles.label}>
        <div className={styles.text}>Description</div>
        <textarea className={styles.textarea} value={description} onChange={e => {
          setItemKeyValueChange('description', e.target.value);
        }}></textarea>
      </label>

      <button className={styles.button} onClick={async e => {
        if (
          name &&
          description
        ) {
          // const supabaseFsWorker = new SupabaseFsWorker({
          //   supabase: supabaseClient.supabase,
          //   bucketName: 'public',
          // });

          //

          // const uuid = crypto.randomUUID();
          // const keyPath = ['assets', `${uuid}.world`];
          // const world = {
          //   objects: [],
          // };
          // const s = JSON.stringify(world, null, 2);
          // const start_url = await supabaseFsWorker.writeFile(keyPath, s);

          const id = crypto.randomUUID();
          const objects = [];
          const worldAsset = {
            id,
            name,
            description,
            // type: 'world',
            // start_url,
            objects,
            preview_url: '',
            user_id: sessionUserId,
          };
          const result = await supabaseClient.supabase
            .from('worlds')
            .upsert(worldAsset);

          setEpoch(epoch + 1);

          const newContentPath = contentPath.slice(0, -1);
          setContentPath(newContentPath);
        }
      }}>Create</button>
    </div>
  );
};
const ChooseAvatarContent = ({
  localStorageManager,
  supabaseClient,
  sessionUserId,
  contentPath,
  setContentPath,

  epoch,
  setEpoch,

  wearItem,

  debug,
}) => {
  return (
    <>
      <div className={styles.row}>
        <nav className={styles.backButton} onClick={e => {
          // setChoosingAvatar(false);
          const newContentPath = contentPath.slice(0, -1);
          setContentPath(newContentPath);
        }}>
          <img className={styles.img} src='/images/chevron.png' draggable={false} />
        </nav>
      </div>

      <VrmAssetContent
        localStorageManager={localStorageManager}
        supabaseClient={supabaseClient}
        sessionUserId={sessionUserId}
        contentPath={contentPath}
        setContentPath={setContentPath}
        wearItem={wearItem}

        epoch={epoch}
        setEpoch={setEpoch}

        onClick={avatar => {
          const avatarContentPath = contentPath[contentPath.length - 2];
          const newContentPath = [
            ...contentPath.slice(0, -2),
            {
              ...avatarContentPath,
              item: {
                ...avatarContentPath.item,
                avatar,
              },
            },
          ];
          setContentPath(newContentPath);
        }}

        debug={debug}
      />
    </>
  );
}
const NftAssetContent = ({
  localStorageManager,
  supabaseClient,
  sessionUserId,
  address,
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadQueue, setLoadQueue] = useState(() => new QueueManager());

  //

  useEffect(() => {
    const abortController = new AbortController();
    const {signal} = abortController;

    loadQueue.waitForTurn(async () => {
      setLoading(true);

      try {
        const newItems = await loadNftItems({
          signal,
          supabaseClient,
          address,
        });
        if (signal.aborted) return;

        setItems(newItems);
      } catch(err) {
        throw err;
      } finally {
        setLoading(false);
      }
    });

    return () => {
      abortController.abort();
    };
  }, []);

  //

  return (
    <>
      {loading && <div className={styles.placeholder}>
        Loading...
      </div>}
      {!loading && items.map(item => {
        return (
          <div className={styles.item} onDoubleClick={e => {
            e.preventDefault();
            e.stopPropagation();

            console.log('double click nft');
          }} key={item.id}>
            <img src={item.preview_url} className={styles.previewImg} draggable={false} />
            <div className={styles.name}>{item.name}</div>
            <div className={styles.category}>{item.collection}</div>
          </div>
        );
      })}

      {!loading && items.length === 0 && <div className={styles.placeholder}>
        No assets
      </div>}
    </>
  );
};

//

const ContentPathElement = ({
  contentPathElement,

  contentPath,
  setContentPath,

  localStorageManager,
  supabaseClient,
  sessionUserId,

  address,
  wearItem,

  epoch,
  setEpoch,

  debug,
}) => {
  const {
    type,
  } = contentPathElement;

  return (
    <>
      {(() => {
        switch (type) {
          case 'vrm': {
            return (
              <VrmAssetContent
                localStorageManager={localStorageManager}
                supabaseClient={supabaseClient}
                sessionUserId={sessionUserId}
                contentPath={contentPath}
                setContentPath={setContentPath}
                wearItem={wearItem}

                epoch={epoch}
                setEpoch={setEpoch}

                Buttons={VrmButtons}
                removable

                debug={debug}
              />
            );
          }
          case 'glb': {
            return (
              <GlbAssetContent
                localStorageManager={localStorageManager}
                supabaseClient={supabaseClient}
                sessionUserId={sessionUserId}
                contentPath={contentPath}
                setContentPath={setContentPath}
                wearItem={wearItem}

                epoch={epoch}
                setEpoch={setEpoch}

                removable
              />
            );
          }
          case 'world': {
            return (
              <WorldAssetContent
                localStorageManager={localStorageManager}
                supabaseClient={supabaseClient}
                sessionUserId={sessionUserId}

                contentPath={contentPath}
                setContentPath={setContentPath}

                contentPathElement={contentPathElement}

                epoch={epoch}
                setEpoch={setEpoch}
              />
            );
          }
          case 'npc': {
            return (
              <NpcAssetContent
                localStorageManager={localStorageManager}
                supabaseClient={supabaseClient}
                sessionUserId={sessionUserId}
                contentPath={contentPath}
                setContentPath={setContentPath}
                wearItem={wearItem}

                contentPathElement={contentPathElement}
              />
            );
          }
          case 'nft': {
            return (
              <NftAssetContent
                localStorageManager={localStorageManager}
                supabaseClient={supabaseClient}
                sessionUserId={sessionUserId}
                address={address}

                contentPath={contentPath}
                setContentPath={setContentPath}

                contentPathElement={contentPathElement}
              />
            );
          }
          case 'createNpc': {
            return (
              <CreateNpcContent
                localStorageManager={localStorageManager}
                supabaseClient={supabaseClient}
                sessionUserId={sessionUserId}
                address={address}

                contentPath={contentPath}
                setContentPath={setContentPath}

                contentPathElement={contentPathElement}

                epoch={epoch}
                setEpoch={setEpoch}
              />
            );
          }
          case 'chooseAvatar': {
            return (
              <ChooseAvatarContent
                localStorageManager={localStorageManager}
                supabaseClient={supabaseClient}
                sessionUserId={sessionUserId}
                address={address}

                contentPath={contentPath}
                setContentPath={setContentPath}

                contentPathElement={contentPathElement}

                debug={debug}
              />
            )
          }
          case 'createWorld': {
            return (
              <CreateWorldContent
                localStorageManager={localStorageManager}
                supabaseClient={supabaseClient}
                sessionUserId={sessionUserId}

                wearItem={wearItem}

                contentPath={contentPath}
                setContentPath={setContentPath}
                contentPathElement={contentPathElement}

                epoch={epoch}
                setEpoch={setEpoch}
              />
            );
          }
          default: {
            throw new Error('invalid asset type: ' + type);
          }
        }
      })()}
    </>
  );
};
const ContentPathUi = ({
  contentPath,
  setContentPath,

  localStorageManager,
  supabaseClient,
  sessionUserId,
  selectedAvatar,
  setSelectedAvatar,
  wearItem,

  epoch,
  setEpoch,

  address,

  debug,
}) => {
  return (
    <>
      {contentPath.slice(-1).map((contentPathElement, i) => {
        return (
          <ContentPathElement
            contentPathElement={contentPathElement}

            contentPath={contentPath}
            setContentPath={setContentPath}

            localStorageManager={localStorageManager}
            supabaseClient={supabaseClient}
            sessionUserId={sessionUserId}
            selectedAvatar={selectedAvatar}
            setSelectedAvatar={setSelectedAvatar}
            wearItem={wearItem}

            address={address}

            epoch={epoch}
            setEpoch={setEpoch}

            debug={debug}

            key={i}
          />
        );
      })}
    </>
  );
};
const AssetContent = ({
  engine,

  supabaseClient,

  sessionUserId,
  address,

  localStorageManager,

  contentPath,
  setContentPath,

  debug,
}) => {
  const [epoch, setEpoch] = useState(0);
  const [selectedAvatar, setSelectedAvatar] = useState(null);

  //

  // const refreshItems = () => {
  //   setEpoch(epoch + 1);
  // };

  const wearItem = (item) => {
    const playerSpec = localStorageManager.getPlayerSpec();

    const newPlayerSpec = {
      ...playerSpec,
      avatarUrl: item.start_url,
    };
    localStorageManager.setPlayerSpec(newPlayerSpec);
  };

  //

  return (
    <div className={styles.content}>
      <ContentPathUi
        contentPath={contentPath}
        setContentPath={setContentPath}

        localStorageManager={localStorageManager}
        supabaseClient={supabaseClient}
        sessionUserId={sessionUserId}

        selectedAvatar={selectedAvatar}
        setSelectedAvatar={setSelectedAvatar}
        wearItem={wearItem}

        epoch={epoch}
        setEpoch={setEpoch}

        address={address}
      
        debug={debug}
      />
    </div>
  );
};

//

const whitelistedContractAddresses = [
  '0x543D43F390b7d681513045e8a85707438c463d80', // Webaverse Genesis Pass
  '0x1dfe7Ca09e99d10835Bf73044a23B73Fc20623DF', // More Loot
  '0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85', // ENS
  '0x2a187453064356c898cae034eaed119e1663acb8', // Decentraland username
  '0x62eb144fe92ddc1b10bcade03a0c09f6fbffbffb', // AdWorld
  '0x3999877754904d8542ad1845d368fa01a5e6e9a5', // Vipe Heroes
  '0x1d20a51f088492a0f1c57f047a9e30c9ab5c07ea', // Wassies
];

//

const Tabs = ({
  tabs,
  // selectedTab,
  // setSelectedTab,
  contentPath,
  setContentPath,
}) => {
  return (
    <div className={styles.tabs}>
      {tabs.map(tab => (
        <div className={classnames(
          styles.tab,
          tab.value === contentPath[0].type ? styles.selected : null,
        )} onClick={e => {
          // setSelectedTab(tab.value);
          setContentPath([
            {
              type: tab.value,
            },
          ]);
        }} key={tab.value}>
          {tab.label}
        </div>
      ))}
    </div>
  );
};

//

export const InventoryUi = ({
  engine,

  supabaseClient,

  sessionUserId,
  address,

  localStorageManager,

  onClose,

  debug,
}) => {
  const tabs = [
    {
      label: 'VRM',
      value: 'vrm',
    },
  ].concat(debug ? [
    {
      label: 'GLB',
      value: 'glb',
    },
    {
      label: 'World',
      value: 'world',
    },
    {
      label: 'NPC',
      value: 'npc',
    },
    /* {
      label: 'NFT',
      value: 'nft',
    }, */
  ] : []);

  //

  const [contentPath, setContentPath] = useState(() => ([
    {
      type: tabs[0].value,
    },
  ]));

  //

  return (
    <div className={styles.inventoryUi}>
      <div className={styles.row}>
        <div className={styles.h}>Inventory</div>
        <div className={styles.icon} onClick={e => {
          e.preventDefault();
          e.stopPropagation();

          onClose();
        }}>
          <img className={styles.img} src='/assets/x.svg' draggable={false} />
        </div>
      </div>
      <Tabs
        tabs={tabs}
        contentPath={contentPath}
        setContentPath={setContentPath}
      />
      <AssetContent
        engine={engine}

        supabaseClient={supabaseClient}

        sessionUserId={sessionUserId}
        address={address}

        localStorageManager={localStorageManager}

        contentPath={contentPath}
        setContentPath={setContentPath}

        debug={debug}
      />
    </div>
  );
};