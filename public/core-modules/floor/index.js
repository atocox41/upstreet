import * as THREE from 'three';
// import metaversefile from 'metaversefile';
// const {useApp, useScene, useParticleSystem, useProcGen, useLocalPlayer, useFrame} = metaversefile;

//

// const localVector = new THREE.Vector3();

//

export default (ctx) => {
  const {
    useApp,
    useThreeUtils,
    usePhysics,
    usePhysicsTracker,
    useCleanup,
  } = ctx;
  
  const app = useApp();
  const physicsScene = usePhysics();
  const physicsTracker = usePhysicsTracker();
  const {BufferGeometryUtils} = useThreeUtils();

  app.name = 'floor';
  app.description = 'Basic floor physics';

  app.setComponent('interactive', false);

  // mesh

  // plane mesh
  const planeGeometry = new THREE.PlaneGeometry(0.9, 0.9)
    .rotateX(-Math.PI/2)
  const geometries = [];
  const range = 1000;
  for (let dz = -range/2; dz <= range/2; dz++) {
    for (let dx = -range/2; dx <= range/2; dx++) {
      const geometry = planeGeometry.clone()
        .applyMatrix4(new THREE.Matrix4().makeTranslation(dx, 0, dz));
      geometries.push(geometry);
    }
  }
  const geometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
  const material = new THREE.MeshBasicMaterial({
    color: 0xCCCCCC,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.01;
  app.add(mesh);
  mesh.updateMatrixWorld();

  // physics

  const physicsObject = physicsScene.addPlaneGeometry(
    new THREE.Vector3(0, 0, 0),
    new THREE.Quaternion(0, 0, 0.7071067811865475, 0.7071067811865476),
    // new THREE.Quaternion(0, 0, 0, 1),
    false
  );
  physicsTracker.addAppPhysicsObject(app, physicsObject);

  useCleanup(() => {
    physicsScene.removeGeometry(physicsObject);
    physicsTracker.removeAppPhysicsObject(app, physicsObject);
  });

  return app;
};