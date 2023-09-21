import * as THREE from "three";
import View from './procgen/View/view.js';
import State from './procgen/State/state.js';
 
import { texturePacks, particleGLBPath } from "./assets.js";

export default ctx => {
  const {
    useApp,
    useFrame,
    useRenderer,
    useCamera,
    useEngineRenderer,
    useLocalPlayer,
    usePhysics,
    useImportManager,
    useInfiniteTerrainWorker,
    usePhysicsTracker,
    useLoreManager,
    useLoadingManager,
    useLoaders,
  } = ctx;

  if (
    !useApp ||
    !useFrame ||
    !useRenderer ||
    !useCamera ||
    !useLocalPlayer ||
    !usePhysics ||
    !useImportManager ||
    !useEngineRenderer ||
    !useInfiniteTerrainWorker ||
    !usePhysicsTracker ||
    !useLoreManager ||
    !useLoadingManager ||
    !useLoaders
  ) {
    console.warn('terrain missing context', {
      useApp,
      useFrame,
      useRenderer,
      useCamera,
      useLocalPlayer,
      usePhysics,
      useImportManager,
      useEngineRenderer,
      useInfiniteTerrainWorker,
      usePhysicsTracker,
      useLoreManager,
      useLoadingManager,
      useLoaders,
    });
    debugger;
    throw new Error('terrain missing context');
  }

  const {gltfLoader} = useLoaders();

  const baseUrl = import.meta.url.replace(/(\/)[^\/\/]*$/, '$1'); 
  const textureLoader = new THREE.TextureLoader();
  //###################################################### load texture #################################################################
  const texturesPromise = (async () => {
    for(const texturePack of texturePacks){
      const texture = textureLoader.load(`${baseUrl}textures/${texturePack.name}.${texturePack.ext}`);
      if (texturePack.repeat) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }
      texturePack.texture = texture;
    }
  })();
  const waitForTextures = () => texturesPromise;
  //###################################################### end of load texture #################################################################  

  //###################################################### load model #################################################################
  const _loadModel = (u) => 
    new Promise((accept, reject) => {
      gltfLoader.load(u.value, o => {
        accept(o);
      }, function onProgress() {}, reject);
    }
  );
  const mapObjectToArray = (obj) => {
    const res = [];
    for (const key in obj)
      res.push({key: key, value: obj[key]});
    return res;
  }
  const particleGLBArray = mapObjectToArray(particleGLBPath);
  //###################################################### end of load model #################################################################


  const terrainWorker = useInfiniteTerrainWorker();

  const app = useApp();
  const physics = usePhysics();
  const physicsTracker = usePhysicsTracker();
  const loreManager = useLoreManager();
  const loadingManager = useLoadingManager();
  const importManager = useImportManager();
  const player = useLocalPlayer();
  const engineRenderer = useEngineRenderer();
  const {camera} = engineRenderer;


  app.name = 'terrain';
  app.description = 'An anime-styled terrain scene';

  app.spec.name = app.name;
  app.spec.description = app.description;
  app.setComponent('interactive', false);

  const layers = app.getComponent('layers') ?? {};
  const timeRate = app.getComponent('timeRate') ?? 150000;

  app.listenChunks = (addCb, removeCb) => {
    // console.log('listen chunks', state);
    // globalThis.state = state;

    const chunks = Array.from(state.chunks.allChunks.values());
    for (const chunk of chunks) {
      addCb({
        chunk,
      });
    }

    app.addEventListener('chunkadd', addCb);
    app.addEventListener('chunkremove', removeCb);
  };



  const models = {};

  let state = null;
  let view = null;
  const setUpProcgen = async () => {
    await waitForTextures();
    state = new State(app, camera, player, terrainWorker);
    view = new View(player, app, camera, layers, timeRate, physics, physicsTracker, loreManager, importManager, texturePacks, models, engineRenderer);

    app.createChunk = async (x, z, customChunkType) => {
      const chunkSize = 64;
      const halfSize = chunkSize / 2;

      x += 0.5;
      z += 0.5;
      x *= chunkSize;
      z *= chunkSize;

      const bounding = {
        xMin: x - halfSize,
        xMax: x + halfSize,
        zMin: z - halfSize,
        zMax: z + halfSize,
      };
      const chunk = state.terrains.create(
        chunkSize,
        x,
        z,
        1,
        bounding,
        customChunkType,
      );

      await new Promise((accept, reject) => {
        if (chunk.ready) {
          accept();
        } else {
          chunk.events.on('ready', e => {
            accept();
          });
        }
      });

      return chunk;
    };
    app.destroyChunk = (chunk) => {
      state.terrains.destroyTerrain(chunk.id);
    };
  };
  
  ctx.waitUntil((async () => {
    const promises = particleGLBArray.map(u => {
      const promise = _loadModel(u);
      const load = loadingManager.addLoad(u.value);
      (async () => {
        try {
          await promise;
        } finally {
          load.finish();
        }
      })();
      return promise;
    });
    const arr = await Promise.all(promises);
    
    const obj = {};
    for (let i = 0; i < particleGLBArray.length; i ++) {
      obj[particleGLBArray[i].key] = arr[i];
    }
    models['particleModels'] = obj;
    setUpProcgen();
    // return obj;
  })());

  useFrame((timestamp) => {
    state && state.update(timestamp);
    view && view.update(timestamp);

    app.updateMatrixWorld();
  });

  return app;
};