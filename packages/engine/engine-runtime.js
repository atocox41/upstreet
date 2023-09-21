/*
this file contains the engine runtime state.
it includes all state except the initial initialization arguments.
*/

import {
  ImportManager,
} from '../app-runtime/import-manager.js';
import {
  PlayersManager,
} from './players-manager.js';
import {
  EnvironmentManager,
} from './environment/environment-manager.js';
import {
  CameraManager,
} from './camera-manager.js';
import {
  Router,
} from './router.js';
import {
  LoreManager,
} from './managers/lore/lore-manager.js';
import {
  SfxManager,
} from './managers/sfx-manager/sfx-manager.js';
import {
  PointerLockManager,
} from './managers/pointer-lock/pointer-lock-manager.js';
import {
  CharacterSelectManager,
} from './characterselect-manager.js';
import {
  PartyManager,
} from './party-manager.js';
import {
  EmoteManager,
} from './managers/emote/emote-manager.js';
import {
  IoManager,
} from './managers/io/io-manager.js';
import {
  AppManagerContext,
} from './app-manager-context.js';
import {
  AppTracker,
} from './managers/app-tracker/app-tracker.js';
import {
  SpawnManager,
} from './spawn-manager.js';
import {
  LightingManager,
} from './managers/lighting/lighting-manager.js';
import {
  SkyManager,
} from './managers/environment/skybox/sky-manager.js';
import {
  GameManager,
} from './game.js';
import {
  AppManager,
} from './app-manager.js';
import {
  Multiplayer,
} from './realms/multiplayer.js';
import {
  DomRenderer,
} from './dom-renderer.js';

// import Avatar from './avatars/avatars.js';
// import physx from './physics/physx.js';
import physicsManager from './physics/physics-manager.js';
// import physxWorkerManager from './physics/physx-worker-manager.js';
import {
  NpcManager,
} from './npc-manager.js';
import {
  MobManager,
} from './managers/mob/mob-manager.js';
import {
  HupsManager,
} from './managers/hups/hups-manager.js';
import {
  ZTargetingManager,
} from './managers/z-targeting/z-targeting-manager.js';
import {
  CameraTargetingManager,
} from './managers/camera-targeting/camera-targeting-manager.js';
import {
  PostProcessing,
} from './post-processing.js';
import {
  LoadoutManager,
} from './loadout-manager.js';
import {
  TransformControlsManager,
} from './managers/transform-controls/transform-controls.js';
import {
  RenderSettingsManager,
} from './managers/rendersettings/rendersettings-manager.js';
import {
  MusicManager,
} from './music-manager.js';
import {
  RaycastManager,
} from './raycast-manager.js';
import {
  InteractionManager,
} from './interaction-manager.js';
import {
  BackgroundFx,
} from './background-fx/background-fx.js';
import {
  HitManager,
} from './managers/interaction/hit-manager.js';
import {
  makeDefaultPerspectiveCamera,
} from './renderer-utils.js';
import {
  EngineAppContextFactory,
} from '../app-runtime/engine-app-context-factory.js';
import {
  ChatManager,
} from './managers/chat/chat-manager.js';
import {
  DropManager,
} from './managers/drop/drop-manager.js';
import {
  LandManager,
} from './managers/land/land-manager.js';
import {
  QueueManager,
} from './managers/queue/queue-manager.js';
import {
  TempManager,
} from './temp-manager.js';
import {
  FrameTracker,
} from './frame-tracker.js';
import {
  PhysicsTracker,
} from './physics/physics-tracker.js';
import {
  StoryManager,
} from './managers/story/story-manager.js';
import {
  EngineRenderer,
} from './renderers/engine-renderer.js';
// import {
//   LiveChatManager,
// } from './managers/livechat/livechat-manager.js';
import {
  FloorManager,
} from './managers/floor/floor-manager.js';
// import {
//   LoadingManager,
// } from './managers/loading/loading-manager.js';
// import {
//   StoryModeManager,
// } from './managers/story-mode/story-mode-manager.js';

import {
  XRManager,
} from './managers/xr/xr-manager.js';

import './metaversefile-binding.js';

// 

// let numWebaverseEngines = null;
export class EngineRuntime {
  #canvas;
  #context;
  #engine;

