import * as THREE from 'three';
// import metaversefile from 'metaversefile';
import {
  MathUtils,
} from 'three';

const {clamp} = MathUtils;
const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

const localVector = new THREE.Vector3();
const localMatrix = new THREE.Matrix4();

const upVector = new THREE.Vector3(0, 1, 0);
const z180Quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
const muzzleOffset = new THREE.Vector3(0, 0.1, 0.25);
const muzzleFlashTime = 300;
const bulletSparkTime = 300;

const emptyArray = [];
const fnEmptyArray = () => emptyArray;

export default ctx => {
  const {
    useApp,
    useFrame,
    useActivate,
    // useWear,
    // useUse,
    useLocalPlayer,
    usePhysics,
    useScene,
    // getNextInstanceId,
    getAppByPhysicsId,
    // useWorld,
    // useDefaultModules,
    useCleanup,
    useSounds,
    useImportManager,
    useEngine,
  } = ctx;

  const app = useApp();
  const appSubApps = [];
  const physics = usePhysics();
  const scene = useScene();
  const importManager = useImportManager();
  const engine = useEngine();
  
  app.name = 'pistol';
  app.description = 'A pistol that seems like it would be used by a gang.';

  // const worldLights = app;
  /* const _updateSubAppMatrix = subApp => {
    subApp.updateMatrixWorld();
    app.position.copy(subApp.position);
    app.quaternion.copy(subApp.quaternion);
    app.scale.copy(subApp.scale);
    app.matrix.copy(subApp.matrix);
    app.matrixWorld.copy(subApp.matrixWorld);
  }; */
  const sounds = useSounds();
  const soundFiles = sounds.getSoundFiles();
  const soundIndex = soundFiles.combat.map(sound => sound.name).indexOf('combat/Colt45_Shot2.wav');

  let pointLights = [];
  const gunPointLight = new THREE.PointLight(0xFFFFFF, 5);
  gunPointLight.castShadow = false; 
  gunPointLight.startTime = 0;
  gunPointLight.endTime = 0;
  gunPointLight.initialIntensity = gunPointLight.intensity;
  // const world = useWorld();
  // const worldLights = world.getLights();
  // worldLights.add(gunPointLight);
  pointLights.push(gunPointLight);
  
  const bulletPointLight = new THREE.PointLight(0xef5350, 5, 10);
  bulletPointLight.castShadow = false;
  bulletPointLight.startTime = 0;
  bulletPointLight.endTime = 0;
  bulletPointLight.initialIntensity = bulletPointLight.intensity;
  // worldLights.add(bulletPointLight);
  pointLights.push(bulletPointLight);

  const textureLoader = new THREE.TextureLoader();

  const debugGeo = new THREE.BoxGeometry( 0.01, 0.01, 0.01);
  const debugMat = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
  const decalTextureName = "bulletHole.jpg";
  const decalTexture = textureLoader.load(`${import.meta.url.replace(/(\/)[^\/]*$/, '$1')}${ decalTextureName}`);
  // decalTexture.needsUpdate = true;
  const decalMaterial = new THREE.MeshPhysicalMaterial({
    // color: 0xFF0000,
    map: decalTexture,
    alphaMap: decalTexture,
    transparent: true,
    alphaTest: 0.01,
    // depthWrite: true,
    // depthTest: true,
  });
  decalMaterial.needsUpdate = true;
  // const debugMesh = [];
  const debugDecalVertPos = false;

  const maxNumDecals = 128;
  const decalGeometry = new THREE.PlaneBufferGeometry(0.5, 0.5, 8, 8).toNonIndexed();
  const _makeDecalMesh = () => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(decalGeometry.attributes.position.array.length * maxNumDecals);
    const positionsAttribute = new THREE.BufferAttribute(positions, 3);
    geometry.setAttribute('position', positionsAttribute);
    const normals = new Float32Array(decalGeometry.attributes.normal.array.length * maxNumDecals);
    const normalsAttribute = new THREE.BufferAttribute(normals, 3);
    geometry.setAttribute('normal', normalsAttribute);
    const uvs = new Float32Array(decalGeometry.attributes.uv.array.length * maxNumDecals);
    const uvsAttribute = new THREE.BufferAttribute(uvs, 2);
    geometry.setAttribute('uv', uvsAttribute);
    // const indices = new Uint16Array(decalGeometry.index.array.length * maxNumDecals);
    // const indicesAttribute = new THREE.BufferAttribute(indices, 1);
    // geometry.setIndex(indicesAttribute);

    const decalMesh = new THREE.Mesh(geometry, decalMaterial);
    decalMesh.name = 'DecalMesh';
    decalMesh.frustumCulled = false;
    decalMesh.offset = 0;

    return decalMesh;
  };

  const appDecalMeshes = [];
  const decalMeshMap = new Map();

  const decalMeshCleanup = (event) => {
    const destroyingApp = event.target;
    const destroyingDecalMesh = decalMeshMap.get(destroyingApp);
    scene.remove(destroyingDecalMesh);
  };

  const baseUrl = import.meta.url
    .replace(/\/([^\/]*)$/, '');
  const baseUrl2 = baseUrl
    .replace(/\/([^\/]*)$/, '');

  let gunApp = null;
  let explosionApp = null;
  let subApps = [null, null];
  ctx.waitUntil((async () => {
    {
      // let u2 = `https://webaverse.github.io/pixelsplosion/`;
      let u2 = `${baseUrl2}/pixelsplosion/index.js`;
      // if (/^https?:/.test(u2)) {
      //   u2 = '/@proxy/' + u2;
      // }
      const appContext = engine.engineAppContextFactory.makeAppContext({
        app,
      });

      explosionApp = await importManager.createAppAsync({
        start_url: u2,

        position: app.position,
        quaternion: app.quaternion,
        scale: app.scale,

        appContext,
      });

      // console.log('group objects 3', u2, m);
      // explosionApp.contentId = u2;
      // explosionApp.instanceId = getNextInstanceId();
      // explosionApp.position.copy(app.position);
      // explosionApp.quaternion.copy(app.quaternion);
      // explosionApp.scale.copy(app.scale);
      // explosionApp.updateMatrixWorld();

      // explosionApp.name = 'explosion';
      subApps[0] = explosionApp;

      // await explosionApp.addModule(m);
      scene.add(explosionApp);
      appSubApps.push(explosionApp);
      explosionApp.add(bulletPointLight);
      // metaversefile.addApp(explosionApp);
      explosionApp.updateMatrixWorld();
    }

    {
      let u2 = `${baseUrl}/military.glb`;

      const appContext = engine.engineAppContextFactory.makeAppContext({
        app,
      });

      gunApp = await importManager.createAppAsync({
        start_url: u2,

        position: app.position,
        quaternion: app.quaternion,
        scale: app.scale,

        appContext,
      });
      gunApp.name = app.name;
      gunApp.description = app.description;
      // gunApp.position.copy(app.position);
      // gunApp.quaternion.copy(app.quaternion);
      // gunApp.scale.copy(app.scale);
      // gunApp.updateMatrixWorld();
      // gunApp.name = 'gun';
      gunApp.getPhysicsObjectsOriginal = gunApp.getPhysicsObjects;
      gunApp.getPhysicsObjects = fnEmptyArray;
      subApps[1] = gunApp;
      gunApp.add(gunPointLight);
      gunApp.updateMatrixWorld();
      
      const components = [
        // {
        //   "key": "instanceId",
        //   "value": getNextInstanceId(),
        // },
        // {
        //   "key": "contentId",
        //   "value": u2,
        // },
        {
          "key": "physics",
          "value": true,
        },
        {
          "key": "wear",
          "value": {
            "boneAttachment": "leftHand",
            "position": [-0.04, -0.03, -0.01],
            "quaternion": [0.5, -0.5, -0.5, 0.5],
            "scale": [1, 1, 1]
          }
        },
        {
          "key": "aim",
          "value": {}
        },
        {
          "key": "use",
          "value": {
            "ik": "pistol"
          }
        }
      ];
      
      for (const {key, value} of components) {
        gunApp.setComponent(key, value);
      }
      // await gunApp.addModule(m);
      scene.add(gunApp);
      appSubApps.push(gunApp);

      // metaversefile.addApp(gunApp);

      gunApp.addEventListener('use', e => {
        // muzzle flash
        {
          explosionApp.position
            .copy(gunApp.position)
            .add(
              new THREE.Vector3(0, 0.1, 0.25).applyQuaternion(gunApp.quaternion)
            );
          explosionApp.quaternion.copy(gunApp.quaternion);
          explosionApp.scale.copy(gunApp.scale);
          explosionApp.updateMatrixWorld();
          explosionApp.setComponent('color1', 0x808080);
          explosionApp.setComponent('color2', 0x000000);
          explosionApp.setComponent('gravity', 0.5);
          explosionApp.setComponent('rate', 5);
          explosionApp.use();

          gunPointLight.startTime = performance.now();
          gunPointLight.endTime = gunPointLight.startTime + muzzleFlashTime;
        }

        // bullet hit
        {
          const result = physics.raycast(
            gunApp.position,
            gunApp.quaternion.clone().multiply(z180Quaternion)
          );
          if (result) {
            const targetApp = getAppByPhysicsId(result.objectId);
            if (targetApp) {
              const hasTargetApp = decalMeshMap.has(targetApp);
              if (!hasTargetApp) {
                const newDecalMesh = _makeDecalMesh();
                scene.add(newDecalMesh);
                appSubApps.push(newDecalMesh)
                appDecalMeshes.push(newDecalMesh);
                decalMeshMap.set(targetApp, newDecalMesh);
                // listening for destroy event on the hit app
                targetApp.addEventListener('destroy', decalMeshCleanup);
              }
            }

            const appDecalMesh = decalMeshMap.get(targetApp);

            const normal = new THREE.Vector3().fromArray(result.normal);
            const newPointVec = new THREE.Vector3().fromArray(result.point);
            const modiPoint = newPointVec
              .clone()
              .add(normal.clone().multiplyScalar(0.01));

            const pos = modiPoint;
            const q = new THREE.Quaternion().setFromRotationMatrix(
              new THREE.Matrix4().lookAt(pos, pos.clone().sub(normal), upVector)
            );
            const s = new THREE.Vector3(1, 1, 1);
            const planeMatrix = new THREE.Matrix4().compose(pos, q, s);
            const planeMatrixInverse = planeMatrix.clone().invert();

            const localDecalGeometry = decalGeometry.clone();
            const positions = localDecalGeometry.attributes.position.array;
            for (let i = 0; i < positions.length; i++) {
              const p = new THREE.Vector3(
                positions[i * 3],
                positions[i * 3 + 1],
                positions[i * 3 + 2]
              );
              const pToWorld = p.clone().applyMatrix4(planeMatrix);
              const vertexRaycast = physics.raycast(pToWorld, q.clone());

              if (vertexRaycast) {
                const vertextHitnormal = new THREE.Vector3().fromArray(
                  vertexRaycast.normal
                );

                /* const dummyPosition = new THREE.Object3D();
                scene.add( dummyPosition );
                const offSet = 14;
                const pointVec =  dummyPosition.localToWorld(new THREE.Vector3().fromArray(vertexRaycast.point).add(
                  new Vector3(0, vertextHitnormal.y / offSet,0 )
                )); */
                const pointVec = new THREE.Vector3()
                  .fromArray(vertexRaycast.point)
                  .add(vertextHitnormal.clone().multiplyScalar(0.01));
                pointVec.applyMatrix4(planeMatrixInverse);
                const minClamp = -0.25;
                const maxClamp = 0.25;
                pointVec.sub(p);
                // pointVec.x = clamp(pointVec.x, minClamp, maxClamp);
                // pointVec.y = clamp(pointVec.y, minClamp, maxClamp);
                pointVec.z = clamp(pointVec.z, minClamp, maxClamp);
                pointVec.add(p);
                pointVec.applyMatrix4(planeMatrix);
                // const clampedPos = new Vector3(clamp(worldToLoc.x, minClamp, maxClamp),
                // clamp(worldToLoc.y, minClamp, maxClamp), clamp(worldToLoc.z, minClamp, maxClamp));

                if (debugDecalVertPos) {
                  const debugMesh = new THREE.Mesh(debugGeo, debugMat);
                  debugMesh.position.set(pointVec.x, pointVec.y, pointVec.z);
                  debugMesh.updateWorldMatrix();
                  scene.add(debugMesh);
                  appSubApps.push(debugMesh);
                }

                // dummyPosition.position.set(pointVec.x, pointVec.y, pointVec.z);
                // dummyPosition.updateWorldMatrix();
                // const worldToLoc = pointVec.clone().applyMatrix4(planeMatrixInverse);

                pointVec.toArray(positions, i * 3);
                // decalGeometry.attributes.position.setXYZ( i, clampedPos.x, clampedPos.y, clampedPos.z );
              } else {
                pToWorld.toArray(positions, i * 3);
              }
            }

            localDecalGeometry.computeVertexNormals();
            // now, we copy the localDecalGeometry into the decalMesh.geometry at the appropriate position
            // we make sure to copy the position, uv, normal, and index. all of these attributes should be correctly offset
            if (appDecalMesh) {
              const offset = appDecalMesh.offset;
              // console.log('offset', appDecalMesh.offset);
              for (
                let i = 0;
                i < localDecalGeometry.attributes.position.count;
                i++
              ) {
                appDecalMesh.geometry.attributes.position.setXYZ(
                  i + offset,
                  localDecalGeometry.attributes.position.getX(i),
                  localDecalGeometry.attributes.position.getY(i),
                  localDecalGeometry.attributes.position.getZ(i)
                );
                appDecalMesh.geometry.attributes.uv.setXY(
                  i + offset,
                  localDecalGeometry.attributes.uv.getX(i),
                  localDecalGeometry.attributes.uv.getY(i)
                );
                appDecalMesh.geometry.attributes.normal.setXYZ(
                  i + offset,
                  localDecalGeometry.attributes.normal.getX(i),
                  localDecalGeometry.attributes.normal.getY(i),
                  localDecalGeometry.attributes.normal.getZ(i)
                );
                // appDecalMesh.geometry.index.setX( i + offset, localDecalGeometry.index.getX(i) );
              }
              // flag geometry attributes for update
              appDecalMesh.geometry.attributes.position.updateRange = {
                offset: offset * 3,
                count: localDecalGeometry.attributes.position.array.length,
              };
              appDecalMesh.geometry.attributes.position.needsUpdate = true;
              appDecalMesh.geometry.attributes.uv.updateRange = {
                offset: offset * 2,
                count: localDecalGeometry.attributes.uv.array.length,
              };
              appDecalMesh.geometry.attributes.uv.needsUpdate = true;
              appDecalMesh.geometry.attributes.normal.updateRange = {
                offset: offset * 3,
                count: localDecalGeometry.attributes.normal.array.length,
              };
              appDecalMesh.geometry.attributes.normal.needsUpdate = true;
              // appDecalMesh.geometry.index.updateRange = {
              //   offset,
              //   count: localDecalGeometry.index.count,
              // };
              //appDecalMesh.geometry.index.needsUpdate = true;
              // update geometry attribute offset
              appDecalMesh.offset +=
                localDecalGeometry.attributes.position.count;
              appDecalMesh.offset =
                appDecalMesh.offset %
                appDecalMesh.geometry.attributes.position.count;

              explosionApp.position.fromArray(result.point);
              explosionApp.quaternion.setFromRotationMatrix(
                new THREE.Matrix4().lookAt(
                  explosionApp.position,
                  explosionApp.position.clone().sub(normal),
                  upVector
                )
              );
              // explosionApp.scale.copy(gunApp.scale);
              explosionApp.updateMatrixWorld();
              explosionApp.setComponent('color1', 0xef5350);
              explosionApp.setComponent('color2', 0x000000);
              explosionApp.setComponent('gravity', -0.5);
              explosionApp.setComponent('rate', 0.5);
              explosionApp.use();

              // bulletPointLight.position.copy(explosionApp.position);
              bulletPointLight.startTime = performance.now();
              bulletPointLight.endTime =
                bulletPointLight.startTime + bulletSparkTime;

              if (targetApp) {
                const localPlayer = useLocalPlayer();
                const damage = 2;

                const hitPosition = new THREE.Vector3().fromArray(result.point);
                const hitQuaternion =
                  new THREE.Quaternion().setFromRotationMatrix(
                    localMatrix.lookAt(
                      localPlayer.position,
                      hitPosition,
                      localVector.set(0, 1, 0)
                    )
                  );

                const hitDirection = targetApp.position
                  .clone()
                  .sub(localPlayer.position);
                // hitDirection.y = 0;
                hitDirection.normalize();

                // const willDie = targetApp.willDieFrom(damage);
                targetApp.hit(damage, {
                  collisionId: result.objectId,
                  hitPosition,
                  hitDirection,
                  hitQuaternion,
                  // willDie,
                });
              }
            } else {
              console.warn('no app with physics id', result.objectId);
            }
          }
        }
      });
    }
  })());
  
  /* app.getPhysicsObjects = () => {
    return gunApp ? gunApp.getPhysicsObjectsOriginal() : [];
  };
  app.removePhysicsObjects = () => {
    if (app.getPhysicsObjects()) {
      for (const physicsId of app.getPhysicsObjects()) {
        physics.removeGeometry(physicsId)
        const index = app.getPhysicsObjects().indexOf(physicsId);
        if (index > -1) {
          app.getPhysicsObjects().splice(index, 1);
        }
      }
    }
  }
  app.removeSubApps = () => {
    for (const subApp of subApps) {
      const parent = subApp.parent;
      parent.remove(subApp);
    }
  } */
  
  useActivate(() => {
    const localPlayer = useLocalPlayer();
    localPlayer.wear(app);
  });
  
  let wearing = false;
  app.addEventListener('wear', e => {
    const {wear, player} = e.data;
    for (const subApp of subApps) {
      subApp.position.copy(app.position);
      subApp.quaternion.copy(app.quaternion);
      subApp.scale.copy(app.scale);
      subApp.updateMatrixWorld();
      
      subApp.dispatchEvent({
        type: 'wearupdate',
        wear,
        player: player
      });
    }
    wearing = wear;
  });
  app.addEventListener('use', e => {
    const {
      use,
    } = e.data;
    if (use && gunApp) {
      sounds.playSound(soundFiles.combat[soundIndex]);
      gunApp.use();
    }
  });

  useFrame((timestamp) => {
    if (!wearing) {
      if (gunApp) {
        gunApp.position.copy(app.position);
        gunApp.quaternion.copy(app.quaternion);
        gunApp.updateMatrixWorld();
      }
    } else {
      if (gunApp) {
        app.position.copy(gunApp.position);
        app.quaternion.copy(gunApp.quaternion);
        app.updateMatrixWorld();
      }
    }
    
    if (gunApp) {
      gunPointLight.position.set(0,0,0)
        .add(localVector.copy(muzzleOffset).applyQuaternion(gunApp.quaternion));
      gunPointLight.updateMatrixWorld();
    }
     
    for (const pointLight of pointLights) {
      const factor = Math.min(Math.max((timestamp - pointLight.startTime) / (pointLight.endTime - pointLight.startTime), 0), 1);
      // if (isNaN(factor)) {
      //   debugger;
      // }
      pointLight.intensity = pointLight.initialIntensity * (1 - Math.pow(factor, 0.5));
    }
  });
  
  useCleanup(() => {
    for (const [targetApp, decalMesh] of decalMeshMap.entries()) {
      targetApp.removeEventListener('destroy', decalMeshCleanup);
      scene.remove(decalMesh);
      decalMeshMap.delete(targetApp);
    }
    for (const decalMesh of appDecalMeshes) {
      scene.remove(decalMesh);
    }
    for (const subApp of subApps) {
      if (subApp) {
        // metaversefile.removeApp(subApp);
        scene.remove(subApp);
        subApp.destroy();
      }
    }
  });

  return app;
};