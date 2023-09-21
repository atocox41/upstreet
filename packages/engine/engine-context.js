/*
this file contains the initialization object for the engine.
this includes all of the objects that are useful outside of the engine, and can be passed in during initialization.
*/

import * as THREE from 'three';
import {
  AudioManager,
} from './audio/audio-manager.js';
import {
  Sounds,
} from './sounds.js';
import {
  Voices,
} from './voices.js';

import {
  LoadingManager,
} from './managers/loading/loading-manager.js';

import {
  AiClient,
} from './clients/ai-client.js';

//

export class EngineContext {
  constructor({
    audioContext,
    sounds,
    voices,
    aiClient,
    loadingManager,
  } = {}) {
    this.audioContext = audioContext;
    this.sounds = sounds;
    this.voices = voices;
    this.aiClient = aiClient;
    this.loadingManager = loadingManager;

    // initialize missing members
    this.#initDefaults();
  }

  #loadPromise = null;
  #initDefaults() {
    if (!this.audioContext) {
      this.audioContext = THREE.AudioContext.getContext();
    }
    if (!this.audioManager) {
      this.audioManager = new AudioManager({
        audioContext: this.audioContext,
      });
    }
    if (!this.sounds) {
      this.sounds = new Sounds({
        audioManager: this.audioManager,
        ioBus: this.ioBus,
      });
    }
    if (!this.voices) {
      this.voices = new Voices();
    }
    if (!this.aiClient) {
      this.aiClient = new AiClient();
    }
    if (!this.loadingManager) {
      this.loadingManager = new LoadingManager();
    }
  }

  waitForLoad() {
    if (!this.#loadPromise) {
      this.#loadPromise = (async () => {
        await Promise.all([
          this.sounds.waitForLoad(),
          this.voices.waitForLoad(),
        ]);
      })();
    }
    return this.#loadPromise;
  }
}