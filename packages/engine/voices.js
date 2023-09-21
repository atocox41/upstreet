import {
  voicePacksUrl,
  voiceEndpointsUrl,
} from './endpoints.js';
// import overrides from './overrides.js';
// import {
//   PlayersManager,
// } from './players-manager.js';

export class Voices {
  constructor() {
    this.voicePacks = [];
    this.voiceEndpoints = {};

    this.loadPromise = (async () => {
      await Promise.all([
        (async () => {
          const res = await fetch(voicePacksUrl);
          const j = await res.json();
          // this.voicePacks.push(...j);
          this.voicePacks = j;
        })(),
        (async () => {
          const res = await fetch(voiceEndpointsUrl);
          const j = await res.json();
          // this.voiceEndpoints.push(...j);
          this.voiceEndpoints = j;
        })(),
      ]);
    })();
  }
  waitForLoad() {
    return this.loadPromise;
  }
}