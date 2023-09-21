import React, {
  useEffect,
  useState,
  useRef,
} from 'react';
import classnames from 'classnames';

import styles from './CompanionQuickSettings.module.css';

import {
  miniCanvasDimensions,
  llmModels,
  imageModels,
  defaultCameraUvw,
  defaultSkyboxPrompt,
} from '../../../packages/engine/constants/companion-constants.js';
import {
  CompanionRenderSpec,
} from '../../../packages/engine/renderers/companion-renderer.js';
import {
  exportNpcPlayer,
  importFiles,
  formatMessagesDebug,
} from '../../../packages/engine/utils/companion-utils.js';
import {
  jsonParse,
  downloadFile,

  makePromise,
} from '../../../packages/engine/util.js';
import Icon from '../ui/icon/Icon.jsx';
import {
  NpcLoader,
} from '../../helpers/npc-loader.js';
import {
  minFov,
} from '../../../packages/engine/constants.js';
import {
  defaultParserSpecs,
} from '../../../packages/engine/ai-agent/parsers/parsers.js';
import {
  AvatarMLStreamParser,
} from '../../../packages/engine/ai-agent/utils/avatarml-stream-parser.js';
import { abortError } from '../../../packages/engine/lock-manager';
import {MemoryViewer} from '../memory-viewer/MemoryViewer.jsx';
import {
  generateSkybox,
  loadSkyboxImageSpecs,
} from '../../../packages/engine/clients/blockade-labs-client.js';

//

const {
  electronIpc,
} = globalThis;

//

const arrayEquals = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const parseErrorString = 'failed to parse context JSON';

//

const llmModelSpecs = Object.keys(llmModels).flatMap(model => {
  return llmModels[model].map(name => {
    const label = `${name} (${model})`;
    const value = `${model}:${name}`
    return {
      // model,
      // name,
      value,
      label,
    };
  });
});
const imageModelSpecs = Object.keys(imageModels).flatMap(model => {
  return imageModels[model].map(name => {
    const label = `${name} (${model})`;
    const value = `${model}:${name}`
    return {
      // model,
      // name,
      value,
      label,
    };
  });
});

//

const flushStream = async (stream) => {
  const reader = stream.readable.getReader();
  for (;;) {
    const {
      done,
      // value,
    } = await reader.read();
    // console.log('got read', {done});
    if (done) {
      break;
    }
  }
};
// programmatic file selection
function selectFile() {
  const input = document.createElement('input');
  input.type = 'file';
  const p = makePromise();
  input.onchange = e => {
    const file = e.target.files[0];
    if (file) {
      p.resolve(file);
    }
  };
  input.click();
  return p;
}

//