  constructor({
    canvas,
    context,
    engine,
  }) {
    // members
    this.#canvas = canvas;
    this.#context = context;
    this.#engine = engine;

    // locals
    const {
      audioManager,
      sounds,
      voices,
      loadingManager,
    } = context;
    this.camera = makeDefaultPerspectiveCamera();
    this.engineRenderer = new EngineRenderer();
    this.engineAppContextFactory = new EngineAppContextFactory({
      engine: this.#engine,
    });
    this.importManager = new ImportManager({
      engineAppContextFactory: this.engineAppContextFactory,
      loadingManager,
    });
    this.tempManager = new TempManager();
    this.router = new Router();
    this.frameTracker = new FrameTracker();

    this.sfxManager = new SfxManager({
      engineRenderer: this.engineRenderer,
      audioManager,
      sounds,
    });
  
    /* this.ioBus = new IoBus({
      iframe: this.uiIframe,
    }); */

    this.appManagerContext = new AppManagerContext();

    this.lightingManager = new LightingManager();
    this.skyManager = new SkyManager({
      lightingManager: this.lightingManager,
    });
    this.environmentManager = new EnvironmentManager();

    this.physicsTracker = new PhysicsTracker();

    this.voiceQueueManager = new QueueManager();
    this.hupsManager = new HupsManager({
      voiceQueueManager: this.voiceQueueManager,
      engineRenderer: this.engineRenderer,
      lightingManager: this.lightingManager,
      ioBus: this.ioBus,
    });

    this.playersManager = new PlayersManager({
      audioManager,
      sounds,
      voices,
      physicsTracker: this.physicsTracker,
      engineRenderer: this.engineRenderer,
      environmentManager: this.environmentManager,
      hupsManager: this.hupsManager,
      importManager: this.importManager,
      appContextFactory: this.engineAppContextFactory,
      sfxManager: this.sfxManager,
      engine: this.#engine,
    });

    this.chatManager = new ChatManager({
      playersManager: this.playersManager,
      audioManager,
      voiceQueueManager: this.voiceQueueManager,
      // ioBus: this.ioBus,
    });
    this.loreManager = new LoreManager({
      context,
      engine: this.#engine,
      chatManager: this.chatManager,
    });

    this.dropManager = new DropManager();

    this.cameraManager = new CameraManager({
      engineRenderer: this.engineRenderer,
      playersManager: this.playersManager,
      ioBus: this.ioBus,
    });
    this.pointerLockManager = new PointerLockManager({
      engine: this.#engine,
      ioBus: this.ioBus,
    });

    this.xrManager = new XRManager({
      engineRenderer: this.engineRenderer,
      cameraManager: this.cameraManager,
      // ioBus: this.ioBus,
    });

    this.spawnManager = new SpawnManager({
      engineRenderer: this.engineRenderer,
      playersManager: this.playersManager,
    });
  
    this.characterSelectManager = new CharacterSelectManager();
  
    /* this.realmManager = new RealmManager({
      playersManager: this.playersManager,
      spawnManager: this.spawnManager,
      engine: this.#engine,
      sceneContextManager: this.sceneContextManager,
      characterSelectManager: this.characterSelectManager,
      audioManager,
      physicsTracker: this.physicsTracker,
      ioBus: this.ioBus,
      importManager: this.importManager,
      appContextFactory: this.engineAppContextFactory,
    }); */

    this.domRenderer = new DomRenderer();

    this.raycastManager = new RaycastManager({
      engineRenderer: this.engineRenderer,
      cameraManager: this.cameraManager,
      world: this.world,
      domRenderer: this.domRenderer,
      physicsTracker: this.physicsTracker,
    });
    this.zTargetingManager = new ZTargetingManager({
      engineRenderer: this.engineRenderer,
      cameraManager: this.cameraManager,
      playersManager: this.playersManager,
      physicsTracker: this.physicsTracker,
      sounds,
    });
    this.zTargetingManager = new ZTargetingManager({
      engineRenderer: this.engineRenderer,
      cameraManager: this.cameraManager,
      playersManager: this.playersManager,
      physicsTracker: this.physicsTracker,
      sounds,
    });
    this.cameraTargetingManager = new CameraTargetingManager({
      engineRenderer: this.engineRenderer,
      cameraManager: this.cameraManager,
      playersManager: this.playersManager,
      physicsTracker: this.physicsTracker,
    });

    this.partyManager = new PartyManager({
      playersManager: this.playersManager,
      characterSelectManager: this.characterSelectManager,
      importManager: this.importManager,
      loreManager: this.loreManager,
      engine: this.#engine,
    });

    this.emoteManager = new EmoteManager({
      playersManager: this.playersManager,
      ioBus: this.ioBus,
    });
    
    this.hitManager = new HitManager({
      engineRenderer: this.engineRenderer,
      playersManager: this.playersManager,
      physicsTracker: this.physicsTracker,
      sounds,
    });
    this.npcManager = new NpcManager({
      audioManager,
      sounds,
      voices,
      physicsTracker: this.physicsTracker,
      engineRenderer: this.engineRenderer,
      environmentManager: this.environmentManager,
      hupsManager: this.hupsManager,
      engine: this.#engine,
      characterSelectManager: this.characterSelectManager,
      hitManager: this.hitManager,
      importManager: this.importManager,
      sfxManager: this.sfxManager,
      appContextFactory: this.engineAppContextFactory,
      loreManager: this.loreManager,
    });
    this.mobManager = new MobManager({
      // physicsTracker: this.physicsTracker,
      // environmentManager: this.environmentManager,
    });

    this.interactionManager = new InteractionManager({
      cameraManager: this.cameraManager,
      playersManager: this.playersManager,
      appManagerContext: this.appManagerContext,
      // ioManager: this.ioManager,
      engineRenderer: this.engineRenderer,
      physicsTracker: this.physicsTracker,
    });
    this.storyManager = new StoryManager({
      context,
      cameraManager: this.cameraManager,
      engineRenderer: this.engineRenderer,
      emoteManager: this.emoteManager,
      playersManager: this.playersManager,
      npcManager: this.npcManager,
      chatManager: this.chatManager,
      voiceQueueManager: this.voiceQueueManager,
      interactionManager: this.interactionManager,
      zTargetingManager: this.zTargetingManager,
      loreManager: this.loreManager,
      physicsTracker: this.physicsTracker,
      sounds,
    });

    this.ioManager = new IoManager({
      engine: this.#engine,
      cameraManager: this.cameraManager,
      pointerLockManager: this.pointerLockManager,
      raycastManager: this.raycastManager,
      engineRenderer: this.engineRenderer,
      playersManager: this.playersManager,
      storyManager: this.storyManager,
      zTargetingManager: this.zTargetingManager,
      ioBus: this.ioBus,
    });

    this.appTracker = new AppTracker({
      appManagerContext: this.appManagerContext,
    });
    this.landManager = new LandManager({
      engineRenderer: this.engineRenderer,
      cameraManager: this.cameraManager,
      playersManager: this.playersManager,
      appTracker: this.appTracker,
    });

    this.loadoutManager = new LoadoutManager({
      engineRenderer: this.engineRenderer,
      playersManager: this.playersManager,
    });
    this.transformControlsManager = new TransformControlsManager({
      engineRenderer: this.engineRenderer,
      physicsTracker: this.physicsTracker,
      appManagerContext: this.appManagerContext,
    });
    this.musicManager = new MusicManager({
      audioManager,
    });
    this.postProcessing = new PostProcessing({
      engineRenderer: this.engineRenderer,
      cameraManager: this.cameraManager,
      playersManager: this.playersManager,
    });
    this.renderSettingsManager = new RenderSettingsManager({
      postProcessing: this.postProcessing,
    });
    this.backgroundFx = new BackgroundFx();

    // this.liveChatManager = new LiveChatManager({
    //   ioBus: this.ioBus,
    //   playersManager: this.playersManager,
    //   sceneManager: this.sceneManager,
    //   npcManager: this.npcManager,
    //   chatManager: this.chatManager,
    //   cameraManager: this.cameraManager,
    //   hupsManager: this.hupsManager,
    //   zTargetingManager: this.zTargetingManager,
    // });

    this.game = new GameManager({
      engineRenderer: this.engineRenderer,
      ioManager: this.ioManager,
      cameraManager: this.cameraManager,
      playersManager: this.playersManager,
      loadoutManager: this.loadoutManager,
      interactionManager: this.interactionManager,
      raycastManager: this.raycastManager,
      appManagerContext: this.appManagerContext,
      hitManager: this.hitManager,
      dropManager: this.dropManager,
      sounds,
      zTargetingManager: this.zTargetingManager,
    });

    this.floorManager = new FloorManager({
      physicsTracker: this.physicsTracker,
    });

    // this.storyModeManager = new StoryModeManager({
    //   engineRenderer: this.engineRenderer,
    //   realmManager: this.realmManager,
    //   floorManager: this.floorManager,
    //   playersManager: this.playersManager,
    //   npcManager: this.npcManager,
    //   sceneContextManager: this.sceneContextManager,
    // });

    // this.uiManager = new UIManager({
    //   iframe: this.uiIframe,
    //   plugins: [ // XXX this can be done via URL + dynamic import, to avoid loading all plugins
    //     // 'chat',
    //     'livechat',
    //     'chatInput',
    //     'emoteWheel',
    //     // 'xr',
    //     'wiki',
    //     'canvasRegistry',
    //     'hups',
    //     'speechBubble',
    //     'megaHups',
    //     'titleScreen',
    //     // 'doomClock',
    //   ],
    //   ioBus: this.ioBus,
    // });

    // bind scene
    const _addSceneObjects = () => {
      const {scene} = this.engineRenderer;
      
      scene.add(this.playersManager);
      this.playersManager.updateMatrixWorld();

      scene.add(this.npcManager);
      this.npcManager.updateMatrixWorld();

      scene.add(this.mobManager);
      this.mobManager.updateMatrixWorld();

      scene.add(this.zTargetingManager);
      this.zTargetingManager.updateMatrixWorld();

      scene.add(this.cameraTargetingManager);
      this.cameraTargetingManager.updateMatrixWorld();

      // scene.add(this.realmManager);
      // this.realmManager.updateMatrixWorld();
    
      scene.add(this.interactionManager);
      this.interactionManager.updateMatrixWorld();

      // scene.add(this.liveChatManager);
      // this.liveChatManager.updateMatrixWorld();

      // scene.add(this.storyModeManager);
      // this.storyModeManager.updateMatrixWorld();
    };
    _addSceneObjects();

    this.appManager = null;
    const _bindAppManagerContext = () => {
      this.appManagerContext.addEventListener('appmanagerchange', e => {
        const {
          appManager,
        } = e.data;

        const {scene} = this.engineRenderer;
        if (this.appMAnager) {
          scene.remove(this.appManager);
          this.appManager.updateMatrixWorld();
          this.appManager = null;
        }

        this.appManager = appManager;

        if (this.appManager) {
          scene.add(this.appManager);
          this.appManager.updateMatrixWorld();
        }
      });
    };
    _bindAppManagerContext();

    // const _bindCanvasEvents = () => {
    //   if (this.#canvas) {
    //     this.engineRenderer.bindCanvasEvents(this.#canvas);
    //   }
    // };
    // _bindCanvasEvents();
  }

