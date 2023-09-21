import * as THREE from 'three';

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector2D = new THREE.Vector2();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localPlane = new THREE.Plane();
const localMatrix = new THREE.Matrix4();
const localRaycaster = new THREE.Raycaster();
const localObject = new THREE.Object3D();

const upVector = new THREE.Vector3(0, 1, 0);
const rightVector = new THREE.Vector3(1, 0, 0);
const oneVector = new THREE.Vector3(1, 1, 1);
const identityQuaternion = new THREE.Quaternion();
const downQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2);
const y180Quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

//

class StoryTargetMesh extends THREE.Mesh {
  constructor({
    BufferGeometryUtils,
  }) {
    const baseHeight = 0.2;
    const baseWidth = 0.03;
    const centerSpacing = baseWidth;
    
    const _addYs = geometry => {
      const ys = new Float32Array(geometry.attributes.position.array.length / 3);
      for (let i = 0; i < ys.length; i++) {
        ys[i] = 1 - geometry.attributes.position.array[i * 3 + 1] / baseHeight;
      }
      geometry.setAttribute('y', new THREE.BufferAttribute(ys, 1));
    };
    const _addDirection = (geometry, direction) => {
      const directions = new Float32Array(geometry.attributes.position.array.length);
      for (let i = 0; i < directions.length / 3; i++) {
        directions[i + 0] = direction.x;
        directions[i + 1] = direction.y;
        directions[i + 2] = direction.z;
      }
      geometry.setAttribute('direction', new THREE.BufferAttribute(directions, 3));
    };
    const _addMonocolor = (geometry, v) => {
      const monocolor = new Float32Array(geometry.attributes.position.array.length / 3).fill(v);
      geometry.setAttribute('monocolor', new THREE.BufferAttribute(monocolor, 1));
    };

    // top geometry
    const topGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseWidth)
      .translate(0, baseHeight / 2 + centerSpacing, 0);
    _addYs(topGeometry);
    _addDirection(topGeometry, new THREE.Vector3(0, 1, 0));
    _addMonocolor(topGeometry, 0);
    // other geometries
    const leftGeometry = topGeometry.clone()
      .rotateZ(Math.PI / 2);
    _addDirection(leftGeometry, new THREE.Vector3(-1, 0, 0));
    _addMonocolor(leftGeometry, 0);
    const bottomGeometry = topGeometry.clone()
      .rotateZ(Math.PI);
    _addDirection(bottomGeometry, new THREE.Vector3(0, -1, 0));
    _addMonocolor(bottomGeometry, 0);
    const rightGeometry = topGeometry.clone()
      .rotateZ(-Math.PI / 2);
    _addDirection(rightGeometry, new THREE.Vector3(1, 0, 0));
    _addMonocolor(rightGeometry, 0);
    const forwardGeometry = topGeometry.clone()
      .rotateX(-Math.PI / 2);
    _addDirection(forwardGeometry, new THREE.Vector3(0, 0, -1));
    _addMonocolor(forwardGeometry, 0);
    const backGeometry = topGeometry.clone()
      .rotateX(Math.PI / 2);
    _addDirection(backGeometry, new THREE.Vector3(0, 0, 1));
    _addMonocolor(backGeometry, 0);
    // same thing, but scaled and inverted
    const f = 0.015;
    const baseWidth2 = baseWidth + f;
    const baseHeight2 = baseHeight + f;
    const topGeometry2 = new THREE.BoxGeometry(baseWidth2, baseHeight2, baseWidth2)
      .scale(-1, -1, -1)
      .translate(0, baseHeight / 2 + centerSpacing, 0);
    _addYs(topGeometry2);
    _addDirection(topGeometry2, new THREE.Vector3(0, 1, 0));
    _addMonocolor(topGeometry2, 1);
    const leftGeometry2 = topGeometry2.clone()
      .rotateZ(Math.PI / 2);
    _addDirection(leftGeometry2, new THREE.Vector3(-1, 0, 0));
    _addMonocolor(leftGeometry2, 1);
    const bottomGeometry2 = topGeometry2.clone()
      .rotateZ(Math.PI);
    _addDirection(bottomGeometry2, new THREE.Vector3(0, -1, 0));
    _addMonocolor(bottomGeometry2, 1);
    const rightGeometry2 = topGeometry2.clone()
      .rotateZ(-Math.PI / 2);
    _addDirection(rightGeometry2, new THREE.Vector3(1, 0, 0));
    _addMonocolor(rightGeometry2, 1);
    const forwardGeometry2 = topGeometry2.clone()
      .rotateX(-Math.PI / 2);
    _addDirection(forwardGeometry2, new THREE.Vector3(0, 0, -1));
    _addMonocolor(forwardGeometry2, 1);
    const backGeometry2 = topGeometry2.clone()
      .rotateX(Math.PI / 2);
    _addDirection(backGeometry2, new THREE.Vector3(0, 0, 1));
    _addMonocolor(backGeometry2, 1);
    // merged geometry
    const geometries = [
      topGeometry2,
      leftGeometry2,
      bottomGeometry2,
      rightGeometry2,
      forwardGeometry2,
      backGeometry2,
      topGeometry,
      leftGeometry,
      bottomGeometry,
      rightGeometry,
      forwardGeometry,
      backGeometry,
    ];
    const geometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
    
