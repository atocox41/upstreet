import * as THREE from 'three';
import View from '../view.js';

export default class InstanceObject
{
  constructor(instancemanager, terrainState, objectRegistry) {
    this.view = View.getInstance();
    this.scene = this.view.instancedScene;
    this.importManager = this.view.importManager;

    this.instancemanager = instancemanager;
    this.terrainState = terrainState;
    this.objectRegistry = objectRegistry;

    this.objectApps = new Set();
    this.abortController = new AbortController();

    this.terrainState.events.on('ready', () => {
      this.create();
    });
  }

  create() {
    if (this.terrainState.size <= 64) {
      const objectCount = this.terrainState.objectPositions.length / 3;

      if (objectCount > 0) {
        const {signal} = this.abortController;

        for (let i = 0; i < objectCount; i++) {
          const position = new THREE.Vector3().fromArray(this.terrainState.objectPositions, i * 3);
          const infos = this.terrainState.objectInfos.slice(i * 3, (i + 1) * 3);
          const objectApp = this.objectRegistry.createApp({
            position,
            infos,
            scene: this.scene,
            importManager: this.importManager,
            signal,
          });
          this.objectApps.add(objectApp);
        }
      }
    }
  }

  destroy() {
    this.abortController.abort();
  }
}