const AvatarOption = ({
  settingsMode,
  // playerSpecs,
  npcLoader,
  npcPlayers,
  companionRenderer,

  agentCharacterIdentities,
  characterIdentity,
  // currentPlayerId,
  // index,

  onClick,
  onAdd,
  onRemove,
  onDelete,
}) => {
  const canvasRef = useRef(null);

  const [removing, setRemoving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [exportBlobUrl, setExportBlobUrl] = useState(null);
  const [exportBlob, setExportBlob] = useState(null);
  const [exportImage, setExportImage] = useState(null);

  const selected = agentCharacterIdentities.some(
    agentCharacterIdentity => agentCharacterIdentity.spec.id === characterIdentity.spec.id
  );
  const [width, height] = miniCanvasDimensions;

  // bind companion renderer
  useEffect(() => {
    if (companionRenderer && canvasRef.current && settingsMode === 'avatarGallery') {
      const playerSpec = characterIdentity.spec;
      const group = 'gallery';
      const key = NpcLoader.getKey(playerSpec, group);
      const npcPlayer = npcPlayers.get(key);
      if (npcPlayer) {
        const newCompanionRenderSpec = new CompanionRenderSpec({
          npcPlayer,
          companionRenderer,
          canvasContext: canvasRef.current.getContext('2d'),
          cameraUvw: defaultCameraUvw,
          cameraFov: minFov,
        })
        companionRenderer.addCompanionRenderSpec(newCompanionRenderSpec);
        return () => {
          companionRenderer.removeCompanionRenderSpec(newCompanionRenderSpec);
        }
      } else {
        // trigger loading the npc
        (async () => {
          await npcLoader.loadNpcPlayer(playerSpec, group);
        })();
      }
    }
  }, [
    companionRenderer,
    characterIdentity,
    npcPlayers,
    canvasRef.current,
    settingsMode,
  ]);

  return (
    <div className={classnames(
      styles.avatarOption,
      selected ? styles.selected : null,
    )} onClick={onClick} onMouseLeave={e => {
      if (removing) {
        setRemoving(false);
      }
    }} draggable onDragStart={e => {
      if (exportBlob) {
        e.dataTransfer.setData('image/png', exportBlob);
      } else {
        const j = {
          type: 'application/npc',
          content: characterIdentity.spec,
        };
        const s = JSON.stringify(j);
        e.dataTransfer.setData('application/json', s);
      }
      if (exportImage) {
        e.dataTransfer.setDragImage(exportImage, 0, 0);
      }
    }}>
      <div className={styles.name}>{characterIdentity.spec.name}</div>
      <div className={styles.subheader}>
        <div className={styles.spacer} />
        {!selected ? <button className={classnames(
          styles.iconButton,
        )} onClick={async e => {
          e.preventDefault();
          e.stopPropagation();

          onAdd();
        }}>
          <img src="/ui/assets/icons/plus.svg" className={styles.icon} />
        </button> : null}
        {(selected && agentCharacterIdentities.length > 1) ? <button className={classnames(
          styles.iconButton,
        )} onClick={async e => {
          e.preventDefault();
          e.stopPropagation();

          onRemove();
        }}>
          <img src="/ui/assets/icons/minus.svg" className={styles.icon} />
        </button> : null}
        {!exporting ? <button className={classnames(
          styles.iconButton,
        )} onClick={async e => {
          e.preventDefault();
          e.stopPropagation();

          if (exportBlob) {
            navigator.clipboard.write([
              new ClipboardItem({
                'image/png': exportBlob,
              }),
            ]);
          } else {
            setExporting(true);

            try {
              const blob = await exportNpcPlayer(characterIdentity.spec, npcLoader, companionRenderer);
              const blobUrl = URL.createObjectURL(blob);

              const image = await new Promise((accept, reject) => {
                const image = new Image();
                image.onload = () => {
                  accept(image);
                };
                image.onerror = reject;
                image.src = blobUrl;
              });

              setExportBlobUrl(blobUrl);
              setExportBlob(blob);
              setExportImage(image);

              navigator.clipboard.write([
                new ClipboardItem({
                  'image/png': blob,
                }),
              ]);
            } finally {
              setExporting(false);
            }
          }
        }}>
          <img src="/ui/assets/icons/upload.svg" className={styles.icon} />
        </button> : null}
        <button className={classnames(
          styles.iconButton,
          removing ? styles.active : null,
          selected ? styles.disabled : null,
        )} onClick={e => {
          e.preventDefault();
          e.stopPropagation();

          if (!selected) {
            if (!removing) {
              setRemoving(true);
            } else {
              onDelete();
            }
          }
        }}>
          <img src="/assets/x.svg" className={styles.icon} />
        </button>
      </div>
      <canvas className={classnames(
        styles.canvas,
        exportBlobUrl ? styles.hidden : null,
      )} width={width} height={height} ref={canvasRef} />
      <img className={classnames(
        styles.card,
        !exportBlobUrl ? styles.hidden : null,
      )} src={exportBlobUrl} />
    </div>
  );
};

//

export const BackButton = ({
  onClick,
  icon,
}) => {
  return (
    <div
      className={classnames(
        styles.close,
      )}
      onClick={onClick}
    >
      <Icon icon={icon} className={styles.icon} />
    </div>
  );
}

//

export const Switch = ({
  onChange,
  label,
  icon,
  checked
}) => {
  return (
    <div className={styles.formItem}>
      <div className={styles.label}>
        {icon && (
          <Icon icon={icon} className={styles.switchIcon} />
        )}
        {label}
      </div>
      <label className={styles.switch}>
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className={classnames(styles.slider, styles.round)}></span>
      </label>
    </div>
  );
}

//

export const GeneralSettings = ({
  companionClient,
  // promptClient,
  // skillsClient,
  worldsClient,
  companionSettingsClient,
  aiAgentController,
  aiAgents,

  // characterIdentity,

  showDebugPerception,
  setShowDebugPerception,

  microphones,
  facecams,
  currentPlayerId,
  showDebugWindows,
  setShowDebugWindows,
  terminalOpen,
  setTerminalOpen,
  browserOpen,
  setBrowserOpen,
  settingsMode,
  setSettingsMode,
  discordEnabled,
  setDiscordEnabled,
  compiler,
  clearScriptCache,

  fullscreenEnabled,
  setFullscreenEnabled,

  renderVirtualScene,
  renderVideo,
  renderAudio,
  renderFull,

  // facecamEnabled,
  // setFacecamEnabled,

  setSkillsLocked,
  skillsLocked,
  setPromptLocked,
  promptLocked
}) => {
  const [microphone, setMicrophone] = useState(() => companionSettingsClient.getSetting('microphone') ?? '');
  const [facecam, setFacecam] = useState(() => companionSettingsClient.getSetting('facecam') ?? '');

  const [closedCaptioning, setClosedCaptioning] = useState(() => companionSettingsClient.getSetting('closedCaptioning') ?? true);
  const [volume, setVolume] = useState(companionSettingsClient.getSetting('volume') ?? 100);
  const [chattiness, setChattiness] = useState(companionSettingsClient.getSetting('chattiness') ?? 5);
  // const [basePrompt, setBasePrompt] = useState(() => companionSettingsClient.getSetting('basePrompt') ?? '');
  // const [jailbreak, setJailbreak] = useState(() => companionSettingsClient.getSetting('jailbreak') ?? '');

  const [discordBotToken, setDiscordBotToken] = useState(() => companionSettingsClient.getSetting('discordBotToken') ?? '');
  const [discordChannelWhitelist, setDiscordChannelWhitelist] = useState(() => companionSettingsClient.getSetting('discordChannelWhitelist') ?? '');
  const [discordUserWhitelist, setDiscordUserWhitelist] = useState(() => companionSettingsClient.getSetting('discordUserWhitelist') ?? '');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileSelectedHandler = event => {
    setSelectedFile(event.target.files[0]);
  };
  const importMemoriesHandler = () => {
    const formData = new FormData();
    formData.append("file", selectedFile);
    aiAgentController.importMemoriesFromFile(selectedFile);
  };
  // update settings
  const bindSetting = (name, value) => {
    useEffect(() => {
      const oldVal = companionSettingsClient.getSetting(name);
      if (oldVal !== void 0 && value !== oldVal) {
        companionSettingsClient.setSetting(name, value);
      }
    }, [value]);
  };
  for (const [name, value, setValue] of [
    ['microphone', microphone, setMicrophone],
    ['facecam', facecam, setFacecam],
    ['closedCaptioning', closedCaptioning, setClosedCaptioning],
    ['discordBotToken', discordBotToken, setDiscordBotToken],
    ['discordChannelWhitelist', discordChannelWhitelist, setDiscordChannelWhitelist],
    ['discordUserWhitelist', discordUserWhitelist, setDiscordUserWhitelist],
    ['volume', volume, setVolume],
    ['chattiness', chattiness, setChattiness],
    // ['jailbreak', jailbreak, setJailbreak],
  ]) {
    bindSetting(name, value);
  }

  return (
    <div>

      <div className={styles.formTitle}>Characters</div>

      <div className={styles.formItem}>
        <label>Chattiness</label>
        <input type="range" className={styles.horizontal} min="1" max="10" onChange={e=>{
          aiAgentController.adjustTickQueueCapacity(e.target.value);
          setChattiness(e.target.value);
        }} value={chattiness} />
      </div>

      <div className={styles.formItem}>
        <button className={styles.button} onClick={async e => {
          await setSkillsLocked(!skillsLocked);
        }}>Edit Skill Sets</button>
      </div>

      <div className={styles.formItem}>
        <button className={styles.button} onClick={async e => {
          await setPromptLocked(!promptLocked);
        }}>Edit Prompts</button>
      </div>

      <div className={styles.formItem}>
        <button onClick={async e => {
          companionSettingsClient.removeSetting('basePrompt');
        }}>Clear base prompt</button>
      </div>

      <div className={styles.formTitle}>Fullscreen</div>

      <Switch
        label={"Fullscreen"}
        icon={"headset"}
        checked={fullscreenEnabled}
        onChange={e => {
          setFullscreenEnabled(!fullscreenEnabled);
        }}
      />

      <div className={styles.formTitle}>Sound</div>

      <div className={styles.formItem}>
        <label>Input</label>
        <select onChange={e => {
          setMicrophone(e.target.value);
        }} value={microphone}>
          {microphones.map(microphone => {
            const {
              label,
            } = microphone;
            return (
              <option value={label} key={label}>{label}</option>
            );
          })}
        </select>
      </div>

      <div className={styles.formItem}>
        <label>Input Volume</label>
        <input type="range" className={styles.horizontal} min="1" max="100" defaultValue="50" />
      </div>

      <div className={styles.formItem}>
        <label>Output Volume</label>
        <input type="range" className={styles.horizontal} min="1" max="100" onChange={e=>{
          setVolume(e.target.value);
        }} value={volume}/>
      </div>

      <div className={styles.formTitle}>Facecam</div>

      <div className={styles.formItem}>
        <label>Device</label>
        <select onChange={e => {
          setFacecam(e.target.value);
        }} value={facecam}>
          {facecams.map(facecam => {
            const {
              label,
            } = facecam;
            return (
              <option value={label} key={label}>{label}</option>
            );
          })}
        </select>
      </div>

      {/* <Switch
        label={"Facecam"}
        icon={"facecam"}
        checked={facecamEnabled}
        onChange={e => {
          setFacecamEnabled(!facecamEnabled);
        }}
      /> */}

      {/* <div className={styles.formItem}>
        <label>Debug Llm</label>
        <button
          onClick={e => {
            setShowDebugLlm(!showDebugLlm);
          }}
        >
          {showDebugLlm ? "Turn OFF" : "Turn ON"}
        </button>
      </div> */}
      {/* <div className={styles.formItem}>
        <label>Prompt set</label>
        <select onChange={e => {
          characterIdentity.setCharacterAttribute('promptset', e.target.value);
        }} value={promptset}>
          // llmModelSpecs.map(llmModel => {
          //   const {
          //     value,
          //     label,
          //   } = llmModel;

          {promptsets.map(promptSpec => {
            const {
              name,
            } = promptSpec;
            return (
              <option value={name} key={name}>{name}</option>
            );
          })}
        </select>
      </div> */}
      {/* <div className={styles.formItem}>
        <label>Jailbreak</label>
        <select onChange={e => {
          setJailbreak(e.target.value);
        }} value={jailbreak}>
          <option value=''>None</option>
          {jailbreakPrompts.map((jailbreakPrompt, i) => {
            return (
              <option value={jailbreakPrompt} key={i}>{jailbreakPrompt}</option>
            );
          })}
        </select>
      </div> */}
      {/* <div className={styles.formItem}>
        <label>Base Prompt</label>
        <textarea value={basePrompt} onChange={e => {
          setBasePrompt(e.target.value);
        }} />
      </div> */}
      {/* <button className={styles.button} onClick={async e => {
        companionSettingsClient.removeSetting('basePrompt');
      }}>Clear base prompt</button> */}

      <div className={styles.formTitle}>Discord</div>

      <Switch
        label={"Discord"}
        icon={"headset"}
        checked={discordEnabled}
        onChange={e => {
          setDiscordEnabled(!discordEnabled);
        }}
      />
      <div className={styles.formItem}>
        <label>Discord bot token</label>
        <input type="password" placeholder="DISCORD_BOT_TOKEN" value={discordBotToken} onChange={e => {
          setDiscordBotToken(e.target.value);
        }} />
      </div>
      <div className={styles.formItem}>
        <label>Channels (comma-separated)</label>
        <input type="text" placeholder="server:channel" value={discordChannelWhitelist} onChange={e => {
          setDiscordChannelWhitelist(e.target.value);
        }} />
      </div>
      <div className={styles.formItem}>
        <label>Users (comma-separated)</label>
        <input type="text" placeholder="user#0001" value={discordUserWhitelist} onChange={e => {
          setDiscordUserWhitelist(e.target.value);
        }} />
      </div>

      <div className={styles.formTitle}>Render Controls</div>

      <RenderControls
        compiler={compiler}
        clearScriptCache={clearScriptCache}
        renderVirtualScene={renderVirtualScene}
        renderVideo={renderVideo}
        renderAudio={renderAudio}
        renderFull={renderFull}
      />

      <div className={styles.formTitle}>Advanced Settings</div>

      <div className={styles.formItem}>
        <label>Closed Captioning</label>
        <select onChange={e => {
          const newClosedCaptioning = e.target.value === 'true';
          setClosedCaptioning(newClosedCaptioning);
        }} value={closedCaptioning}>
          {[true, false].map(value => (
            <option value={value} key={value}>{value + ''}</option>
          ))}
        </select>
      </div>

      <Switch
        label={"Debug Perception"}
        icon={"debugMode"}
        checked={showDebugPerception}
        onChange={e => {
          setShowDebugPerception(!showDebugPerception)
        }}
      />

      { /*
      <Switch
        label={"Debug LLM"}
        icon={"debugMode"}
        checked={showDebugLlm}
        onChange={e => {
          setShowDebugLlm(!showDebugLlm);
        }}
      />
      */ }

      <Switch
        label={"Browser Window"}
        icon={"browserWindow"}
        checked={browserOpen}
        onChange={e => {
          setBrowserOpen(!browserOpen);
        }}
      />

      <Switch
        label={"Terminal Window"}
        icon={"terminalWindow"}
        checked={terminalOpen}
        onChange={e => {
          setTerminalOpen(!terminalOpen);
        }}
      />

      <br />

      <div className={styles.formItem}>
        <button className={styles.button} onClick={async e => {
          await aiAgents[0].exportMemories();
        }}>Export memories</button>
      </div>
      <div className={styles.formItem}>
        <input type="file" onChange={fileSelectedHandler} />
        <button onClick={importMemoriesHandler}>Import Memories</button>
      </div>

      <br />

      <div className={styles.formItem}>
        <button className={styles.button} onClick={async e => {
          await companionClient.clearCharacters();
        }}>Clear characters</button>
      </div>
      <div className={styles.formItem}>
        <button className={styles.button} onClick={async e => {
          await aiAgentController.clearMemories();
        // }));
        }}>Clear memories</button>
      </div>

      <div className={styles.formItem}>
        <button onClick={async e => {
          worldsClient.clearWorlds();
        }}>Clear worlds</button>
      </div>

      {/* <br />

      <div className={styles.formItem}>
        <button className={styles.button} onClick={async e => {
          await companionClient.resetToDefaultCharacters();
        }}>Reset to default characters</button>
      </div> */}
    </div>
  );
}

//

const UvSelector = ({
  value,
  onChange,
}) => {
  const [dragging, setDragging] = useState(false);
  const divRef = useRef();

  const setMouseMove = e => {
    const divEl = divRef.current;
    if (divEl) {
      const rect = divEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dx = ((x / rect.width) - 0.5) * 2;
      const dy = -((y / rect.height) - 0.5) * 2;
      onChange([dx, dy]);
    }
  };
  const size = 150;
  const style = {
    transform: `translate(${((value[0] / 2)) * size}px, ${-((value[1] / 2)) * size}px)`,
  };

  return (
    <div
      className={classnames(
        styles.uvSelector,
        dragging ? styles.dragging : null,
      )}
      onMouseDown={e => {
        setDragging(true);
        setMouseMove(e);

        const mouseup = e => {
          setDragging(false);
        };
        document.addEventListener('mouseup', mouseup);
      }}
      onMouseMove={e => {
        if (dragging) {
          setMouseMove(e);
        }
      }}
      ref={divRef}
    >
      <div className={styles.crosshair}>
        <img src="/assets/crosshair.svg" className={styles.img} style={style} />
      </div>
    </div>
  );
};

//

const TextareaDynamic = ({
  className,
  value,
  onChange,
}) => {
  const textareaRef = useRef();

  useEffect(() => {
    const textareaEl = textareaRef.current;
    if (textareaEl) {
      // textareaEl.style.height = null;
      // textareaEl.style.height = `${textareaEl.scrollHeight + 1}px`;

      // resize observer
      const resizeObserver = new ResizeObserver(entries => {
        return;

        resizeObserver.unobserve(textareaEl);

        textareaEl.style.height = null;
        textareaEl.style.height = `${textareaEl.scrollHeight + 1}px`;

        resizeObserver.observe(textareaEl);
      });
      resizeObserver.observe(textareaEl);

      return () => {
        resizeObserver.unobserve(textareaEl);
      };
    }
  }, [textareaRef.current, value]);

  return (
    <textarea className={className} value={value} onChange={onChange} ref={textareaRef} />
  );
}

//

const PromptSettings = ({
  promptClient,
  // companionClient,
  skillsClient,
  setSettingsMode,

  aiAgentController,

  // characterIdentities,
  aiAgents,
  skills,
}) => {
  const [promptsets, setPromptsets] = useState(promptClient.getPromptsets());
  const [currentPromptset, setCurrentPromptset] = useState(promptClient.getCurrentPromptset());

  const [llmModel, setLlmModel] = useState('');
  const [chunks, setChunks] = useState([]);

  const [contextString, setContextString] = useState('');
  const [userMessageString, setUserMessageString] = useState('');
  const [promptString, setPromptString] = useState('');

  const [responseString, setResponseString] = useState('');

  const [parsedMessages, setParsedMessages] = useState([]);

  const [generateAbortController, setGenerateAbortController] = useState(null);

  const [forceAgentName, setForceAgentName] = useState('');
  const [forceSkillName, setForceSkillName] = useState('');

  // bind prompt client
  useEffect(() => {
    const promptsetsupdate = (e) => {
      const newPromptsets = promptClient.getPromptsets();
      setPromptsets(newPromptsets);
    };
    const currentpromptsetupdate = (e) => {
      const currentPromptset = promptClient.getCurrentPromptset();
      setCurrentPromptset(currentPromptset);
    };

    promptClient.addEventListener('promptsetsupdate', promptsetsupdate);
    promptClient.addEventListener('currentpromptsetupdate', currentpromptsetupdate);

    return () => {
      promptClient.removeEventListener('promptsetsupdate', promptsetsupdate);
      promptClient.removeEventListener('currentpromptsetupdate', currentpromptsetupdate);
    };
  }, [promptClient, promptsets, currentPromptset]);

  // bind prompt data
  useEffect(() => {
    const promptset = promptsets.find(promptset => promptset.spec.name === currentPromptset);
    // console.log('init prompt set', {promptset, promptsets, currentPromptset});

    if (promptset) {
      const promptsetupdate = (e) => {
        const {
          key,
          value,
        } = e.data;
        switch (key) {
          case 'llmModel': {
            setLlmModel(value);
            break;
          }
          case 'chunks': {
            if (!value) {
              console.warn('no chunk templates 1');
              debugger;
              throw new Error('no chunk templates 1');
            }
            setChunks(value);
            break;
          }
        }
      };
      promptset.addEventListener('promptsetupdate', promptsetupdate);

      const _init = () => {
        const {
          spec: {
            llmModel,
            chunks,
          },
        } = promptset;
        setLlmModel(llmModel);
        setChunks(chunks);
      };
      _init();

      return () => {
        promptset.removeEventListener('promptsetupdate', promptsetupdate);
      };
    }
  }, [promptsets, currentPromptset]);

  const getPromptSpec = () => {
    let contextObject = jsonParse(contextString);
    if (typeof contextObject === 'object' && contextObject !== null) {

      contextObject = {
        ...contextObject,
        forceAgentName,
        forceSkillName,
      };

      const cleanups = [];
      if (userMessageString) {
        const userMessage = {
          role: 'user',
          content: userMessageString,
        };
        aiAgentController.postMessages.push(userMessage);

        cleanups.push(() => {
          const index = aiAgentController.postMessages.indexOf(userMessage);
          aiAgentController.postMessages.splice(index, 1);
        });
      }

      const promptSpec = aiAgentController.getPromptSpecFromContextObject(contextObject);

      for (const cleanup of cleanups) {
        cleanup();
      }

      return promptSpec;
    } else { // failed to parse
      return null;
    }
  };

  const allSkills = Array.from(skills.values());

  return (
    <>
      <div className={styles.actions}>
        <div className={styles.formItem}>
          <label>Current Prompt Set</label>
          <select
            onChange={e => {
              promptClient.setCurrentPromptset(e.target.value);
            }}
            value={currentPromptset}
          >
            {promptsets.map(promptset => {
              return (
                <option value={promptset.spec.name} key={promptset.spec.name}>{promptset.spec.name}</option>
              );
            })}
          </select>
        </div>
        <button className={styles.btn} onClick={async e => {
          throw new Error('not implemented');
        }}>New</button>
        <button className={styles.btn} onClick={async e => {
          throw new Error('not implemented');
        }}>Save</button>
        <button className={styles.btn} onClick={async e => {
          throw new Error('not implemented');
        }}>Revert</button>
        <button className={styles.btn} onClick={async e => {
          throw new Error('not implemented');
        }}>Import</button>
        <button className={styles.btn} onClick={async e => {
          throw new Error('not implemented');
        }}>Export</button>
        <button className={styles.btn} onClick={async e => {
          throw new Error('not implemented');
        }}>Delete</button>
        <button className={styles.btn} onClick={async e => {
          throw new Error('not implemented');
        }}>Default</button>
      </div>
      <div className={
        classnames(
          styles.row,
          styles.scroll,
          styles.skillsSettings,
        )
      }>
      <div className={classnames(
        styles.promptSettings,
      )}>
        <div className={styles.windows}>
          <div className={classnames(
            styles.window,
            styles.main,
          )}>

            <div className={styles.formTitle}>Prompt Sets</div>
            
            <div className={styles.formItem}>
              <label>Llm model</label>
              <select onChange={e => {
                const llmModel = e.target.value;
                const promptset = promptsets.find(promptset => promptset.name === currentPromptset);
                promptset.setPromptsetAttribute('llmModel', llmModel);
              }} value={llmModel}>
                {llmModelSpecs.map(llmModel => {
                  const {
                    label,
                    value,
                  } = llmModel;
                  return (
                    <option value={value} key={value}>{label}</option>
                  );
                })}
              </select>
            </div>
            
            <div className={styles.formItem}>
              <label>Parser</label>
              <select onChange={e => {
                const parser = e.target.value;
                const promptset = promptsets.find(promptset => promptset.name === currentPromptset);
                promptset.setPromptsetAttribute('parser', parser);
              }} value={llmModel}>
                {defaultParserSpecs.map(parserSpec => {
                  return (
                    <option value={parserSpec.name} key={parserSpec.name}>{parserSpec.name}</option>
                  );
                })}
              </select>
            </div>

            <div>
              <div className={styles.formTitle}>Prompts</div>
              {chunks.map((chunkTemplate, i) => {
                return (
                  <div className={styles.formItem} key={i}>
                    <div className={styles.prompt} key={i}>
                      <TextareaDynamic className={styles.textarea} value={chunkTemplate} onChange={e => {
                        const promptset = promptsets.find(promptset => promptset.spec.name === currentPromptset);

                        const newChunks = chunks.slice();
                        newChunks[i] = e.target.value;
                        promptset.setPromptsetAttribute('chunks', newChunks);
                      }} />
                      <div className={styles.icons}>
                        <nav className={styles.icon} onClick={e => {
                          const promptset = promptsets.find(promptset => promptset.spec.name === currentPromptset);

                          const newChunks = chunks.slice();
                          newChunks.splice(i, 0, '');
                          promptset.setPromptsetAttribute('chunks', newChunks);
                        }}>
                          <img src="/ui/assets/icons/plus.svg" className={styles.img} />
                        </nav>
                        <nav className={styles.icon} onClick={e => {
                          const promptset = promptsets.find(promptset => promptset.spec.name === currentPromptset);

                          const newChunks = chunks.slice();
                          newChunks.splice(i, 1);
                          promptset.setPromptsetAttribute('chunks', newChunks);
                        }}>
                          <img src="/ui/assets/icons/minus.svg" className={styles.img} />
                        </nav>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className={styles.formItem}>
                <button className={styles.btn} onClick={e => {
                  // add a new chunk template
                  const newChunks = chunks.slice();
                  newChunks.push('');
                  setChunks(newChunks);
                }}>Add prompt</button>
              </div>
            </div>
          </div>
          <div className={classnames(
            styles.window,
            styles.side,
          )}>
            <div className={styles.formTitle}>Test LLM</div>

            <div className={styles.formItem}>
              <label>Character Name</label>
              <select
                value={forceAgentName}
                onChange={e => {
                  setForceAgentName(e.target.value);
                }}
              >
                <option value=''>[random character]</option>
                {aiAgents.map(aiAgent => {
                  const {
                    characterIdentity,
                  } = aiAgent;
                  const characterId = characterIdentity.spec.id;
                  const characterName = characterIdentity.spec.name;
                  return (
                    <option key={characterId} value={characterName}>{characterName}</option>
                  );
                })}
              </select>
            </div>

            <div className={styles.formItem}>
              <label>Skill Name</label>
              <select
                value={forceSkillName}
                onChange={e => {
                  const newSkill = e.target.value;
                  setForceSkillName(newSkill);
                }}
              >
                <option value=''>[random skill]</option>
                {allSkills.map(skill => {
                  const skillName = skill.spec.name;
                  return (
                    <option key={skillName} value={skillName}>{skillName}</option>
                  );
                })}
              </select>
            </div>
            
            <div className={styles.formItem}>
              <button
                className={styles.btn}
                onClick={async e => {
                  const contextObject = await aiAgentController.getContextObject();
                  const newContextString = JSON.stringify(contextObject, null, 2);
                  setContextString(newContextString);
                }}
              >Get context</button>
            </div>

            <div className={styles.formItem}>
              <textarea className={styles.textarea} value={contextString} placeholder='CONTEXT (JSON)' onChange={e => {
                setContextString(e.target.value);
              }} />
            </div>
            
            <div className={styles.formItem}>
              <input type='text' className={styles.text} value={userMessageString} placeholder='USER MESSAGE' onChange={e => {
                setUserMessageString(e.target.value);
              }} />
            </div>
            
            <div className={styles.formItem}>
              <button
                className={styles.btn}
                disabled={!contextString}
                onClick={e => {
                  const newPromptSpec = getPromptSpec();
                  if (newPromptSpec !== null) {
                    // if (userMessageString) {
                    //   newPromptSpec.messages.push({
                    //     role: 'user',
                    //     content: userMessageString,
                    //   });
                    // }

                    const newPromptString = formatMessagesDebug(newPromptSpec.messages);
                    setPromptString(newPromptString);
                  } else {
                    console.warn(parseErrorString);
                    setPromptString(parseErrorString);
                  }
                }}
              >Compile</button>
            </div>

            <div className={styles.formItem}>
              <textarea className={styles.textarea} value={promptString} placeholder='PROMPT' onChange={e => {
                setPromptString(e.target.value);
              }} />
            </div>

            {!generateAbortController ? (
              <div className={styles.formItem}>
                <button
                  className={styles.btn}
                  disabled={!promptString}
                  onClick={async e => {
                    const newPromptSpec = getPromptSpec();
                    if (newPromptSpec !== null) {
                      const abortController = new AbortController();
                      const {signal} = abortController;
                      setGenerateAbortController(abortController);

                      const stream = await aiAgentController.getCompletionStream(newPromptSpec, {
                        signal,
                      });

                      let newParsedMessages = [];
                      const skills = skillsClient.getSkills();
                      const avatarMlParser = new AvatarMLStreamParser({
                        skills,
                        onMessage: (message) => {
                          // console.log('got message', message);
                          newParsedMessages = [
                            ...newParsedMessages,
                            message,
                          ];
                          setParsedMessages(newParsedMessages);
                        },
                      });
                      const p = flushStream(avatarMlParser);
                      (async () => {
                        await p;
                        setGenerateAbortController(null);
                      })();

                      // read the stream to completion
                      (async () => {
                        const reader = stream.getReader();
                        const avatarMlWriter = avatarMlParser.writable.getWriter();
                        let newResponseString = '';
                        for (;;) {
                          const {
                            done,
                            value,
                          } = await reader.read();
                          if (!done) {
                            avatarMlWriter.write(value);

                            newResponseString += value;
                            setResponseString(newResponseString);
                          } else {
                            avatarMlWriter.close();
                            break;
                          }
                        }
                      })();
                    } else {
                      console.warn(parseErrorString);
                      setPromptString(parseErrorString);
                    }
                  }}
                >Generate</button>
              </div>
            ) : (
              <div className={styles.formItem}>
                <button
                  className={styles.btn}
                  disabled={!promptString}
                  onClick={e => {
                    generateAbortController.abort(abortError);
                    setGenerateAbortController(null);
                  }}
                >Stop</button>
              </div>
            )}
            <div className={styles.formItem}>
              <textarea className={styles.textarea} value={responseString} placeholder='RESPONSE' onChange={async e => {
                const newResponseString = e.target.value;
                setResponseString(newResponseString);

                // parse messages
                {
                  const newParsedMessages = [];
                  const skills = skillsClient.getSkills();
                  const avatarMlParser = new AvatarMLStreamParser({
                    skills,
                    onMessage: (message) => {
                      newParsedMessages.push(message);
                    },
                  });
                  const p = flushStream(avatarMlParser);

                  const avatarMlWriter = avatarMlParser.writable.getWriter();
                  avatarMlWriter.write(newResponseString);
                  avatarMlWriter.close();

                  await p;
                  setParsedMessages(newParsedMessages);
                }
              }} />
            </div>

            <div className={styles.messages}>
              {parsedMessages.map((message, i) => {
                const {
                  character,
                  command,
                  value,
                } = message;
                return (
                  <div className={styles.message} key={i}>
                    <div className={styles.text}>:{character}::{command}:::{value}</div>
                    <div className={styles.icon} onClick={e => {
                      // remove the message
                      const newParsedMessages = parsedMessages.slice();
                      newParsedMessages.splice(i, 1);
                      setParsedMessages(newParsedMessages);
                    }}>
                      <img src='/ui/assets/icons/minus.svg' className={styles.img} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.formItem}>
              <button
                className={styles.btn}
                disabled={parsedMessages.length === 0}
                onClick={e => {
                  const abortController = new AbortController();
                  const {
                    signal,
                  } = abortController;
                  const agentMessages = parsedMessages.map(message => {
                    return aiAgentController.makeAgentMessage(message, {
                      signal,
                    });
                  });
                  // console.log('run messages', agentMessages);
                  for (const agentMessage of agentMessages) {
                    aiAgentController.playAgentMessage(agentMessage);
                  }
                }}
              >Execute</button>

              {/* <button
                className={styles.btn}
                onClick={e => {
                  // XXX run the entire above pipeline with no interaction, to test
                }}
              >Run pipeline</button> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
  );
};

//

const SkillElement = ({
  skill,
  onRemove,
}) => {
  // if (!skill?.spec?.name) {
  //   console.warn('bad value', skill);
  //   debugger;
  //   throw new Error('fail');
  // }
  const [name, setName] = useState(skill.spec.name);
  const [value, setValue] = useState(skill.spec.value);
  const [description, setDescription] = useState(skill.spec.description);
  const [handlerUrl, setHandlerUrl] = useState(skill.spec.handlerUrl);

  // bind skill
  useEffect(() => {
    if (skill) {
      const update = () => {
        setName(skill.spec.name);
        setValue(skill.spec.value);
        setDescription(skill.spec.description);
        setHandlerUrl(skill.spec.handlerUrl);
      };
      const skillupdate = (e) => {
        update();
      };
      skill.addEventListener('skillupdate', skillupdate);

      return () => {
        skill.removeEventListener('skillupdate', skillupdate);
      };
    }
  }, [skill]);

  const onSave = () => {
    skill.setSkillAttribute('name', name);
    skill.setSkillAttribute('value', value);
    skill.setSkillAttribute('description', description);
    skill.setSkillAttribute('handlerUrl', handlerUrl);
  };
  const onRevert = () => {
    setName(skill.spec.name);
    setValue(skill.spec.value);
    setDescription(skill.spec.description);
    setHandlerUrl(skill.spec.handlerUrl);
  };

  return (
    <div className={styles.skill}>
      <div className={classnames(
        styles.icons,
      )}>
        <nav className={styles.icon} onClick={e => {
          onSave(skill);
        }}>
          <img src='/images/save.svg' className={styles.img} />
        </nav>
        <nav className={styles.icon} onClick={e => {
          onRevert(skill);
        }}>
          <img src='/images/revert.svg' className={styles.img} />
        </nav>
        <nav className={styles.icon} onClick={e => {
          onRemove(skill);
        }}>
          <img src="/ui/assets/icons/minus.svg" className={styles.img} />
        </nav>
      </div>
      <div className={styles.formItem}>
        <label>Name</label>
        <input type="text" value={name} onChange={e => {
          skill.setSkillAttribute('name', e.target.value);
        }} />
      </div>
      <div className={styles.formItem}>
        <label>Example</label>
        <input type="text" value={value} onChange={e => {
          skill.setSkillAttribute('value', e.target.value);
        }} />
      </div>
      <div className={styles.formItem}>
        <label>Description</label>
        <textarea value={description} onChange={e => {
          skill.setSkillAttribute('description', e.target.value);
        }} />
      </div>
      <div className={styles.formItem}>
        <label>Handler url</label>
        <input type="text" value={handlerUrl} onChange={e => {
          skill.setSkillAttribute('handlerUrl', e.target.value);
        }} />
      </div>
    </div>
  );
};
const SkillsSettings = ({
  skillsClient,
  skills,
}) => {
  const allSkills = Array.from(skills.values());

  const scrollToRef = useRef();

  const addNewSkill = () => {
    skillsClient.addNewSkill();
    setTimeout(()=> {
      scrollToRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 300);
  }

  return (
    <>
      <div className={styles.actions}>
        <button className={styles.btn} onClick={e => {
          addNewSkill();
        }}>Add skill</button>
      </div>
      <div className={
        classnames(
          styles.row,
          styles.scroll,
          styles.skillsSettings,
      )}>
        <div className={styles.skills}>
          {allSkills.map((skill, i) => {
            return (
              <SkillElement
                skill={skill}
                onRemove={e => {
                  skillsClient.removeSkill(skill);
                }}
                key={i}
              />
            );
          })}
          <div ref={scrollToRef} />
        </div>
      </div>
    </>
  );
};

//

export const CompanionSettings = ({
  // playerSpecs,
  // currentPlayerId,
  companionRenderer,

  promptClient,
  // skillsClient,

  characterIdentity,

  // companionClient,
  voices,
  // companionSettingsClient,
  npcLoader,

  skills: globalSkills,
}) => {
  // const playerSpec = playerSpecs ? playerSpecs.find(playerSpec => playerSpec.id === currentPlayerId) : null;

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [visualDescription, setVisualDescription] = useState('');
  const [promptset, setPromptset] = useState('');
  const [skills, setSkills] = useState([]);
  const [voiceEndpoint, setVoiceEndpoint] = useState('');
  const [imageModel, setImageModel] = useState('');
  const [cameraUvw, setCameraUvw] = useState(defaultCameraUvw);
  const [cameraFov, setCameraFov] = useState([0, 0, 0]);

  const [voiceEndpointSpecs, setVoiceEndpointSpecs] = useState(null);

  //

  const allPromptsets = Array.from(promptClient.getPromptsets().values());
  const allSkills = Array.from(globalSkills.values());

  //

  // bind character identity
  useEffect(() => {
    if (characterIdentity) {
      // initialize
      {
        const playerSpec = characterIdentity?.spec;

        setName(playerSpec?.name ?? '');
        setBio(playerSpec?.bio ?? '');
        setVisualDescription(playerSpec?.visualDescription ?? '');
        setPromptset(playerSpec?.promptset ?? '');
        setSkills(playerSpec?.skills ?? []);
        setVoiceEndpoint(playerSpec?.voiceEndpoint ?? '');
        setImageModel(playerSpec?.imageModel ?? '');
        setCameraUvw(playerSpec?.cameraUvw ?? defaultCameraUvw);
        setCameraFov(playerSpec?.cameraFov ?? minFov);
      }

      // listen
      const characterupdate = e => {
        const {
          key,
          value: newValue,
        } = e.data;
        switch (key) {
          case 'name': {
            setName(newValue);
            break;
          }
          case 'bio': {
            setBio(newValue);
            break;
          }
          case 'visualDescription': {
            setVisualDescription(newValue);
            break;
          }
          case 'promptset': {
            setPromptset(newValue);
            break;
          }
          case 'skills': {
            setSkills(newValue);
            break;
          }
          case 'voiceEndpoint': {
            setVoiceEndpoint(newValue);
            break;
          }
          case 'imageModel': {
            setImageModel(newValue);
            break;
          }
          case 'cameraUvw': {
            if (!arrayEquals(cameraUvw, newValue)) {
              setCameraUvw(newValue);
            }
            break;
          }
          case 'cameraFov': {
            if (newValue !== cameraFov) {
              setCameraFov(newValue);
            }
            break;
          }
          default: {
            console.warn('unhandled character update', e.data);
            break;
          }
        }
      };
      characterIdentity.addEventListener('characterupdate', characterupdate);

      return () => {
        characterIdentity.removeEventListener('characterupdate', characterupdate);
      };
    }
  }, [characterIdentity]);

  // load voice specs
  useEffect(() => {
    let live = true;

    (async () => {
      await voices.waitForLoad();
      if (!live) return;

      const voiceEndpointSpecs = Object.keys(voices.voiceEndpoints)
        .flatMap(model => {
          return voices.voiceEndpoints[model].map(voice => {
            const {
              name,
              voiceId,
            } = voice;
            const label = `${name} (${model})`;
            const value = `${model}:${name}`
            return {
              value,
              label,
            };
          });
        });
      setVoiceEndpointSpecs(voiceEndpointSpecs);
    })();

    return () => {
      live = false;
    };
  }, []);

  return (
    <div className={styles.scroll}>
      <div className={styles.formItem}>
        <label>Name</label>
        <input
          type="text"
          value={name}
          onChange={e => {
            characterIdentity.setCharacterAttribute('name', e.target.value);
          }}
        />
      </div>
      <div className={styles.formItem}>
        <label>Bio</label>
        <textarea
          value={bio}
          onChange={e => {
            characterIdentity.setCharacterAttribute('bio', e.target.value);
          }}
        ></textarea>
      </div>
      <div className={styles.formItem}>
        <label>Visual description</label>
        <textarea
          value={visualDescription}
          onChange={e => {
            characterIdentity.setCharacterAttribute('visualDescription', e.target.value);
          }}
        ></textarea>
      </div>
      <div className={styles.formItem}>
        <label>Voice model</label>
        <select onChange={e => {
          characterIdentity.setCharacterAttribute('voiceEndpoint', e.target.value);
        }} value={voiceEndpoint}>
          {voiceEndpointSpecs ?
            voiceEndpointSpecs
              .map(({
                value,
                label,
              }) => {
                // console.log('got option value', {value, label});
                return (
                  <option value={value} key={value}>{label}</option>
                );
              })
          : null}
        </select>
      </div>
      <div className={styles.formItem}>
        <label>Prompt set</label>
        <select
          onChange={e => {
            characterIdentity.setCharacterAttribute('promptset', e.target.value);
          }}
          value={promptset}
        >
          {allPromptsets.map((promptset, i) => {
            return (
              <option value={promptset.name} key={i}>{promptset.name}</option>
            );
          })}
        </select>
      </div>
      <div className={styles.formItem}>
        <label>Skill set</label>
        <div className={styles.row}>
          <select>
            {allSkills.map((skill, i) => {
              return (
                <option value={skill.name} key={i}>{skill.name}</option>
              );
            })}
          </select>
          <button className={styles.btn} onClick={e => {
            const newSkills = skills.slice();
            characterIdentity.setCharacterAttribute('skills', newSkills);
          }}>Add skill</button>
        </div>
      </div>
      <div className={styles.formItem}>
        {/* this should move to the prompt client */}
        <label>Image model</label>
        <select onChange={e => {
          characterIdentity.setCharacterAttribute('imageModel', e.target.value);
        }} value={imageModel}>
          {imageModelSpecs.map(imageModel => {
            const {
              value,
              label,
            } = imageModel;
            return (
              <option value={value} key={value}>{label}</option>
            );
          })}
        </select>
      </div>
      <div className={styles.formItem}>
        <label>Camera UVW</label>
        <div className={styles.row}>
          <UvSelector value={[cameraUvw[0], cameraUvw[1]]} onChange={value => {
            const newCameraUvw = cameraUvw.slice();
            newCameraUvw[0] = value[0];
            newCameraUvw[1] = value[1];

            characterIdentity.setCharacterAttribute('cameraUvw', newCameraUvw);
          }} />
        </div>
        <div className={styles.formItem}>
          <label>Fov</label>
          <input type="range" className={styles.horizontal} min="5" max="60" step="1" value={cameraFov} onChange={e => {
            characterIdentity.setCharacterAttribute('cameraFov', e.target.value);
          }} />
        </div>
        <div className={styles.formItem}>
          <label>Zoom</label>
          <input type="range" min="0" max="1" step="0.01" value={cameraUvw[2]} className={styles.horizontal}
            onChange={e => {
              const newCameraUvw = cameraUvw.slice();
              newCameraUvw[2] = Number(e.target.value);

              characterIdentity.setCharacterAttribute('cameraUvw', newCameraUvw);
            }} />
        </div>
      </div>
      <div className={styles.formItem}>
        <button onClick={async e => {
          const blob = await exportNpcPlayer(characterIdentity.spec, npcLoader, companionRenderer);
          downloadFile(blob, 'export.png');
        }}>Export avatar</button>
      </div>
    </div>
  );
}

//

const aiFpsSpecs = [
  0.125,
  0.25,
  0.5,
  1,
  2,
  4,
  8,
  16,
  32,
];
const RenderControls = ({
  compiler,
  clearScriptCache,
  renderVirtualScene,
  renderVideo,
  renderAudio,
  renderFull,
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState(`https://www.youtube.com/watch?v=b_e7GnQvKxI`);
  const [aiFps, setAiFps] = useState(0.5);
  const [cacheScripts, setCacheScripts] = useState(true);

  const _renderVirtualScene = async () => {
    const file = await selectFile();
    await renderVirtualScene(file);
  };
  const _renderVideo = () => {
    renderVideo({
      youtubeUrl,
      aiFps,
      cacheScripts,
    });
  };
  const _renderAudio = () => {
    renderAudio({
      youtubeUrl,
      aiFps,
      cacheScripts,
    });
  };
  const _renderFull = () => {
    renderFull({
      youtubeUrl,
      aiFps,
      cacheScripts,
    });
  };

  return (
    <div>
      <div className={styles.formItem}>
        <button onClick={e => {
          _renderVirtualScene();
        }}>Render virtual scene</button>
      </div>

      <br />

      <div className={styles.formItem}>
        <label>Youtube URL</label>
        <input type="text" value={youtubeUrl} placeholder='https://www.youtube.com/watch?v=b_e7GnQvKxI' onChange={e => {
          setYoutubeUrl(e.target.value);
        }} disabled={!!compiler} />
      </div>

      <div className={styles.formItem}>
        <label>AI fps</label>
        <select value={aiFps} onChange={e => {
          setAiFps(Number(e.target.value));
        }} disabled={!!compiler}>
          {aiFpsSpecs.map(aiFps => {
            return (
              <option value={aiFps} key={aiFps}>{aiFps}</option>
            );
          })}
        </select>
      </div>

      <Switch
        label={"Cache Scripts"}
        icon={"browserWindow"}
        checked={cacheScripts}
        onChange={e => {
          setCacheScripts(e.target.checked);
        }}
        disabled={!!compiler}
      />
      <div className={styles.formItem}>
        <button onClick={e => {
          clearScriptCache();
        }} disabled={!!compiler}>Clear cache</button>
      </div>
      <div className={styles.formItem}>
        <button onClick={e => {
          _renderVideo();
        }} disabled={!!compiler}>Render video</button>
      </div>
      <div className={styles.formItem}>
        <button onClick={e => {
          _renderAudio();
        }} disabled={!!compiler}>Render audio</button>
      </div>
      <div className={styles.formItem}>
        <button onClick={e => {
          _renderFull();
        }} disabled={!!compiler}>Full render</button>
      </div>
    </div>
  );
};

//

const WorldElement = ({
  worldIdentity,
  selected,
  onClick,
  onRemove,
}) => {
  const [sceneUrl, setSceneUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    const worldupdate = e => {
      ensure();
    };
    worldIdentity.addEventListener('worldupdate', worldupdate);

    const ensure = async () => {
      await worldIdentity.ensureScene();
      setSceneUrl(worldIdentity.spec.sceneUrl);
      setPreviewUrl(worldIdentity.spec.previewUrl);
    };
    ensure();

    return () => {
      worldIdentity.removeEventListener('worldupdate', worldupdate);
    };
  }, [worldIdentity]);

  const {
    prompt,
  } = worldIdentity.spec.source;

  return (
    <div className={classnames(
      styles.world,
      selected ? styles.selected : null,
      sceneUrl ? styles.loaded : null,
    )} onClick={e => {
      onClick();
    }}>
      <div className={styles.name}>
        {prompt}
      </div>
      <div className={classnames(
        styles.imgs,
      )}>
        <img src={previewUrl} className={styles.img} />
      </div>
      <div className={classnames(
        styles.buttons,
      )}>
        <nav className={styles.button} onClick={e => {
          e.preventDefault();
          e.stopPropagation();

          onRemove();
        }}>
          <img src='/ui/assets/icons/erase.svg' className={styles.icon} />
        </nav>
      </div>
    </div>
  );
};

//

const WorldsElement = ({
  worldsClient,
}) => {
  const [prompt, setPrompt] = useState(defaultSkyboxPrompt);
  const [worlds, setWorlds] = useState([]);
  const [currentWorldIds, setCurrentWorldIds] = useState([]);

  useEffect(() => {
    const worldidentitiesupdate = e => {
      const {
        worldIdentities,
      } = e.data;
      setWorlds(worldIdentities);
    };
    worldsClient.addEventListener('worldidentitiesupdate', worldidentitiesupdate);
    const currentworldidsupdate = e => {
      const {
        currentWorldIds,
      } = e.data;
      setCurrentWorldIds(currentWorldIds);
    };
    worldsClient.addEventListener('currentworldidsupdate', currentworldidsupdate);

    return () => {
      worldsClient.removeEventListener('worldidentitiesupdate', worldidentitiesupdate);
      worldsClient.removeEventListener('currentworldidsupdate', currentworldidsupdate);
    };
  }, []);

  const generateWorld = async prompt => {
    const source = await generateSkybox({
      prompt,
    });
    await worldsClient.addWorld({
      source,
    });
  };

  return (
    <div className={styles.worldsElement} onClick={e => {
      e.stopPropagation();
    }}>
      <input className={styles.input} placeholder="Where do you want to go today?" value={prompt} onChange={e => {
        setPrompt(e.target.value);
      }} />
      <button className={styles.button} onClick={e => {
        generateWorld(prompt);
      }}>Generate</button>
      <div className={styles.worlds}>
        {worlds.map((worldIdentity, i) => {
          const {
            source: {
              id,
            },
          } = worldIdentity.spec;

          return (
            <WorldElement
              worldIdentity={worldIdentity}
              selected={currentWorldIds.includes(id)}
              onClick={e => {
                if (currentWorldIds.includes(id)) {
                  worldsClient.setCurrentWorldIds([]);
                } else {
                  worldsClient.setCurrentWorldIds([
                    id,
                  ]);
                }
              }}
              onRemove={() => {
                // console.log('delete world', {id});
                worldsClient.deleteWorldId(id);
              }}
              key={id}
            />
          );
        })}
      </div>
    </div>
  );
};

//

export const CompanionQuickSettings = ({
  companionClient,
  memoryClient,
  promptClient,
  skillsClient,
  companionSettingsClient,
  worldsClient,

  voices,
  settingsHover,
  devtoolsOpen,
  settingsMode,
  setSettingsMode,
  terminalOpen,
  setTerminalOpen,
  browserOpen,
  setBrowserOpen,

  characterIdentities,
  npcPlayers,
  agentCharacterIdentities,
  companionRenderer,

  aiAgentController,

  showDebugPerception,
  setShowDebugPerception,

  screenshotEnabled,
  setScreenshotEnabled,

  microphones,
  facecams,

  skills,
  sources,

  aiAgents,

  captureMode,
  setCaptureMode,

  discordEnabled,
  setDiscordEnabled,
  npcLoader,
  compiler,
  clearScriptCache,

  enterXr,

  fullscreenEnabled,
  setFullscreenEnabled,

  renderVirtualScene,
  renderVideo,
  renderAudio,
  renderFull,
}) => {
  const skillsLocked = settingsMode === 'skills';
  const setSkillsLocked = (locked) => {
    setSettingsMode(locked ? 'skills' : "settings");
  };

  const promptLocked = settingsMode === 'prompt';
  const setPromptLocked = (locked) => {
    setSettingsMode(locked ? 'prompt' : "settings");
  };

  if (electronIpc) {
    useEffect(() => {
      if (skillsLocked || promptLocked) {
        electronIpc.browserAddSolid();

        return () => {
          electronIpc.browserRemoveSolid();
        };
      }
    }, [skillsLocked, promptLocked]);
  }

  const selectUploadAvatar = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async e => {
      await importFiles(e.target.files, companionClient);
    };
    input.click();
  };

  const currentCharacterIdentity = agentCharacterIdentities.length > 0 ? agentCharacterIdentities[0] : characterIdentities[0];

  return (
    <div className={classnames(
      styles.quickSettings,
      (settingsHover || devtoolsOpen || skillsLocked || promptLocked) ? styles.hover : null,
    )}>
      {/* <div className={classnames(
        styles.toolbar,
        styles.wrap,
        settingsMode === null ? styles.open : null,
      )}>
        <SettingsButton
          icon="devTools"
          active={devtoolsOpen ? true : false}
          onClick={e => {
            globalThis.electronIpc.toggleDevTools();
          }}
        />
        <SettingsButton
          icon="userSettings"
          active={settingsMode === 'companionSettings' ? true : false}
          onClick={e => {
            toggleSettingsMode('companionSettings');
          }}
        />
        <SettingsButton
          icon="party"
          active={settingsMode === 'avatarGallery' ? true : false}
          onClick={e => {
            toggleSettingsMode('avatarGallery');
          }}
        />
        <SettingsButton
          icon="chat"
          active={chatLocked ? true : false}
          onClick={e => {
            setChatLocked(!chatLocked);
          }}
        />

        <div className={styles.multiButton}>
          <SettingsButton
            icon="auto"
            active={captureMode === 'auto'}
            onClick={e => {
              setCaptureMode('auto');
            }}
          />
          <SettingsButton
            icon="camera"
            active={captureMode === 'facetime'}
            onClick={e => {
              setCaptureMode('facetime');
            }}
          />
          <div className={styles.padding} />
        </div>

        <SettingsButton
          icon="memory"
          active={settingsMode === 'memoryViewer' ? true : false}
          onClick={e => {
            setSettingsMode('memoryViewer');
          }}
        />
        <SettingsButton
          icon="screenshot"
          active={screenshotEnabled}
          onClick={e => {
            setScreenshotEnabled(!screenshotEnabled);
          }}
        />
        <SettingsButton
          icon="xr"
          active={false}
          onClick={e => {
            enterXr();
          }}
        />
        <SettingsButton
          icon="map"
          active={settingsMode === 'worlds' ? true : false}
          onClick={e => {
            setSettingsMode('worlds');
          }}
        />
        <SettingsButton
          icon="generalSettings"
          active={settingsMode === 'settings' ? true : false}
          onClick={e => {
            setSettingsMode('settings');
          }}
        />
      </div> */}

      { /* COMPANION SETTINGS */ }

      <div className={classnames(
        styles.wrap,
        styles.full,
        settingsMode === 'companionSettings' ? styles.open : null,
      )}>
        <div className={styles.header}>
          <BackButton
            icon="caretLeft"
            onClick={force => {
              if (!skillsLocked || force) {
                setSkillsLocked(false);
                setSettingsMode(null);
              }
            }}
          />
          <div className={styles.settingsTitle}>Companion Settings</div>
        </div>
        <CompanionSettings
          // playerSpecs={playerSpecs}
          // currentPlayerId={currentPlayerId}
          companionRenderer={companionRenderer}

          promptClient={promptClient}
          // skillsClient={skillsClient}

          characterIdentity={currentCharacterIdentity}

          companionClient={companionClient}
          voices={voices}
          npcLoader={npcLoader}

          skills={skills}
        />
      </div>

      { /* AVATAR GALLERY */ }

      <div className={classnames(
        styles.wrap,
        styles.full,
        settingsMode === 'avatarGallery' ? styles.open : null,
      )} onClick={e => {
        e.stopPropagation();
      }}>
        <div className={styles.header}>
          <BackButton
            icon="caretLeft"
            onClick={e => {
              setSettingsMode(null);
            }}
          />
          <div className={styles.settingsTitle}>Avatar Gallery</div>
        </div>
        <div className={classnames(
          styles.avatarGallery,
          styles.scroll,
        )}>
          {
            characterIdentities.map((characterIdentity, i) => {
              const playerSpec = characterIdentity.spec;

              return <AvatarOption
                settingsMode = {settingsMode}

                agentCharacterIdentities={agentCharacterIdentities}
                characterIdentity={characterIdentity}
                npcPlayers={npcPlayers}
                companionRenderer={companionRenderer}

                npcLoader={npcLoader}

                onClick={e => {
                  companionClient.setCurrentCharacterIds([
                    playerSpec.id,
                  ]);
                }}
                onAdd={e => {
                  companionClient.setCurrentCharacterIds([
                    ...companionClient.currentCharacterIds,
                    playerSpec.id,
                  ]);
                }}
                onRemove={e => {
                  companionClient.setCurrentCharacterIds(
                    companionClient.currentCharacterIds.filter(id => id !== playerSpec.id)
                  );
                }}
                onDelete={e => {
                  companionClient.deleteCharacterId(playerSpec.id);
                }}
                key={playerSpec.id}
              />
            })
          }
          <div className={classnames(
            styles.avatarOptionPlaceholder,
          )} onClick={e => {
            selectUploadAvatar();
          }}>
            <img src='/ui/assets/icons/plus.svg' className={styles.icon} />
          </div>
        </div>
      </div>

      { /* PROMPTS */ }

      <div className={classnames(
        styles.wrap,
        styles.max,
        (settingsMode === 'prompt' || promptLocked)  ? styles.open : null,
      )}>
        <div className={styles.header}>
          <BackButton
            icon="caretLeft"
            onClick={e => {
              setSettingsMode(null);
            }}
          />
          <div className={styles.settingsTitle} onClick={e => {
            e.stopPropagation();
          }}>Prompts</div>
        </div>
        <PromptSettings
          promptClient={promptClient}
          skillsClient={skillsClient}

          setSettingsMode={setSettingsMode}
          aiAgentController={aiAgentController}

          // characterIdentities={characterIdentities}
          aiAgents={aiAgents}
          skills={skills}
        />
      </div>

      { /* SKILLS */ }

      <div className={classnames(
        styles.wrap,
        styles.max,
        skillsLocked ? styles.open : null,
      )}>
        <div className={styles.header}>
          <BackButton
            icon="caretLeft"
            onClick={e => {
              setSettingsMode(null);
            }}
          />
          <div className={styles.settingsTitle}>Skill sets</div>
        </div>
        <SkillsSettings
          skillsClient={skillsClient}
          skills={skills}
        />  
      </div>

      { /* RENDER */ }

      <div className={classnames(
        styles.wrap,
        styles.full,
        settingsMode === 'render' ? styles.open : null,
      )}>
        <div className={styles.header}>
          <BackButton
            icon="caretLeft"
            onClick={e => {
              setSettingsMode(null);
            }}
          />
          <div className={styles.settingsTitle}>Render Controls</div>
        </div>
        <RenderControls
          compiler={compiler}
          clearScriptCache={clearScriptCache}
          renderVirtualScene={renderVirtualScene}
          renderVideo={renderVideo}
          renderAudio={renderAudio}
          renderFull={renderFull}
        />
      </div>

      { /* GENERAL SETTINGS */ }

      <div className={classnames(
        styles.wrap,
        styles.full,
        settingsMode === 'settings' ? styles.open : null,
      )}>
        <div className={styles.header}>
          <BackButton
            icon="caretLeft"
            onClick={e => {
              setSettingsMode(null);
            }}
          />
          <div className={styles.settingsTitle}>General Settings</div>
        </div>
        <div className={classnames(
          styles.row,
          styles.scroll,
          styles.generalSettings,
        )}>
          <GeneralSettings
            companionClient={companionClient}
            // promptClient={promptClient}
            // skillsClient={skillsClient}
            worldsClient={worldsClient}

            companionSettingsClient={companionSettingsClient}
            aiAgentController={aiAgentController}
            aiAgents={aiAgents}

            // characterIdentity={currentCharacterIdentity}

            showDebugPerception={showDebugPerception}
            setShowDebugPerception={setShowDebugPerception}

            microphones={microphones}
            facecams={facecams}
            memoryClient={memoryClient}
            // playerSpecs={playerSpecs}
            // currentPlayerId={currentPlayerId}
            browserOpen={browserOpen}
            setBrowserOpen={setBrowserOpen}
            terminalOpen={terminalOpen}
            setTerminalOpen={setTerminalOpen}
            settingsMode={settingsMode}
            setSettingsMode={setSettingsMode}
            discordEnabled={discordEnabled}
            setDiscordEnabled={setDiscordEnabled}
            compiler={compiler}
            clearScriptCache={clearScriptCache}

            fullscreenEnabled={fullscreenEnabled}
            setFullscreenEnabled={setFullscreenEnabled}

            renderVirtualScene={renderVirtualScene}
            renderVideo={renderVideo}
            renderAudio={renderAudio}
            renderFull={renderFull}

            captureMode={captureMode}
            setCaptureMode={setCaptureMode}

            setSkillsLocked={setSkillsLocked}
            skillsLocked={skillsLocked}
            setPromptLocked={setPromptLocked}
            promptLocked={promptLocked}
          />
        </div>
      </div>
      { /* MEMORY VIEWER */ }
      <div className={classnames(
        styles.wrap,
        styles.full,
        settingsMode === 'memoryViewer' ? styles.open : null,
      )}>
        <div className={styles.header}>
          <BackButton
            icon="caretLeft"
            onClick={e => {
              setSettingsMode(null);
            }}
          />
          <div className={styles.settingsTitle}>Memory Viewer</div>
        </div>
        <div className={classnames(
          styles.row,
          styles.scroll,
          styles.generalSettings,
        )}>
          <MemoryViewer
            aiAgentController={aiAgentController}
          />
        </div>
      </div>
      
      { /* WORLDS */ }

      <div className={classnames(
        styles.wrap,
        styles.full,
        styles.max,
        settingsMode === 'worlds' ? styles.open : null,
      )}>
        <div className={styles.header}>
          <BackButton
            icon="caretLeft"
            onClick={e => {
              setSettingsMode(null);
            }}
          />
          <div className={styles.settingsTitle}>Worlds</div>
        </div>
        <WorldsElement
          worldsClient={worldsClient}
        />
      </div>

    </div>
  );
};