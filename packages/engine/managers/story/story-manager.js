/*
this file contains the story beat triggers (battles, victory, game over, etc.)
*/

import * as THREE from 'three';
// import {
//   emotes,
// } from '../emote/emotes.js';
// import {
//   emotions,
// } from '../emote/emotions.js';
// import physicsManager from '../../physics/physics-manager.js';
import {
  messageTypes,
} from '../lore/messages.jsx';
import {
  getFuzzyTargetObject,
  // getHitMap,
  // makeHitMesh,
  // getLine,
  // makePathLineGeometry,
} from '../../pathfinding.js';

import {
  cleanLowercase,
} from '../../util.js';

//

/* function makeSwirlPass() {
  const renderer = getRenderer();
  const size = renderer.getSize(localVector2D)
    .multiplyScalar(renderer.getPixelRatio());
  const resolution = size;
  const swirlPass = new SwirlPass(rootScene, camera, resolution.x, resolution.y);
  return swirlPass;
}
let swirlPass = null;
const _startSwirl = () => {
  if (!swirlPass) {
    swirlPass = makeSwirlPass();
    renderSettingsManager.addExtraPass(swirlPass);

    this.sounds.playSoundName('battleTransition');
    musicManager.playCurrentMusicName('battle');
  }
};
const _stopSwirl = () => {
  if (swirlPass) {
    renderSettingsManager.removeExtraPass(swirlPass);
    swirlPass = null;

    musicManager.stopCurrentMusic();
    return true;
  } else {
    return false;
  }
}; */

//

const fuzzyEmotionMappings = {
  "alert": "alert",
  "angry": "angry",
  "embarrassed": "embarrassed",
  "headNod": "headNod",
  "headShake": "headShake",
  "sad": "sad",
  "surprise": "surprise",
  "victory": "victory",
  "surprised": "surprise",
  "happy": "victory",
  "sorrow": "sad",
  "joy": "victory",
  "confused": "alert",
};
export const getFuzzyEmotionMapping = emotionName => fuzzyEmotionMappings[emotionName];

//

/* let currentFieldMusic = null;
let currentFieldMusicIndex = 0;
export const handleStoryKeyControls = async (e) => {
  switch (e.which) {
    case 48: { // 0
      await musicManager.waitForLoad();
      _stopSwirl() || _startSwirl();
      return false;
    }
    case 57: { // 9
      await musicManager.waitForLoad();
      _stopSwirl();
      if (currentFieldMusic) {
        musicManager.stopCurrentMusic();
        currentFieldMusic = null;
      } else {
        const fieldMusicName = fieldMusicNames[currentFieldMusicIndex];
        currentFieldMusicIndex = (currentFieldMusicIndex + 1) % fieldMusicNames.length;
        currentFieldMusic = musicManager.playCurrentMusic(fieldMusicName, {
          repeat: true,
        });
      }
      return false;
    }
    case 189: { // -
      await musicManager.waitForLoad();
      _stopSwirl();
      musicManager.playCurrentMusic('victory', {
        repeat: true,
      });
      return false;
    }
    case 187: { // =
      await musicManager.waitForLoad();

      _stopSwirl();
      musicManager.playCurrentMusic('gameOver', {
        repeat: true,
      });
      return false;
    }
  }

  return true;

}; */

