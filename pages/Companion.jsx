import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';
import Avatar from '../packages/engine/avatars/avatars.js';
import {
  AiAgentController,
} from '../packages/engine/ai-agent/controllers/ai-agent-controller.js';
import {
  EnvironmentManager,
} from '../packages/engine/environment/environment-manager.js';

import {
  AiClient,
} from '../packages/engine/clients/ai-client.js';
import {
  VectorDatabaseClient,
} from '../packages/engine/clients/vector-database-client.js';
import {
  Memory,
  MemoryClient,
} from '../packages/engine/clients/memory-client.js';
import {
  PerceptionContextClient,
} from '../packages/engine/clients/perception-context-client.js';
import {
  PromptClient,
} from '../packages/engine/clients/prompt-client.js';
import {
  SkillsClient,
} from '../packages/engine/clients/skills-client.js';
import {
  FileDatabaseClient,
} from '../packages/engine/clients/file-database-client.js';
import {
  CharacterClient,
} from '../packages/engine/clients/character-client-old.js';
import {
  WorldsClient,
} from '../packages/engine/clients/worlds-client.js';

import {
  CompanionSettingsClient,
} from '../packages/engine/clients/companion-settings-client.js';
import {
  Voices,
} from '../packages/engine/voices.js';
import {
  Sounds,
} from '../packages/engine/sounds.js';
import {
  AudioManager,
} from '../packages/engine/audio/audio-manager.js';
import {
  CompanionAppContextFactory,
} from '../packages/app-runtime/companion-app-context-factory.js';
import {
  ImportManager,
} from '../packages/app-runtime/import-manager.js';
import {
  NpcLoader,
} from './helpers/npc-loader.js';
import physicsManager from '../packages/engine/physics/physics-manager.js';
import '../packages/engine/metaversefile-binding.js';
import {
  QueueManager,
} from '../packages/engine/managers/queue/queue-manager.js';
import {fuzzy} from 'fast-fuzzy';
import anime from 'animejs';
import {
  CompanionRenderSpec,
  CompanionRenderer,
} from '../packages/engine/renderers/companion-renderer.js';
// import {
//   GameRenderer,
// } from '../packages/engine/renderers/game-renderer.js';
import {
  encryptionKey,
  loadNpcPlayer,
  importCardBlob,
  importItems,
  normalizeText,
} from '../packages/engine/utils/companion-utils.js';
import {
  makeId,
  addDefaultLights,
} from '../packages/engine/util.js';
import {
  zbencode,
  zbdecode,
} from '../packages/zjs/encoding.mjs';
import {
  OpusDecoder,
} from 'opus-decoder';
import {
  whisperTranscribe,
} from './helpers/WhisperTranscribe.js';
import audioBufferToWav from 'audiobuffer-to-wav';
import {
  GameCanvas,
} from './components/game-canvas/GameCanvas.jsx';
import {
  imageSelection,
} from '../packages/engine/vqa.js';

//

import {CompanionQuickSettings} from './components/companion-quick-settings/CompanionQuickSettings.jsx';
import {CompanionChat} from './components/companion-chat/CompanionChat.jsx';
import {AiTimings} from './components/ai-timings/AiTimings.jsx';
import {TerminalElement} from './components/terminal-element/TerminalElement.jsx';
import {BrowserElement} from './components/browser-element/BrowserElement.jsx';

//

import {
  RealtimePerceptionDriver,
} from '../packages/engine/ai-agent/drivers/realtime-perception-driver.js';
import {VoiceListener} from './classes/VoiceListener.jsx';

import {
  canvasDimensions,
  defaultCameraUvw,
} from '../packages/engine/constants/companion-constants.js';
import {
  memoryDatabaseDataDirectoryName,
  characterDatabaseDataDirectoryName,
  worldsDatabaseDataDirectoryName,
} from '../packages/engine/constants/client-constants.js';
import {
  minFov,
} from '../packages/engine/constants.js';
import {
  AudioInjectWorkletNode,
} from '../packages/engine/audio/inject-worklet-node.js';
import {
  VideoScriptCompiler,
  AudioScriptCompiler,
  FullScriptCompiler,
} from '../packages/engine/ai-agent/drivers/media-script-driver.js';
import {
  compileVirtualScene,
} from '../packages/gen/src/generators/scene-generator.js';

import CompanionEmoteManager from '../packages/engine/managers/companion-emote/companion-emote-manager.js';

import {
  RainbowComponent,
} from './components/rainbow-component/RainbowComponent.jsx';

//

import styles from '../styles/Companion.module.css';

//

const {
  electronIpc,
} = globalThis;
const isMobile = typeof globalThis.orientation !== 'undefined';
let lastAltState = 'up';
let lastAltDownTimestamp = -Infinity;

// top-level globals

const aiClient = new AiClient();
const vectorDatabaseClient = new VectorDatabaseClient({
  aiClient,
  dataDirectoryName: memoryDatabaseDataDirectoryName,
});
const memoryClient = new MemoryClient({
  aiClient,
  vectorDatabaseClient,
});
const perceptionContextClient = new PerceptionContextClient();
const promptClient = new PromptClient();
const skillsClient = new SkillsClient();

const characterDatabaseClient = new FileDatabaseClient({
  dataDirectoryName: characterDatabaseDataDirectoryName,
});
const characterClient = new CharacterClient({
  fileDatabaseClient: characterDatabaseClient,
});

const worldsDatabaseClient = new FileDatabaseClient({
  dataDirectoryName: worldsDatabaseDataDirectoryName,
});
const worldsClient = new WorldsClient({
  fileDatabaseClient: worldsDatabaseClient,
});

const companionSettingsClient = new CompanionSettingsClient();
// Used to update the settings skills descriptions 
const updateSettingsDescription = () => {
  let settings_description = `Change a setting ONLY if the user has just asked for it. Here are the current settings: VOLUME [curval = ${companionSettingsClient.getSetting('volume')}, minval = 0, maxval = 100], CLOSED_CAPTIONING [curval = ${companionSettingsClient.getSetting('closedCaptioning')}].`;
  skillsClient.getSkills().get('SETTINGS_CHANGE').setSkillAttribute('description', settings_description); // initialize the settings skill with values
};
const renderVirtualScene = async (file) => {
  const imageArrayBuffer = await file.arrayBuffer();
  const zine = await compileVirtualScene({
    imageArrayBuffer,
  });
  console.log('got compiled scene', zine);
  return zine;
};

// engine objects

const audioContext = new AudioContext();
const audioManager = new AudioManager({
  audioContext,
});
const environmentManager = new EnvironmentManager();
const companionAppContextFactory = new CompanionAppContextFactory();
const physicsTracker = {
  addAppPhysicsObject() {},
};
const importManager = new ImportManager();
const voices = new Voices();
const sounds = new Sounds({
  audioManager,
  ioBus: null,
});

const voiceOutputManager = new QueueManager();
const voiceStreamManager = new QueueManager({
  parallelism: 2,
});

const npcLoader = new NpcLoader({
  voices,
  sounds,
  audioManager,
  environmentManager,
  importManager,
  appContextFactory: companionAppContextFactory,
  physicsTracker,
});

const companionLoadPromises = [
  vectorDatabaseClient.waitForLoad(),
  Avatar.waitForLoad(),
  physicsManager.waitForLoad(),
  audioManager.waitForLoad(),
  voices.waitForLoad(),
  characterClient.waitForLoad(),
  worldsClient.waitForLoad(),
  CompanionEmoteManager.waitForLoad(),
  // hnswManager.waitForLoad(),
];
const companionLoadPromise = Promise.all(companionLoadPromises).then(() => {});
// console.log('load promises', companionLoadPromises);
const companionWaitForLoad = () => companionLoadPromise;

class WindowMetricsManager extends EventTarget {
  constructor(data = null) {
    super();

    this.data = data;
  }
  getData() {
    return this.data;
  }
  setData(data) {
    this.data = data;

    this.dispatchEvent(new MessageEvent('update'));
  }
}
const windowMetricsManager = new WindowMetricsManager({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  displayWidth: 0,
  displayHeight: 0,
  mouseX: 0,
  mouseY: 0,
});

//

const AnimatedText = ({
  className,
  text,
  visible,
  onEnd,
}) => {
  const [cacheMap, setCacheMap] = useState(new Map());
  const divRef = useRef();

  const letters = text.split('');

  useEffect(() => {
    const div = divRef.current;
    if (div) {
      const oldTimeline = cacheMap.get('timeline');
      const letterEls = Array.from(div.querySelectorAll(`.${styles.letter}`));

      if (visible && !cacheMap.get('visible')) {
        // console.log('trigger in');

        cacheMap.set('visible', true);

        if (oldTimeline) {
          oldTimeline.pause();
        }

        const newTimeline = anime.timeline({
          // loop: true,
        });
        newTimeline
          .add({
            // targets: `.${styles.ml12}.${className} .${styles.letter}`,
            targets: letterEls,
            opacity: [
              oldTimeline ? oldTimeline.progressValue / 100 : 0,
              1,
            ],
            easing: "easeOutExpo",
            duration: 1200,
            delay: (el, i) => 30 * i,
            update: anim => {
              newTimeline.progressValue = anim.progress;
            },
          });
        newTimeline.progressValue = 0;

        cacheMap.set('timeline', newTimeline);
      } else if (!visible && cacheMap.get('visible')) {
        cacheMap.set('visible', false);

        if (oldTimeline) {
          oldTimeline.pause();
        }

        const newTimeline = anime.timeline({
          // loop: true,
        });
        newTimeline
          .add({
            // targets: `.${styles.ml12}.${className} .${styles.letter}`,
            // targets: letterEls,
            targets: [div],
            translateY: [0, -30],
            opacity: [
              // oldTimeline ? oldTimeline.progressValue / 100 : 0,
              1,
              0,
            ],
            // easing: "easeInExpo",
            easing: "easeOutExpo",
            duration: 200,
            // delay: (el, i) => 5 * i,
            update: anim => {
              newTimeline.progressValue = anim.progress;
            },
            complete: () => {
              // console.log('complete out 2');
              onEnd();
            },
          });
        newTimeline.progressValue = 0;

        cacheMap.set('timeline', newTimeline);
      }
    }
  }, [divRef.current, visible]);

  return (
    <div className={styles.animatedText}>
      <div ref={divRef} className={classnames(
        styles.text,
        styles.ml12,
        className,
      )}>{
        letters.map((letter, i) => (
          <span className={styles.letter} key={i}>{letter}</span>
        ))
      }</div>
    </div>
  );
};

