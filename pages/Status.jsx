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
import { fuzzy } from 'fast-fuzzy';
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
// import {
//   AudioInjectWorkletNode,
// } from '../packages/engine/audio/inject-worklet-node.js';
import {
  OpusDecoder,
} from 'opus-decoder';
// import { VoiceTranscriber } from './classes/VoiceTranscriber.jsx';
import {
  whisperTranscribe,
} from './helpers/WhisperTranscribe.js';
import audioBufferToWav from 'audiobuffer-to-wav';
// import {
//   makeDefaultSkills,
// } from '../packages/engine/ai-agent/skills/skills.js';
import {
  GameCanvas,
} from './components/game-canvas/GameCanvas.jsx';
import {
  aiProxyHost,
} from '../packages/engine/endpoints.js';
import {
  imageSelection,
  imageSegmentation,
  imageSegmentationMulti,
  imageCaptioning,
  vqa,
} from '../packages/engine/vqa.js';
import { WebaverseEngine } from '../packages/engine/webaverse.js';

//

import {
  RealtimePerceptionDriver,
} from '../packages/engine/ai-agent/drivers/realtime-perception-driver.js';
import { VoiceListener } from './classes/VoiceListener.jsx';

// import {
//   canvasDimensions,
//   megaCanvasDimensions,
//   cardDimensions,
//   defaultCameraUvw,
//   validMoods,
//   validEmotions,
//   // defaultBasePrompt,
//   defaultLlmModel,
// } from '../packages/engine/constants/companion-constants.js';
// import {
//   vectorDatabaseDataDirectoryName,
//   characterDatabaseDataDirectoryName,
//   worldsDatabaseDataDirectoryName,
// } from '../packages/engine/constants/client-constants.js';
import {
  minFov,
} from '../packages/engine/constants.js';
// import {
//   loadWorkletModules,
// } from '../packages/engine/audio/audio-manager.js';
import {
  AudioInjectWorkletNode,
} from '../packages/engine/audio/inject-worklet-node.js';
import {
  // MediaScriptDriver,
  // compileVideoScript,
  // compileAudioScript,
  // compileFullScript,
  VideoScriptCompiler,
  AudioScriptCompiler,
  FullScriptCompiler,
} from '../packages/engine/ai-agent/drivers/media-script-driver.js';
import {
  compileVirtualScene,
} from '../packages/gen/src/generators/scene-generator.js';
import {
  generateSkybox,
  loadSkyboxImageSpecs,
} from '../packages/engine/clients/blockade-labs-client.js';

import CompanionEmoteManager from '../packages/engine/managers/companion-emote/companion-emote-manager.js';

import {
  EventStreamParseStream,
} from '../packages/engine/ai-agent/utils/event-stream-parser.js';

//

import styles from '../styles/Status.module.css';

//

// engine objects

const Section = ({
  section,
}) => {
  const {
    title,
    type,
    value,
  } = section;

  return (
    <div className={styles.section}>
      <h1>{title}</h1>
      {(() => {
        switch (type) {
          case 'text': {
            return (<pre>{value}</pre>);
          }
          case 'audio': {
            return (
              <audio controls src={value} />
            );
          }
          default: {
            return null;
          }
        }
      })()}
    </div>
  );
};