export class StoryManager extends EventTarget {
  constructor({
    context,
    cameraManager,
    engineRenderer,
    emoteManager,
    playersManager,
    npcManager,
    chatManager,
    voiceQueueManager,
    interactionManager,
    zTargetingManager,
    loreManager,
    physicsTracker,
    sounds,
  }) {
    super();

    if (!context || !cameraManager || !engineRenderer || !emoteManager || !playersManager || !npcManager || !chatManager || !voiceQueueManager || !interactionManager || !zTargetingManager || !loreManager || !physicsTracker || !sounds) {
      console.warn('missing args', {cameraManager, engineRenderer, emoteManager, playersManager, npcManager, chatManager, voiceQueueManager, interactionManager, zTargetingManager, loreManager, physicsTracker, sounds});
      throw new Error('missing args');
    }

    this.context = context;
    this.cameraManager = cameraManager;
    this.engineRenderer = engineRenderer;
    this.emoteManager = emoteManager;
    this.playersManager = playersManager;
    this.npcManager = npcManager;
    this.chatManager = chatManager;
    this.voiceQueueManager = voiceQueueManager;
    this.interactionManager = interactionManager;
    this.zTargetingManager = zTargetingManager;
    this.loreManager = loreManager;
    this.physicsTracker = physicsTracker;
    this.sounds = sounds;

    this.currentConversation = null;

    this.#listen();
  }

  #setCurrentConversation(conversation) {
    this.currentConversation = conversation;

