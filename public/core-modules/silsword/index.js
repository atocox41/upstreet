import * as THREE from 'three';
// import Simplex from './simplex-noise.js';
// import metaversefile from 'metaversefile';
// const {
//   useApp,
//   useFrame,
//   useScene,
//   useInternals,
//   useLocalPlayer,
//   useActivate,
//   useUse,
//   useWear,
//   usePhysics,
//   getAppByPhysicsId,
//   useCleanup,
//   useSound,
// } = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localVector6 = new THREE.Vector3();
const localVector7 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localQuaternion3 = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localLine = new THREE.Line3();

const _makeSwordTransform = () => {
  return {
    swordPosition: new THREE.Vector3(),
    swordQuaternion: new THREE.Quaternion(),
    shoulderPosition: new THREE.Vector3(),
    shoulderQuaternion: new THREE.Quaternion(),
    copy(t) {
      this.swordPosition.copy(t.swordPosition);
      this.swordQuaternion.copy(t.swordQuaternion);
      this.shoulderPosition.copy(t.shoulderPosition);
      this.shoulderQuaternion.copy(t.shoulderQuaternion);
    }
  };
};
const tempSwordTransform = _makeSwordTransform();
const tempSwordTransform2 = _makeSwordTransform();

const startSwordTransform = _makeSwordTransform();
const lastSwordTransform = _makeSwordTransform();