const globalSections = [];
export const StatusApp = () => {
  const [sections, setSections] = useState(globalSections);

  const pushSection = ({
    title,
    type,
    value,
  }) => {
    globalSections.push({
      title,
      type,
      value,
    });
    setSections(globalSections.slice());
  };
  const _testFalcon = () => new Promise((accept, reject) => {
    let s = '';

    const eventSource = new EventSource(`https://${aiProxyHost}/api/falcon/generate?prompt=the best thing ever is`);
    eventSource.onmessage = e => {
      if (e.data === '[END]') {
        accept();
        cleanup();
      } else {
        s += e.data;
      }
    };
    eventSource.onerror = e => {
      reject(e);
      cleanup();
    };
    const cleanup = () => {
      eventSource.onmessage = null;
      eventSource.onerror = null;

      eventSource.close();

      pushSection({
        title: 'falcon',
        type: 'text',
        value: s,
      });
    };
  });
  const _testPygmalion = async () => {
    const messages = [
      {
        role: 'system',
        content: 'you are a waifu',
      },
      {
        role: 'user',
        content: 'the best thing ever is...',
      },
    ];
    const abortController = new AbortController();
    const signal = abortController.signal;

    const eventStreamParseStream = new EventStreamParseStream();

    // stream the response via server sent events (EventSource)
    const response = await fetch(`https://${aiProxyHost}/api/pygmalion/v1/chat/completions`, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        model: 'manticore-13b-chat',
        messages,
        // stop: ['\n'],
        // temperature: 1.25,

        "max_tokens": 200,
        "temperature": 0.7,

        stream: true,
      }),

      signal,
    });
    if (signal.aborted) return;

    response.body.pipeThrough(eventStreamParseStream);

    let s = '';
    const reader = eventStreamParseStream.readable.getReader();
    // console.log('reading');
    for (;;) {
      const {
        done,
        value,
      } = await reader.read();
      if (done) {
        break;
      } else {
        s += value;
      }
    }
    pushSection({
      title: 'pygmalion',
      type: 'text',
      value: s,
    });
  };
  const _testVqa = async () => {
    const res = await fetch('/images/skyboxes/diffuse.jpg');
    const blob = await res.blob();

    const [
      // caption,
      question,
    ] = await Promise.all([
      // imageCaptioning(clipBlob),
      vqa(blob, 'Question: What is the main color? Answer:'),
    ]);

    pushSection({
      title: 'vqa',
      type: 'text',
      value: question,
    });
  };
  const _testImageSelection = async () => {
    const res = await fetch('/images/skyboxes/diffuse.jpg');
    const blob = await res.blob();

    const imageBitmap = await createImageBitmap(blob);
    const x = Math.floor(imageBitmap.width / 2);
    const y = Math.floor(imageBitmap.height / 2);

    const centerPoints = [];
    const centerLabels = [];
    centerPoints.push([
      x,
      y,
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
    );
    const {
      dims,
      bbox,
      uint8Array,
    } = result2;

    const s = JSON.stringify({
      dims,
      bbox,
    });
    pushSection({
      title: 'imageSelection',
      type: 'text',
      value: s,
    });
  };
  const _testImageCaptioning = async () => {
    const res = await fetch('/images/skyboxes/diffuse.jpg');
    const blob = await res.blob();

    const caption = await imageCaptioning(blob);

    pushSection({
      title: 'imageCaptioning',
      type: 'text',
      value: caption,
    });
  };
  const _testImageSegmentation = async () => {
    const res = await fetch('/images/skyboxes/diffuse.jpg');
    const blob = await res.blob();

    const j = await imageSegmentation(
      blob,
    );

    const s = JSON.stringify(j);
    pushSection({
      title: 'imageSegmentation',
      type: 'text',
      value: s,
    });
  };
  const _testDoctr = async () => {
    const res = await fetch('/images/test-anime-title-screen.jpeg');
    const blob = await res.blob();

    const res2 = await fetch(`https://${aiProxyHost}/api/ocr`, {
      method: 'POST',
      body: blob,
    });
    const ocrString = await res2.text();

    pushSection({
      title: 'ocr',
      type: 'text',
      value: ocrString,
    });
  };
  const _testOpenAi = async () => {
    const modelName = 'gpt-4';
    const messages = [
      {
        role: 'system',
        content: 'you are a waifu',
      },
      {
        role: 'user',
        content: 'the best thing ever is...',
      },
    ];
    const abortController = new AbortController();
    const signal = abortController.signal;

    const eventStreamParseStream = new EventStreamParseStream();
    (async () => {
      // stream the response via server sent events (EventSource)
      const response = await fetch(`https://${aiProxyHost}/api/ai/chat/completions`, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          model: modelName,
          messages,
          // stop: ['\n'],
          // temperature: 1.25,
          stream: true,
        }),

        signal,
      });
      if (signal.aborted) return;

      response.body.pipeThrough(eventStreamParseStream);
    })().catch(err => {
      console.warn(err);
    });

    let s = '';
      const reader = eventStreamParseStream.readable.getReader();
      // console.log('reading');
      for (;;) {
        const {
          done,
          value,
        } = await reader.read();
        if (done) {
          break;
        } else {
          s += value;
        }
      }
      pushSection({
        title: 'openai',
        type: 'text',
        value: s,
      });
  };

  const _testElevenLabs = async () => {
    const baseUrl = `https://${aiProxyHost}/api/ai/text-to-speech`;

    const text = `What's up?`;
    const j = {
      text,
      voice_settings: {
        stability: 0.15,
        similarity_boost: 1,
        optimize_streaming_latency: 4,
      },
      // optimize_streaming_latency: 3,
      optimize_streaming_latency: 4,
    };
    const voiceId = 'XLvJY0dlqRhbdmq8Z5JR';

    // read fetch stream
    // const res = await fetch(`${baseUrl}/${voiceId}/stream`, {
    const res = await fetch(`${baseUrl}/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(j),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    pushSection({
      title: 'elevenLabs',
      type: 'audio',
      value: url,
    });
  };
  const _testBlockadeLabs = async () => {
    const data = await generateSkybox({
      prompt: 'anime town',
    });
    const s = JSON.stringify(data);

    pushSection({
      title: 'blockadeLabs',
      type: 'text',
      value: s,
    });
  };

  // unpaid
  const _checkLocal = async () => {
    // await _testFalcon();
    // await _testPygmalion();
    await _testVqa();
    await _testImageSelection();
    await _testImageCaptioning();
    await _testImageSegmentation();
    await _testDoctr();
  };
  // paid
  const _checkRemote = async () => {
    await _testOpenAi();
    await _testElevenLabs();
    await _testBlockadeLabs();
  };

  return (
    <div
      className={styles.statusApp}
    >
      <button onClick={e => {
        _checkLocal();
      }}>Check local</button>
      <button onClick={e => {
        _checkRemote();
      }}>Check remote</button>
      {sections.map((section, i) => {
        return (<Section section={section} key={i} />);
      })}
    </div>
  );
};