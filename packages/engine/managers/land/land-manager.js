import * as THREE from 'three';
// import bezier from '../../easing.js';
import {
  QueueManager,
} from '../queue/queue-manager.js';

import {
  GridMesh,
} from './land-mesh.js';
import {
  MapMesh,
} from './map-mesh.js';

//

const localVector2D = new THREE.Vector2();
const localVector2D2 = new THREE.Vector2();
const forwardVector = new THREE.Vector3(0, 0, -1);

//

const landUpdatesChannelName = 'land-updates';
const landUpdateEventName = 'land-update';

//

export const chunkSize = 64;
export const segments = 40 + 1;
export const gridHeight = 120;
export const chunkHeight = 8;
export const chunkRange = 100;
export const customChunkType = 'grid';

//

const getCoordsKey = coords => coords.join(':');

//

export class LandManager extends EventTarget {
  constructor({
    engineRenderer,
    cameraManager,
    playersManager,
    appTracker,
  }) {
    super();

    this.engineRenderer = engineRenderer;
    this.cameraManager = cameraManager;
    this.playersManager = playersManager;
    this.appTracker = appTracker;
    this.queueManager = new QueueManager();

    // meshes
    this.gridMesh = null;
    this.mapMesh = null;

    // cache
    this.mapOffset = new THREE.Vector3();

    // supabase land update channel
    this.channel = null;
  }

  setMode(mode) {
    {
      const landEnabled = mode === 'land';
      if (landEnabled && !this.gridMesh) {
        this.gridMesh = new GridMesh({
          landManager: this,
        });
      } else if (!landEnabled && this.gridMesh) {
        this.gridMesh.destroy();
        this.gridMesh = null;
      }
    }
    {
      const mapEnabled = mode === 'map';
      if (mapEnabled && !this.mapMesh) {
        this.mapMesh = new MapMesh({
          landManager: this,
        });

        //

        this.mapMesh.addEventListener('hoverpointupdate', e => {
          this.dispatchEvent(new MessageEvent('hoverpointupdate', {
            data: e.data,
          }));
        });
        this.mapMesh.addEventListener('selectpointupdate', e => {
          this.dispatchEvent(new MessageEvent('selectpointupdate', {
            data: e.data,
          }));
        });

        //

        const {engineRenderer, cameraManager} = this;
        const {
          camera,
        } = engineRenderer;
        cameraManager.setControllerFn(() => {
          camera.position.copy(this.mapOffset);
          camera.quaternion.setFromRotationMatrix(
            new THREE.Matrix4().lookAt(
              camera.position,
              new THREE.Vector3(
                camera.position.x,
                0,
                camera.position.z,
              ),
              forwardVector
            ),
          );
          camera.updateMatrixWorld();
        });
      } else if (!mapEnabled && this.mapMesh) {
        this.mapMesh.destroy();
        this.mapMesh = null;

        const {cameraManager} = this;
        cameraManager.setControllerFn(null);
      }
    }
  }

  // map methods

  getMapOffset(target) {
    return target.copy(this.mapOffset);
  }
  setMapOffset(v3) {
    this.mapOffset.copy(v3);
  }

  //
  
  setMapCameraPosition(v3) {
    this.mapMesh && this.mapMesh.setCameraPosition(v3);
  }

  //

  getMapHoverPoint(target) {
    return this.mapMesh && this.mapMesh.getHoverPoint(target);
  }
  setMapHoverPoint(v3) {
    this.mapMesh && this.mapMesh.setHoverPoint(v3);
  }

  getMapSelectPoint(target) {
    return this.mapMesh && this.mapMesh.getSelectPoint(target);
  }
  setMapSelectPoint(v3) {
    this.mapMesh && this.mapMesh.setSelectPoint(v3);
  }

  //

  /* getMapColor() {
    return this.mapMesh.getColor();
  } */
  setMapColor(hex) {
    this.mapMesh && this.mapMesh.setColor(hex);
  }

  //

  setMapTokenMap(tokenMap) {
    this.mapMesh && this.mapMesh.setTokenMap(tokenMap);
  }
  setMapAddress(address) {
    this.mapMesh && this.mapMesh.setAddress(address);
  }

  // event methods

  listenForLandUpdates({
    supabaseClient,
  }, fn) {
    let channel = supabaseClient.supabase
      .channel(landUpdatesChannelName, {
        config: {
          broadcast: {
            self: true,
          },
        },
      })
      .on('broadcast', {
        event: landUpdateEventName,
      }, data => {
        const {
          payload,
        } = data;
        const {
          land,
        } = payload;
        fn(land);
      })
      .on('error', err => {
        console.warn('error', err);
      });
    this.channel = channel;

    (async () => {
      await new Promise((accept, reject) => {
        channel.subscribe(status => {
          accept();
        });
      });
    })();

    return {
      cancel() {
        channel.unsubscribe();
      },
    };
  }

