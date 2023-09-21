import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import physicsManager from '../engine/physics/physics-manager.js';
import physicsWorkerManager from '../engine/physics/physx-worker-manager.js';
import {AvatarManager} from '../engine/avatars/avatar-manager.js';
import Avatar from '../engine/avatars/avatars.js';
import {AppManager} from '../engine/app-manager.js';
import loaders from '../engine/loaders.js';
import * as env from '../engine/env.js';
import * as vqa from '../engine/vqa.js';
import {
  AppContext,
} from './app-context.js';
import * as blockadelabs from '../engine/clients/blockade-labs-client.js';
import danceManager from '../engine/managers/dance/dance-manager.js';
import infiniteTerrainWorkerManager from '../engine/infinite-terrain/infinite-terrain-worker-manager.js';
import * as endpoints from '../engine/endpoints.js';
import {Text} from 'troika-three-text/src/Text.js';
import {
  CharacterCardParser,
} from '../engine/character-card/character-card.js';
import alea from 'alea';
import bezier from '../engine/easing.js';

//

const threeUtils = {
  BufferGeometryUtils,
};
const characterCardParser = new CharacterCardParser();

//

// const useTHREE = () => THREE;
const useAvatarManager = (() => {
  let avatarManager = null;
  return () => {
    if (!avatarManager) {
      avatarManager = new AvatarManager();
    }
    return avatarManager;
  };
})();
// XXX this is expensive... should we load all loaders?
const useLoaders = () => loaders;

const clients = {
  blockadelabs,
};

export class EngineAppContext extends AppContext {
  #app;
  #engine;
  constructor({
    app,
    engine,
  }) {
    super();

    this.#app = app;
    this.#engine = engine;

    this.useApp = () => this.#app;
    this.useEngine = () => this.#engine;
    
    this.useFrame = fn => this.#engine.frameTracker.add(fn);
    this.useEndpoints = () => endpoints;
    this.useEnv = () => env;
    this.useCameraManager = () => this.#engine.cameraManager;
    this.useVqa = () => vqa;
    this.useEnvironmentManager = () => this.#engine.environmentManager;
    this.useLoadingManager = () => this.#engine.loadingManager;
    this.useActivate = fn => {
      // console.warn('on activate not implemented', fn);
    };
    this.useThree = () => THREE;
    this.useThreeUtils = () => threeUtils;
    this.useText = () => Text;
    this.useEasing = () => bezier;
    this.useCleanup = fn => {
      const destroy = e => {
        fn();
        cleanup();
      };
      this.#app.addEventListener('destroy', destroy);
      const cleanup = () => {
        this.#app.removeEventListener('destroy', destroy);
      };
    };
    this.useAlea = fn => alea;
    this.useCharacterCardParser = () => characterCardParser;
    this.useDropManager = () => this.#engine.dropManager;
    this.useLandManager = () => this.#engine.landManager;
    
    this.useEngineRenderer = () => this.#engine.engineRenderer;
    this.useRenderer = () => this.#engine.engineRenderer.renderer;
    this.useScene = () => this.#engine.engineRenderer.scene;
    this.useCamera = () => this.#engine.engineRenderer.camera;
    this.useImportManager = () => this.#engine.importManager;

    this.createAppManager = () => new AppManager({
      importManager: this.#engine.importManager,
      appContextFactory: this.#engine.engineAppContextFactory,
    });

    this.useRouter = () => this.#engine.router;

    this.useLocalPlayer = () => this.#engine.playersManager.getLocalPlayer();
    this.usePlayersManager = () => this.#engine.playersManager;
    this.useRealmManager = () => this.#engine.realmManager;
    this.useSpawnManager = () => this.#engine.spawnManager;
    this.useHitManager = () => this.#engine.hitManager;
    this.useZTargetingManager = () => this.#engine.zTargetingManager;
    this.useCameraTargetingManager = () => this.#engine.cameraTargetingManager;
    this.useStoryManager = () => this.#engine.storyManager;
    this.useLoreManager = () => this.#engine.loreManager;
    this.useIoManager = () => this.#engine.ioManager;
    this.useChatManager = () => this.#engine.chatManager;
    this.useLoadoutManager = () => this.#engine.loadoutManager;
    this.useTransfromControlsManager = () => this.#engine.transformControlsManager;
    this.useAppTracker = () => this.#engine.appTracker;

    this.useRenderSettings = () => this.#engine.renderSettingsManager;
    this.useLightingManager = () => this.#engine.lightingManager;
    this.useSkyManager = () => this.#engine.skyManager;
    this.useInfiniteTerrainWorker = () => infiniteTerrainWorkerManager.worker;

    let physics;
    this.usePhysics = () => {
      if (!physics) {
        physics = physicsManager.getScene();
      }
      return physics;
    };
    this.usePhysicsWorkerManager = () => {
      return physicsWorkerManager;
    };
    this.usePhysicsTracker = () => this.#engine.physicsTracker;
    this.useTempManager = () => this.#engine.tempManager;
    
    this.useAvatar = () => Avatar;
    this.useDanceManager = () => danceManager;
    
    this.usePostProcessing = () => this.#engine.postProcessing;

    this.useAvatarManager = useAvatarManager;
    this.useAudioManager = () => this.#engine.audioManager;
    this.useNpcManager = () => this.#engine.npcManager;
    this.useMobManager = () => this.#engine.mobManager;
    this.useSounds = () => this.#engine.sounds;
    this.useFloorManager = () => this.#engine.floorManager;
    this.useClients = () => clients;

    this.useDomRenderer = () => this.#engine.domRenderer;
    
    this.useLoaders = useLoaders;
  }
}