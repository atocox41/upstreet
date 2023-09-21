import {
  // encryptionKey,
  loadNpcPlayer,
  // importCardBlob,
  // importItems,
  // normalizeText,
} from '../../packages/engine/utils/companion-utils.js';

export class NpcLoader extends EventTarget {
  constructor({
    voices,
    sounds,
    audioManager,
    environmentManager,
    importManager,
    appContextFactory,
    physicsTracker,
  }) {
    super();

    this.voices = voices;
    this.sounds = sounds;
    this.audioManager = audioManager;
    this.environmentManager = environmentManager;
    this.importManager = importManager;
    this.appContextFactory = appContextFactory;
    this.physicsTracker = physicsTracker;

    this.npcs = new Map();
    this.promises = new Map();
  }

  static getKey(playerSpec, group) {
    return `${playerSpec.id}_${group}`;
  }

  getCachedNpcPlayer(playerSpec, group) {
    const key = NpcLoader.getKey(playerSpec, group);
    return this.npcs.get(key);
  }

  /**
   * Loads an NPC player with the given player specification and group.
   *
   * @param {Object} playerSpec - The specification of the player.
   * @param {string} group - The group the player belongs to.
   * @returns {Promise} A promise that resolves with the NPC player.
   */
  loadNpcPlayer(playerSpec, group) {
    const {
      voices,
      sounds,
      audioManager,
      environmentManager,
      importManager,
      appContextFactory,
      physicsTracker,
    } = this;

    const key = NpcLoader.getKey(playerSpec, group);
    let promise = this.promises.get(key);
    if (!promise) {
      promise = (async () => {
        const npcPlayer = await loadNpcPlayer(playerSpec, {
          voices,
          sounds,
          audioManager,
          environmentManager,
          importManager,
          appContextFactory,
          physicsTracker,
        });

        this.npcs.set(key, npcPlayer);

        this.dispatchEvent(new MessageEvent('npcsupdate'/*, {
          data: {
            playerSpec,
            npcPlayer,
          },
        } */));

        return npcPlayer;
      })();
      this.promises.set(key, promise);
    }
    return promise;
  }
}