const AnimatedChatBubble = ({
  texts,
  setTexts,
}) => {
  return (
    <div className={classnames(
      styles.chatBubble,
    )}>
      <div className={styles.background} />
      {texts.map((textSpec, i) => {
        const {
          id,
          text,
          visible,
        } = textSpec;
        return (
          <AnimatedText
            className={styles.botText}
            text={text}
            visible={visible}
            onEnd={e => {
              const newTexts = [...texts];
              newTexts.splice(i, 1);
              setTexts(newTexts);
            }}
            key={id}
          />
        );
      })}
      {/* <AnimatedText
        className={styles.userText}
        text={'Hey yall! This is a relatively long sentence that I\'m typing to test the text wrapping... I hope it works!'}
      /> */}
    </div>
  );
};

//

class DiscordInput {
  constructor({
    ws,
  }) {
    this.ws = ws;
  }

  writeText(text) {
    const writeTextMessage = {
      method: 'writeText',
      args: {
        text,
      },
    };
    this.ws.send(JSON.stringify(writeTextMessage));
  }

  // async to wait for consumption of the stream by the discord api
  async pushStream(stream, {
    signal,
  }) {
    const streamId = makeId(8);

    const startVoiceMessage = {
      method: 'playVoiceStart',
      args: {
        streamId,
      },
    };
    this.ws.send(JSON.stringify(startVoiceMessage));

    signal.addEventListener('abort', () => {
      const voiceAbortMessage = {
        method: 'playVoiceAbort',
        args: {
          streamId,
        },
      };
      // console.log('play voice stream send abort', voiceAbortMessage);
      this.ws.send(JSON.stringify(voiceAbortMessage));
    });

    // (async () => {
      const reader = stream.getReader();

      for (;;) {
        const {
          done,
          value,
        // } = await abortableRead(reader, signal);
        } = await reader.read();
        if (!done) {
          // console.log('signal read not done', !!signal.aborted);
          const uint8Array = value;
          const voiceDataMessage = {
            method: 'playVoiceData',
            args: {
              streamId,
              uint8Array,
            },
          };
          const encodedData = zbencode(voiceDataMessage);
          // console.log('play voice stream send data', voiceDataMessage, encodedData);
          this.ws.send(encodedData);
        } else {
          // console.log('signal read done', !!signal.aborted);
          const voiceEndMessage = {
            method: 'playVoiceEnd',
            args: {
              streamId,
            },
          };
          // console.log('play voice stream send end', voiceEndMessage);
          this.ws.send(JSON.stringify(voiceEndMessage));
          break;
        }
      }
    // })();
  }
}

//

class DiscordOutputStream extends EventTarget {
  constructor({
    sampleRate,
    speechQueue,
  }) {
    super();

    this.sampleRate = sampleRate;
    this.speechQueue = speechQueue;

    this.decoder = new OpusDecoder();
    this.chunks = [];
    this.bufferSize = 0;

    const loadPromise = this.decoder.ready
      .then(() => {});
    this.waitForLoad = () => loadPromise;
  }

  update(uint8Array) {
    (async () => {
      await this.waitForLoad();

      const result = this.decoder.decodeFrame(uint8Array);
      const {channelData, /* samplesDecoded, */ sampleRate} = result;

      const chunk = {
        channelData,
        sampleRate,
      };
      this.chunks.push(chunk);

      const firstChannelData = channelData[0];
      this.bufferSize += firstChannelData.length;
    })();
  }

  async end() {
    await this.waitForLoad();

    let sampleRate = 0;
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      if (sampleRate === 0) {
        sampleRate = chunk.sampleRate;
      } else {
        if (sampleRate !== chunk.sampleRate) {
          throw new Error('sample rate mismatch');
        }
      }
    }

    // create audio buffer from chunks
    const audioBuffer = new AudioBuffer({
      length: this.bufferSize,
      sampleRate,
      numberOfChannels: 1,
    });
    let offset = 0;
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      const {channelData} = chunk;
      const firstChannelData = channelData[0];
      audioBuffer.copyToChannel(firstChannelData, 0, offset);
      offset += firstChannelData.length;
    }

    const wavBuffer = audioBufferToWav(audioBuffer);
    const wavBlob = new Blob([wavBuffer], {
      type: 'audio/wav',
    });

    await this.speechQueue.waitForTurn(async () => {
      const text = await whisperTranscribe(wavBlob);
      // console.log('discord transcribed', {text});
      this.dispatchEvent(new MessageEvent('speech', {
        data: text,
      }));
    });
  }

  destroy() {
    (async () => {
      await this.waitForLoad();

      this.decoder.free();
    })();
  }
}

//

class DiscordOutput extends EventTarget {
  constructor({
    sampleRate = 48000,
  } = {}) {
    super();

    this.sampleRate = sampleRate;

    this.speechQueue = new QueueManager();

    this.streams = new Map();
  }

  pushUserTextMessage(text) {
    this.dispatchEvent(new MessageEvent('usermessage', {
      data: {
        text,
      },
    }));
  }

  pushStreamStart(streamId) {
    let stream = this.streams.get(streamId);
    if (!stream) {
      const {
        sampleRate,
        speechQueue,
      } = this;

      stream = new DiscordOutputStream({
        sampleRate,
        speechQueue,
      });
      stream.addEventListener('speech', e => {
        const text = e.data;

        this.dispatchEvent(new MessageEvent('usermessage', {
          data: text,
        }));
      });
      this.streams.set(streamId, stream);
    } else {
      throw new Error('stream already exists for streamId: ' + streamId);
    }
    return stream;
  }

  pushStreamEnd(streamId) {
    const stream = this.streams.get(streamId);
    if (stream) {
      stream.end();
      this.streams.delete(streamId);
    } else {
      throw new Error('no stream found for streamId: ' + streamId);
    }
  }

  pushStreamUpdate(streamId, uint8Array) {
    const stream = this.streams.get(streamId);
    if (stream) {
      stream.update(uint8Array);
    } else {
      throw new Error('no stream found for streamId: ' + streamId);
    }
  }

  destroy() {
    for (const stream of this.streams.values()) {
      stream.destroy();
    }
  }
}

//

const DISCORD_BOT_WS_PORT = 9898;
const DISCORD_BOT_WS_HOST = `wss://${location.hostname}:${DISCORD_BOT_WS_PORT}`;
class DiscordClient extends EventTarget {
  constructor({
    token,
    channelWhitelist,
    userWhitelist,
  }) {
    super();

    const u = (() => {
      const u = new URL(DISCORD_BOT_WS_HOST);
      u.searchParams.set('token', token);
      u.searchParams.set('channelWhitelist', channelWhitelist.join(','));
      u.searchParams.set('userWhitelist', userWhitelist.join(','));
      return u;
    })();
    const ws = new WebSocket(u);
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      console.log('opened');
    };
    ws.onmessage = e => {
      // console.log('got message', e.data);

      if (e.data instanceof ArrayBuffer) {
        const arrayBuffer = e.data;
        const uint8Array = new Uint8Array(arrayBuffer);
        const o = zbdecode(uint8Array);
        // console.log('got binary message', o);
        const {
          method,
          args,
        } = o;
        switch (method) {
          case 'voicedata': {
            const {
              userId,
              streamId,
              uint8Array,
            } = args;
            this.output.pushStreamUpdate(streamId, uint8Array);
            break;
          }
          default: {
            console.warn('unhandled binary method', method);
            break;
          }
        }
      } else {
        const j = JSON.parse(e.data);
        const {
          method,
          args,
        } = j;
        switch (method) {
          case 'ready': {
            // nothing
            break;
          }
          case 'voicestart': {
            const {
              userId,
              streamId,
            } = args;
            this.output.pushStreamStart(streamId);
            break;
          }
          case 'voiceend': {
            const {
              userId,
              streamId,
            } = args;
            this.output.pushStreamEnd(streamId);
            break;
          }
          case 'text': {
            const {
              userId,
              text,
            } = args;
            this.output.pushUserTextMessage(text);
            break;
          }
          default: {
            console.warn('unhandled json method', method);
            break;
          }
        }
      }
    };
    this.ws = ws;

    this.input = new DiscordInput({
      ws: this.ws,
    });
    this.output = new DiscordOutput();
  }

  destroy() {
    this.ws.close();

    this.output.destroy();
  }
}

//

export class CompanionOutput extends EventTarget {
  constructor() {
    super();

    // this.audioContext = audioContext;

    // const audioInjectWorkletNode = new AudioInjectWorkletNode({
    //   audioContext,
    // });
    // this.audioInjectWorkletNode = audioInjectWorkletNode;
  }

  setAudioContext(audioContext) {
    this.audioContext = audioContext;

    if (this.audioInjectWorkletNode) {
      this.audioInjectWorkletNode.disconnect();
      this.audioInjectWorkletNode = null;
    }
    this.audioInjectWorkletNode = new AudioInjectWorkletNode({
      audioContext: this.audioContext,
    });
  }
  connectAudioToPlayer(player) {
    if (!this.audioContext) {
      throw new Error('cannot connect audio to player without audio context');
    }

    player.avatar.setAudioEnabled({
      audioContext: this.audioContext,
    });
    this.audioInjectWorkletNode.connect(player.avatar.getAudioInput());
  }

  pushBotMessage(agentMessage) {
    this.dispatchEvent(new MessageEvent('botmessage', {
      data: {
        agentMessage,
      },
    }));
  }
  endCurrentAudioMessage(){
    this.audioInjectWorkletNode.port.postMessage({
      method: 'clear',
      args: {},
    });
  }

