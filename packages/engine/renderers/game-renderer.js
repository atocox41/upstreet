import * as THREE from 'three';
import {
  generateSkybox,
  loadSkyboxImageSpecs,
} from '../clients/blockade-labs-client.js';
import physicsManager from '../physics/physics-manager.js';
// import {
//   aiProxyHost,
// } from '../endpoints.js';

//

const localVector = new THREE.Vector3();
const localVector2D = new THREE.Vector2();
const localMatrix = new THREE.Matrix4();

const downQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2);

//

function bilinearSample(depthData, uv, width, height) {
  let x = uv.x * width;
  let y = uv.y * height;
  
  let x1 = Math.floor(x);
  let y1 = Math.floor(y);

  let x2 = x1 + 1;
  let y2 = y1 + 1;
  
  // Ensure that the sample points are within the data bounds
  x1 = Math.max(0, Math.min(x1, width - 1));
  y1 = Math.max(0, Math.min(y1, height - 1));
  x2 = Math.max(0, Math.min(x2, width - 1));
  y2 = Math.max(0, Math.min(y2, height - 1));
  
  // Get the four sample points
  let q11 = depthData[y1 * width + x1];
  let q21 = depthData[y1 * width + x2];
  let q12 = depthData[y2 * width + x1];
  let q22 = depthData[y2 * width + x2];

  let r1;
  if (x2 === x1) {
    r1 = q11;
  } else {
    r1 = ((x2 - x) / (x2 - x1)) * q11 + ((x - x1) / (x2 - x1)) * q21;
  }

  let r2;
  if (x2 === x1) {
    r2 = q12;
  } else {
    r2 = ((x2 - x) / (x2 - x1)) * q12 + ((x - x1) / (x2 - x1)) * q22;
  }
  if (y2 === y1) {
    return r1;
  } else {
    return ((y2 - y) / (y2 - y1)) * r1 + ((y - y1) / (y2 - y1)) * r2;
  }
}
function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

export class GameRenderer {
  constructor({
    engine,
    worldIdentity,
  }) {
    // this.abortController = new AbortController();

    (async () => {
      // await this.engine.waitForLoad();
      // if (this.abortController.signal.aborted) return;
      // await this.engine.setState({
      //   src: '',
      // });
      // if (this.abortController.signal.aborted) return;
      // this.engine.start();
      // this.engine.floorManager.disableFloor();

      // this.abortController.signal.addEventListener('abort', () => {
      //   this.engine.stop();
      // });

      // load the skybox
      const {
        file_url,
        depth_map_url,
      } = await loadSkyboxImageSpecs(worldIdentity.spec);

      const imgBlob = await (async () => {
        const res = await fetch(file_url);
        const blob = await res.blob();
        return blob;
      })();
      const img = await new Promise((accept, reject) => {
        const img = new Image();
        img.onload = () => {
          cleanup();
          accept(img);
        };
        img.onerror = err => {
          cleanup();
          reject(err);
        };
        const u = URL.createObjectURL(imgBlob);
        const cleanup = () => {
          URL.revokeObjectURL(u);
        };
        img.crossOrigin = 'Anonymous';
        img.src = u;
      });
      const imgTexture = new THREE.Texture(img);
      imgTexture.needsUpdate = true;

      /* const {
        width,
        height,
        arrayBuffer,
      } = await (async () => {
        const depthWidth = 1024;
        const img2 = resizeImage(img, depthWidth);
        const img2Blob = await new Promise((accept, reject) => {
          img2.toBlob(accept, 'image/jpeg');
        });

        console.log('worldzine fetch depth 1', img2Blob.size, imgUrl);
        const res2 = await fetch(`https://${aiProxyHost}/zoeDepth`, {
          method: 'POST',
          body: img2Blob,
        });
        console.log('worldzine fetch depth 2', imgUrl);
        const width = parseInt(res2.headers.get('X-Width'), 10);
        const height = parseInt(res2.headers.get('X-Height'), 10);
        const arrayBuffer = await res2.arrayBuffer();
        console.log('worldzine fetch depth 3', arrayBuffer.byteLength, width, height, imgUrl);

        return {
          width,
          height,
          arrayBuffer,
        };
      })(); */

      // read depth_map_url
      const {
        width,
        height,
        arrayBuffer,
      } = await (async () => {
        const res = await fetch(depth_map_url);
        const blob = await res.blob();
        const imageBitmap = await createImageBitmap(blob);
        const {width, height} = imageBitmap;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imageBitmap, 0, 0);

        // read the depth from grey scale
        const imageData = ctx.getImageData(0, 0, width, height);
        const {data} = imageData;
        const arrayBuffer = new ArrayBuffer(width * height * Float32Array.BYTES_PER_ELEMENT);
        const float32Array = new Float32Array(arrayBuffer);
        const depthFactor = 10;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i + 0];
          // const g = data[i + 1];
          // const b = data[i + 2];
          // const a = data[i + 3];
          let rawDepth = r / 255;
          const j = i / 4;
          float32Array[j] = rawDepth * depthFactor;
        }

        return {
          width,
          height,
          arrayBuffer,
        };
      })();
      let float32Array = new Float32Array(arrayBuffer);
      
