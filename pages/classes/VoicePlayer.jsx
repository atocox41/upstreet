// import {
//   QueueManager,
// } from '../../packages/engine/managers/queue/queue-manager.js';
import {
  AudioInjectWorkletNode,
} from '../../packages/engine/audio/inject-worklet-node.js';

//

export class VoicePlayer { // XXX rename to CompanionOutput
  constructor({
    player,
    audioContext,
  }) {
    this.player = player;
    this.audioContext = audioContext;

    const audioInjectWorkletNode = new AudioInjectWorkletNode({
      audioContext,
    });
    this.audioInjectWorkletNode = audioInjectWorkletNode;

    // this.voiceQueueManager = new QueueManager(); // XXX break out globally
  }
  async playVoiceStream(opts) {
    // await this.voiceQueueManager.waitForTurn(async () => {
      const stream = await opts.onStart();
      if (opts.signal.aborted) return;

      const onabort = () => {
        this.audioInjectWorkletNode.port.postMessage({
          method: 'clear',
          args: {},
        });
      };
      opts.signal.addEventListener('abort', onabort);

      try {
        await this.player.voicer.start(stream, {
          ...opts,
          audioInjectWorkletNode: this.audioInjectWorkletNode,
        });

        await opts.onEnd();
      } finally {
        opts.signal.removeEventListener('abort', onabort);
      }
    // });
  }
  connectToAvatar(avatar) {
    let audioContext = this.audioContext;
    avatar.setAudioEnabled({
      audioContext,
    });
    this.audioInjectWorkletNode.connect(avatar.getAudioInput());
  }
}