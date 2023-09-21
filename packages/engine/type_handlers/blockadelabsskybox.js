import * as THREE from 'three';
import {
  Skybox360Mesh,
} from '../meshes/Skybox360Mesh.js';

//

export default srcUrl => ctx => {
  const {
    useApp,
    usePhysics,
    usePhysicsTracker,
    useCleanup,
    useEngineRenderer,
    useLoreManager,
  } = ctx;

  const app = useApp();
  const physics = usePhysics();
  const physicsTracker = usePhysicsTracker();
  // const engineRenderer = useEngineRenderer();
  const loreManager = useLoreManager();

  app.appType = 'blockadelabsskybox';
  app.name = srcUrl.match(/([^\/]*)$/)[1];
  app.description = '';

  app.setHighlightImage = (image) => {
    const octahedronMesh = app.children[0];

    if (image) {
      octahedronMesh.material.uniforms.highlightImage.value.image = image;
      octahedronMesh.material.uniforms.highlightImage.value.needsUpdate = true;
    }

    octahedronMesh.material.uniforms.highlightImageValid.value = +!!image;
    octahedronMesh.material.uniforms.highlightImageValid.needsUpdate = true;
  };
  
  ctx.waitUntil((async () => {
    const res = await fetch(srcUrl);
    const json = await res.json();

    const {
      id,
      fileUrl,
      depthMapUrl,
    } = json;

    app.worldIdentityId = id;

    const octahedronMesh = new Skybox360Mesh();
    await octahedronMesh.load({
      fileUrl,
      depthMapUrl,
    });
    app.add(octahedronMesh);
    octahedronMesh.updateMatrixWorld();

    // scene physics
    {
      let scenePhysicsObject = null;

      const enablePhysics = () => {
        const scenePhysicsMesh = new THREE.Mesh(
          octahedronMesh.geometry.clone()
            .applyMatrix4(app.matrixWorld),
          octahedronMesh.material
        );

        scenePhysicsObject = physics.addGeometry(scenePhysicsMesh);
        physicsTracker.addAppPhysicsObject(app, scenePhysicsObject);
        // engineRenderer.scene.add(scenePhysicsObject);
        scenePhysicsObject.updateMatrixWorld();

        scenePhysicsObject.name = app.name;
        scenePhysicsObject.description = app.description;
      };
      const disablePhysics = () => {
        // console.log('disable physics', scenePhysicsObject);
        physics.removeGeometry(scenePhysicsObject);
        physicsTracker.removeAppPhysicsObject(app, scenePhysicsObject);
        // scenePhysicsObject.parent.remove(scenePhysicsObject);
        scenePhysicsObject = null;
      };

      const getPhysicsEnabled = () => app.getComponent('physics') ?? true;
      if (getPhysicsEnabled()) {
        enablePhysics();
      }
      loreManager.addSetting(json);
      app.addEventListener('componentsupdate', e => {
        const {
          keys,
        } = e;
        // console.log('componentsupdate', keys);
        if (keys.includes('physics')) {
          const physicsEnabled = getPhysicsEnabled();
          // console.log('check physics enabled', physicsEnabled, app);
          if (physicsEnabled && !scenePhysicsObject) {
            // console.log('enable physics', app);
            enablePhysics();
          } else if (!physicsEnabled && scenePhysicsObject) {
            // console.log('disable physics', app);
            disablePhysics();
          }
        }
      });

      useCleanup(() => {
        loreManager.removeSetting(json);
        
        if (scenePhysicsObject) {
          disablePhysics();
        }
      });
      
      // start off as not selected
      // physics.disableActor(scenePhysicsObject);
      /* app.setSelected = selected => {
        if (selected) {
          // console.log('enable actor', scenePhysicsObject);
          physics.enableActor(scenePhysicsObject);
        } else {
          // console.log('disable actor', scenePhysicsObject);
          physics.disableActor(scenePhysicsObject);
        }
      }; */
    }

    // const raycastResolution = 128;
    // const boundingBox = new THREE.Box3()
    //   .setFromObject(octahedronMesh);
    // const size = boundingBox.getSize(new THREE.Vector3());
    // const getHitMap = () => {
    //   const ps = [];
    //   const qs = [];
    //   for (let h = 0; h < raycastResolution; h++) {
    //     for (let w = 0; w < raycastResolution; w++) {
    //       const p = new THREE.Vector3()
    //         .copy(boundingBox.min)
    //         .add(new THREE.Vector3(
    //           w / raycastResolution * size.x,
    //           0,
    //           h / raycastResolution * size.z
    //         ));
    //       // p.y = boundingBox.max.y + 1;
    //       p.y = 0;
    //       const q = downQuaternion;
    //       ps.push(p);
    //       qs.push(q);
    //     }
    //   }
    //   const hitMap = physics.raycastArray(ps, qs, ps.length);
      
    //   hitMap.coords = Array(hitMap.hit.length);
    //   hitMap.validCoords = new Set();
    //   for (let i = 0; i < hitMap.hit.length; i++) {
    //     const hit = hitMap.hit[i];
    //     if (hit) {
    //       const x = i % raycastResolution;
    //       const y = Math.floor(i / raycastResolution);

    //       let hasAllNeighbors = true;
    //       for (let dx = -5; dx <= 5; dx++) {
    //         for (let dy = -5; dy <= 5; dy++) {
    //           const nx = x + dx;
    //           const ny = y + dy;
    //           if (nx >= 0 && nx < raycastResolution && ny >= 0 && ny < raycastResolution) {
    //             const ni = ny * raycastResolution + nx;
    //             if (!hitMap.hit[ni]) {
    //               hasAllNeighbors = false;
    //               break;
    //             }
    //           }
    //         }
    //       }

    //       const position = new THREE.Vector3().fromArray(hitMap.point, i * 3);
    //       // position.y += 1.5;
    //       hitMap.coords[i] = position;

    //       if (hasAllNeighbors) {
    //         const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * 2 * Math.random());
    //         hitMap.validCoords.add({
    //           position,
    //           quaternion,
    //         });
    //       }
    //     } else {
    //       hitMap.coords[i] = null;
    //     }
    //   }
      
    //   return hitMap;
    // };

    // const makeHitMesh = hitMap => {
    //   // instanced cube mesh
    //   const baseGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    //   const baseMaterial = new THREE.MeshBasicMaterial({
    //     color: 0x0000ff,
    //   });
    //   const instancedMesh = new THREE.InstancedMesh(baseGeometry, baseMaterial, hitMap.hit.length);
    //   instancedMesh.frustumCulled = false;
    //   instancedMesh.name = 'instancedMesh';
    //   instancedMesh.count = 0;

    //   for (let i = 0; i < hitMap.hit.length; i++) {
    //     const hit = hitMap.hit[i];
    //     if (hit) {
    //       const point = new THREE.Vector3().fromArray(hitMap.point, i * 3);
    //       instancedMesh.setMatrixAt(
    //         i,
    //         localMatrix
    //           .makeTranslation(point.x, point.y, point.z)
    //       );
    //     }
    //     instancedMesh.count++;
    //   }
    //   instancedMesh.instanceMatrix.needsUpdate = true;

    //   return instancedMesh;
    // };

    // const hitMap = getHitMap();
    // console.log('got hit map', hitMap);
    // const _listenPortalApp = portalApp => {
    //   const localPlayer = this.playersManager.getLocalPlayer();
    //   let lastPosition = localPlayer.position.clone();
    //   let transitionedLastFrame = false;
    //   const recurse = () => {
    //     frame = requestAnimationFrame(recurse);

    //     const portalPlane = localPlane.setFromNormalAndCoplanarPoint(
    //       localVector.set(0, 0, 1)
    //         .applyQuaternion(portalApp.quaternion),
    //       portalApp.position
    //     );
    //     const lastDistance = portalPlane.distanceToPoint(lastPosition);
    //     const distance = portalPlane.distanceToPoint(localPlayer.position);

    //     if (lastDistance >= 0 && distance < 0) {
    //       // console.log('transition to portal');
    //       // now check whether we passed through the portal bounding square (within 2m of each side)
    //       const projectedPoint = localPlane.projectPoint(localPlayer.position, localVector);
    //       const distanceToCenter = projectedPoint.sub(portalApp.position);
    //       distanceToCenter.x = Math.abs(distanceToCenter.x);
    //       distanceToCenter.y = Math.abs(distanceToCenter.y);
          
    //       // console.log('got distance', distanceToCenter.x, distanceToCenter.y);
    //       if (distanceToCenter.x <= 0.5 && distanceToCenter.y <= 1) {
    //         // move current world into portal
    //         // const rootRealm = this.realmManager.getRootRealm();
    //         // const portalAppManager = portalApp.getAppManager();
    //         // rootRealm.appManager.transplantApp(worldZineApp, portalAppManager);
    //         const oldApps = apps.slice();
    //         // disable old apps
    //         for (let i = 0; i < oldApps.length; i++) {
    //           const oldApp = oldApps[i];
    //           oldApp.setSelected(false);
    //         }

    //         // swap world with portal
    //         const newApps = portalApp.swapApps(oldApps, rootRealm.appManager);
    //         for (let i = 0; i < newApps.length; i++) {
    //           const newApp = newApps[i];
    //           newApp.setSelected(true);
    //         }
    //         apps = newApps;

    //         transitionedLastFrame = true;
    //       }
    //     }

    //     lastPosition.copy(localPlayer.position);
    //     transitionedLastFrame = false;
    //   };
    //   let frame = requestAnimationFrame(recurse);
    // };
    // const _addPortals = async () => {
    //   const numPortals = 1;

    //   const specs = [];
    //   for (let i = 0; i < numPortals; i++) {
    //     const validCoord = Array.from(hitMap.validCoords)[Math.floor(Math.random() * hitMap.validCoords.size)];
    //     const spec = {
    //       validCoord,
    //     };
    //     specs.push(spec);
    //   }

    //   for (let i = 0; i < specs.length; i++) {
    //     const spec = specs[i];
    //     const {
    //       validCoord,
    //     } = spec;
        
    //     let {
    //       position,
    //       quaternion,
    //     } = validCoord;

    //     const rootScene = this.realmManager.getRootRealm();
    //     position = position.clone();
    //     position.y += 1.5;
    //     const portalApp = await rootScene.appManager.addAppAsync({
    //       type: 'application/portal',
    //       position,
    //       quaternion,
    //       content: {
    //         portalContents: [
    //           {
    //             type: 'application/blockadelabsskybox',
    //             content: {
    //               "fileUrl":"/skyboxes/beautiful_vr_anime_illustration_view_red_black_volcanic_plains__f2a9437846594d4c__5662966_f2a94.jpeg_diffuse",
    //               "depthMapUrl":"/skyboxes/beautiful_vr_anime_illustration_view_red_black_volcanic_plains__f2a9437846594d4c__5662966_f2a94.jpeg_depth"
    //             },
    //           },
    //         ],
    //       },
    //     });
    //     _listenPortalApp(portalApp);
    //     console.log('add content portal 2');
    //   }
    // };
    // await _addPortals();

    // const hitMesh = makeHitMesh(hitMap);
    // app.add(hitMesh);
    // hitMesh.updateMatrixWorld();

    // const point = new THREE.Vector3().fromArray(hitMap.point, Math.floor(hitMap.point.length / 3 / 2) * 3);
    // spawnManager.setSpawnPoint(
    //   point,
    //   new THREE.Quaternion(),
    // );
    // await spawnManager.spawn();
  })());

  return app;
};
// export const contentId = ${this.contentId};
// export const name = ${this.name};
// export const description = ${this.description};
// export const type = 'blockadelabsskybox';
// export const components = ${this.components};