      const sphereGeometry = new THREE.SphereBufferGeometry(1, 64, 32);
      const positions = sphereGeometry.attributes.position.array;
      const uvs = sphereGeometry.attributes.uv.array;
      const indices = sphereGeometry.index.array;

      // for all points have the same position, make sure they have the same uv
      {
        const positionToOriginalIndexMap = new Map();
        for (let i = 0; i < positions.length / 3; i++) {
          let x = positions[i * 3 + 0];
          let y = positions[i * 3 + 1];
          let z = positions[i * 3 + 2];

          // quantize
          const quantum = 0.01;
          if (Math.abs(y) > (1 - quantum)) {
            if (Math.abs(x) < quantum) x = 0;
            if (Math.abs(z) < quantum) z = 0;
            // y = Math.round(y / quantum) * quantum;
          }

          const key = `${x},${y},${z}`;
          if (positionToOriginalIndexMap.has(key)) {
            const oldIndex = positionToOriginalIndexMap.get(key);
            localVector2D.fromArray(uvs, oldIndex * 2)
              .toArray(uvs, i * 2);
            // debugger;
            // throw new Error('duplicate position');
          } else {
            positionToOriginalIndexMap.set(key, i);
          }
        }
      }

      const min = 0.1;
      const scale = 10;
      const max = 10;

      // support negative values
      function mod(x, y) {
        return x - y * Math.floor(x / y);
      }

      // in JS
      for (let i = 0; i < positions.length / 3; i++) {
        const uv = localVector2D.fromArray(uvs, i * 2);
        uv.x = mod(uv.x, 1)
        uv.y = clamp(1 - uv.y, 0, 1);
        let depth = bilinearSample(float32Array, uv, width, height);
        depth = scale / depth;
        depth = clamp(depth, min * scale, max * scale);
        localVector.fromArray(positions, i * 3)
          .multiplyScalar(depth)
          .toArray(positions, i * 3);
      }
      // reverse triangles
      for (let i = 0; i < indices.length / 3; i++) {
        const a = indices[i * 3 + 0];
        const b = indices[i * 3 + 1];
        const c = indices[i * 3 + 2];
        indices[i * 3 + 0] = c;
        indices[i * 3 + 1] = b;
        indices[i * 3 + 2] = a;
      }
      const sphereMaterial = new THREE.MeshBasicMaterial({
        // color: 0xFFFFFF,
        map: imgTexture,
        // side: THREE.BackSide,
      });
      const octahedronMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
      // this.scene.add(octahedronMesh);
      // octahedronMesh.updateMatrixWorld();
      engine.engineRenderer.scene.add(octahedronMesh);
      octahedronMesh.updateMatrixWorld();

      // scene physics
      {
        const scenePhysicsMesh = new THREE.Mesh(octahedronMesh.geometry, octahedronMesh.material);

        const physics = physicsManager.getScene();
        const scenePhysicsObject = physics.addGeometry(scenePhysicsMesh);
        scenePhysicsObject.update = () => {
          scenePhysicsMesh.matrixWorld.decompose(
            scenePhysicsObject.position,
            scenePhysicsObject.quaternion,
            scenePhysicsObject.scale
          );
          physics.setTransform(scenePhysicsObject, false);
        };
        // engine.physicsTracker.addAppPhysicsObject(app, scenePhysicsObject);
        
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

      const raycastResolution = 128;
      const boundingBox = new THREE.Box3()
        .setFromObject(octahedronMesh);
      const size = boundingBox.getSize(new THREE.Vector3());
      const getHitMap = () => {
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
        const physicsScene = physicsManager.getScene();
        const hitMap = physicsScene.raycastArray(ps, qs, ps.length);
        
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
              const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * 2 * Math.random());
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

      const hitMap = getHitMap();
      const hitMesh = makeHitMesh(hitMap);
      engine.engineRenderer.scene.add(hitMesh);


      const point = new THREE.Vector3().fromArray(hitMap.point, Math.floor(hitMap.point.length / 3 / 2) * 3);
      engine.spawnManager.setSpawnPoint(
        point,
        new THREE.Quaternion(),
      );
      await engine.spawnManager.spawn();
    })();
  }
  // destroy() {
  //   this.abortController.abort(abortError);
  // }
}