    // console.log('set conversation', conversation, new Error().stack);
    this.dispatchEvent(new MessageEvent('conversationchange', {
      data: {
        conversation,
      },
    }));
  }

  async inspectPhysicsId(physicsId) {
    if (!this.currentConversation) {
      const [
        app,
        targetObject,
      ] = this.physicsTracker.getPairByPhysicsId(physicsId);

      // locals
      const localPlayer = this.playersManager.getLocalPlayer();
      const localPlayerId = localPlayer.playerId;

      // initialize conversation
      const conversation = this.loreManager.createConversation();
      this.#setCurrentConversation(conversation);
      this.currentConversation.addEventListener('message', e => {
        const {
          message,
        } = e.data;
        this.#addMessage(message);
      });
      this.currentConversation.addEventListener('close', () => {
        this.#setCurrentConversation(null);
    
        this.cameraManager.setDynamicTarget();
      }, {once: true});

      this.dispatchEvent(new MessageEvent('conversationstart', {
        data: {
          conversation: this.currentConversation,
        },
      }));

      const completer = this.currentConversation.getAppCompleter({
        localPlayerId,
        app,
        physicsId,
      });

      // set camera
      this.cameraManager.setFocus(false);

      this.cameraManager.lastTarget = null;
      this.cameraManager.setDynamicTarget(
        localPlayer.avatar.modelBones.Head,
        completer.object,
      );

      // add local player actions
      {
        const targetPosition = targetObject.position;
        const bbox2 = targetObject.physicsMesh ?
          new THREE.Box3()
            .setFromBufferAttribute(targetObject.physicsMesh.geometry.attributes.position)
            .applyMatrix4(targetObject.physicsMesh.matrixWorld)
        :
          null;

        const timestamp = performance.now();
        localPlayer.characterBehavior.clearWaypointActions();
        localPlayer.characterBehavior.addWaypointAction(
          targetPosition,
          timestamp,
          {
            boundingBox: bbox2,
          },
        );
      }

      // add possible remote player actions
      {
        const npcPlayer = this.npcManager.getNpcByVrmApp(app);
        // console.log('remote app', app, npcPlayer);
        if (npcPlayer) {
          const timestamp = performance.now();
          npcPlayer.characterBehavior.addFaceTowardAction(
            // localPlayer.avatar.modelBones.Head.position,
            localPlayer.position,
            timestamp,
          );
        }
      }

      // play sound
      this.sounds.playSoundName('menuSelect');

      // initial message
      const message = await completer.completeFn();
    } else {
      throw new Error('already in a conversation!');
    }
  }

  #listen() {
    this.interactionManager.addEventListener('interact', async e => {
      const {
        // app,
        physicsId,
      } = e;
      await this.inspectPhysicsId(physicsId);
    });
    this.zTargetingManager.addEventListener('select', async e => {
      const {
        // app,
        physicsId,
      } = e;
      await this.inspectPhysicsId(physicsId);
    });
    this.chatManager.addEventListener('message', e => {
      const _setCamera = () => {
        if (conversation !== null) {
          const localPlayer = this.playersManager.getLocalPlayer();
          if (player === localPlayer) {
            this.cameraManager.setDynamicTarget(
              localPlayer.avatar.modelBones.Head,
              player.avatar.modelBones.Head,
            );
          } else {
            this.cameraManager.setDynamicTarget(
              player.avatar.modelBones.Head,
              localPlayer.avatar.modelBones.Head,
            );
          }
        }
      };

      const _executePlayerActions = (player) => {
        _setCamera();

        const speakMessageType = messageTypes['SPEAK'];
        message && speakMessageType.execute({
          messageObject: m,
          message,
          player,
          voiceQueueManager: this.voiceQueueManager,
        });
        
        switch (command) {
          case 'SPEAK': {
            break;
          }
          case 'EMOTE': {
            messageTypes['EMOTE'].execute({
              commandArgument,
              player,
              emoteManager: this.emoteManager,
            });
            break;
          }
          case 'EMOTION': {
            messageTypes['EMOTION'].execute({
              commandArgument,
              player,
              emoteManager: this.emoteManager,
            });
            break;
          }
          case 'TALKTO': {
            messageTypes['TALKTO'].execute({
              commandArgument,
              player,
            });
            break;
          }
          case 'FACETOWARD': {
            const target = commandArgument;
            const targetObject = getFuzzyTargetObject({
              localPlayer: player,
              target,
              playersManager: this.playersManager,
              loreManager: this.loreManager,
              npcManager: this.npcManager,
              physicsTracker: this.physicsTracker,
            });

            messageTypes['FACETOWARD'].execute({
              // commandArgument,
              player,
              targetObject,
            });
            break;
          }
          case 'MOVETO': {
            const target = commandArgument;
            const targetObject = getFuzzyTargetObject({
              localPlayer: player,
              target,
              playersManager: this.playersManager,
              loreManager: this.loreManager,
              npcManager: this.npcManager,
              physicsTracker: this.physicsTracker,
            });

            messageTypes['MOVETO'].execute({
              // commandArgument,
              player,
              targetObject,
            });
            break;
          }
          case 'LOOKAT': {
            const target = commandArgument;
            const targetObject = getFuzzyTargetObject({
              localPlayer: player,
              target,
              playersManager: this.playersManager,
              loreManager: this.loreManager,
              npcManager: this.npcManager,
              physicsTracker: this.physicsTracker,
            });

            messageTypes['LOOKAT'].execute({
              // commandArgument,
              player,
              targetObject,
            });
            break;
          }
          default: {
            console.warn('unknown command', command);
            break;
          }
        }
      };

      //

      const {
        message: m,
      } = e.data;

      const conversation = m.getConversation();

      const spec = m.getSpec();
      const {
        // characterName,
        command,
        commandArgument,
        message,
      } = spec;

      const playerId = m.getPlayerName();
      const playerName = cleanLowercase(playerId);
      const player = this.playersManager.getPlayerByNameFunction(n => cleanLowercase(n) === playerName) ??
        this.npcManager.getNpcByNameFunction(n => cleanLowercase(n) === playerName);
      if (player) {
        _executePlayerActions(player);
      } else {
        console.warn('missing player when executing action: ' + JSON.stringify({
          playerId,
          playerName,
        }), {
          allPlayers: this.playersManager.getAllPlayers()
            .concat(
              Array.from(this.npcManager.npcPlayers)
            ),
          player,
        });
        debugger;
      }
    });
  }
  #addMessage(message) {
    this.chatManager.addMessage(message);
  }

  getConversation() {
    return this.currentConversation;
  }
  async progressConversation() {
    if (this.currentConversation) {
      if (!this.currentConversation.progressing) {
        this.currentConversation.progressing = true;
        this.currentConversation.dispatchEvent(new MessageEvent('progressstart', {
          data: {
            // conversation: this.currentConversation,
          },
        }));

        this.sounds.playSoundName('menuNext');

        const message = await this.currentConversation.nextMessage();

        this.currentConversation.progressing = false;
        this.currentConversation.dispatchEvent(new MessageEvent('progressend', {
          data: {
            // conversation: this.currentConversation,
          },
        }));
      }
    } else {
      throw new Error('not in a conversation!');
    }
  }

  async nextMessageAnonymous(opts) {
    const conversation = this.loreManager.createConversation({
      messages: true,
    });
    conversation.addEventListener('message', e => {
      const {
        message,
      } = e.data;
      this.#addMessage(message);
    });
    const message = await conversation.completeMessages([], opts);
    return message;
  }

  /* useEffect(() => {
    if (engine) {
      const mousedown = async e => {
        // {
        //   const {
        //     zTargetingManager,
        //     storyManager,
        //   } = engine;
        //   const focusedApp = zTargetingManager.getFocusedApp();
        //   if (focusedApp !== null) {
        //     storyManager.clickApp(focusedApp);
        //   }
        // }

        const {
          zTargetingManager,
          // storyManager,
          playersManager,
        } = engine;
        const focusedApp = zTargetingManager.getFocusedApp();
        if (focusedApp) {
          const appManager = engine.getAppManager();
          const apps = appManager.getApps();
          const blockadelabsSkyboxApp = apps.find(a => a.appType === 'blockadelabsskybox');
          if (blockadelabsSkyboxApp) {
            const worldSpec = blockadelabsSkyboxApp.spec?.content;
            const localPlayer = playersManager.getLocalPlayer();
            const {
              playerSpec: localPlayerSpec,
            } = localPlayer;

            const aiClient = new AiClient({
              modelType: 'openai',
              modelName: 'gpt-4-0613',
            });
            const conversation = new Conversation({
              aiClient,
            });
            conversation.setWorldSpec(worldSpec);
            conversation.addPlayerSpec(localPlayerSpec);
            const remotePlayerSpecs = apps.filter(a =>
              a.appType === 'character360'
            ).map(a => a.spec.content);
            for (let i = 0; i < remotePlayerSpecs.length; i++) {
              conversation.addPlayerSpec(remotePlayerSpecs[i]);
            }

            if (remotePlayerSpecs.length > 0) {
              const parseMessage = message => {
                const argsString = message?.function_call?.arguments;
                const j = argsString ? JSON.parse(argsString) : null;
                return j;
              };

              // const remotePlayerSpec = remotePlayerSpecs[0];
              const message = await conversation.completeApp({
                localPlayerSpec,
                app: focusedApp,
              });
              const j = parseMessage(message);
              console.log('first message', message, j);
              globalThis.nextMessage = async () => {
                // const argsString = message?.function_call?.arguments;
                // const j = argsString ? JSON.parse(argsString) : null;
                const message = await conversation.nextMessage();
                const j = parseMessage(message);
                console.log('next message', message, j, conversation.getMessages());
              };
            } else {
              console.warn('no remote player specs', apps);
            }
          } else {
            console.warn('no skybox app', apps);
          }
        }
      };
      globalThis.addEventListener('mousedown', mousedown);

      return () => {
        globalThis.removeEventListener('mousedown', mousedown);
      };
    }
  }, [engine]); */

  /* getConversation() {
    return this.currentConversation;
  }
  handleWheel(e) {
    // returns whether the event was handled (used for options scrolling)
    if (this.currentConversation) {
      return this.currentConversation.handleWheel(e);
    } else {
      return false;
    }
  }
  startConversation(comment, remotePlayer, done) {
    const localPlayer = this.playersManager.getLocalPlayer();
    this.currentConversation = new Conversation(localPlayer, remotePlayer, this);
    this.currentConversation.addEventListener('close', () => {
      this.currentConversation = null;
  
      this.cameraManager.setDynamicTarget();
    }, {once: true});
    this.dispatchEvent(new MessageEvent('conversationstart', {
      data: {
        conversation: this.currentConversation,
      },
    }));
    this.currentConversation.addLocalPlayerMessage(comment);
    done && this.currentConversation.finish();
    return this.currentConversation;
  };
  startLocalPlayerComment(comment) {
    return this.startConversation(comment, null, true);
  } */

  clickApp(app) {
    debugger;

    const {
      appType,
      spec,
    } = app;

    // cameraManager.setFocus(false);
    // zTargeting.focusTargetReticle = null;
    // this.sounds.playSoundName('menuSelect');

    this.cameraManager.setFocus(false);
    this.cameraManager.setDynamicTarget();

    (async () => {
      const localPlayer = this.playersManager.getLocalPlayer();

      if (appType === 'vrm') {
        const remotePlayer = this.npcManager.getNpcByVrmApp(app);
        if (remotePlayer) {
          const {
            value: comment,
            done,
          } = await this.sceneContextManager.generateSelectCharacterComment({
            player: localPlayer,
            targetPlayerSpec: spec,
          });

          this.startConversation(comment, remotePlayer, done);
        } else {
          console.warn('no player associated with app', app);
        }
      } else if (appType === 'character360') {
        const {
          value: comment,
          done,
        } = await this.sceneContextManager.generateSelectCharacterComment({
          player: localPlayer,
          targetPlayerSpec: spec.content,
        });

        const fakePlayer = {
          avatar: {
            modelBones: {
              Head: app,
            },
          },
        };
        this.startConversation(comment, fakePlayer, done);
      } else if (appType === 'item360') {
        const {
          value: comment,
          done,
        } = await this.sceneContextManager.generateSelectTargetComment({
          player: localPlayer,
          targetSpec: spec.content,
        });

        const fakePlayer = {
          avatar: {
            modelBones: {
              Head: app,
            },
          },
        };
        this.startConversation(comment, fakePlayer, done);
      } else {
        const localPlayer = this.playersManager.getLocalPlayer();
        const targetSpec = this.sceneContextManager.getWorldSpec();
        const comment = await this.sceneContextManager.generateSelectTargetComment({
          player: localPlayer,
          targetSpec,
        });
        const fakePlayer = {
          avatar: {
            modelBones: {
              Head: app,
            },
          },
        };
        this.startConversation(comment, fakePlayer, true);
      }
    })();
  }
}

