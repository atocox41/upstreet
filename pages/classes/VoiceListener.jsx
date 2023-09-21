import MicrophoneWorker from "../../packages/engine/audio/microphone-worker";
import { VoiceInput } from "../../packages/engine/audio/voice-input/voice-input";
import { VoiceTranscriber } from "./VoiceTranscriber";
import { VolumeTracker } from "./VolumeTracker";
import {
  abortError,
} from "../../packages/engine/lock-manager.js";

//

export class VoiceListener extends EventTarget {
  constructor({
    audioManager,
    audioContext,
  }) {
    super();

    // members
    this.enabled = false;
    this.locked = false;
    this.voiceTranscriber = new VoiceTranscriber();
    this.voiceTranscriber.addEventListener('transcribe', e => {
      this.dispatchEvent(new MessageEvent('usermessage', {
        data: e.data,
      }));
    });
    this.abortController = new AbortController();

    // locals
    this.voiceInput = new VoiceInput({
      character: null,
      audioManager,
    });
    this.microphoneWorker = new MicrophoneWorker({
      audioContext,
      emitVolume: true,
      // volumeCutoff: 0.05,
    });
    this.recorder = null;
    
    // state
    this.listening = false;
    this.lastListeningTime = 0;

    (async () => {
      // listen for microphone change to bind/unbind
      let mediaStreamNode = null;
      this.voiceInput.addEventListener('micchange', e => {
        const {
          enabled,
        } = e.data;

        if (mediaStreamNode) {
          mediaStreamNode.disconnect();
          mediaStreamNode = null;
        }

        if (enabled) {
          mediaStreamNode = audioContext.createMediaStreamSource(this.voiceInput.mediaStream);
          mediaStreamNode.connect(this.microphoneWorker.getInput());
        }
      });

      // enable microphone
      // await this.voiceInput.enableMic();
      // if (this.abortController.signal.aborted) return;

      // activity detection
      const volumeStartThreshold = 0.05;
      const volumeEndThreshold = 0.05;
      const volumeTracker = new VolumeTracker();
      
      this.microphoneWorker.addEventListener('volume', e => {
        volumeTracker.sampleVolume(e.data);

        const maxVolume = volumeTracker.getMaxVolume();

        // stop listening
        const listeningTimeDiff = performance.now() - this.lastListeningTime;
        const minListenTime = 500;
        if (this.listening && listeningTimeDiff > minListenTime) {
          if ((!this.enabled && !this.locked) || ((this.enabled || this.locked) && maxVolume < volumeEndThreshold)) {
            this.#stopRecording();
          } else {
            // console.log('volume too high to stop');
          }
        }

        // start listening
        if (!this.listening) {
          if (((this.enabled || this.locked) && maxVolume >= volumeStartThreshold)) {
            this.#startRecording();
          } else {
            // console.log('max volume too low to start');
          }
        }
      });
    })();
  }

  async setEnabled(enabled) {
    if (enabled) {
      await this.voiceInput.enableMic();
    }
    this.enabled = enabled;
  }
  async setLocked(locked) {
    if (locked) {
      await this.voiceInput.enableMic();
    }
    this.locked = locked;
  }

  #startRecording() {
    const makeMediaRecorder = () => {
      // recording wav chunks
      const recorder = new MediaRecorder(this.voiceInput.mediaStream, {
        // mimeType: 'audio/webm',
      });
      recorder.ondataavailable = async e => {
        if (this.abortController.signal.aborted) return;
        this.pushData(e.data);
      };
      recorder.onerror = e => {
        if (this.abortController.signal.aborted) return;
        console.error('recorder error', e);
      };
      // console.log('recorder start');
      recorder.start();
      return recorder;
    };

    this.recorder = makeMediaRecorder();
    this.listening = true;
    this.lastListeningTime = performance.now();

    this.dispatchEvent(new MessageEvent('listeningchange', {
      data: {
        listening: true,
      },
    }));
  }
  #stopRecording() {
    this.recorder.stop();
    this.recorder = null;
    this.listening = false;

    this.dispatchEvent(new MessageEvent('listeningchange', {
      data: {
        listening: false,
      },
    }));
  }

  setMicrophone(microphone) {
    if (microphone !== this.voiceInput.microphone) {
      this.voiceInput.setMicrophone(microphone);
    }
  }
  pushData(blob) {
    this.voiceTranscriber.pushData(blob);
  }

  close() {
    this.voiceInput.disableMic();
    this.microphoneWorker.close();
    this.recorder && this.recorder.stop();
    this.abortController.abort(abortError);
  }
}