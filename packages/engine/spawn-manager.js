import * as THREE from 'three';
// import {camera} from './renderer.js';
// import {
//   PlayersManager,
// } from './players-manager.js';
// import {
//   PartyManager,
// } from './party-manager.js';

//

// const localVector = new THREE.Vector3();
// const localVector2 = new THREE.Vector3();

//

export class SpawnManager extends EventTarget {
  constructor({
    engineRenderer,
    playersManager,
    // partyManager,
  }) {
    if (!engineRenderer || !playersManager) {
      throw new Error('missing required argument');
    }

    super();

    this.engineRenderer = engineRenderer;
    this.playersManager = playersManager;

    this.spawned = false;
  }

  #spawnPosition = new THREE.Vector3();
  #spawnQuaternion = new THREE.Quaternion();
  setSpawnPoint(position, quaternion) {
    this.#spawnPosition.copy(position);
    this.#spawnQuaternion.copy(quaternion);
  }

  async spawn() {
    const localPlayer = this.playersManager.getLocalPlayer();
    // if the avatar was not set, we'll need to set the spawn again when it is
    if (!localPlayer.avatar) {
      await new Promise((accept, reject) => {
        localPlayer.addEventListener('avatarchange', e => {
          const {avatar} = e;
          if (avatar) {
            accept();
          }
        });
      });
    }
    const {height} = localPlayer.avatar;
    const playerSpawnPosition = this.#spawnPosition.clone()
      .add(
        new THREE.Vector3(0, height, 0)
      );
    localPlayer.characterPhysics.setPosition(playerSpawnPosition);

    this.spawned = true;
    this.dispatchEvent(new MessageEvent('spawn'));
  }

  async waitForSpawn() {
    if (!this.spawned) {
      await new Promise((accept, reject) => {
        const spawn = e => {
          accept();
          cleanup();
        };
        this.addEventListener('spawn', spawn);
        
        const cleanup = () => {
          this.removeEventListener('spawn', spawn);
        };
      });
    }
  }
}