export default ctx => {
  const {
    useApp,
    useFrame,
    useScene,
    // useInternals,
    // useLocalPlayer,
    // useActivate,
    // useUse,
    // useWear,
    usePhysics,
    useEngine,
    // getAppByPhysicsId,
    useCleanup,
    // useSounds,
    // useRealmManager,
    useImportManager,
  } = ctx;
  const app = useApp();
  const scene = useScene();
  // const {renderer, camera, sceneLowPriority} = useInternals();
  const physics = usePhysics();
  const engine = useEngine();

  // const sounds = useSounds();
  // const soundFiles = sounds.getSoundFiles();
  // const soundIndex = soundFiles.combat.map(sound => sound.name).indexOf('combat/sword_slash0-1.wav');
  // const realmManager = useRealmManager();
  const importManager = useImportManager();

  const {components} = app;

  app.name = 'Silsword'
  app.description = 'A powerful violet crystal sword that transforms its shape.';

  // console.log('silsword initial position', app.position.toArray());

  const swordBackOffset = 0.5;
  const swordLength = 1.4;
  const maxNumDecals = 128;
  const normalScale = 0.05;
  const numSegments = 128;
  const planeGeometry = new THREE.PlaneBufferGeometry(1, 1, 1, 1)
    // .applyMatrix4(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 0, 1), Math.PI*0.5))
    .applyMatrix4(new THREE.Matrix4().makeTranslation(0, -0.5, 0))
    .applyMatrix4(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), -Math.PI*0.5))
    .toNonIndexed();
  
  const decalTexture = new THREE.Texture();
  decalTexture.wrapS = THREE.RepeatWrapping;
  decalTexture.wrapT = THREE.RepeatWrapping;
  const decalMaterial = new THREE.MeshBasicMaterial({
    color: 0xFF0000,
    map: decalTexture,
    side: THREE.DoubleSide,
    // transparent: true,
  });
  // decalMaterial.freeze();

  // test the decal texture
  // const m = new THREE.Mesh(planeGeometry, decalMaterial);
  // scene.add(m);

  /* const boxGeometry = new THREE.BoxBufferGeometry(0.1, 0.1, 0.1);
  const currentTransformMesh = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({color: 0xff0000}));
  scene.add(currentTransformMesh);
  const backTransformMesh = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({color: 0x0000ff}));
  scene.add(backTransformMesh); */

  const _makeDecalMesh = () => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(planeGeometry.attributes.position.array.length * numSegments * maxNumDecals);
    const positionsAttribute = new THREE.BufferAttribute(positions, 3);
    geometry.setAttribute('position', positionsAttribute);
    const normals = new Float32Array(planeGeometry.attributes.normal.array.length * numSegments * maxNumDecals);
    const normalsAttribute = new THREE.BufferAttribute(normals, 3);
    geometry.setAttribute('normal', normalsAttribute);
    const uvs = new Float32Array(planeGeometry.attributes.uv.array.length * numSegments * maxNumDecals);
    const uvsAttribute = new THREE.BufferAttribute(uvs, 2);
    geometry.setAttribute('uv', uvsAttribute);
    // const indices = new Uint16Array(planeGeometry.index.array.length * maxNumDecals);
    // const indicesAttribute = new THREE.BufferAttribute(indices, 1);
    // geometry.setIndex(indicesAttribute);

    const decalMesh = new THREE.Mesh(geometry, decalMaterial);
    decalMesh.name = 'DecalMesh';
    decalMesh.frustumCulled = false;
    decalMesh.offset = 0;
    let lastHitPoint = null;
    const width = 0.2;
    const thickness = 0.05;
    decalMesh.update = (using, matrixWorldSword, matrixWorldShoulder) => {
      const _getCurrentSwordTransform = swordTransform => {
        matrixWorldSword.decompose(localVector, localQuaternion, localVector2);
        localQuaternion.multiply(
          localQuaternion2.setFromAxisAngle(localVector2.set(1, 0, 0), Math.PI*0.5)
        );
        swordTransform.swordPosition.copy(localVector);
        swordTransform.swordQuaternion.copy(localQuaternion);

        matrixWorldShoulder.decompose(swordTransform.shoulderPosition, swordTransform.shoulderQuaternion, localVector2);

        return swordTransform;
      };
      const endSwordTransform = _getCurrentSwordTransform(tempSwordTransform);

      /* // debug meshes
      {
        currentTransformMesh.position.copy(
          endSwordTransform.swordPosition
        ).add(
          new THREE.Vector3(0, 0, -swordLength)
            .applyQuaternion(endSwordTransform.swordQuaternion)
        );
        currentTransformMesh.quaternion.copy(endSwordTransform.swordQuaternion);
        currentTransformMesh.updateMatrixWorld();

        backTransformMesh.position.copy(endSwordTransform.shoulderPosition);
        backTransformMesh.quaternion.copy(endSwordTransform.shoulderQuaternion);
        backTransformMesh.updateMatrixWorld();
      } */

      if (!using) {
        startSwordTransform.copy(endSwordTransform);
        lastSwordTransform.copy(endSwordTransform);
        lastHitPoint = null;
        return;
      }

      const _lerpSwordTransform = (a, b, swordTransform, f) => {
        swordTransform.shoulderPosition.copy(a.shoulderPosition).lerp(b.shoulderPosition, f);
        swordTransform.shoulderQuaternion.copy(a.shoulderQuaternion).slerp(b.shoulderQuaternion, f);
        swordTransform.swordPosition.copy(a.swordPosition).lerp(b.swordPosition, f);
        swordTransform.swordQuaternion.copy(a.swordQuaternion).slerp(b.swordQuaternion, f);
        return swordTransform;
      };
      // XXX this should have destination sword transform as an argument, to prevent allocations
      const _getNextPoint = currentSwordTransform => {
        const line = localLine.set(
          currentSwordTransform.shoulderPosition,
          currentSwordTransform.swordPosition.clone()
            .add(localVector.set(0, 0, -swordLength).applyQuaternion(currentSwordTransform.swordQuaternion))
        );
        const lineQuaternion = localQuaternion.setFromRotationMatrix(
          localMatrix.lookAt(
            line.start,
            line.end,
            localVector.set(0, 1, 0)
          )
        );
        let result = physics.raycast(line.start, lineQuaternion);

        if (result) {
          const hitPoint = localVector.fromArray(result.point);
          if (hitPoint.distanceTo(line.start) <= line.distance()) {
            /* // debug meshes
            // {
              const boxGeometry3 = new THREE.BoxBufferGeometry(0.01, 0.01, 0.01);
              const hitMesh = new THREE.Mesh(boxGeometry3, new THREE.MeshBasicMaterial({color: i === 0 ? 0x00FF00 : 0x808080}));
              hitMesh.position.copy(hitPoint);
              hitMesh.updateMatrixWorld();
              scene.add(hitMesh);
            // } */

            // if consecutive hits are too far apart, treat them as separate hits
            if (lastHitPoint && hitPoint.distanceTo(lastHitPoint.hitPoint) > 0.2) {
              lastHitPoint = null;
            }

            const normal = localVector2.copy(line.start)
              .sub(line.end)
              .normalize();
            const hitNormal = localVector3.fromArray(result.normal);

            const normalScaled = localVector4.copy(normal).multiplyScalar(normalScale);
            const normalBack = localVector5.copy(normal).multiplyScalar(swordBackOffset);
            const hitNormalBack = localVector6.copy(hitNormal).multiplyScalar(swordBackOffset);
    
            const normalUpQuaternion = localQuaternion2.setFromUnitVectors(
              localVector7.set(0, 0, -1),
              normal
            );
            const normalDownQuaternion = localQuaternion3.setFromUnitVectors(
              localVector7.set(0, 0, 1),
              normal
            );
    
            let rotationMatrix;
            let localWidth;
            let initialHit;
            if (lastHitPoint) {
              rotationMatrix = localMatrix.lookAt(
                lastHitPoint.hitPoint,
                hitPoint,
                hitNormal
              );
              localWidth = lastHitPoint.hitPoint.distanceTo(hitPoint);
              initialHit = false;
            } else {
              rotationMatrix = null;
              localWidth = 0;
              initialHit = true;
            }

            return {
              initialHit,
              hitPoint: hitPoint.clone(),
              rotationMatrix: rotationMatrix && rotationMatrix.clone(),
              normal: normal.clone(),
              normalBack: normalBack.clone(),
              normalScaled: normalScaled.clone(),
              hitNormalBack: hitNormalBack.clone(),
              normalUpQuaternion: normalUpQuaternion.clone(),
              normalDownQuaternion: normalDownQuaternion.clone(),
              width: localWidth,
              thickness,
              forwardLeftPoint: new THREE.Vector3(),
              forwardRightPoint: new THREE.Vector3(),
            };
          } else {
            return null;
          }
        } else {
          return null;
        }
      };
      const localDecalGeometries = [];
      let uvOffset = 0;
      const _drawPoints = () => {
        for (let i = 1; i < numSegments; i++) {
          const f = i/(numSegments - 1);

          const currentSwordTransform = _lerpSwordTransform(startSwordTransform, endSwordTransform, tempSwordTransform2, f);
          /* if (using) {
            const hitMesh = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({color: i === 0 ? 0x00FF00 : 0x808080}));
            hitMesh.position.copy(currentSwordTransform.position)
              .add(new THREE.Vector3(0, 0, -swordLength).applyQuaternion(currentSwordTransform.quaternion));
            hitMesh.quaternion.copy(currentSwordTransform.quaternion);
            hitMesh.updateMatrixWorld();
            scene.add(hitMesh);

            const box2Geometry = new THREE.BoxBufferGeometry(0.005, 0.005, 1)
              .applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, -0.5))
              .applyMatrix4(new THREE.Matrix4().makeScale(1, 1, swordBackOffset + swordLength));

            const hitMesh2 = new THREE.Mesh(
              box2Geometry,
              new THREE.MeshBasicMaterial({color: 0x00FF00})
            );
            hitMesh2.position.copy(currentSwordTransform.position)
              .add(new THREE.Vector3(0, 0, swordBackOffset).applyQuaternion(currentSwordTransform.quaternion));
            hitMesh2.quaternion.copy(currentSwordTransform.quaternion);
            hitMesh2.updateMatrixWorld();
            scene.add(hitMesh2);
          } */

          const nextPoint = _getNextPoint(currentSwordTransform);
          if (nextPoint && !nextPoint.initialHit) {
            let {hitPoint, rotationMatrix, normal, normalBack, normalScaled, hitNormalBack, normalDownQuaternion, width, thickness} = nextPoint;

            const localDecalGeometry = planeGeometry.clone();

            localDecalGeometry
              .applyMatrix4(localMatrix.makeScale(thickness, 1, width))
              .applyMatrix4(rotationMatrix)
              .applyMatrix4(new THREE.Matrix4().makeTranslation(
                hitPoint.x,
                hitPoint.y,
                hitPoint.z
              ));
            
            const uvs = localDecalGeometry.attributes.uv.array;
            for (let j = 0; j < localDecalGeometry.attributes.uv.count; j++) {
              const index = j*2;
              const yIndex = index + 1;
              uvs[yIndex] = (uvOffset + uvs[yIndex] * width) * 4; // y
            }
            uvOffset += width;

            // if there was a previous point, copy the last point's forward points to the next point's backward points
            if (lastHitPoint && !lastHitPoint.initialHit) {
              for (let j = 0; j < localDecalGeometry.attributes.position.count; j++) {
                localVector.fromArray(planeGeometry.attributes.position.array, j*3);
                if (localVector.z >= 1) { // if this is a backward point
                  const isLeft = localVector.x < 0;
                  (isLeft ? lastHitPoint.forwardLeftPoint : lastHitPoint.forwardRightPoint)
                    .toArray(localDecalGeometry.attributes.position.array, j*3);
                }
              }
            }

           // make the local decal geometry conform to the object mesh by raycasting from the decal mesh points down the normal
            for (let j = 0; j < localDecalGeometry.attributes.position.count; j++) {
              // localVector.fromArray(planeGeometry.attributes.position.array, j*3);
              if (
                localVector.z < 1 || // if this is a forward point
                lastHitPoint.initialHit // if this is the beginning of a chain
              ) {
                localVector.fromArray(localDecalGeometry.attributes.position.array, j*3);
                localVector2.copy(localVector)
                  .add(normalBack);
                const result = physics.raycast(localVector2, normalDownQuaternion);
                if (result) {
                  localVector3.fromArray(result.point);
                  if (localVector.distanceTo(localVector3) < 0.1) {
                    localVector3
                      .add(normalScaled)
                      .toArray(localDecalGeometry.attributes.position.array, j*3);
                  } else {
                    localVector.add(
                      localVector2.copy(localVector3)
                        .sub(localVector)
                        .normalize()
                        .multiplyScalar(0.1)
                    ).toArray(localDecalGeometry.attributes.position.array, j*3);
                  }
                }
              }
            }

            nextPoint.forwardLeftPoint.fromArray(localDecalGeometry.attributes.position.array, 0*3);
            nextPoint.forwardRightPoint.fromArray(localDecalGeometry.attributes.position.array, 2*3);
            localDecalGeometries.push(localDecalGeometry);
          }

          lastSwordTransform.copy(currentSwordTransform);
          lastHitPoint = nextPoint;
        }
      };
      _drawPoints();
      decalMesh.mergeGeometries(localDecalGeometries);
      startSwordTransform.copy(endSwordTransform);
      lastSwordTransform.copy(endSwordTransform);
    };
    const updateRanges = [];
    decalMesh.mergeGeometries = localDecalGeometies => {
      if (localDecalGeometies.length > 0) {
        const _makeUpdateRange = () => ({
          position: {
            offset: decalMesh.offset*3,
            count: 0,
          },
          uv: {
            offset: decalMesh.offset*2,
            count: 0,
          },
          normal: {
            offset: decalMesh.offset*3,
            count: 0,
          },
        });
        const lastUpdateRange = updateRanges.length > 0 ? updateRanges[updateRanges.length - 1] : null;
        let updateRange = (
          lastUpdateRange &&
            ((lastUpdateRange.position.offset + lastUpdateRange.position.count) < decalMesh.geometry.attributes.position.count*3)
        ) ? lastUpdateRange : null;
        for (const localDecalGeometry of localDecalGeometies) {
          const startOffset = decalMesh.offset;
          
          for (let i = 0; i < localDecalGeometry.attributes.position.count; i++) {
            decalMesh.geometry.attributes.position.setXYZ( i + startOffset, localDecalGeometry.attributes.position.getX(i), localDecalGeometry.attributes.position.getY(i), localDecalGeometry.attributes.position.getZ(i) );
            decalMesh.geometry.attributes.uv.setXY( i + startOffset, localDecalGeometry.attributes.uv.getX(i), localDecalGeometry.attributes.uv.getY(i) );
            decalMesh.geometry.attributes.normal.setXYZ( i + startOffset, localDecalGeometry.attributes.normal.getX(i), localDecalGeometry.attributes.normal.getY(i), localDecalGeometry.attributes.normal.getZ(i) );
            // decalMesh.geometry.index.setX( i + offset, localDecalGeometry.index.getX(i) );
          }

          // flag geometry attributes for update
          if (!updateRange) {
            updateRange = _makeUpdateRange();
            updateRanges.push(updateRange);
          }
          updateRange.position.count += localDecalGeometry.attributes.position.count*3;
          updateRange.uv.count += localDecalGeometry.attributes.uv.count*2;
          updateRange.normal.count += localDecalGeometry.attributes.normal.count*3;

          // update geometry attribute offset
          decalMesh.offset += localDecalGeometry.attributes.position.count;
          if (decalMesh.offset >= decalMesh.geometry.attributes.position.count) {
            decalMesh.offset = decalMesh.offset % decalMesh.geometry.attributes.position.count;
            updateRange = null;
          }
        }
      }
    };
    decalMesh.pushGeometryUpdate = () => {
      const updateRange = updateRanges.shift();
      if (updateRange) {
        decalMesh.geometry.attributes.position.updateRange = updateRange.position;
        decalMesh.geometry.attributes.position.needsUpdate = true;
        decalMesh.geometry.attributes.uv.updateRange = updateRange.uv;
        decalMesh.geometry.attributes.uv.needsUpdate = true;
        decalMesh.geometry.attributes.normal.updateRange = updateRange.normal;
        decalMesh.geometry.attributes.normal.needsUpdate = true;
      }
    };

    return decalMesh;
  };
  // const decalMesh = _makeDecalMesh();
  // scene.add(decalMesh);
  class TrailMesh extends THREE.Mesh {
    constructor(a, b) {
      const numPositions = 256;

      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(6*3*numPositions);
      const positionAttribute = new THREE.BufferAttribute(positions, 3);
      geometry.setAttribute('position', positionAttribute);
      const ts = new Float32Array(positions.length/3);
      const tAttribute = new THREE.BufferAttribute(ts, 1);
      geometry.setAttribute('t', tAttribute);
      geometry.setDrawRange(0, 0);
      
      const trailVsh = `\
        ${THREE.ShaderChunk.common}
        // #define PI 3.1415926535897932384626433832795

        uniform float uTime;
        attribute float t;
        varying float vT;

        /* mat4 rotationMatrix(vec3 axis, float angle)
        {
            axis = normalize(axis);
            float s = sin(angle);
            float c = cos(angle);
            float oc = 1.0 - c;
            
            return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                        oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                        oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                        0.0,                                0.0,                                0.0,                                1.0);
        }

        varying float vDepth; */

        ${THREE.ShaderChunk.logdepthbuf_pars_vertex}

        void main() {
          float f = 1. - pow((uTime - vT)/100., 0.1);
          vec3 p = (f >= -1.) ? position : vec3(0.);
          // vec3 p = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
          vT = t;
          ${THREE.ShaderChunk.logdepthbuf_vertex}
        }
      `;
      const trailFsh = `\
        // #define PI 3.1415926535897932384626433832795
        
        // uniform sampler2D uTex;
        // uniform vec3 uColor;
        uniform float uTime;
        varying float vT;
        
        // vec3 grey = vec3(0.5);
        vec3 grey = vec3(0.7);
        ${THREE.ShaderChunk.logdepthbuf_pars_fragment}

        void main() {
          float f = 1. - pow((uTime - vT)/100., 0.1);
          if (f >= 0.) {
            gl_FragColor = vec4(grey, f);
          } else {
            discard;
          }
          ${THREE.ShaderChunk.logdepthbuf_fragment}
        }
      `;
      const material = new THREE.ShaderMaterial({
        uniforms: {
          /* uColor: {
            type: 'c',
            value: new THREE.Color(0xef5350),
            needsUpdate: true,
          }, */
          uTime: {
            type: 'f',
            value: 0,
            needsUpdate: true,
          },
        },
        vertexShader: trailVsh,
        fragmentShader: trailFsh,
        side: THREE.DoubleSide,
        // depthWrite: false,
        transparent: true,

        clipping: false,
        fog: false,
        lights: false,
      });
      material.freeze();
      
      super(geometry, material);
      this.frustumCulled = false;

      this.a = a;
      this.b = b;
      this.lastAWorld = new THREE.Vector3(NaN, NaN, NaN);
      this.lastBWorld = new THREE.Vector3(NaN, NaN, NaN);
      this.positionIndex = 0;
      this.tIndex = 0;
      this.lastNow = -Infinity;
      this.lastEnabled = false;
      this.lastTriggerStartTime = -Infinity;
    }
    update(enabled, matrixWorld) {
      let now = performance.now();

      if (enabled && !this.lastEnabled) {
        this.lastAWorld.set(NaN, NaN, NaN);
        this.lastBWorld.set(NaN, NaN, NaN);
        this.positionIndex = 0;
        this.tIndex = 0;
        this.lastNow = -Infinity;
        this.lastTriggerStartTime = now;
      }
      now -= this.lastTriggerStartTime;

      if (enabled && !isNaN(this.lastAWorld.x) && !isNaN(this.lastBWorld.x)) {
        const positions = this.geometry.attributes.position.array;
        const ts = this.geometry.attributes.t.array;

        {
          const startIndex = this.positionIndex;

          this.lastAWorld
            .toArray(positions, this.positionIndex);
          this.positionIndex += 3;

          this.lastBWorld
            .toArray(positions, this.positionIndex);
          this.positionIndex += 3;

          localVector.copy(this.b)
            .applyMatrix4(matrixWorld)
            .toArray(positions, this.positionIndex);
          this.positionIndex += 3;

          this.lastAWorld
            .toArray(positions, this.positionIndex);
          this.positionIndex += 3;

          localVector.copy(this.b)
            .applyMatrix4(matrixWorld)
            .toArray(positions, this.positionIndex);
          this.positionIndex += 3;

          localVector.copy(this.a)
            .applyMatrix4(matrixWorld)
            .toArray(positions, this.positionIndex);
          this.positionIndex += 3;

          this.geometry.attributes.position.updateRange = {
            offset: startIndex,
            count: (this.positionIndex - startIndex),
          };
          this.geometry.attributes.position.needsUpdate = true;

          this.positionIndex = this.positionIndex % this.geometry.attributes.position.array.length;
        }
        {
          const startIndex = this.tIndex;

          ts[this.tIndex++] = this.lastNow;
          ts[this.tIndex++] = this.lastNow;
          ts[this.tIndex++] = now;
          ts[this.tIndex++] = this.lastNow;
          ts[this.tIndex++] = now;
          ts[this.tIndex++] = now;

          this.geometry.attributes.t.updateRange = {
            offset: startIndex,
            count: (this.tIndex - startIndex),
          };
          this.geometry.attributes.t.needsUpdate = true;

          this.tIndex = this.tIndex % this.geometry.attributes.t.array.length;
        }
      } 

      this.lastAWorld.copy(this.a)
        .applyMatrix4(matrixWorld);
      this.lastBWorld.copy(this.b)
        .applyMatrix4(matrixWorld);
      this.lastNow = now;
      this.lastEnabled = enabled;

      this.geometry.setDrawRange(0, this.positionIndex/3);

      this.material.uniforms.uTime.value = now;
      this.material.uniforms.uTime.needsUpdate = true;
    }
  }
  let trailMesh = null;
  const useComponent = components.find(component => component.key === 'use');
  const trail = useComponent?.value.trail;
  if (Array.isArray(trail)) {
    const a = new THREE.Vector3().fromArray(trail[0]);
    const b = new THREE.Vector3().fromArray(trail[1]);
    trailMesh = new TrailMesh(a, b);
    scene.add(trailMesh);
  }

  let subApp = null;
  ctx.waitUntil((async () => {
    const _loadModel = async () => {
      let u2 = baseUrl + 'megasword_v4_texta.glb';
      /* if (/^https?:/.test(u2)) {
        u2 = '/@proxy/' + u2;
      } */

      // console.log('initial app position', app.position.toArray(), app.matrixWorld.toArray());
      
      // const rootRealm = realmManager.getRootRealm();
      // subApp = await rootRealm.appManager.addAppAsync({
      // const appManager = engine.getAppManager();

      const subApp = importManager.createApp();
      subApp.name = app.name;
      subApp.description = app.description;
      app.add(subApp);
      subApp.updateMatrixWorld();

      const appContext = engine.engineAppContextFactory.makeAppContext({
        app: subApp,
      });

      await importManager.createAppAsync({
        // parent: app,
        app: subApp,
        appContext,
        start_url: u2,
        // instanceId: app.instanceId,
        name: 'silsword mesh',
        // components,
        components: [
          {
            key: 'animation',
            value: 'Active',
          },
        ],
      });

      // subApp.name = 'silsword mesh';
      /* subApp.position.copy(app.position);
      subApp.quaternion.copy(app.quaternion);
      subApp.scale.copy(app.scale); */
      // app.add(subApp);
      // subApp.updateMatrixWorld();
      // subApp.contentId = u2;
      // subApp.instanceId = app.instanceId;

      // for (const {key, value} of components) {
      //   subApp.setComponent(key, value);
      // }
      // await subApp.addModule(m);
    };
    const _loadDecal = async () => {
      const src = baseUrl + 'chevron2.png';
      const res = await fetch(src);
      const blob = await res.blob();
      const imageBitmap = await createImageBitmap(blob);
      decalTexture.image = imageBitmap;
      decalTexture.needsUpdate = true;
    };
    await Promise.all([
      _loadModel(),
      _loadDecal(),
    ]);
  })());

  /* useActivate(() => {
    const localPlayer = useLocalPlayer();
    localPlayer.wear(app);
  }); */

  let wearing = false;
  app.addEventListener('wearupdate', e => {
    const {wear} = e;
    if (subApp) {
      /* if (!wear) {
        subApp.position.copy(app.position);
        subApp.quaternion.copy(app.quaternion);
        subApp.scale.copy(app.scale);
        subApp.updateMatrixWorld();
      } */

      /* subApp.dispatchEvent({
        type: 'wearupdate',
        wear,
      }); */
    }
    wearing = !!wear;
  });

  let using = false;
  app.addEventListener('use', e => {
    using = e.use;
  });

  useFrame(() => {
    // const localPlayer = useLocalPlayer();
    if (trailMesh && subApp) {
      trailMesh.update(using, subApp.matrixWorld);
    }
    // if (decalMesh) {
    //   //const localPlayer = useLocalPlayer();
    //   if (subApp && localPlayer.avatar) {
    //     decalMesh.update(using, subApp.matrixWorld, localPlayer.avatar.modelBones.Right_arm.matrixWorld);
    //   }

    //   decalMesh.pushGeometryUpdate();
    // }
  });

  useCleanup(() => {
    trailMesh && trailMesh.parent.remove(trailMesh);
    // decalMesh && scene.remove(decalMesh);
    subApp && subApp.destroy();
  });

  // app.getPhysicsObjects = () => subApp ? subApp.getPhysicsObjects() : [];

  return app;
};