    // const material = new THREE.MeshBasicMaterial({
    //   color: 0x333333,
    // });
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: {
          value: 0,
          needsUpdate: true,
        },
        uPress: {
          value: 0,
          needsUpdate: true,
        },
      },
      vertexShader: `\
        uniform float uTime;
        uniform float uPress;
        attribute float y;
        attribute vec3 direction;
        attribute float monocolor;
        varying float vY;
        varying vec2 vUv;
        varying vec3 vDirection;
        varying float vMonocolor;

        void main() {
          vUv = uv;
          vY = y;
          vDirection = direction; // XXX offset by direction and time
          vMonocolor = monocolor;

          vec3 p = position * (0.5 + (1. - uPress) * 0.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `\
        varying vec2 vUv;
        varying float vY;
        varying vec3 vDirection;
        varying float vMonocolor;

        void main() {
          vec3 c = vec3(0.1, 0.1, 0.1);
          gl_FragColor = vec4(c, 1.);
          gl_FragColor.rgb += vY * 0.15;
          gl_FragColor.rgb += vMonocolor;
          // gl_FragColor.rg += vUv * 0.2;
        }
      `,
      transparent: true,
    });

    super(geometry, material);

    this.name = 'storyTargetMesh';
  }
}

//

const makeHitMesh = hitMap => {
  // instanced cube mesh
  const baseGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const baseMaterial = new THREE.MeshBasicMaterial({
    color: 0x0000ff,
  });
  const instancedMesh = new THREE.InstancedMesh(baseGeometry, baseMaterial, hitMap.hit.length);
  instancedMesh.frustumCulled = false;
  instancedMesh.name = 'instancedMesh';
  instancedMesh.count = 0;

  for (let i = 0; i < hitMap.hit.length; i++) {
    const hit = hitMap.hit[i];
    if (hit) {
      const point = new THREE.Vector3().fromArray(hitMap.point, i * 3);
      instancedMesh.setMatrixAt(
        i,
        localMatrix
          .makeTranslation(point.x, point.y, point.z)
      );
    }
    instancedMesh.count++;
  }
  instancedMesh.instanceMatrix.needsUpdate = true;

  return instancedMesh;
};
const makeObjectWithPhysics = (object, physics) => {
  object = {
    ...object,
  };
  if (!object.components) {
    object.components = [];
  }
  object.components.push({
    key: 'physics',
    value: physics,
  });
  return object;
};

//

export default ctx => {
  const {
    useApp,
    useLocalPlayer,
    useCameraManager,
    usePhysicsWorkerManager,
    usePlayersManager,
    useRealmManager,
    useSpawnManager,
    useFrame,
    useCleanup,
    useAlea,
    useRouter,
    useEndpoints,
    useEasing,
    useThreeUtils,
    usePhysics,
    useCharacterCardParser,
    useDropManager,
    useZTargetingManager,
    useStoryManager,
    useIoManager,
    useSceneContextManager,
  } = ctx;

  const app = useApp();

  const objects = app.getComponent('worlds');
  // const items = app.getComponent('items');
  const npcs = app.getComponent('npcs');
  const cameraLocked = app.getComponent('cameraLocked');
  // console.log('portals auto objects', objects, items);

  const alea = useAlea();
  const r = alea('lol');

  const bezier = useEasing();
  const cubicBezier = bezier(0, 1, 0, 1);

  const cameraManager = useCameraManager();
  const physicsWorkerManager = usePhysicsWorkerManager();
  // const physicsTracker = usePhysicsTracker();
  const playersManager = usePlayersManager();
  const realmManager = useRealmManager();
  const spawnManager = useSpawnManager();
  const rootRealm = realmManager.getRootRealm();
  const router = useRouter();
  const endpoints = useEndpoints();
  const globalPhysicsScene = usePhysics();
  const characterCardParser = useCharacterCardParser();
  const dropManager = useDropManager();
  const zTargetingManager = useZTargetingManager();
  const storyManager = useStoryManager();
  const ioManager = useIoManager();
  const sceneContextManager = useSceneContextManager();
  // const env = useEnv();
  const {
    BufferGeometryUtils,
  } = useThreeUtils();

  //

  const storyTargetMesh = new StoryTargetMesh({
    BufferGeometryUtils,
  });
  storyTargetMesh.frustumCulled = false;
  app.add(storyTargetMesh);
  storyTargetMesh.updateMatrixWorld();

  //

  const getHitMapAsync = async (app, r) => {
    const raycastResolution = 128;
    const boundingBox = new THREE.Box3(
      new THREE.Vector3(-10, 0, -10),
      new THREE.Vector3(10, 0, 10)
    );
    boundingBox.translate(app.position);
    const size = boundingBox.getSize(new THREE.Vector3());

    const sceneId = Math.random();
    const physicsScene = await physicsWorkerManager.getScene(sceneId);

    const mesh = app.children[0];
    const physicsMesh = await physicsScene.addGeometry(mesh);

    const ps = [];
    const qs = [];
    for (let h = 0; h < raycastResolution; h++) {
      for (let w = 0; w < raycastResolution; w++) {
        const p = new THREE.Vector3()
          .copy(boundingBox.min)
          .add(new THREE.Vector3(
            w / raycastResolution * size.x,
            0,
            h / raycastResolution * size.z
          ));
        // p.y = boundingBox.max.y + 1;
        p.y = 0;
        const q = downQuaternion;
        ps.push(p); 
        qs.push(q);
      }
    }
    const hitMap = await physicsScene.raycastArray(ps, qs, ps.length);

    await physicsScene.removeGeometry(physicsMesh);

    hitMap.coords = Array(hitMap.hit.length);
    hitMap.validCoords = new Set();
    for (let i = 0; i < hitMap.hit.length; i++) {
      const hit = hitMap.hit[i];
      if (hit) {
        const x = i % raycastResolution;
        const y = Math.floor(i / raycastResolution);

        let hasAllNeighbors = true;
        for (let dx = -5; dx <= 5; dx++) {
          for (let dy = -5; dy <= 5; dy++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < raycastResolution && ny >= 0 && ny < raycastResolution) {
              const ni = ny * raycastResolution + nx;
              if (!hitMap.hit[ni]) {
                hasAllNeighbors = false;
                break;
              }
            }
          }
        }

        const position = new THREE.Vector3().fromArray(hitMap.point, i * 3);
        // position.y += 1.5;
        hitMap.coords[i] = position;

        if (hasAllNeighbors) {
          const quaternion = new THREE.Quaternion()
            .setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * 2 * r());
          hitMap.validCoords.add({
            position,
            quaternion,
          });
        }
      } else {
        hitMap.coords[i] = null;
      }
    }

    return hitMap;
  };
  const _listenPortalApp = portalApp => {
    // console.log('got current object', currentObject);
    // const localPlayer = playersManager.getLocalPlayer();
    // let lastPosition = localPlayer.position.clone();
    let lastDistance = NaN;
    const recurse = () => {
      if (portalApp.ownerObject === currentObject) {
        portalApp.matrixWorld.decompose(
          localVector,
          localQuaternion,
          localVector2
        );

        const portalPlane = localPlane.setFromNormalAndCoplanarPoint(
          localVector2.set(0, 0, 1)
            .applyQuaternion(localQuaternion),
          localVector
        );
        const distance = portalPlane.distanceToPoint(localPlayer.position);

        // check if we passed through the portal plane
        if (lastDistance >= 0 && distance < 0) {
          // now check whether we passed through the portal bounding square (within 2m of each side)
          const projectedPoint = localPlane.projectPoint(localPlayer.position, localVector3);
          const distanceToCenter = projectedPoint.sub(localVector);
          distanceToCenter.x = Math.sqrt(distanceToCenter.x * distanceToCenter.x + distanceToCenter.z * distanceToCenter.z);
          distanceToCenter.y = Math.abs(distanceToCenter.y);
          
          // console.log('got distance', distanceToCenter.x, distanceToCenter.y);
          if (distanceToCenter.x <= 0.5 && distanceToCenter.y <= 1) {
            const nextObject = portalApp.otherPortalApp.ownerObject;
            // setCurrentObject(nextObject);

            const multiplayerEnabled = /^\/m\/$/.test(location.pathname);

            const u = new URL(location.href);
            u.pathname = `/${multiplayerEnabled ? 'm' : 'w'}/${nextObject.content.id}`;
            router.replaceUrl(u);
          }
        }

        lastDistance = distance;
      }
    };
    const cleanup = useFrame(recurse);

    return () => {
      cleanup();
    };
  };

  // drag and drop
  const drop = async e => {
    const {
      files,
      clientX,
      clientY,
    } = e.data;
    const file = files[0];
    const data = await characterCardParser.parse(file);
    const {
      name,
      description,
      personality,
      scenario,
      first_mes,
      mes_example,
    } = data.data;
    console.log('parsed character card data', {
      name,
      description,
      personality,
      scenario,
      first_mes,
      mes_example,
    });
  };
  dropManager.addEventListener('drop', drop);
  useCleanup(() => {
    dropManager.removeEventListener('drop', drop);
  });

  /* // items
  const loreItemApps = [];
  const frameCleanup = useFrame(() => {
    const timestamp = performance.now();

    for (const loreItemApp of loreItemApps) {
      loreItemApp.update(timestamp);
    }
  });
  useCleanup(() => {
    frameCleanup();
  }); */

  // portals
  let portalApps = [];
  useCleanup(() => {
    for (let i = 0; i < portalApps.length; i++) {
      const portalApp = portalApps[i];
      portalApp.unlisten();
    }
  });

  const makeWorldIdentityMeta = async (app, r) => {
    const hitMap = await getHitMapAsync(app, r);
    
    const candidates = [];

    const maxNumCandidates = 8;
    const minDistanceAwayFromCenter = 2;
    const minDistanceAwayFromOther = 2;
    for (let i = 0; i < maxNumCandidates; i++) {
      const numRetries = 10;
      let found = false;
      for (let j = 0; j < numRetries; j++) {
        const hitCoord = Array.from(hitMap.validCoords)[Math.floor(r() * hitMap.validCoords.size)];
        // ensure it's the minimum distance away from the center
        const centerDistance = Math.sqrt(
          hitCoord.position.x * hitCoord.position.x +
          hitCoord.position.z * hitCoord.position.z
        );
        if (centerDistance >= minDistanceAwayFromCenter) {
          if (candidates.every(hitCoord2 => {
            const distance = hitCoord.position.distanceTo(hitCoord2.position);
            return distance >= minDistanceAwayFromOther;
          })) {
            candidates.push(hitCoord);
            found = true;
            break;
          }
        }
      }
      if (!found) {
        break;
      }
    }

    const availableCandidates = candidates.slice();

    return {
      getCandidate() {
        return availableCandidates.shift();
      },
    };
  };

  const setCurrentObject = o => {
    // disable old physics
    if (currentObject) {
      currentObject.app.setComponent('physics', false);
    }

    // set the current object
    currentObject = o;

    // hide all objects
    hideAll();
    // link the portals in both directions
    linkObjectNeighborPortals(currentObject);
    showObject(currentObject);
    rootRealm.add(currentObject.app);

    // enable new physics
    currentObject.app.setComponent('physics', true);

    // set scene context world spec
    sceneContextManager.setWorldSpec(currentObject.content);
  };
  const linkObjectNeighborPortals = (currentObject) => {
    for (const portalApp of currentObject.portals) {
      const {
        otherPortalApp,
      } = portalApp;
      portalApp.portalScene.add(otherPortalApp.ownerObject.app);
      // otherPortalApp.visible = false;
    }
  };
  const alignNeighborPortals = (object) => {
    linkObjectNeighborPortals(object);

    for (const portalApp of object.portals) {
      portalApp.otherPortalApp.matrixWorld.decompose(
        localVector,
        localQuaternion,
        localVector2
      );
      portalApp.matrixWorld.decompose(
        localVector3,
        localQuaternion2,
        localVector4
      );

      for (const portalSceneChild of portalApp.portalScene.children) {
        portalSceneChild.matrix
          .premultiply(
            new THREE.Matrix4().compose(
              localVector.clone().negate(),
              new THREE.Quaternion(),
              new THREE.Vector3(1, 1, 1),
            )
          )
          .premultiply(
            new THREE.Matrix4().compose(
              new THREE.Vector3(0, 0, 0),
              localQuaternion.clone().invert(),
              new THREE.Vector3(1, 1, 1),
            )
          )
          .premultiply(
            new THREE.Matrix4().compose(
              new THREE.Vector3(0, 0, 0),
              localQuaternion2.clone().premultiply(y180Quaternion),
              new THREE.Vector3(1, 1, 1),
            )
          )
          .premultiply(
            new THREE.Matrix4().compose(
              localVector3,
              new THREE.Quaternion(),
              new THREE.Vector3(1, 1, 1),
            )
          )
          .decompose(portalSceneChild.position, portalSceneChild.quaternion, portalSceneChild.scale);

        // rootRealm.add(portalSceneChild);
        portalSceneChild.updateMatrixWorld();
      }
    }
  };
  const getNpcAppPhysicsObject = npcApp => {
    return npcApp.npc.physicsTracker.getAppPhysicsObjects(
      Array.from(npcApp.npc.appManager.apps.values())[0]
    )[0];
  };
  const enableNpcApp = npcApp => {
    if (!npcApp.npc.enabled) {
      const physicsObject = getNpcAppPhysicsObject(npcApp);
      globalPhysicsScene.enableActor(physicsObject);

      sceneContextManager.addPlayerSpec(npcApp.npc.playerSpec);
    }

    npcApp.npc.enabled = true;
    npcApp.npc.appManager.visible = true;
  };
  const disableNpcApp = npcApp => {
    if (npcApp.npc.enabled) {
      // enable the character controller physics
      const physicsObject = getNpcAppPhysicsObject(npcApp);
      globalPhysicsScene.disableActor(physicsObject);

      sceneContextManager.removePlayerSpec(npcApp.npc.playerSpec);
    }

    npcApp.npc.enabled = false;
    npcApp.npc.appManager.visible = false;
  };
  const showObject = (object) => {
    object.app.visible = true;
    for (const portalApp of object.portals) {
      portalApp.visible = true;
      portalApp.otherPortalApp.ownerObject.app.visible = true;
    }
    for (const npcApp of object.npcs) {
      enableNpcApp(npcApp);
    }
  };
  const hideAll = () => {
    for (const object of objects) {
      object.app.visible = false;
      for (const portal of object.portals) {
        portal.visible = false;
      }
      for (const npcApp of object.npcs) {
        disableNpcApp(npcApp);
      }
      for (const item of object.items) {
        item.visible = false;
      }
    }
  };

  const localPlayer = useLocalPlayer();
  const camera = cameraManager.getCamera();
  const setTargetPosition = p => {
    if (cameraSlide) {
      cameraSlide.getTargetPosition(p);
    } else {
      p.copy(currentObject.app.position);
    }
    return p;
  };
  const setTargetQuaternion = (() => {
    const localMatrix = new THREE.Matrix4();
    return q => q.setFromRotationMatrix(
      localMatrix.lookAt(
        camera.position,
        localPlayer.position,
        upVector
      )
    );
  })();

  let mouseX = 0, mouseY = 0;
  globalThis.addEventListener('mousemove', e => {
    if (document.pointerLockElement) {
      mouseX += e.movementX * 0.005;
      mouseX = Math.min(Math.max(mouseX, -1), 1);

      mouseY -= e.movementY * 0.005;
      mouseY = Math.min(Math.max(mouseY, -1), 1);
    }
  });

  let mouseZ = 0;
  let mouseDown = false;
  let lastMouseZTime = 0;
  globalThis.addEventListener('mousedown', e => {
    const now = performance.now();

    const focusedApp = zTargetingManager.getFocusedApp();
    if (focusedApp !== null) {
      // console.log('click focused app 1', focusedApp);
      storyManager.clickApp(focusedApp);
      // console.log('click focused app 2', focusedApp);
    } else {
      if (ioManager.keys.keyE) {
        localRaycaster.setFromCamera(localVector2D, camera);

        localObject.position.copy(localRaycaster.ray.origin);
        localObject.quaternion.setFromRotationMatrix(
          localMatrix.lookAt(
            localVector.set(0, 0, 0),
            localRaycaster.ray.direction,
            localVector2.set(0, 1, 0)
          )
        );
        zTargetingManager.handleRayFocus(localObject);
      } else {
        mouseDown = true;
      }
    }
    lastMouseZTime = now;
  });
  globalThis.addEventListener('mouseup', e => {
    mouseDown = false;
  });
  useFrame(() => {
    const now = performance.now();
    const timeDiff = now - lastMouseZTime;
    const rate = 0.0005;
    if (mouseDown) {
      mouseZ += timeDiff * rate;
    } else {
      mouseZ -= timeDiff * rate;
    }
    mouseZ = Math.min(Math.max(mouseZ, 0), 1);
  });

  let cameraSlide = null;
  let cameraAnimation = null;
  const loadWorldAsync = async (nextObject) => {
    const hadObject = !!currentObject;

    setCurrentObject(nextObject);

    if (!hadObject) {
      spawnManager.setSpawnPoint(
        nextObject.app.position,
        identityQuaternion,
      );
      await spawnManager.spawn();

      useFrame(() => {
        // -1 .. 1
        localVector2D.set(
          mouseX,
          mouseY
        );
        
        // raycast
        {
          localRaycaster.setFromCamera(localVector2D, camera);

          let result;
          {
            // const popRaycast = this.#pushRaycast(); // disable walls
            result = globalPhysicsScene.raycast(
              localRaycaster.ray.origin,
              localQuaternion.setFromRotationMatrix(
                localMatrix.lookAt(
                  localVector.set(0, 0, 0),
                  localRaycaster.ray.direction,
                  localVector2.set(0, 1, 0)
                )
              )
            );
            // popRaycast();
          }
          if (result) {
            storyTargetMesh.position.fromArray(result.point);

            const z = mouseZ;
            const z2 = cubicBezier(z);
            storyTargetMesh.material.uniforms.uPress.value = z2;
            storyTargetMesh.material.uniforms.uPress.needsUpdate = true;
          }
          storyTargetMesh.visible = !!result;
        }
        storyTargetMesh.updateMatrixWorld();
      });

      if (cameraLocked) {
        cameraManager.setControllerFn(() => {
          if (cameraSlide) {
            if (!cameraSlide.update()) {
              cameraSlide = null;
            }
          }

          let animated = false;
          if (cameraAnimation) {
            const ok = cameraAnimation.update();
            if (ok) {
              animated = true;
            } else {
              cameraAnimation = null;
            }
          }
          if (!animated) {
            setTargetPosition(camera.position);
            setTargetQuaternion(camera.quaternion);
          }

          // andle towards the mouse position
          {
            const hFov = camera.fov * camera.aspect * Math.PI / 180;
            const vFov = camera.fov * Math.PI / 180;

            camera.quaternion
              .multiply(
                localQuaternion2.setFromAxisAngle(
                  upVector,
                  // -mouseX * Math.PI / 8
                  -mouseX * hFov / 6
                )
              )
              .multiply(
                localQuaternion2.setFromAxisAngle(
                  rightVector,
                  // mouseY * Math.PI / 4
                  mouseY * vFov / 6
                )
              )
          }

          camera.updateMatrixWorld();
        });
      }
    } else {
      // camera slide
      {
        // find the closest portal
        let minDistance = Infinity;
        let closestPortal = null;
        for (let i = 0; i < currentObject.portals.length; i++) {
          const portal = currentObject.portals[i];

          portal.matrixWorld.decompose(localVector, localQuaternion, localVector2);

          const distance = localVector.distanceTo(localPlayer.position);
          if (distance < minDistance) {
            minDistance = distance;
            closestPortal = portal;
          }
        }

        closestPortal.matrixWorld.decompose(localVector, localQuaternion, localVector2);
        const portalWorldPosition = localVector.clone();
        const portalWorldQuaternion = localQuaternion.clone();
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
          currentObject.app.position.clone()
            .sub(portalWorldPosition)
            .normalize(),
          portalWorldPosition
        );

        const distance = plane.distanceToPoint(currentObject.app.position);
        const distanceStartFactor = 1.2;
        const normal = camera.position.clone()
          .sub(currentObject.app.position)
          .normalize();
        // const startPosition = currentObject.app.position.clone()
        //   .add(
        //     normal.clone()
        //       .multiplyScalar(distance * distanceStartFactor)
        //   );
        const cameraDistance = 4;
        const cameraDirection = new THREE.Vector3(0, 0, -1)
          .applyQuaternion(camera.quaternion);
        const targetForward = cameraDirection.dot(normal) <= 0;
        const startPosition = portalWorldPosition.clone()
          .add(
            new THREE.Vector3(0, 0, cameraDistance * (targetForward ? -1 : 1))
              .applyQuaternion(portalWorldQuaternion)
          );
        const endPosition = currentObject.app.position.clone();

        let maxFactor = -Infinity;
        cameraSlide = {
          update() {
            let factor = plane.distanceToPoint(localPlayer.position);
            factor /= distance;
            factor = Math.min(Math.max(factor, 0), 1);

            maxFactor = Math.max(maxFactor, factor);

            return maxFactor < 1;
          },
          getTargetPosition(position) {
            position.lerpVectors(
              startPosition,
              endPosition,
              maxFactor
            );
            // position.copy(startPosition);
          },
        };
      }

      // camera animation
      {
        const animationDuration = 3000;
        const startTime = performance.now();
        const endTime = startTime + animationDuration;

        const startPosition = camera.position.clone();
        const startQuaternion = camera.quaternion.clone();

        cameraAnimation = {
          update() {
            const now = performance.now();
            let f = (now - startTime) / (endTime - startTime);
            if (f < 1) {
              const f2 = cubicBezier(f);

              const targetPosition = setTargetPosition(localVector);

              camera.position.lerpVectors(
                startPosition,
                targetPosition,
                f2
              );
              const targetQuaternion = setTargetQuaternion(localQuaternion);
              camera.quaternion.slerpQuaternions(
                startQuaternion,
                targetQuaternion,
                f2
              );
              // camera.updateMatrixWorld();

              return true;
            } else {
              return false;
            }
          },
        };
      }
    }
  };

  let currentObject = null;
  let loadPromise = null;
  const ensureLoaded = async () => {
    if (!loadPromise) {
      loadPromise = (async () => {
        // load objects
        await Promise.all(objects.map(async (object, i) => {
          const r2 = alea(r());

          const object2 = makeObjectWithPhysics(object, false);

          const app = await rootRealm.appManager.addAppAsync(object2);
          app.visible = false;
          object.app = app;

          const meta = await makeWorldIdentityMeta(app, r2);
          object.meta = meta;

          object.portals = [];
          object.npcs = [];
          object.items = [];
        }));

        // initialize portals
        await Promise.all(objects.map(async (object, i) => {
          let portals = object.portals;
          const nextObject = objects[i + 1];
          if (nextObject) { // if there is a next object, create a portal to it
            const hitCoord = object.meta.getCandidate();
            let {
              position,
              // quaternion,
            } = hitCoord;

            // create the outgoing portal
            position = position.clone();
            position.y += 1;
            const quaternion = new THREE.Quaternion()
              .setFromUnitVectors(
                new THREE.Vector3(0, 0, -1),
                new THREE.Vector3(position.x, 0, position.z).normalize()
              );
            const portalApp = await rootRealm.appManager.addAppAsync({
              type: 'application/portal',
              position,
              quaternion,
              content: {
                components: [
                  {
                    key: 'doubleSideEnabled',
                    value: true,
                  },
                ],
              },
            });
            portalApp.ownerObject = object;
            portalApp.visible = false;
            _listenPortalApp(portalApp);
            object.app.add(portalApp);
            portalApp.updateMatrixWorld();
            portals.push(portalApp);

            // create the reverse portal
            const otherHitCoord = nextObject.meta.getCandidate();
            let {
              position: reversePosition,
              // quaternion: reverseQuaternion,
            } = otherHitCoord;
            reversePosition = reversePosition.clone();
            reversePosition.y += 1;
            const reverseQuaternion = new THREE.Quaternion()
              .setFromUnitVectors(
                new THREE.Vector3(0, 0, -1),
                new THREE.Vector3(reversePosition.x, 0, reversePosition.z).normalize()
              );
            const reversePortalApp = await rootRealm.appManager.addAppAsync({
              type: 'application/portal',
              position: reversePosition,
              quaternion: reverseQuaternion,
              content: {
                components: [
                  {
                    key: 'doubleSideEnabled',
                    value: true,
                  },
                ],
              },
            });
            reversePortalApp.ownerObject = nextObject;
            reversePortalApp.visible = false;
            _listenPortalApp(reversePortalApp);
            nextObject.app.add(reversePortalApp);
            reversePortalApp.updateMatrixWorld();
            let otherPortals = nextObject.portals;
            otherPortals.push(reversePortalApp);

            // link the portals
            portalApp.otherPortalApp = reversePortalApp;
            reversePortalApp.otherPortalApp = portalApp;
          }
        }));

        // align apps and portals
        for (let i = 0; i < objects.length; i++) {
          const object = objects[i];
          alignNeighborPortals(object);
        }

        // initialize npcs
        const avatarUrls = [
          'Stevia_cl_a_1.03.vrm',
          // 'Scilly_FaceTracking_v1_Darling.vrm',
          'citrine.vrm',
          'Yoll2.vrm',
          'Buster_Rabbit_V1.1_Guilty.vrm',
          'ann.vrm',
          'NuQuiche.vrm',
          'Drake_hacker_v8_Guilty.vrm',
          'CornetVRM.vrm',
          'Scillia_Drophunter_V19.vrm',
          // 'scilly_drophunter_v31.10_Guilty.vrm',
        ].map(n => `/avatars/${n}`);
        await Promise.all(objects.map(async (object, i) => {
          const npcsSpec = npcs[i];
          await Promise.all(npcsSpec.npcs.map(async (npcSpec, j) => {
            // console.log('got npc spec', npcSpec);
            if (j >= 2) { // only create npcs for the first two objects
              return;
            }

            const {firstLastName: name, bio} = npcSpec;
            const r2 = alea(r());

            const hitCoord = object.meta.getCandidate();
            let {
              position,
              quaternion,
            } = hitCoord;

            const avatarUrl = avatarUrls[Math.floor(r2() * avatarUrls.length)];
            // const npcApp = new app.constructor();
            // app.add(npcApp);
            // npcApp.updateMatrixWorld();

            localMatrix.compose(
              position,
              quaternion,
              oneVector
            )
              .premultiply(object.app.matrixWorld)
              .decompose(localVector, localQuaternion, localVector2);

            // console.log('premultiply app', app.matrixWorld.toArray());

            const npcApp = await rootRealm.appManager.addAppAsync({
              type: 'application/npc',
              // app: npcApp,
              content: {
                avatarUrl,
                name,
                bio,
                voice: 'Rainbow Dash',
                // voicePack: 'ShiShi voice pack'
              },
              position: localVector,
              quaternion: localQuaternion,
            });
            npcApp.npc.appManager.visible = false;
            // console.log('got npc app', npcApp.npc.appManager);

            object.app.add(npcApp);
            npcApp.updateMatrixWorld();
            object.npcs.push(npcApp);
          }));
        }));
      })();
    }
    await loadPromise;
  };
  /* let hitMap = null; // xXX needs to be populated
  const loadInitialItemsState = async () => {
    // console.log('load items', items);
    const firstWorldItems = items[0].items;

    for (let i = 0; i < firstWorldItems.length; i++) {
      const item = firstWorldItems[i];
      const {
        name,
        description,
        prompt,
        url,
      } = item;

      const hitCoord = Array.from(hitMap.validCoords)[Math.floor(r() * hitMap.validCoords.size)];
      let {
        position,
        // quaternion,
      } = hitCoord;

      position = position.clone();
      position.y += 1;

      const loreItemApp = await rootRealm.appManager.addAppAsync({
        type: 'application/loreitem',
        content: {
          name,
          description,
          prompt,
          url,
        },
        position,
      });
      console.log('lore item app', loreItemApp);
      loreItemApps.push(loreItemApp);
    }
  }; */
  let multiplayerPromise = null;
  const ensureMultiplayer = async () => {
    if (!multiplayerPromise) {
      multiplayerPromise = (async () => {
        const multiplayer = realmManager.createMultiplayer();
        app.add(multiplayer);
        multiplayer.updateMatrixWorld();
    
        await multiplayer.connectMultiplayer({
          endpoint_url: endpoints.multiplayerEndpointUrl,
        });
    
        const tracker = multiplayer.createTracker({
          getKeySpec: () => {
            const id = currentObject.content.id + '';
            const realmsKeys = [id];
            const rootRealmKey = id;
            return {
              realmsKeys,
              rootRealmKey,
            };
          },
        });
        useCleanup(() => {
          tracker.stop();
        });
      })();
    }
    await multiplayerPromise;
  };

  ctx.waitUntil((async () => {
    router.registerRouteHandler(u => {
      const match = u.pathname.match(/^\/(w|m)\/(.*)$/);
      if (match) {
        const multiplayerEnabled = match[1] === 'm';
        const id = match[2] || (objects.length > 0 ? (objects[0].content.id + '') : null);

        const object = objects.find(o => o.content.id + '' === id);
        if (object) {
          return {
            id,
            multiplayerEnabled,
          };
        } else {
          throw new Error('404 not found');
        }
      } else {
        throw new Error('400 invalid url');
      }
    });
    router.addEventListener('route', e => {
      const route = e.data;
      e.waitUntil((async () => {
        await ensureLoaded();

        const {
          id,
          multiplayerEnabled,
        } = route;

        const startObject = objects.find(o => o.content.id + '' === id);
        await loadWorldAsync(startObject);

        if (multiplayerEnabled) {
          await ensureMultiplayer();
        }
      })());
    });
    // console.log('load router 1');
    await router.load();
    // console.log('load router 2');
  })());

  return app;
};