/* this module is responsible for mapping a remote TTS endpoint to the character. */

import {
  MPEGDecoder,
} from 'mpg123-decoder';

import {
  aiProxyHost,
} from '../../endpoints.js';
import {
  abortableRead,
} from '../../util.js';

//

export const getVoiceRequest = {
  elevenlabs: async ({
    text = '',
    voiceId = null,
  }) => {
    if (!voiceId) {
      throw new Error('voiceId was not passed');
    }

    const baseUrl = `https://${aiProxyHost}/api/ai/text-to-speech`;
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
    // read fetch stream
    const res = await fetch(`${baseUrl}/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(j),
    });
    return res;
  },
  tiktalknet: async ({
    text = '',
    voiceId = null,
  }) => {
    if (!voiceId) {
      throw new Error('voiceId was not passed');
    }

    const baseUrl = `https://${aiProxyHost}/api/tts`;
    const u = new URL(baseUrl);
    u.searchParams.set('voice', voiceId);
    u.searchParams.set('s', text);

    // read fetch stream
    const res = await fetch(u);
    return res;
  },
};
export const getVoiceStream = {
  elevenlabs: (opts) => {
    // create a through stream that will be used to pipe the audio stream
    const throughStream = new TransformStream();

    // request the audio stream
    (async () => {
      const res = await getVoiceRequest.elevenlabs(opts);

      if (res.ok) {
        // const start = performance.now();
        await res.body.pipeTo(throughStream.writable);
        // const end = performance.now();
        // console.log('preloadElevenLabsVoiceStream took', end - start, 'ms');
      } else {
        console.warn('preloadElevenLabsVoiceStream error', res.status, res.statusText);
      }
    })();

    // return the through stream readable end
    const stream = throughStream.readable;
    // stream.isPreloadStream = true;
    // mp3
    // stream.mimeType = 'audio/mpeg';
    return stream;
  },
  tiktalknet: (opts) => {
    // create a through stream that will be used to pipe the audio stream
    const throughStream = new TransformStream();

    // request the audio stream
    (async () => {
      const res = await getVoiceRequest.tiktalknet(opts);

      if (res.ok) {
        // const start = performance.now();
        await res.body.pipeTo(throughStream.writable);
        // const end = performance.now();
        // console.log('tiktalknet took', end - start, 'ms');
      } else {
        console.warn('tiktalknet error', res.status, res.statusText);
      }
    })();

    // return the through stream readable end
    const stream = throughStream.readable;
    // stream.isPreloadStream = true;
    // mp3
    // stream.mimeType = 'audio/mpeg';
    return stream;
  },
};
/* const preloadElevenLabsVoiceMessage = (text, voiceEndpointVoicer) => {
  const loadPromise = (async () => {
    const baseUrl = 'https://api.elevenlabs.io/v1/text-to-speech';
    const j = {
      text,
      voice_settings: {
        stability: 0.15,
        similarity_boost: 1,
        // optimize_streaming_latency: 4,
      },
      optimize_streaming_latency: 3,
      // optimize_streaming_latency: 4,
    };
    let res;
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        res = await fetch(`${baseUrl}/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(j),
        });
      } catch (err) {
        // nothing
      }
    }
    const arrayBuffer = await res.arrayBuffer();
    
    const audioBuffer = await voiceEndpointVoicer.loadAudioBufferFromArrayBuffer(arrayBuffer);
    return audioBuffer;
    // const mp3Blob = await res.blob();
    // const audio = new Audio();
    // audio.src = URL.createObjectURL(mp3Blob);
    // audio.play();

    // // wait for audio to finish
    // await new Promise((accept, reject) => {
    //   audio.addEventListener('ended', accept, {once: true});
    //   audio.addEventListener('error', reject, {once: true});
    // });
  })();

  return {
    isPreloadMessage: true,
    waitForLoad() {
      return loadPromise;
    },
  };
}; */

//

export class VoiceEndpoint {
  constructor(getVoiceStreamFn, voiceId) {
    this.#getVoiceStreamFn = getVoiceStreamFn;
    this.#voiceId = voiceId;
  }
  #getVoiceStreamFn;
  #voiceId;
  getStream(text) {
    return this.#getVoiceStreamFn({
      text,
      voiceId: this.#voiceId,
    });
  }
}
export class ElevenLabsVoiceEndpoint extends VoiceEndpoint {
  constructor({
    voiceId,
  }) {
    super(getVoiceStream.elevenlabs, voiceId);
  }
}
export class TiktalknetVoiceEndpoint extends VoiceEndpoint {
  constructor({
    voiceId,
  }) {
    super(getVoiceStream.tiktalknet, voiceId);
  }
}

//

const readStream = async (stream, opts) => {
  const signal = opts?.signal;
  const audioInjectWorkletNode = opts?.audioInjectWorkletNode;
  if (!stream || !signal || !audioInjectWorkletNode) {
    debugger;
    throw new Error('invalid arguments');
  }

  const decoder = new MPEGDecoder();
  await decoder.ready;

  const abort = e => {
    audioInjectWorkletNode.port.postMessage({
      method: 'clear',
      args: {},
    });
  };
  signal.addEventListener('abort', abort);

  let firstPush = true;
  await new Promise((accept, reject) => {
    const reader = stream.getReader();

    const pushAudioBuffer = ({
      buffer,
      sampleRate,
    }) => {
      if (firstPush) {
        firstPush = false;
        opts.onStart?.();
      }

      const channelData = [
        buffer,
      ];
      audioInjectWorkletNode.port.postMessage({
        method: 'buffer',
        args: {
          channelData,
          sampleRate,
        },
      });
    };
    const read = async () => {
      const {
        done,
        value,
      } = await abortableRead(reader, opts.signal);
      if (opts.signal.aborted) {
        accept();
        return;
      }

      if (done) {
        await audioInjectWorkletNode.waitForFinish();
        accept();
      } else {
        const {
          channelData,
          sampleRate,
        } = decoder.decode(value);

        const firstChannelData = channelData[0]; // Float32Array
        if (firstChannelData.length > 0) {
          pushAudioBuffer({
            buffer: firstChannelData,
            sampleRate,
          });
        }

        read();
      }
    };
    read();
  });

  opts?.onEnd?.();

  signal.removeEventListener('abort', abort);

  decoder.free();
};

export class VoiceEndpointVoicer {
  constructor({
    voiceEndpoint,
    audioManager,
  }) {
    if (!voiceEndpoint || !audioManager) {
      console.warn('bad args', {
        voiceEndpoint,
        audioManager,
      });
      debugger;
    }

    this.voiceEndpoint = voiceEndpoint;
    this.audioManager = audioManager;

    this.running = false;
    this.queue = [];
    this.cancel = null;
    this.endPromise = null;
  }
  setVolume(value){
    this.audioManager.setVolume(value);
  }
  getStream(text) {
    return this.voiceEndpoint.getStream(text);
  }
  async start(text, opts) {
    let stream;
    if (text instanceof ReadableStream) {
      stream = text;
    } else {
      stream = this.getStream(text);
    }

    await readStream(stream, opts);
  }
}