  #loadPromise = null;
  waitForLoad() {
    if (!this.#loadPromise) {
      this.#loadPromise = (async () => {
        await Promise.all([
          // this.backgroundFx.waitForLoad(),
          // this.musicManager.waitForLoad(),
          this.floorManager.waitForLoad(),
        ]);
      })();
    }
    return this.#loadPromise;
  }

  getCanvas() {
    return this.engineRenderer.renderer.domElement;
  }
  setCanvas(canvas) {
    this.engineRenderer.setCanvas(canvas);
  }

  createAppManager() {
    return new AppManager({
      importManager: this.importManager,
      appContextFactory: this.engineAppContextFactory,
    });
  }

  createMultiplayer() {
    return new Multiplayer({
      playersManager: this.playersManager,
      spawnManager: this.spawnManager,
      engine: this,
      characterSelectManager: this.characterSelectManager,
      audioManager: this.#context.audioManager,
      physicsTracker: this.physicsTracker,
      importManager: this.importManager,
      appContextFactory: this.engineAppContextFactory,
    });
  }

  // XXX
  /* async setState(spec) {
    this.cameraManager.initializeMode();

    const _initializePlayer = async () => {
      await this.partyManager.initDefaultPlayer();
      await this.partyManager.inviteDefaultPlayer();
      this.loadoutManager.initDefault();
    };
    await _initializePlayer();
    
    const _initializeRealm = async () => {
      await this.realmManager.setRealmSpec(spec);
    };
    await _initializeRealm();
  } */

  render(timestamp, timeDiff, frame) {
    if (this.engineRenderer.renderer.xr.isPresenting) {
      this.cameraManager.decapitateLocalPlayer();
      this.engineRenderer.render();
      this.cameraManager.undecapitateLocalPlayer();
    } else {
      const firstperson = this.cameraManager.getMode() === 'firstperson';
      firstperson && this.cameraManager.decapitateLocalPlayer();
      this.engineRenderer.render();
      firstperson && this.cameraManager.undecapitateLocalPlayer();
    }
  }

  getAppManager() {
    const appManager = this.appManagerContext.getAppManager();
    if (!appManager) {
      debugger;
    }
    return appManager;
  }
  setAppManager(appManager) {
    this.appManagerContext.setAppManager(appManager);

    // this.dispatchEvent({
    //   type: 'realmchange',
    // });
  }

  // async initializePlayer() {
  //   await this.partyManager.initDefaultPlayer();
  //   await this.partyManager.inviteDefaultPlayer();
  //   this.loadoutManager.initDefault();
  // }

  async spawn() {
    // const localPlayer = this.playersManager.getLocalPlayer();
    // localPlayer.position.set(0, initialPosY, 0);
    // localPlayer.updateMatrixWorld();

    // localPlayer.characterPhysics.setPosition(localPlayer.position);
    // localPlayer.characterPhysics.reset();

    await this.spawnManager.spawn();
  }
  
  start() {
    // const renderer = getRenderer();
    const {renderer, camera} = this.engineRenderer;
    if (!renderer || !camera) {
      console.warn('no renderer or camera', {
        renderer,
        camera,
      });
      throw new Error('no renderer or camera');
    }

    // let characterMesh = null;
    // let hmdMesh = null;
    
    let lastTimestamp = performance.now();
    const animate = (timestamp, frame) => {
      timestamp = timestamp ?? performance.now();
      const timeDiff = timestamp - lastTimestamp;
      const timeDiffCapped = Math.min(Math.max(timeDiff, 0), 100);

      const _pre = () => {
        const {renderer} = this.engineRenderer;
        const session = renderer.xr.getSession();
        const referenceSpace = renderer.xr.getReferenceSpace();
        const xrAvatarPose = session && XRManager.getXrAvatarPose(session, referenceSpace, frame);

        this.ioManager.update(timeDiffCapped, xrAvatarPose);

        const physicsScene = physicsManager.getScene();
        // if (this.contentLoaded /* && physicsScene.getPhysicsEnabled() */) {
          physicsScene.simulatePhysics(timeDiffCapped);
          physicsScene.getTriggerEvents();
          // npcAiManager.update(timestamp, timeDiffCapped);
          // npcManager.updatePhysics(timestamp, timeDiffCapped);
        // }

        this.playersManager.updateAvatars(timestamp, timeDiffCapped, session, xrAvatarPose);
        this.npcManager.updateAvatars(timestamp, timeDiffCapped);
        // npcManager.updateAvatar(timestamp, timeDiffCapped);
        // this.playersManager.updateRemotePlayers(timestamp, timeDiffCapped);

        this.landManager.update(timestamp, timeDiffCapped);
        this.transformControlsManager.update(timestamp, timeDiffCapped);

        // if (this.contentLoaded) {
          // update frame tracker
          this.frameTracker.update(timestamp, timeDiffCapped);
        // }

        // transformControls.update();
        this.raycastManager.update(timestamp, timeDiffCapped);
        this.zTargetingManager.update(timestamp, timeDiffCapped);
        this.cameraTargetingManager.update(timestamp, timeDiffCapped);
        this.game.update(timestamp, timeDiffCapped);
        this.interactionManager.update(timestamp, timeDiffCapped);

        // const rootRealm = this.realmManager.getRootRealm();
        // rootRealm.appManager.tick(timestamp, timeDiffCapped, frame);

        // this.mobManager.update(timestamp, timeDiffCapped);
        // this.hpManager.update(timestamp, timeDiffCapped); // XXX unlock this
        // questManager.update(timestamp, timeDiffCapped);
        // particleSystemManager.update(timestamp, timeDiffCapped);
        this.hupsManager.update(timestamp, timeDiffCapped);

        this.sfxManager.update(timestamp, timeDiffCapped);

        this.cameraManager.updatePost(timestamp, timeDiffCapped);
        this.ioManager.updatePost();

        lastTimestamp = timestamp;
      };
      _pre();

      // render scenes
      // this.dioramaManager.update(timestamp, timeDiffCapped);
      this.loadoutManager.update(timestamp, timeDiffCapped);

      {
        const popRenderSettings = this.renderSettingsManager.push(
          this.engineRenderer.rootScene,
          undefined,
          {
            postProcessing: this.postProcessing,
          }
        );

        this.render(timestamp, timeDiffCapped, frame);
        // if (this.#canvas) {
        //   this.engineRenderer.transferToCanvas(this.#canvas);
        // }

        popRenderSettings();
      }

      // console.log('frame end');
    }
    renderer.setAnimationLoop(animate);

    // _startHacks(this);
  }
  stop() {
    this.engineRenderer.renderer && this.engineRenderer.renderer.setAnimationLoop(null);
  }

  enterXr() {
    return this.xrManager.enterXr();
  }

  destroy() {
    this.stop();

    // this.realmManager.destroy();
    this.pointerLockManager.destroy();
    this.floorManager.destroy();

    this.engineRenderer.renderer && this.engineRenderer.renderer.dispose();
  }
}

