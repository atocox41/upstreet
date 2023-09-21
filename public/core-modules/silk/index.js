import * as THREE from 'three';
import Simplex from './simplex-noise.js';
// import metaversefile from 'metaversefile';

const localVector = new THREE.Vector3();
const simplex = new Simplex('lol');
const material = new THREE.MeshNormalMaterial();
const defaultScale = new THREE.Vector3(1, 0.3, 1).multiplyScalar(0.5);

export default (ctx) => {
  const {
    useApp,
    useFrame,
    usePhysics,
    useLoreManager,
    useCleanup,
  } = ctx;

  const app = useApp();
  app.name = 'silk';

  const physics = usePhysics();
  const loreManager = useLoreManager();

  const geometry = new THREE.BoxBufferGeometry(0.1, 0.05, 0.1, 10, 10, 10);
  const silkMesh = new THREE.Mesh(geometry, material);
  silkMesh.scale.copy(defaultScale);

  // const startTime = Date.now();
  // let lastTimestamp = startTime;
  // let animation = null;
  const timeOffset = Math.random() * 10;
  const shapeObject = () => {
    /* const now = Date.now();
    const timeDiff = (now - lastTimestamp) / 1000;
    lastTimestamp = now; */

    const time = timeOffset + performance.now() * 0.002;
    const k = 1;
    for (var i = 0; i < silkMesh.geometry.attributes.position.array.length; i += 3) {
      const p = localVector.fromArray(silkMesh.geometry.attributes.position.array, i);
      const f = 0.5 + 0.2 * simplex.noise3D(p.x * k + time, p.y * k, p.z * k);
      p.normalize().multiplyScalar(f);
      p.toArray(silkMesh.geometry.attributes.position.array, i);
    }
    silkMesh.geometry.attributes.position.needsUpdate = true;
    silkMesh.geometry.computeVertexNormals();
    silkMesh.geometry.normalsNeedUpdate = true;
    silkMesh.geometry.verticesNeedUpdate = true;
  };
  useFrame(() => {
    shapeObject();
  });
  shapeObject();
  app.add(silkMesh);
  const physicsId = physics.addGeometry(silkMesh);
  // app.addPhysicsObject(physicsId);
  useCleanup(() => {
    physics.removeGeometry(physicsId);
  });

  const k = app.instanceId + ':' + (physicsId.physicsId + '').padStart(5, '0');
  loreManager.addItemSpec(k, {
    name: physicsId.name,
    description: physicsId.description,
  }, physicsId);
  useCleanup(() => {
    loreManager.removeItemSpec(k);
  });

  return app;
};