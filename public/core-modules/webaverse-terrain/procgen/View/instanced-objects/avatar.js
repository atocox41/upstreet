import * as THREE from 'three';
import View from '../view.js';

export default class AvatarObject
{
  constructor(instancemanager, terrainState, avatarRegistry) {
    this.view = View.getInstance();
    this.scene = this.view.instancedScene;
    this.importManager = this.view.importManager;

    this.instancemanager = instancemanager;
    this.terrainState = terrainState;
    this.avatarRegistry = avatarRegistry;

    this.avatarApps = new Set();
    this.abortController = new AbortController();

    this.terrainState.events.on('ready', () => {
      this.create();
    });
  }

  create() {
    if (this.terrainState.size <= 64) {
      const avatarCount = this.terrainState.avatarPositions.length / 3;

      if (avatarCount > 0) {
        const {signal} = this.abortController;

        for (let i = 0; i < avatarCount; i++) {
          const position = new THREE.Vector3().fromArray(this.terrainState.avatarPositions, i * 3);
          const infos = this.terrainState.avatarInfos.slice(i * 3, (i + 1) * 3);
          const avatarApp = this.avatarRegistry.createApp({
            position,
            infos,
            scene: this.scene,
            importManager: this.importManager,
            signal,
          });
          this.avatarApps.add(avatarApp);
        }
      }
    }
  }

  destroy() {
    this.abortController.abort();
  }
}