  // async because we want to wait for all async children reading this stream to finish processing
  async pushStream(stream, {
    signal,
  }) {
    const e = new MessageEvent('pushstream', {
      data: {
        stream,
        signal,
      },
    });
    const promises = [];
    e.waitUntil = (fn) => {
      const p = fn();
      promises.push(p);
    };
    this.dispatchEvent(e);

    await Promise.all(promises);
  }
}

//

const PerceptionBox = ({
  label,
  bbox,
  previewCanvasSize,
  size,
}) => {
  const [
    width,
    height,
  ] = size;
  let [
    x,
    y,
    w,
    h,
  ] = bbox;
  x *= width / previewCanvasSize[0];
  y *= height / previewCanvasSize[1];
  w *= width / previewCanvasSize[0];
  h *= height / previewCanvasSize[1];
  return (
    <div className={styles.perceptionBox} style={{
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${h}px`,
    }}>
      <div className={styles.label}>{label}</div>
    </div>
  );
};

const PerceptionOverlay = ({
  segmentCaptions,
  previewCanvasSize,
  previewWrapSize,
}) => {
  const divRef = useRef(null);
  // const [width, setWidth] = useState(0);
  // const [height, setHeight] = useState(0);

  const previewWidth = previewWrapSize[0];
  const previewHeight = previewWrapSize[1];

  return (
    <div
      className={styles.perceptionOverlay}
      style={{
        width: previewWidth ? `${previewWidth}px` : null,
        height: previewHeight ? `${previewHeight}px` : null,
      }}
      ref={divRef}
    >
      {segmentCaptions.map((segmentOption, index) => {
        return (
          <PerceptionBox
            label={segmentOption.label}
            bbox={segmentOption.bbox}
            size={[previewWidth, previewHeight]}
            previewCanvasSize={previewCanvasSize}
            key={index}
          />
        );
      })}
    </div>
  );
};

const PerceptionPreview = ({
  segmentCaptions,

  previewCanvasSize,
  setPreviewCanvasSize,

  driver,
  compiler,
}) => {
  const [previewWrapSize, setPreviewWrapSize] = useState([0, 0]);
  const blobCanvasRef = useRef();

  // bind driver perception update
  const bindPerceptionCanvasUpdate = ({
    canvas,
  }) => {
    return e => {
      const {
        imageBitmap,
      } = e.data;

      if (imageBitmap) {
        const newWidth = imageBitmap.videoWidth ?? imageBitmap.width;
        const newHeight = imageBitmap.videoHeight ?? imageBitmap.height;

        if (canvas) {
          const ctx = canvas.getContext('2d');

          if (canvas.width !== newWidth || canvas.height !== newHeight) {
            canvas.width = newWidth;
            canvas.height = newHeight;
          }
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(imageBitmap, 0, 0);
        }

        // const wrapWidth = window.innerWidth;
        // const wrapHeight = wrapWidth * newHeight / newWidth;
        // if (wrapWidth !== previewWrapSize[0] || wrapHeight !== previewWrapSize[1]) {
        //   setPreviewWrapSize([wrapWidth, wrapHeight]);
        // }
        const canvasAspectRatio = newWidth / newHeight;
        const windowAspectRatio = window.innerWidth / window.innerHeight;
        // if the canvas is wider aspect than the window, then we want to fit the width
        if (canvasAspectRatio > windowAspectRatio) {
          const wrapWidth = window.innerWidth;
          const wrapHeight = wrapWidth / canvasAspectRatio;
          if (wrapWidth !== previewWrapSize[0] || wrapHeight !== previewWrapSize[1]) {
            setPreviewWrapSize([wrapWidth, wrapHeight]);
          }
        } else { // otherwise, we want to fit the height
          const wrapHeight = window.innerHeight;
          const wrapWidth = wrapHeight * canvasAspectRatio;
          if (wrapWidth !== previewWrapSize[0] || wrapHeight !== previewWrapSize[1]) {
            setPreviewWrapSize([wrapWidth, wrapHeight]);
          }
        }

        if (newWidth !== previewCanvasSize[0] || newHeight !== previewCanvasSize[1]) {
          setPreviewCanvasSize([newWidth, newHeight]);
        }

        // console.log('update dims', {
        //   wrapWidth,
        //   wrapHeight,
        //   newWidth,
        //   newHeight,
        // });
      }
    };
  };
  // bind realtime rendering preview perception update
  useEffect(() => {
    if (compiler) {
      const perceptionupdate2 = bindPerceptionCanvasUpdate({
        canvas: blobCanvasRef.current,
      });
      compiler.addEventListener('perceptionupdate', perceptionupdate2);

      return () => {
        compiler.removeEventListener('perceptionupdate', perceptionupdate2);
      };
    }
  }, [compiler, blobCanvasRef]);

  useEffect(() => {
    if (driver) {
      const canvas = blobCanvasRef.current;
      const perceptionupdate = bindPerceptionCanvasUpdate({
        canvas,
      });
      driver.addEventListener('perceptionupdate', perceptionupdate);

      return () => {
        driver.removeEventListener('perceptionupdate', perceptionupdate);
      };
    }
  }, [driver, blobCanvasRef]);

  return (
    <div className={styles.perceptionPreview}>
      <div
        className={styles.perceptionPreviewWrap}
        style={{
          width: `${previewWrapSize[0]}px`,
          height: `${previewWrapSize[1]}px`,
        }}
      >
        <canvas
          className={styles.img}
          ref={blobCanvasRef}
        />
        <PerceptionOverlay
          segmentCaptions={segmentCaptions}
          previewCanvasSize={previewCanvasSize}
          previewWrapSize={previewWrapSize}
        />
      </div>
    </div>
  );
};

//

const AgentNodeElement = ({
  placeIndex,
  
  characterIdentity,
  npcPlayer,
  volume,
  companionRenderer,

  chatLocked,
  closedCaptioning,
  discordClient,

  aiAgentController,

  mousePosition,
  screenshotEnabled,
}) => {
  const [companionRenderSpec, setCompanionRenderSpec] = useState(null);
  const [companionOutput, setCompanionOutput] = useState(null);
  const [aiAgent, setAiAgent] = useState(null);
  const [texts, setTexts] = useState([]);

  const canvasRef = useRef(null);

  //

  const [width, setWidth] = useState(canvasDimensions[0]);
  const [height, setHeight] = useState(canvasDimensions[1]);

  //

  useEffect(() => {
    const element = canvasRef.current;
    // if (element) {
      const setSize = (width, height) => {
        setWidth(width);
        setHeight(height);
        companionRenderer.setSize(width, height);
      };

      const observer = new ResizeObserver((entries) => {
        // console.log('got entries', Array.from(entries));

        for (const entry of entries) {
          setSize(entry.contentRect.width, entry.contentRect.height);

          // console.log('resize observer', [
          //   entry.contentRect.width,
          //   entry.contentRect.height,
          // ]);
        }
      });
      observer.observe(element);

      // console.log('listen to resize', element);

      const bbox = element.getBoundingClientRect();
      setSize(bbox.width, bbox.height);

      return () => {
        // Cleanup the observer by unobserving all elements
        observer.disconnect();
      };
    // }
  }, [canvasRef])

  // bind graphics canvas/companion renderer
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (npcPlayer && companionRenderer) {
      const newCompanionRenderSpec = new CompanionRenderSpec({
        npcPlayer,
        companionRenderer,
        canvasContext: canvasEl.getContext('2d'),
        cameraUvw: characterIdentity.spec.cameraUvw ?? defaultCameraUvw,
        cameraFov: characterIdentity.spec.cameraFov ?? minFov,
      });
      companionRenderer.addCompanionRenderSpec(newCompanionRenderSpec);
      npcPlayer.avatar.looker.setCamera(newCompanionRenderSpec.camera);
      setCompanionRenderSpec(newCompanionRenderSpec);

      // companion output
      const newCompanionOutput = new CompanionOutput();
      newCompanionOutput.setAudioContext(audioContext);
      newCompanionOutput.connectAudioToPlayer(npcPlayer);
      setCompanionOutput(newCompanionOutput);

      return () => {
        companionRenderer.removeCompanionRenderSpec(newCompanionRenderSpec);
        setCompanionRenderSpec(null);
        newCompanionOutput.endCurrentAudioMessage();
        setCompanionOutput(null);
      };
    }
  }, [characterIdentity, npcPlayer, canvasRef, companionRenderer]);

  useEffect(() => {
    if (npcPlayer?.avatar?.looker){
      npcPlayer.avatar.looker.updateMouse(mousePosition)
    }
  },[mousePosition, npcPlayer]);

  useEffect(()=>{
    if (npcPlayer?.avatar?.looker){
      npcPlayer.avatar.looker.setMouseOffset((width * placeIndex) + (width/2), -height/2); 
    }
  },[npcPlayer, placeIndex])
  // bind ai agent/controller
  useEffect(() => {
    if (npcPlayer && !aiAgent) {
      let live = true;

      const cleanups = [];
      cleanups.push(() => {
        live = false;
      });

      (async () => {
        const newAiAgent = await aiAgentController.createAiAgent({
          characterIdentity,
        });
        if (!live) return;

        aiAgentController.addAiAgent(newAiAgent);
        setAiAgent(newAiAgent);

        cleanups.push(() => {
          aiAgentController.removeAiAgent(newAiAgent);
          setAiAgent(null);
        });
      })();

      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          cleanups[i]();
        }
      };
    }
  }, [aiAgentController, npcPlayer]);

  // bind skill context
  useEffect(() => {
    if (aiAgent) {
      const skillContext = {
        useAiAgentController: () => aiAgentController,
        useCompanionRenderSpec: () => companionRenderSpec,
        useCompanionOutput: () => companionOutput,
        useNpcPlayer: () => npcPlayer,
        useVoiceStreamManager: () => voiceStreamManager,
        useVoiceOutputManager: () => voiceOutputManager,
        useCompanionSettings: () => companionSettingsClient
      };
      aiAgent.setSkillContext(skillContext);
    }
  }, [
    aiAgent,
    aiAgentController,
    companionRenderer,
    companionOutput,
    npcPlayer,
    voiceStreamManager,
    voiceOutputManager,
  ]);

  // bind system volume
  useEffect(() => {
    if (npcPlayer) {
      npcPlayer.voicer.setVolume((volume ?? 100) / 100);
    }
  }, [volume, npcPlayer]);

  // bind character identity
  useEffect(() => {
    const characterupdate = async e => {
      const {
        key,
        value,
      } = e.data;
      if (npcPlayer) {
        const {
          playerSpec,
        } = npcPlayer;
        const newPlayerSpec = {
          ...playerSpec,
          [key]: value,
        };

        // potentially set avatar (async)
        (async () => {
          await npcPlayer.setPlayerSpec(newPlayerSpec);
        })();
      }
      switch (key) {
        case 'cameraUvw': {
          companionRenderSpec.setCameraUvw(value);
          break;
        }
        case 'cameraFov': {
          companionRenderSpec.setCameraFov(value);
          break;
        }
      }
    };
    characterIdentity.addEventListener('characterupdate', characterupdate);

    return () => {
      characterIdentity.removeEventListener('characterupdate', characterupdate);
    };
  }, [characterIdentity, npcPlayer, companionRenderSpec]);

  // companion output binding
  useEffect(() => {
    if (npcPlayer && companionOutput) {
      const botmessage = e => {
        const {
          agentMessage,
        } = e.data;

        if (agentMessage.type === 'TEXT') {
          const newTexts = texts.map(textSpec => {
            const newText = {
              ...textSpec,
              visible: false,
            };
            return newText;
          });
          const id = makeId(8);
          newTexts.push({
            id,
            text: agentMessage.value,
            visible: true,
          });
          setTexts(newTexts);
          if (discordClient) {
            const text = agentMessage.value;
            discordClient.input.writeText(text);
          }
        }
      };
      companionOutput.addEventListener('botmessage', botmessage);

      const pushstream = e => {
        const {
          stream,
          signal,
        } = e.data;

        e.waitUntil(async () => {
          await npcPlayer.voicer.start(stream, {
            signal,
            audioInjectWorkletNode: companionOutput.audioInjectWorkletNode,
          });
        });
        if (discordClient) {
          e.waitUntil(async () => {
            await discordClient.input.pushStream(stream, {
              signal,
            });
          });
        }
      };
      companionOutput.addEventListener('pushstream', pushstream);

      return () => {
        companionOutput.removeEventListener('botmessage', botmessage);
        companionOutput.removeEventListener('pushstream', pushstream);
      };
    }
  }, [npcPlayer, companionOutput, discordClient]);

  return (
    <div className={classnames(
      styles.agentNode,
    )}>
      {!chatLocked && closedCaptioning && (
        <AnimatedChatBubble
          texts={texts}
          setTexts={setTexts}
        />
      )}
      <canvas
        // width={width}
        // height={height}
        className={styles.canvas}
        ref={canvasRef}
      />
    </div>
  );
};

//

class ScreenWorld extends EventTarget {
  constructor() {
    super();
    
    this.start = [NaN, NaN];
    this.end = [NaN, NaN];
    this.img = null;
  }

  setStart(x, y) {
    this.start[0] = x;
    this.start[1] = y;

    this.dispatchEvent(new MessageEvent('update'));
  }
  setEnd(x, y) {
    this.end[0] = x;
    this.end[1] = y;

    this.dispatchEvent(new MessageEvent('update'));
  }

  setPosition(x, y) {
    const w = this.end[0] - this.start[0];
    const h = this.end[1] - this.start[1];

    this.start[0] = x;
    this.start[1] = y;
    this.end[0] = x + w;
    this.end[1] = y + h;

    this.dispatchEvent(new MessageEvent('update'));
  }

  getCoords() {
    if (
      isNaN(this.start[0]) || isNaN(this.start[1]) || isNaN(this.end[0]) || isNaN(this.end[1])
    ) {
      return [
        [0, 0],
        [0, 0],
      ];
    } else {
      // account for reverse box
      const x0 = Math.min(this.start[0], this.end[0]);
      const y0 = Math.min(this.start[1], this.end[1]);
      const x1 = Math.max(this.start[0], this.end[0]);
      const y1 = Math.max(this.start[1], this.end[1]);
      return [
        [x0, y0],
        [x1, y1],
      ];
    }
  }

  async finish(img) {
    const [
      [x0, y0],
      [x1, y1],
    ] = this.getCoords();
    const minX = Math.min(x0, x1);
    const minY = Math.min(y0, y1);
    const maxX = Math.max(x0, x1);
    const maxY = Math.max(y0, y1);

    this.start[0] = minX;
    this.start[1] = minY;
    this.end[0] = maxX;
    this.end[1] = maxY;

    this.img = img;

    let p = Promise.resolve();
    const e = new MessageEvent('finish', {
      data: {
        img,
      },
    });
    e.waitUntil = fn => {
      p = fn();
    };
    this.dispatchEvent(e);
    if (p) {
      await p;
    }
  }
}

//

const makeTimeoutPromise = timeout => new Promise((accept, reject) => {
  setTimeout(() => {
    accept();
  }, timeout);
});
const ScreenWorldElement = ({
  screenWorld,
  onClose,
}) => {
  const [coords, setCoords] = useState([[0, 0], [0, 0]]);
  const [dragStart, setDragStart] = useState(null);
  const [dragStartCoord, setDragStartCoord] = useState(null);
  const [rendered, setRendered] = useState(false);
  const [hovered, setHovered] = useState(false);

  const canvasRef = useRef();

  // listen to coords
  useEffect(() => {
    const update = () => {
      const newCoords = screenWorld.getCoords();
      setCoords(newCoords);
    };
    screenWorld.addEventListener('update', update);
    update();

    return () => {
      screenWorld.removeEventListener('update', update);
    };
  }, [screenWorld, canvasRef.current]);

  // listen to finish
  useEffect(() => {
    const canvas = canvasRef.current;

    const draw = img => {
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      setRendered(true);
    };
    const finish = e => {
      const {
        img,
      } = e.data;

      draw(img);
    };
    screenWorld.addEventListener('finish', finish);

    if (screenWorld.img) {
      draw(screenWorld.img);
    }

    return () => {
      screenWorld.removeEventListener('finish', finish);
    };
  }, [screenWorld, canvasRef.current]);

  // listen to local mousemove
  useEffect(() => {
    const mouseup = e => {
      setDragStart(null);
      setDragStartCoord(null);
    };
    document.addEventListener('mouseup', mouseup);

    const mousemove = e => {
      if (dragStart) {
        const [dragStartX, dragStartY] = dragStartCoord;
        const dx = e.clientX - dragStart[0];
        const dy = e.clientY - dragStart[1];

        screenWorld.setPosition(
          dragStartX + dx,
          dragStartY + dy,
        );
      }
    };
    document.addEventListener('mousemove', mousemove);

    return () => {
      document.removeEventListener('mouseup', mouseup);
      document.removeEventListener('mousemove', mousemove);
    };
  }, [dragStart]);

  // listen to global mousemove
  useEffect(() => {
    const update = e => {
      const windowMetrics = windowMetricsManager.getData();
      const {
        // x,
        // y,
        // width,
        // height,
        mouseX,
        mouseY,
      } = windowMetrics;

      const coords = screenWorld.getCoords();
      const [
        [x0, y0],
        [x1, y1],
      ] = coords;

      if (
        (mouseX >= x0 && mouseX <= x1) &&
        (mouseY >= y0 && mouseY <= y1)
      ) {
        setHovered(true);
      } else {
        setHovered(false);
      }
    };
    windowMetricsManager.addEventListener('update', update);

    return () => {
      windowMetricsManager.removeEventListener('update', update);
    };
  }, [windowMetricsManager]);

  if (electronIpc) {
    useEffect(() => {
      if (hovered) {
        electronIpc.browserAddSolid();

        return () => {
          electronIpc.browserRemoveSolid();
        };
      }
    }, [hovered]);
  }

  const onSendClick = e => {
    console.log('send', screenWorld);
  };
  const onMapClick = e => {
    console.log('map', screenWorld);
  };
  const onInspectClick = e => {
    console.log('inspect', screenWorld);
  };

  return (
    <div
      className={classnames(
        styles.screenWorld,
        rendered ? styles.rendered : null,
        hovered ? styles.hovered : null,
      )}
      style={{
        left: coords[0][0],
        top: coords[0][1],
        width: coords[1][0] - coords[0][0],
        height: coords[1][1] - coords[0][1],
      }}
      onMouseDown={e => {
        e.preventDefault();
        e.stopPropagation();

        setDragStart([e.clientX, e.clientY]);

        const [
          [x0, y0],
        ] = coords;
        setDragStartCoord([x0, y0]);
      }}
      draggable
    >
      <div className={styles.border}>
        <canvas
          className={classnames(
            styles.captureCanvas,
          )}
          ref={canvasRef}
        />
        <div className={styles.bar}>
          <div className={styles.link} onClick={onSendClick}>
            <img src={'/ui/assets/icons/sendMessage.svg'} className={classnames(
              styles.img,
            )} />
          </div>
          <div className={styles.link} onClick={onMapClick}>
            <img src={'/ui/assets/icons/map.svg'} className={classnames(
              styles.img,
            )} />
          </div>
          <div className={styles.link} onClick={onInspectClick}>
            <img src={'/ui/assets/icons/digital-eye.svg'} className={classnames(
              styles.img,
            )} />
          </div>
          <div className={styles.link} onClick={onClose}>
            <img src={'/ui/assets/icons/close.svg'} className={classnames(
              styles.img,
            )} />
          </div>
        </div>
      </div>
    </div>
  );
};

//

const ScreenWorlds = ({
  enabled,
  setEnabled,
  dragging,
  setDragging,
}) => {
  const [screenWorlds, setScreenWorlds] = useState([]);
  const [currentScreenWorld, setCurrentScreenWorld] = useState(null);
  // const [down, setDown] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  if (electronIpc) {
    useEffect(() => {
      if (enabled) {
        electronIpc.browserAddSolid();

        return () => {
          electronIpc.browserRemoveSolid();
        };
      }
    }, [enabled]);
  }

  useEffect(() => {
    const mouseup = e => {
      setCurrentScreenWorld(null);
      setDragStart(null);
      setEnabled(false);

      if (currentScreenWorld) {
        (async () => {
          await makeTimeoutPromise(100);
          const result = await electronIpc.screenshotDesktop();
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.src = result.screenshotB64;
          await new Promise((accept, reject) => {
            img.onload = accept;
            img.onerror = reject;
          });

          const dpr = window.devicePixelRatio;

          const coords = currentScreenWorld.getCoords();

          const width = coords[1][0] - coords[0][0];
          const height = coords[1][1] - coords[0][1];
          const canvas = document.createElement('canvas');
          canvas.width = width * dpr;
          canvas.height = height * dpr;

          const windowMetrics = windowMetricsManager.getData();
          coords[0][0] += windowMetrics.x;
          coords[0][1] += windowMetrics.y;
          coords[1][0] += windowMetrics.x;
          coords[1][1] += windowMetrics.y;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, coords[0][0] * dpr, coords[0][1] * dpr, width * dpr, height * dpr, 0, 0, canvas.width, canvas.height);

          await currentScreenWorld.finish(canvas);

          setDragging(false);
        })();
      } else if (dragStart) {
        const windowMetrics = windowMetricsManager.getData();
        const x = e.clientX + windowMetrics.x;
        const y = e.clientY + windowMetrics.y;
        addMaskWorld(x, y);
        setDragging(false);
      }
    };
    document.addEventListener('mouseup', mouseup);

    return () => {
      document.removeEventListener('mouseup', mouseup);
    };
  }, [currentScreenWorld, dragStart]);

  const addMaskWorld = async (x, y) => {
    const result = await electronIpc.screenshotDesktop();
    const {screenshotB64} = result;

    // get blob from data url
    const blob = await (async () => {
      const response = await fetch(screenshotB64);
      const blob = await response.blob();
      return blob;
    })();

    const imageBitmap = await createImageBitmap(blob);

    const centerPoints = [];
    const centerLabels = [];
    const dpr = window.devicePixelRatio;
    centerPoints.push([
      x * dpr,
      y * dpr,
    ]);
    centerLabels.push(1);
  
    const result2 = await imageSelection(
      // animated image
      blob,
      [
        ...centerPoints,
      ],
      // labels (foreground vs background)
      [
        ...centerLabels,
      ],
      // bbox
      // [
      //   Math.floor(imageBitmap2.width * 0.1),
      //   Math.floor(imageBitmap2.height * 0.1),
      //   Math.floor(imageBitmap2.width * 0.9),
      //   imageBitmap2.height,
      // ],
    );
    // console.log('add mask world 2', result2);
    const {
      dims,
      bbox,
      uint8Array,
    } = result2;
    console.assert(dims[0] === imageBitmap.width);
    console.assert(dims[1] === imageBitmap.height);
  
    /* const drawFullCanvas = () => {
      // draw the bitmask on the canvas
      const canvas = document.createElement('canvas');
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageBitmap, 0, 0);
      const maskImageData = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
      for (let i = 0; i < uint8Array.length; i++) {
        const v = uint8Array[i];
        if (v) {
          maskImageData.data[i * 4 + 0] = 255;
        }
        maskImageData.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(maskImageData, 0, 0);
      return canvas;
    };
    const fullCanvas = drawFullCanvas();
    fullCanvas.style.cssText = `\
      position: fixed;
      top: 0;
      left: 0;
      width: 512px;
    `;
    document.body.appendChild(fullCanvas); */

    const [
      x0, y0,
      x1, y1,
    ] = bbox;
    const w = x1 - x0;
    const h = y1 - y0;
    const drawClipCanvas = () => {
      // draw the bitmask on the canvas
      const canvas = document.createElement('canvas');
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageBitmap, 0, 0);
      const maskImageData = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
      for (let i = 0; i < uint8Array.length; i++) {
        const v = uint8Array[i];
        if (v) {
          // maskImageData.data[i * 4 + 0] = 255;
          maskImageData.data[i * 4 + 3] = 255;
        } else {
          maskImageData.data[i * 4 + 3] = 0;
        }
      }
      ctx.putImageData(maskImageData, 0, 0);

      // draw only the bounding box region
      const canvas2 = document.createElement('canvas');
      canvas2.width = w;
      canvas2.height = h;
      const ctx2 = canvas2.getContext('2d');
      ctx2.drawImage(canvas, x0, y0, w, h, 0, 0, w, h);
      return canvas2;
    };
    const clipCanvas = drawClipCanvas();
    // clipCanvas.style.cssText = `\
    //   position: fixed;
    //   top: 0;
    //   left: 0;
    //   width: 512px;
    // `;
    // document.body.appendChild(clipCanvas);
    
    const windowMetrics = windowMetricsManager.getData();

    const screenWorld = new ScreenWorld();
    screenWorld.setStart(x0 / dpr - windowMetrics.x, y0 / dpr - windowMetrics.y);
    screenWorld.setEnd(x1 / dpr - windowMetrics.x, y1 / dpr - windowMetrics.y);
    screenWorld.finish(clipCanvas);
    const newScreenWorlds = screenWorlds.slice();
    newScreenWorlds.push(screenWorld);
    setScreenWorlds(newScreenWorlds);

    // const clipBlob = await new Promise((accept, reject) => {
    //   clipCanvas.toBlob(accept);
    // });
    // const [
    //   caption,
    //   question,
    // ] = await Promise.all([
    //   imageCaptioning(clipBlob),
    //   vqa(clipBlob, 'Question: What is the emotion? Answer:'),
    // ]);
    // console.log('got caption', {
    //   caption,
    //   question,
    // });
  };
  const addScreenWorld = (x, y) => {
    const screenWorld = new ScreenWorld();
    screenWorld.setStart(x, y);
    const newScreenWorlds = screenWorlds.slice();
    newScreenWorlds.push(screenWorld);
    setScreenWorlds(newScreenWorlds);

    setCurrentScreenWorld(screenWorld);

    setDragging(true);

    return screenWorld;
  };

  return (
    <div
      className={
        classnames(
          styles.screenWorlds,
          enabled ? styles.enabled : null,
          currentScreenWorld ? styles.active : null,
        )
      }
      onMouseDown={e => {
        if (enabled) {
          e.preventDefault();
          e.stopPropagation();

          setDragStart([e.clientX, e.clientY]);
        }
      }}
      onMouseMove={e => {
        if (currentScreenWorld) {
          currentScreenWorld.setEnd(e.clientX, e.clientY);
        } else {
          if (dragStart) {
            const [x, y] = dragStart;
            const dx = e.clientX - x;
            const dy = e.clientY - y;
            if (Math.sqrt(dx * dx + dy * dy) > 5) {
              addScreenWorld(x, y);
            }
          }
        }
      }}
    >
      {screenWorlds.map((screenWorld, i) => {
        return (
          <ScreenWorldElement
            screenWorld={screenWorld}
            onClose={e => {
              e.preventDefault();
              e.stopPropagation();

              const newScreenWorlds = screenWorlds.slice();
              newScreenWorlds.splice(i, 1);
              setScreenWorlds(newScreenWorlds);
            }}
            key={i}
          />
        );
      })}
    </div>
  );
};

//

let mediaDevicesLoaded = false;
export const CompanionApp = () => {
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [devtoolsOpen, setDevtoolsOpen] = useState(!electronIpc);
  const [showDebugPerception, setShowDebugPerception] = useState(companionSettingsClient.getSetting('showDebugPerception') ?? false);
  const [fullscreenEnabled, setFullscreenEnabled] = useState(companionSettingsClient.getSetting('fullscreenEnabled') ?? isMobile);

  const [captureMode, setCaptureMode] = useState('auto');

  const [screenshotEnabled, setScreenshotEnabled] = useState(false);
  const [screenshotDragging, setScreenshotDragging] = useState(false);

  const compilerCanvasRef = useRef(null);

  const [ocrString, setOcrString] = useState('');
  const [segmentCaptions, setSegmentCaptions] = useState([]);
  const [segmentCaptionString, setSegmentCaptionString] = useState('');
  const [nameString, setNameString] = useState('');
  const [titleString, setTitleString] = useState('');
  const [bundleIdString, setBundleIdString] = useState('');
  const [pathString, setPathString] = useState('');
  const [processId, setProcessId] = useState(0);
  const [imageCaptionString, setImageCaptionString] = useState('');
  const [previewCanvasSize, setPreviewCanvasSize] = useState([0, 0]);
  const [sources, setSources] = useState([]);

  const [companionLoaded, setCompanionLoaded] = useState(false);

  const [driver, setDriver] = useState(() => {
    const driver = new RealtimePerceptionDriver();
    driver.start();
    return driver;
  });

  const [settingsHover, setSettingsHover] = useState(!electronIpc);
  const [settingsMode, setSettingsMode] = useState(null);

  const [microphone, setMicrophone] = useState(companionSettingsClient.getSetting('microphone'));
  const [microphones, setMicrophones] = useState([]);
  const [facecam, setFacecam] = useState(companionSettingsClient.getSetting('facecam'));
  const [facecams, setFacecams] = useState([]);

  const [skills, setSkills] = useState(skillsClient.getSkills());

  const [clipboardString, setClipboardString] = useState('');

  const [closedCaptioning, setClosedCaptioning] = useState(companionSettingsClient.getSetting('closedCaptioning'));
  const [volume, setVolume] = useState(companionSettingsClient.getSetting('volume'));

  const [characterIdentities, setCharacterIdentities] = useState([]);
  const [currentCharacterIds, setCurrentCharacterIds] = useState([]);

  const [agentCharacterIdentities, setAgentCharacterIdentities] = useState([]);

  const [npcPlayers, setNpcPlayers] = useState(new Map());
  const [agentNpcPlayers, setAgentNpcPlayers] = useState(new Map());

  const [companionRenderer, setCompanionRenderer] = useState(null);

  const [aiAgentController, setAiAgentController] = useState(() => {
    return new AiAgentController({
      aiClient,
      perceptionContextClient,
      memoryClient,
      promptClient,
      skillsClient,
    });
  });
  const [aiAgentControllerRunning, setAiAgentControllerRunning] = useState(false);
  const [aiAgents, setAiAgents] = useState([]);

  const [voiceListener, setVoiceListener] = useState(null);

  const [terminalOpen, setTerminalOpen] = useState(null);
  const [browserOpen, setBrowserOpen] = useState(null);

  const [discordClient, setDiscordClient] = useState(null);

  const [discordBotToken, setDiscordBotToken] = useState(companionSettingsClient.getSetting('discordBotToken'));
  const [discordChannelWhitelist, setDiscordChannelWhitelist] = useState(companionSettingsClient.getSetting('discordChannelWhitelist'));
  const [discordUserWhitelist, setDiscordUserWhitelist] = useState(companionSettingsClient.getSetting('discordUserWhitelist'));

  const [chatOpen, setChatOpen] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);

  const [mousePosition, setMousePosition] = useState(()=>{return {x:0,y:0}});

  const [worlds, setWorlds] = useState([]);
  const [currentWorldIds, setCurrentWorldIds] = useState([]);

  const [compiler, setCompiler] = useState(null);
  const [compilerDimensions, setCompilerDimensions] = useState([0, 0]);

  const [timings, setTimings] = useState({
    ocr: Infinity,
    seg: Infinity,
    ic: Infinity,
  });

  const [voiceInputEnabled, setVoiceInputEnabled] = useState(false);
  const [voiceInputLockEnabled, setVoiceInputLockEnabled] = useState(false);
  const [keys, setKeys] = useState(() => ({
    ctrl: false,
    shift: false,
  }));

  // derived block

  // const [companionState, setCompanionState] = useState("standby");
  useEffect(() => {
    const runningchange = e => {
      setAiAgentControllerRunning(e.data.running);
    };
    aiAgentController.addEventListener('runningchange', runningchange);

    return () => {
      aiAgentController.removeEventListener('runningchange', runningchange);
    };
  }, [aiAgentController]);
  useEffect(() => {
    if (aiAgentControllerRunning && !aiAgentController.isRunning()) {
      aiAgentController.start();
    } else if (!aiAgentControllerRunning && aiAgentController.isRunning()) {
      aiAgentController.stop();
    }
  }, [aiAgentController, aiAgentControllerRunning]);

  // helpers block

  const click = e => {
    // if the audio context is paused, resume it
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  };
  const mouseEnter = e => {
    setHover(true);
  };
  const mouseLeave = e => {
    setHover(false);
  };
  const dragEnter = e => {
    e.preventDefault();
  };
  const dragLeave = e => {
    e.preventDefault();
  };
  const dragOver = e => {
    e.preventDefault();
  };
  const dragStart = e => {
    if (!dragging) {
      setDragging(true);
    }
  };
  const dragEnd = e => {
    if (dragging) {
      setDragging(false);
    }
  };
  const drop = async e => {
    if (dragging) {
      setDragging(false);
    }

    await importItems(e.dataTransfer.items, characterClient);
  };

  useEffect(() => {
    const newCompanionRenderer = new CompanionRenderer({
      width: canvasDimensions[0],
      height: canvasDimensions[1],
    });
    setCompanionRenderer(newCompanionRenderer);
  }, []);

  // wait for load
  useEffect(() => {
    if (!companionLoaded) {
      (async () => {
        await companionWaitForLoad();

        setCompanionLoaded(true);
      })();
    }
  }, [companionLoaded]);

  // npc players update sync
  useEffect(() => {
    const npcsupdate = e => {
      const newNpcPlayers = new Map(npcLoader.npcs);
      setNpcPlayers(newNpcPlayers);
    };
    npcLoader.addEventListener('npcsupdate', npcsupdate);

    return () => {
      npcLoader.removeEventListener('npcsupdate', npcsupdate);
    };
  }, [npcPlayers]);

  // load voice client
  useEffect(() => {
    if (companionLoaded) {
      const voiceListener = new VoiceListener({
        audioContext,
        audioManager,
      });
      setVoiceListener(voiceListener);
    }
  }, [companionLoaded]);

  // bind character client
  useEffect(() => {
    if (companionLoaded) {
      // latch characters
      const _latchCharacters = () => {
        setCharacterIdentities(characterClient.characterIdentities);
        setCurrentCharacterIds(characterClient.currentCharacterIds);
      };
      _latchCharacters();

      // listen characters update
      const currentcharacteridsupdate = e => {
        const {
          characterIds,
        } = e.data;
        setCurrentCharacterIds(characterIds);
      };
      characterClient.addEventListener('currentcharacteridsupdate', currentcharacteridsupdate);

      const characteridentitiesupdate = e => {
        const {
          characterIdentities,
        } = e.data;
        setCharacterIdentities(characterIdentities);
      };
      characterClient.addEventListener('characteridentitiesupdate', characteridentitiesupdate);

      return () => {
        characterClient.removeEventListener('currentcharacteridsupdate', currentcharacteridsupdate);
        characterClient.removeEventListener('characteridentitiesupdate', characteridentitiesupdate);
      };
    }
  }, [companionLoaded]);

  // bind agent character identities
  useEffect(() => {
    if (companionLoaded && characterIdentities && currentCharacterIds && characterIdentities.length !== 0 && currentCharacterIds.length !== 0) {
      const newAgentCharacterIdentities = currentCharacterIds.map(characterId => {
        const characterIdentity = characterIdentities.find(characterIdentity => characterIdentity.spec.id === characterId);
        if (characterIdentity) {
          return characterIdentity;
        } else {
          throw new Error('no character identity for id: ' + characterId);
        }
      });
      setAgentCharacterIdentities(newAgentCharacterIdentities);
    }
  }, [characterIdentities, currentCharacterIds]);

  // load agent npc players from agent character identities
  useEffect(() => {
    let live = true;

    (async () => {
      const newAgentNpcPlayers = new Map(agentNpcPlayers);
      let changed = false;
      const promises = [];

      // remove old
      const _removeOld = () => {
        for (const [characterIdentity, npcPlayer] of newAgentNpcPlayers) {
          if (!agentCharacterIdentities.includes(characterIdentity)) {
            newAgentNpcPlayers.delete(characterIdentity);
            changed = true;
          }
        }
      }
      _removeOld();
      const _addNew = () => {
        for (let i = 0; i < agentCharacterIdentities.length; i++) {
          const characterIdentity = agentCharacterIdentities[i];

          if (!newAgentNpcPlayers.has(characterIdentity)) {
            const o = (async () => {
              // XXX this needs to take a signal for cancellation
              const npcPlayer = await npcLoader.loadNpcPlayer(characterIdentity.spec, 'agent'); // second argument is the cache key
              if (!live) return;

              newAgentNpcPlayers.set(characterIdentity, npcPlayer);
              changed = true;
            })();
            promises.push(o);
          }
        }
      };
      _addNew();

      await Promise.all(promises);
      if (!live) return;

      if (changed) {
        setAgentNpcPlayers(newAgentNpcPlayers);
      }
    })();

    return () => {
      live = false;
    };
  }, [agentCharacterIdentities, agentNpcPlayers]);

  // bind ai agents
  useEffect(() => {
    if (aiAgentController) {
      const aiagentsupdate = e => {
        const {
          aiAgents,
        } = e.data;
        const newAiAgents = aiAgents.slice();
        setAiAgents(newAiAgents);
      };
      aiAgentController.addEventListener('aiagentsupdate', aiagentsupdate);

      return () => {
        aiAgentController.removeEventListener('aiagentsupdate', aiagentsupdate);
      };
    }
  }, [aiAgentController]);

  // bind ai agents chat messages update
  useEffect(() => {
    const cacheupdate = e => {
      const memories = aiAgentController.getAllAgentMemoriesCache();
      const newChatMessages = memories
        .filter(m => m.state === Memory.states.COMMITTED)
        .map(m => m.data);
      setChatMessages(newChatMessages);
    };

    cacheupdate();

    const cleanups = [];
    for (const aiAgent of aiAgents) {
      aiAgent.conversation.addEventListener('cacheupdate', cacheupdate);

      cleanups.push(() => {
        aiAgent.conversation.removeEventListener('cacheupdate', cacheupdate);
      });
    }
    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, [aiAgents]);

  // listen for user speech from speech sources
  useEffect(() => {
    if (aiAgentController) {
      const usermessage = e => {
        const {
          text,
          file,
        } = e.data;
        if (text) {
          aiAgentController.addUserMessage(text);
        } else if (file) {
          // Handle the image here.
          // For example, pass it to a method of aiAgentController:
          aiAgentController.addUserFile(file);
        }
      };

      const cleanups = [];
      if (voiceListener) {
        voiceListener.addEventListener('usermessage', usermessage);

        cleanups.push(() => {
          voiceListener.removeEventListener('usermessage', usermessage);
        });
      }

      if (discordClient) {
        discordClient.output.addEventListener('usermessage', usermessage);

        cleanups.push(() => {
          discordClient.output.removeEventListener('usermessage', usermessage);
        });
      }

      if (cleanups.length > 0) {
        return () => {
          for (let i = 0; i < cleanups.length; i++) {
            cleanups[i]();
          }
        };
      }
    }
  }, [aiAgentController, voiceListener, discordClient]);
  useEffect(() => {
    const listeningchange = e => {
      const {
        listening,
      } = e.data;
      if (voiceInputEnabled && !listening) {
        // console.log('disabling voice input...');
        setVoiceInputEnabled(false);
      }
    };

    const cleanups = [];
    if (voiceListener) {
      voiceListener.addEventListener('listeningchange', listeningchange);

      cleanups.push(() => {
        voiceListener.removeEventListener('listeningchange', listeningchange);
      });
    }

    if (cleanups.length > 0) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          cleanups[i]();
        }
      };
    }
  }, [voiceListener, voiceInputEnabled]);

  // voice listener state
  useEffect(() => {
    if (voiceListener) {
      voiceListener.setEnabled(voiceInputEnabled);
    }
  }, [voiceListener, voiceInputEnabled]);
  useEffect(() => {
    if (voiceListener) {
      voiceListener.setLocked(voiceInputLockEnabled);
    }
  }, [voiceListener, voiceInputLockEnabled]);

  // bind settings
  useEffect(() => {
    const settingsupdate = e => {
      const {
        key,
        value,
      } = e.data;
      switch (key) {
        case 'volume':{
          setVolume(value)
          updateSettingsDescription();
          break;
        }
        case 'showDebugPerception': {
          setShowDebugPerception(value);
          break;
        }
        case 'fullscreenEnabled': {
          setFullscreenEnabled(value);
          break;
        }
        case 'microphone': {
          setMicrophone(value);
          break;
        }
        case 'facecam': {
          setFacecam(value);
          break;
        }
        case 'closedCaptioning': {
          setClosedCaptioning(value);
          updateSettingsDescription();
          break;
        }
        // case 'basePrompt': {
        //   setBasePrompt(value);
        //   break;
        // }
        case 'discordBotToken': {
          setDiscordBotToken(value);
          break;
        }
        case 'discordChannelWhitelist': {
          setDiscordChannelWhitelist(value);
          break;
        }
        case 'discordUserWhitelist': {
          setDiscordUserWhitelist(value);
          break;
        }
      }
    };
    companionSettingsClient.addEventListener('settingsupdate', settingsupdate);

    return () => {
      companionSettingsClient.removeEventListener('settingsupdate', settingsupdate);
    };
  }, []);

  // bind microphone selection
  useEffect(() => {
    if (voiceListener) {
      voiceListener.setMicrophone(microphone);
    }
  }, [voiceListener, microphone]);

  // bind context client state updates
  useEffect(() => {
    if (perceptionContextClient) {
      perceptionContextClient.setState({
        titleString,
        pathString,
        segmentCaptionString,
        imageCaptionString,
        ocrString,
        clipboardString,
      });
    }
  }, [perceptionContextClient, ocrString, titleString, pathString, segmentCaptionString, imageCaptionString]);

  // load media devices
  useEffect(() => {
    if (!mediaDevicesLoaded) {
      mediaDevicesLoaded = true;

      (async () => {
        const devices = await navigator.mediaDevices.enumerateDevices();

        const audioInputs = devices
          .filter(device => device.kind === 'audioinput')
          // .map(m => m.label);
        setMicrophones(audioInputs);

        const videoInputs = devices
          .filter(device => device.kind === 'videoinput')
          // .map(m => m.label);
        setFacecams(videoInputs);
      })();
    }
  }, []);

  // bind video stream input
  useEffect(() => {
    const initDriver = (source, metadata) => {
      driver.stopStream();

      driver.startStream({
        source,
        metadata,
      });
    };
    // camera
    const getMatchingMediaDeviceSource = (facecamLabel, facecams) => {
      const device = facecams.find(device => device.label === facecamLabel) ?? facecams[0];
      return device;
    };
    // screen
    const getMatchingScreenSourceAsync = async (screenLabel) => {
      const source = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      return source;
    };
    // auto
    const getMatchingDisplayMediaSource = (sources, searchString) => {
      if (searchString) {
        // check exact match
        for (const source of sources) {
          if (source.name === searchString) {
            return source;
          }
        }
        // check fuzzy match
        for (const source of sources) {
          if (fuzzy(searchString, source.name) > 0.75) {
            return source;
          }
        }
      }
      return null;
    };

    (async () => {
      // media device source
      let source;
      if (captureMode === 'facetime' && (source = getMatchingMediaDeviceSource(facecam, facecams))) {
        if (!driver.stream || driver.metadata?.facecamDeviceId !== source.deviceId) {
          initDriver(source, {
            facecamDeviceId: source.deviceId,
          });
        }
      // screen capture source
      } else if (captureMode === 'screen' && (source = await getMatchingScreenSourceAsync())) {
        if (!driver.stream || driver.metadata?.screenDeviceId !== source.deviceId) {
          initDriver(source, {
            screenDeviceId: source.deviceId,
          });
        }
      // auto source
      } else if (captureMode === 'auto' && (source = getMatchingDisplayMediaSource(sources, titleString || nameString))) {
        if (!driver.stream || driver.metadata?.processId !== processId) {
          initDriver(source, {
            processId,
          });
        }
      } else {
        driver.stopStream();
      }
    })();
  }, [titleString, driver, processId, sources, captureMode, facecam, facecams]);

  // bind skills client
  useEffect(() => {
    const skillsupdate = (e) => {
      const newSkills = skillsClient.getSkills();
      setSkills(newSkills);
    };
    skillsClient.addEventListener('skillsupdate', skillsupdate);

    return () => {
      skillsClient.removeEventListener('skillsupdate', skillsupdate);
    };
  }, [skillsClient]);

  // bind driver perception update
  const bindPerceptionStatsUpdate = () => {
    return e => {
      const {
        ocr,
        seg,
        ic,
        timings,
      } = e.data;

      if (ocr) {
        const ocrString = ocr;
        setOcrString(ocrString);
      }

      if (seg) {
        const segmentCaptions = seg;
        setSegmentCaptions(segmentCaptions);

        const segmentCaptionString = segmentCaptions.map(sc => {
          const {
            bbox,
            label,
          } = sc;
          return label;
        }).join('\n');
        setSegmentCaptionString(segmentCaptionString);
      }

      if (ic) {
        const imageCaptionString = ic;
        setImageCaptionString(imageCaptionString);
      }

      if (timings) {
        setTimings(timings);
      }
    };
  };
  useEffect(() => {
    if (driver) {
      const perceptionupdate = bindPerceptionStatsUpdate();
      driver.addEventListener('perceptionupdate', perceptionupdate);

      return () => {
        driver.removeEventListener('perceptionupdate', perceptionupdate);
      };
    }
  }, [driver]);

  // disable driver while compiler is running
  useEffect(() => {
    if (driver) {
      driver.enabled = !compiler;
    }
  }, [driver, compiler]);

  // message handling
  const doubleKeyTime = 200;
  useEffect(() => {
    const message = e => {
      const {
        method,
      } = e.data;

      switch (method) {
        case 'desktop-captures': {
          const {
            data: {
              sources,
            },
          } = e.data;

          setSources(sources);
          break;
        }
        case 'global-key': {
          const {
            data: {
              name,
              state,
            },
          } = e.data;
          if (/(?:alt|meta)/.test(name)) {
            if (state === 'down' && lastAltState === 'up') {
              const now = performance.now();
              const timeDiff = now - lastAltDownTimestamp;
              if (timeDiff < doubleKeyTime) {
                if (keys.ctrl) {
                  const newChatOpen = !chatOpen;
                  setChatOpen(newChatOpen);
                } else if (keys.shift) {
                  const newVoiceInputLockEnabled = !voiceInputLockEnabled;
                  setVoiceInputLockEnabled(newVoiceInputLockEnabled);
                } else {
                  setVoiceInputEnabled(true);
                  // Set indicator to listening when the mic is on
                  // setCompanionState('listening');
                }
              }
              lastAltDownTimestamp = now;
            } else if (state === 'up' && lastAltState === 'down') {
              setVoiceInputEnabled(false);
              // Set indicator to standby when the mic is off
              // setCompanionState('standby');
            }
            lastAltState = state;
          } else if (/ctrl/.test(name)) {
            keys.ctrl = state === 'down';
          } else if (/shift/.test(name)) {
            keys.shift = state === 'down';
          }
          break;
        }
        case 'global-mouse': {
          const {
            data: {
              mousePosition,
            },
          } = e.data;
          setMousePosition(mousePosition);
          break;
        }
        case 'window-metrics': {
          const {
            data,
          } = e.data;
          windowMetricsManager.setData(data);
          break;
        }
        case 'clipboard-update': {
          const {
            data: {
              textContent,
            },
          } = e.data;
          const newClipboardString = textContent.slice(0, 1024).replace(/```/g, '\\`');
          setClipboardString(newClipboardString);
          break;
        }
        case 'settings-hover': {
          const {
            data: {
              hover,
            },
          } = e.data;
          setSettingsHover(hover);

          if (!hover && !['chat','prompt','skills'].includes(settingsMode)) {
            setSettingsMode(null);
          }
          break; 
        }
        case 'devtools-opened': {
          const {
            data: {
              open,
            },
          } = e.data;
          setDevtoolsOpen(open);
          break;
        }
        case 'active-window': {
          const {
            data,
          } = e.data;

          if (data.title !== titleString) {
            setTitleString(data.title);
          }
          if (data.name !== nameString) {
            setNameString(data.name);
          }
          if (data.bundleId !== bundleIdString) {
            setBundleIdString(data.bundleId);
          }
          if (data.path !== pathString) {
            setPathString(data.path);
          }
          if (data.processId !== processId) {
            setProcessId(data.processId);
          }

          break;
        }
        default: {
          break;
        }
      }
    };
    window.addEventListener('message', message);

    return () => {
      window.removeEventListener('message', message);
    };
  }, [settingsMode, voiceInputEnabled, voiceInputLockEnabled]);

  // stop companion ai agent on voice interrupt
  useEffect(() => {
    if (aiAgentController && (voiceInputEnabled || voiceInputLockEnabled || chatOpen)) {
      aiAgentController.stop();
    }
  }, [aiAgentController, voiceInputEnabled, voiceInputLockEnabled, chatOpen]);

  // worlds
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

  // electron bindings
  if (electronIpc) {
    // browser solids, for keeping the app in focus
    useEffect(() => {
      if (settingsHover) {
        electronIpc.browserAddSolid();

        return () => {
          electronIpc.browserRemoveSolid();
        };
      }
    }, [settingsHover]);
  }

  const chatLocked = settingsMode === 'chat';
  const setChatLocked = (locked) => {
    setSettingsMode(locked ? 'chat' : null);
  };

  const discordEnabled = !!discordClient;
  const setDiscordEnabled = enabled => {
    if (enabled && !discordClient) {
      const newDiscordClient = new DiscordClient({
        token: discordBotToken,
        channelWhitelist: discordChannelWhitelist.split(','),
        userWhitelist: discordUserWhitelist.split(','),
      });
      setDiscordClient(newDiscordClient);
    } else if (!enabled && discordClient) {
      discordClient.destroy();
      setDiscordClient(null);
    }
  };

  const clearScriptCache = () => {
    const videoScriptCompiler = new VideoScriptCompiler();
    videoScriptCompiler.clear();

    const audioScriptCompiler = new AudioScriptCompiler();
    audioScriptCompiler.clear();

    const fullScriptCompiler = new FullScriptCompiler();
    fullScriptCompiler.clear();
  };

  const enterXr = () => {
    let worldIdentity = null;
    currentWorldIds.some((worldId, i) => {
      worldIdentity = worlds.find(world => world.spec.source.id === worldId);
      return !!worldIdentity;
    });
    if (worldIdentity) {
      console.log('entering xr', {worldIdentity});
    } else {
      console.warn('no current world id', {worldIdentity});
    }
  };

  const renderVideo = async ({
    youtubeUrl: u,
    aiFps,
    cacheScripts,
  }) => {
    console.log('render video', {u});

    const u2 = new URL(window.location.href);
    u2.pathname = '/api/youtube';
    u2.searchParams.set('url', u);
    u2.searchParams.set('type', 'video');

    try {
      const compiler = new VideoScriptCompiler({
        aiFps,
        cacheScripts,
      });
      setCompiler(compiler);
      const videoScript = await compiler.compile(u2, {
        aiFps,
        cacheScripts,
      });
      console.log('got video script', videoScript);
    } catch(err) {
      console.warn(err);
    } finally {
      setCompiler(null);
    }
  };
  const renderAudio = async ({
    youtubeUrl: u,
    aiFps,
    cacheScripts,
  }) => {
    console.log('render audio', {u});

    const u2 = new URL(window.location.href);
    u2.pathname = '/api/youtube';
    u2.searchParams.set('url', u);
    u2.searchParams.set('type', 'video');

    try {
      const compiler = new AudioScriptCompiler({
        aiFps,
        cacheScripts,
      });
      setCompiler(compiler);
      const audioScript = await compiler.compile(u2, {
        aiFps,
        cacheScripts,
      });
      console.log('got audio script', audioScript);
    } catch(err) {
      console.warn(err);
    } finally {
      setCompiler(null);
    }
  };
  const renderFull = async ({
    youtubeUrl: u,
    aiFps,
    cacheScripts,
  }) => {
    console.log('render full', {u});

    const u2 = new URL(window.location.href);
    u2.pathname = '/api/youtube';
    u2.searchParams.set('url', u);
    u2.searchParams.set('type', 'video');

    try {
      const compiler = new FullScriptCompiler({
        aiFps,
        cacheScripts,
      });
      setCompiler(compiler);
      const fullScript = await compiler.compile(u2, {
        aiFps,
        cacheScripts,
      });
      console.log('got full script', fullScript);
    } catch(err) {
      console.warn(err);
    } finally {
      setCompiler(null);
    }
  };

  const characterName = (() => {
    if (agentCharacterIdentities.length > 0) {
      return agentCharacterIdentities[0].spec.name;
    } else {
      return '';
    }
  })();

  // console.log('fullscreenEnabled', fullscreenEnabled);

  return (
    <div
      className={classnames(
        styles.companion,
        hover ? styles.hover : null,
        fullscreenEnabled ? styles.fullscreen : null,
        devtoolsOpen ? styles.devtoolsOpen : null,
        showDebugPerception ? styles.showDebugPerception : null
      )}
      onClick={click}
      onMouseEnter={mouseEnter}
      onMouseLeave={mouseLeave}
      onDragEnter={dragEnter}
      onDragLeave={dragLeave}
      onDragOver={dragOver}
      onDragStart={dragStart}
      onDragEnd={dragEnd}
      onDrop={drop}
    >
      <div className={styles.imgs}>
        <canvas
          width={compilerDimensions[0]}
          height={compilerDimensions[1]}
          className={classnames(
            styles.img,
            !compiler ? styles.hidden : null,
          )}
          ref={compilerCanvasRef}
        />
        <PerceptionPreview
          segmentCaptions={segmentCaptions}
          previewCanvasSize={previewCanvasSize}
          setPreviewCanvasSize={setPreviewCanvasSize}

          driver={driver}
          compiler={compiler}
        />
      </div>
      {showDebugPerception && (
        <div className={styles.debugOverlay}>
          <h1>Artificial Intelligent. ~live~</h1>

          {(titleString || pathString) ? <>
            <h2>Process info</h2>
            <div className={styles.header}>
              <div
                className={styles.title}
              >{titleString}</div>
              <div
                className={styles.path}
              >{pathString}</div>
            </div>
          </> : null}

          {(imageCaptionString || segmentCaptionString) ? <>
            <h2>Visual perception</h2>
            <div className={styles.subheader}>
              <div
                className={styles.detail}
              >{imageCaptionString}</div>
              <div
                className={styles.detail}
              >{segmentCaptionString}</div>
            </div>
          </> : null}

          {ocrString ? <>
            <h2>Text perception</h2>
            <div
              className={styles.textarea}
            >{ocrString}</div>
          </> : null}

          {Object.keys(timings).some(k => isFinite(timings[k])) ? <>
            <h2>Timing</h2>
            <AiTimings
              timings={timings}
            />
          </> : null}
        </div>
      )}

      <div className={styles.worlds}>
        {currentWorldIds.map((worldId, i) => {
          const worldIdentity = worlds.find(world => world.spec.source.id === worldId);
          const id = worldIdentity.spec.source.id;

          return (
            <GameCanvas
              worldIdentity={worldIdentity}

              // aiAgentController={aiAgentController}

              key={id}
            />
          );
        })}
      </div>

      <ScreenWorlds
        enabled={screenshotEnabled}
        setEnabled={setScreenshotEnabled}
        dragging={screenshotDragging}
        setDragging={setScreenshotDragging}
      />

      <RainbowComponent
        characterName={characterName}

        chatLocked={chatLocked}
        setChatLocked={setChatLocked}

        settingsMode={settingsMode}
        setSettingsMode={setSettingsMode}

        devtoolsOpen={devtoolsOpen}

        screenshotEnabled={screenshotEnabled}
        setScreenshotEnabled={setScreenshotEnabled}

        voiceInputEnabled={voiceInputEnabled}
        setVoiceInputEnabled={setVoiceInputEnabled}

        captureMode={captureMode}
        setCaptureMode={setCaptureMode}

        voiceInputLockEnabled={voiceInputLockEnabled}
        setVoiceInputLockEnabled={setVoiceInputLockEnabled}

        aiAgentControllerRunning={aiAgentControllerRunning}
        setAiAgentControllerRunning={setAiAgentControllerRunning}
      />

      <CompanionQuickSettings
        characterClient={characterClient}
        memoryClient={memoryClient}
        promptClient={promptClient}
        skillsClient={skillsClient}
        companionSettingsClient={companionSettingsClient}
        worldsClient={worldsClient}

        aiAgentController={aiAgentController}

        voices={voices}
        settingsHover={settingsHover}
        devtoolsOpen={devtoolsOpen}
        settingsMode={settingsMode}
        setSettingsMode={setSettingsMode}
        terminalOpen={terminalOpen}
        setTerminalOpen={setTerminalOpen}
        browserOpen={browserOpen}
        setBrowserOpen={setBrowserOpen}

        characterIdentities={characterIdentities}
        npcPlayers={npcPlayers}
        agentCharacterIdentities={agentCharacterIdentities}
        agentNpcPlayers={agentNpcPlayers}
        companionRenderer={companionRenderer}

        showDebugPerception={showDebugPerception}
        setShowDebugPerception={setShowDebugPerception}

        screenshotEnabled={screenshotEnabled}
        setScreenshotEnabled={setScreenshotEnabled}

        microphones={microphones}
        facecams={facecams}

        skills={skills}
        sources={sources}

        aiAgents={aiAgents}

        captureMode={captureMode}
        setCaptureMode={setCaptureMode}

        discordEnabled={discordEnabled}
        setDiscordEnabled={setDiscordEnabled}
        npcLoader={npcLoader}
        compiler={compiler}

        clearScriptCache={clearScriptCache}

        enterXr={enterXr}

        fullscreenEnabled={fullscreenEnabled}
        setFullscreenEnabled={setFullscreenEnabled}

        renderVirtualScene={renderVirtualScene}
        renderVideo={renderVideo}
        renderAudio={renderAudio}
        renderFull={renderFull}
      />

      <CompanionChat
        open={chatOpen}
        locked={chatLocked}
        // currentPlayerSpec={currentPlayerSpec}
        messages={chatMessages}
        onOpen={e => {
          setChatOpen(true);
        }}
        onClose={force => {
          if (!chatLocked || force) {
            setChatOpen(false);
            setSettingsMode(null);
          }
        }}
        onChat={message => {
          if (voiceListener) {
            switch (message.type) {
              case 'text': {
                // it's a text message
                voiceListener.dispatchEvent(new MessageEvent('usermessage', {
                  data: {
                    text: message.value,
                  },
                }));
                break;
              }
              case 'file': {
                // it's an image blob
                voiceListener.dispatchEvent(new MessageEvent('usermessage', {
                  data: {
                    file: message.value,
                  },
                }));
                break;
              }
            }
          }
        }}

        characterIdentities={characterIdentities}
        skills={skills}

        aiAgentController={aiAgentController}
      />

      {terminalOpen ? <TerminalElement /> : null}
      {browserOpen ? <BrowserElement /> : null}

      <div className={classnames(
        styles.agents,
        screenshotDragging ? styles.dim : null,
      )}>
        {agentCharacterIdentities.map((characterIdentity, i) => {
          const npcPlayer = agentNpcPlayers.get(characterIdentity);

          return (
            <AgentNodeElement
              placeIndex={agentCharacterIdentities.length - i - 1}

              characterIdentity={characterIdentity}
              npcPlayer={npcPlayer}
              volume={volume}
              companionRenderer={companionRenderer}

              chatLocked={chatLocked}
              closedCaptioning={closedCaptioning}
              discordClient={discordClient}

              aiAgentController={aiAgentController}

              mousePosition={mousePosition}
              screenshotEnabled={screenshotEnabled}

              key={characterIdentity.spec.id}
            />
          );
        })}
      </div>

      {dragging ? <div className={styles.canvasPlaceholder}></div> : null}
    </div>
  );
};