  createLandTracker({
    supabaseClient,
    range = 1,
  }) {
    const localPlayer = this.playersManager.getLocalPlayer();
    const isPlayerInChunkCoordRange = (playerCoords, chunkCoords, range) => {  
      const playerX = playerCoords.x;
      const playerZ = playerCoords.y;

      const chunkX = chunkCoords.x;
      const chunkZ = chunkCoords.y;

      const chunkXMin = chunkX - (range - 1);
      const chunkXMax = chunkX + (range - 1);
      const chunkZMin = chunkZ - (range - 1);
      const chunkZMax = chunkZ + (range - 1);

      const chunkXInRange = playerX >= chunkXMin && playerX <= chunkXMax;
      const chunkZInRange = playerZ >= chunkZMin && playerZ <= chunkZMax;
      
      const inRange = chunkXInRange && chunkZInRange;
      return inRange;
    };

    const allLands = new Map();
    const liveLands = new Map();
    const lastPlayerCoords = new THREE.Vector2(NaN, NaN);

    const update = () => {
      const playerX = Math.floor(localPlayer.position.x / chunkSize);
      const playerZ = Math.floor(localPlayer.position.z / chunkSize);
      const playerCoords = localVector2D.set(playerX, playerZ);

      if (!playerCoords.equals(lastPlayerCoords)) {
        lastPlayerCoords.copy(playerCoords);

        const localPlayerCoords = playerCoords.clone();
        this.queueManager.waitForTurn(async () => {
          // console.log('land tracker update', localPlayerCoords.toArray());

          // compute live apps
          const chunksInRange = new Map();
          for (const [key, land] of allLands.entries()) {
            const chunkCoords = localVector2D2.fromArray(land.coords);
            if (isPlayerInChunkCoordRange(localPlayerCoords, chunkCoords, range)) {
              chunksInRange.set(key, land);
            }
          }

          // add new live apps
          for (const [key, land] of chunksInRange.entries()) {
            if (!liveLands.has(key)) {
              liveLands.set(key, land);
              events.dispatchEvent(new MessageEvent('landadd', {
                data: {
                  key,
                  land,
                },
              }));
            }
          }

          // remove dead apps
          for (const [key, land] of liveLands.entries()) {
            if (!chunksInRange.has(key)) {
              liveLands.delete(key);
              events.dispatchEvent(new MessageEvent('landremove', {
                data: {
                  key,
                  land,
                },
              }));
            }
          }
        });
      }
    };

    (async () => {
      const results = await supabaseClient.supabase
        .from('land')
        .select('*')
        .order('id', {
          ascending: true,
        });
      const {
        data,
      } = results;

      for (let i = 0; i < data.length; i++) {
        const landObject = data[i];
        const {
          location,
          objects,
        } = landObject;
        const coords = JSON.parse(location);

        const land = {
          coords,
          objects,
        };
        const key = getCoordsKey(coords);
        allLands.set(key, land);
        lastPlayerCoords.set(NaN, NaN);
      }
      update();
    })();

    const {
      cancel,
    } = this.listenForLandUpdates({
      supabaseClient,
    }, landObject => {
      update();

      const {
        location: coords,
        objects,
      } = landObject;

      const key = getCoordsKey(coords);

      // old
      if (allLands.has(key)) {
        allLands.delete(key);
        lastPlayerCoords.set(NaN, NaN);
        update();
      }

      // new
      {
        const land = {
          coords,
          objects,
        };
        allLands.set(key, land);
        lastPlayerCoords.set(NaN, NaN);
        update();
      }
    });

    const events = new EventTarget();
    events.update = update;
    events.cancel = cancel;
    return events;
  }

  async deployCoord(coord, sceneJson, {
    supabaseClient,
    userId,
  }) {
    // need to call listenForLandUpdates() first
    // the reason is that if we were to create the client outselves,
    // other clients would automatically unsubscribe themselves
    if (!this.channel) {
      console.warn('must be subscribed to land first');
    }

    (async () => {
      const {
        objects,
      } = sceneJson;

      const id = crypto.randomUUID();
      const land = {
        id,
        location: coord,
        // start_url,
        objects,
        user_id: userId,
      };
      const result = await supabaseClient.supabase
        .from('land')
        .upsert(land/*, {
          returning: 'minimal',
          onConflict: 'address', // Specify the conflict target
          update: { // Specify what to update on conflict
            name: name ?? randomName,
            characterName: avatar,
            provider: 'metamask',
          }
        }*/);

      if (!result.error) {
        // send the update on the supabase channel
        this.channel.send({
          type: 'broadcast',
          event: landUpdateEventName,
          payload: {
            land,
          },
        });

        return land;
      } else {
        throw new Error(result.error);
      }
    })();
  }

  update(timestamp, timeDiff) {
    this.gridMesh && this.gridMesh.update(timestamp, timeDiff);
    this.mapMesh && this.mapMesh.update(timestamp, timeDiff);
  }
}