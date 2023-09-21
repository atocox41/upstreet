import * as THREE from 'three';

//

const localVector = new THREE.Vector3();
const zeroVector = new THREE.Vector3();
const upVector = new THREE.Vector3(0, 1, 0);
const localEuler = new THREE.Euler();
const waypointRange = 300;

//

export default srcUrl => ctx => {
  const {
    useApp,
    useEngineRenderer,
    useNpcManager,
    useStoryManager,
    useFrame,
    useCleanup,
  } = ctx;
  const app = useApp();
  const engineRenderer = useEngineRenderer();
  const npcManager = useNpcManager();
  const storyManager = useStoryManager();

  app.appType = 'npc';

  let live = true;
  const cleanupFns = [];
  app.npc = null;
  ctx.waitUntil((async () => {
    const npc = await npcManager.addNpcApp(app, srcUrl);
    if (!live) return;

    app.name = npc.playerSpec.name || '';
    app.description = npc.playerSpec.description || '';

    app.npc = npc;
    npc.playerApp = app;

    const _bindBehaviors = () => {    
      const npcs = new Set();
      const npcBindings = new Map();
      const _startMovement = (playerId, player) => {
        if (!npcBindings.has(playerId) && !storyManager.currentConversation) {
          const abortController = new AbortController();
    
          const _walkNewPath = async () => {
            const source = player.position;
            const destinationOffset = new THREE.Vector3(
              (Math.random() - 0.5) * 2 * waypointRange,
              0,
              (Math.random() - 0.5) * 2 * waypointRange
            );
            const destination = source.clone()
              .add(destinationOffset);
    
            // get the quaternion between the source and the destination
            const quaternion = new THREE.Quaternion()
              .setFromRotationMatrix(
                new THREE.Matrix4()
                  .lookAt(
                    source,
                    destination,
                    upVector,
                  )
              );
            
            // amount of points between the destination
            const internalPoints = 10;
            const points = [source];
            for (let i = 0; i < internalPoints; i++) {
              const point = source.clone()
                .lerp(destination, (i + 1) / (internalPoints + 1));
              const rightVector = new THREE.Vector3(1, 0, 0)
                .applyQuaternion(quaternion);
              // randomly offset left or right along the point
              const offset = rightVector.clone()
                .multiplyScalar((Math.random() - 0.5) * 2 * 10);
              point.add(offset);
              points.push(point);
            }
            // final point
            points.push(destination);
    
            // create the curve
            const curve = new THREE.CatmullRomCurve3(points);
            
            // walk along the curve
            let currentPointIndex = 1;
            await new Promise((accept, reject) => {
              const _setNextWaypoint = () => {
                // start the waypoint
                const currentPoint = curve.points[currentPointIndex];
                const timestamp = performance.now();
                player.characterBehavior.addWaypointAction(
                  currentPoint,
                  timestamp,
                  {
                    speed: 2.5,
                  },
                );
    
                // when the waypoint is done
                const actionremoved = e => {
                  const {action} = e.data;
                  if (action.type === 'behavior' && action.behaviorType === 'waypoint') {
                    player.actionManager.removeEventListener('actionremoved', actionremoved);
                    abortController.signal.removeEventListener('abort', abort);
    
                    if (currentPointIndex < curve.points.length - 1) {
                      currentPointIndex++;
                      _setNextWaypoint();
                    } else {
                      accept();
                    }
                  }
                };
                player.actionManager.addEventListener('actionremoved', actionremoved);
    
                const conversationchange = e => {
                  const {
                    conversation,
                  } = e.data;
                  if (conversation) {
                    // stop the waypoint
                    player.characterBehavior.clearWaypointActions();
                    storyManager.removeEventListener('conversationchange', conversationchange);
                    abortController.signal.removeEventListener('abort', abort);
      
                    // wait for conversation to end so we can start the waypoint again
                    storyManager.addEventListener('conversationchange', conversationchange2);
                  }
                };
                const conversationchange2 = e => {
                  const {
                    conversation,
                  } = e.data;
                  if (!conversation) {
                    storyManager.removeEventListener('conversationchange', conversationchange2);
    
                    // start the waypoint again
                    _setNextWaypoint();
                  }
                };
                // wait for conversation to interrupt waypoint
                storyManager.addEventListener('conversationchange', conversationchange);
    
                const abort = e => {
                  storyManager.removeEventListener('conversationchange', conversationchange);
                  storyManager.removeEventListener('conversationchange', conversationchange2);
                  player.actionManager.removeEventListener('actionremoved', actionremoved);
    
                  player.characterBehavior.clearWaypointActions();
                  // note: this line hacks around a bug where the character will continue to walk with velocity despite no waypoint action
                  player.characterPhysics.applyWasd(zeroVector, engineRenderer.camera, 0);
                };
                abortController.signal.addEventListener('abort', abort);
              };
              _setNextWaypoint();
            });
    
            _walkNewPath();
          };
          _walkNewPath();
    
          npcBindings.set(playerId, {
            player,
            cleanup: () => {
              abortController.abort();
            },
          });
        }
      };
      const _stopMovement = (playerId, player) => {
        const npcBinding = npcBindings.get(playerId);
        if (npcBinding) {
          npcBinding.cleanup();
          npcBindings.delete(playerId);
        }
      };

      // start movement initially
      _startMovement(npc.playerId, npc);

      // stop movement on conversation
      storyManager.addEventListener('conversationchange', e => {
        const {
          conversation,
        } = e.data;
        if (conversation) {
          for (const npc of npcs) {
            _stopMovement(npc.playerId, npc);
          }
        } else {
          for (const npc of npcs) {
            _startMovement(npc.playerId, npc);
          }
        }
      });

      cleanupFns.push(() => {
        _stopMovement(npc.playerId, npc);
      });
    };
    app.getComponent('randomWalk') && _bindBehaviors();

    cleanupFns.push(() => {
      npcManager.removeNpcApp(app);
    });
  })());

  // update transforms
  const lastMatrixWorld = app.matrixWorld.clone();
  useFrame(() => {
    if (!app.matrixWorld.equals(lastMatrixWorld)) {
      lastMatrixWorld.copy(app.matrixWorld);

      if (app.npc) {
        localVector.copy(app.position);
        localVector.y += app.npc.avatar.height;
        app.npc.characterPhysics.setPosition(localVector);

        localEuler.setFromQuaternion(app.quaternion, 'YXZ');
        localEuler.x = 0;
        localEuler.z = 0;
        app.npc.quaternion.setFromEuler(localEuler);
      }
    }
  });

  useCleanup(() => {
    live = false;

    for (const cleanupFn of cleanupFns) {
      cleanupFn();
    }
  });

  return app;
};