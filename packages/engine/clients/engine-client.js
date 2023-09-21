import * as THREE from 'three';
import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';

import {
  EngineContext,
} from '../engine-context.js';
import {
  Engine,
} from '../engine.js';
import {
  addDefaultLights,
  makePromise,
} from '../util.js';

//

class EngineCache extends EventTarget {
  constructor({
    canvas,
    context,
    objects,
    playerSpec,
  }) {
    super();

    this.engine = null;
    this.abortController = new AbortController();

    this.objectToAppMap = new Map();
    this.objectsUpdateRunning = false;
    this.objectsUpdateQueue = [];

    this.playersUpdateRunning = false;
    this.playersUpdateQueue = [];

    this.loadPromise = (async () => {
      this.engine = new Engine({
        context,
      });
      addDefaultLights(this.engine.engineRenderer.scene);

      const {signal} = this.abortController;
      signal.addEventListener('abort', () => {
        this.engine.destroy();
        this.engine = null;
      });

      await this.engine.waitForLoad();
      if (signal.aborted) return;

      this.engine.setCanvas(canvas);

      const appManager = this.engine.createAppManager();
      this.engine.setAppManager(appManager);

      await this.updatePlayerSpec(playerSpec);
      if (signal.aborted) return;

      await this.updateObjects(objects);
      if (signal.aborted) return;

      if (playerSpec) {
        await this.engine.spawn();
        if (signal.aborted) return;
      }

      this.engine.start();
    })();
  }
  async waitforLoad() {
    await this.loadPromise;
  }
  getEngine() {
    return this.engine;
  }
  async updateObjects(newObjects) {
    const {signal} = this.abortController;
    if (signal.aborted) return;

    if (!this.objectsUpdateRunning) {
      this.objectsUpdateRunning = true;

      //

      newObjects = newObjects.map(object => {
        const {
          position,
          quaternion,
          scale,
          ...rest
        } = object;
        const o = {
          ...rest,
          key: object,
        };
        if (position) {
          o.position = new THREE.Vector3().fromArray(position);
        }
        if (quaternion) {
          o.quaternion = new THREE.Quaternion().fromArray(quaternion);
        }
        if (scale) {
          o.scale = new THREE.Vector3().fromArray(scale);
        }
        return o;
      });
  
      const appManager = this.engine.getAppManager();

      //

      const oldObjectKeys = [...this.objectToAppMap.keys()];
      for (const oldObjectKey of oldObjectKeys) {
        if (!newObjects.some(newObject => newObject.key === oldObjectKey)) {
          const app = this.objectToAppMap.get(oldObjectKey);
          appManager.removeApp(app);
          this.objectToAppMap.delete(oldObjectKey);
        }
      }

      const newPromises = [];
      for (const newObject of newObjects) {
        if (!this.objectToAppMap.has(newObject.key)) {
          const p = (async () => {
            const app = await appManager.addAppAsync(newObject);
            this.objectToAppMap.set(newObject.key, app);
          })();
          newPromises.push(p);
        }
      }

      this.objectsUpdateRunning = false;
      if (this.objectsUpdateQueue.length > 0) {
        const fn = this.objectsUpdateQueue.shift();
        fn();
      }

      await Promise.all(newPromises);
    } else {
      const p = makePromise();
      this.objectsUpdateQueue.push(async () => {
        await this.updateObjects(newObjects);
        p.resolve();
      });
      await p;
    }
  }
  async updatePlayerSpec(spec) {
    const {signal} = this.abortController;
    if (signal.aborted) return;

    if (!this.playersUpdateRunning) {
      this.playersUpdateRunning = true;

      const playersManager = this.engine.playersManager;
      const player = playersManager.getLocalPlayer();
      await player.setPlayerSpec(spec);
      
      if (spec) {
        const loreManager = this.engine.loreManager;
        loreManager.addPlayerSpec(player.playerId, spec);
      }

      this.playersUpdateRunning = false;
      if (this.playersUpdateQueue.length > 0) {
        const fn = this.playersUpdateQueue.shift();
        fn();
      }
    } else {
      const p = makePromise();
      this.playersUpdateQueue.push(async () => {
        await this.updatePlayerSpec(spec);
        p.accept();
      });
      await p;
    }
  }
  destroy() {
    this.abortController.abort();
  }
}

//

export const EngineProvider = ({
  canvas = null,

  objects = [],
  playerSpec = null,

  setEngine,
  setEngineLoading,

  onContext,
} = {}) => {
  const [engineCache, setEngineCache] = useState(null);
  const [context, setContext] = useState(() => new EngineContext());

  // emit context
  useEffect(() => {
    context && onContext && onContext(context);
  }, [
    context,
  ]);

  // engine cache
  useEffect(() => {
    const newEngineCache = new EngineCache({
      canvas,
      context,
      objects,
      playerSpec,
    });

    let live = true;
    (async () => {
      setEngineCache(newEngineCache);
      setEngineLoading(true);

      // wait for the engine to load
      await newEngineCache.waitforLoad();
      if (!live) return;

      // latch the engine
      const engine = newEngineCache.getEngine();

      // update the agent binding about the fact that the engine is now loaded
      if (typeof globalThis.engineLoaded === 'function') {
        globalThis.engineLoaded();
      }

      // set the engine as loaded
      setEngine(engine);
      setEngineLoading(false);
    })();

    return () => {
      live = false;

      newEngineCache.destroy();

      setEngine(null);
    };
  }, []);

  // player spec
  useEffect(() => {
    if (engineCache) {
      (async () => {
        await engineCache.waitforLoad();
        await engineCache.updatePlayerSpec(playerSpec);
      })();
    }
  }, [
    engineCache,
    playerSpec,
  ]);

  // objects
  useEffect(() => {
    if (engineCache) {
      (async () => {
        await engineCache.waitforLoad();
        await engineCache.updateObjects(objects);
      })();
    }
  }, [
    engineCache,
    objects,
  ]);
};