/* story.listenHack = () => {
  (typeof window !== 'undefined') && window.document.addEventListener('click', async e => {
    if (this.cameraManager.pointerLockEle`ment) {
      if (e.button === 0 && (this.cameraManager.focus && zTargeting.focusTargetReticle)) {
        const app = metaversefile.getAppByPhysicsId(zTargeting.focusTargetReticle.physicsId);
        
        if (app) {
          const {appType} = app;

          // cameraManager.setFocus(false);
          // zTargeting.focusTargetReticle = null;
          sounds.playSoundName('menuSelect');

          this.cameraManager.setFocus(false);
          this.cameraManager.setDynamicTarget();

          (async () => {
            const aiScene = metaversefile.useLoreAIScene();
            if (appType === 'npc') {
              const {name, description} = app.getLoreSpec();
              const remotePlayer = npcManager.getNpcByApp(app);

              if (remotePlayer) {
                const {
                  value: comment,
                  done,
                } = await aiScene.generateSelectCharacterComment(name, description);

                _startConversation(comment, remotePlayer, done);
              } else {
                console.warn('no player associated with app', app);
              }
            } else {
              const {name, description} = app;
              const comment = await aiScene.generateSelectTargetComment(name, description);
              const fakePlayer = {
                avatar: {
                  modelBones: {
                    Head: app,
                  },
                },
              };
              _startConversation(comment, fakePlayer, true);
            }
          })();
        } else {
          console.warn('could not find app for physics id', zTargeting.focusTargetReticle.physicsId);
        }
      } else if (e.button === 0 && currentConversation) {
        if (!currentConversation.progressing) {
          currentConversation.progress();

          sounds.playSoundName('menuNext');
        }
      }
    }
  });
}; */