/* const _startHacks = webaverse => {
  const localPlayer = playersManager.getLocalPlayer();
  const vpdAnimations = Avatar.getAnimations().filter(animation => animation.name.endsWith('.vpd'));

  // Press } to debug current state in console.
  (typeof window !== 'undefined') && window.addEventListener('keydown', event => {
    if (event.key === '}') {
      console.log('>>>>> current state');
      console.log(universe.state);
      console.log('>>>>> scene');
      console.log(scene);
      console.log('>>>>> local player');
      console.log(localPlayer);
      console.log('>>>>> remote players');
      console.log(playersManager.getRemotePlayers());
    }
  });

  const lastEmotionKey = {
    key: -1,
    timestamp: 0,
  };
  let emotionIndex = -1;
  let poseAnimationIndex = -1;
  const _emotionKey = key => {
    const timestamp = performance.now();
    if ((timestamp - lastEmotionKey.timestamp) < 1000) {
      const key1 = lastEmotionKey.key;
      const key2 = key;
      emotionIndex = (key1 * 10) + key2;
      
      lastEmotionKey.key = -1;
      lastEmotionKey.timestamp = 0;
    } else {
      lastEmotionKey.key = key;
      lastEmotionKey.timestamp = timestamp;
    }
  };
  const _updateFacePose = () => {
    const oldFacePoseActionIndex = localPlayer.findActionIndex(action => action.type === 'facepose' && /^emotion-/.test(action.emotion));
    if (oldFacePoseActionIndex !== -1) {
      localPlayer.removeActionIndex(oldFacePoseActionIndex);
    }
    if (emotionIndex !== -1) {
      const emoteAction = {
        type: 'facepose',
        emotion: `emotion-${emotionIndex}`,
        value: 1,
      };
      localPlayer.addAction(emoteAction);
    }
  };
  const _updatePose = () => {
    localPlayer.removeAction('pose');
    if (poseAnimationIndex !== -1) {
      const animation = vpdAnimations[poseAnimationIndex];
      const poseAction = {
        type: 'pose',
        animation: animation.name,
      };
      localPlayer.addAction(poseAction);
    }
  };
  webaverse.titleCardHack = false;
  // let haloMeshApp = null;
  (typeof window !== 'undefined') && window.addEventListener('keydown', e => {
    if (e.which === 46) { // .
      emotionIndex = -1;
      _updateFacePose();
    } else if (e.which === 107) { // +
      poseAnimationIndex++;
      poseAnimationIndex = Math.min(Math.max(poseAnimationIndex, -1), vpdAnimations.length - 1);
      _updatePose();
    
      // _ensureMikuModel();
      // _updateMikuModel();
    } else if (e.which === 109) { // -
      poseAnimationIndex--;
      poseAnimationIndex = Math.min(Math.max(poseAnimationIndex, -1), vpdAnimations.length - 1);
      _updatePose();

      // _ensureMikuModel();
      // _updateMikuModel();
    } else if (e.which === 106) { // *
      webaverse.titleCardHack = !webaverse.titleCardHack;
      webaverse.dispatchEvent(new MessageEvent('titlecardhackchange', {
        data: {
          titleCardHack: webaverse.titleCardHack,
        },
      }));
    } else if (e.code === 'Home') { // home
      const quality = settingsManager.adjustCharacterQuality(-1);
      game.setAvatarQuality(quality);
    } else if (e.code === 'End') { // end
      const quality = settingsManager.adjustCharacterQuality(1);
      game.setAvatarQuality(quality);
    } else {
      const match = e.code.match(/^Numpad([0-9])$/);
      if (match) {
        const key = parseInt(match[1], 10);
        _emotionKey(key);
        _updateFacePose();
      }
    }
  });
}; */