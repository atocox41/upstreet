import * as THREE from 'three';
import {
  Frame360Mesh,
} from '../meshes/Frame360Mesh.js';

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();

//

export default srcUrl => ctx => {
  const {
    useApp,
    usePhysics,
    usePhysicsTracker,
    useEngineRenderer,
    useLoreManager,
    useCleanup,
  } = ctx;

  const app = useApp();
  const physics = usePhysics();
  const physicsTracker = usePhysicsTracker();
  const engineRenderer = useEngineRenderer();
  const loreManager = useLoreManager();

  app.appType = 'item360';

  ctx.waitUntil((async () => {
    const res = await fetch(srcUrl);
    const json = await res.json();

    const {
      id,
      itemImageUrl,
      item360ImageUrl,
      scale = 1,
    } = json;

    // app.name = srcUrl.match(/([^\/]*)$/)[1];
    // app.description = '';
    app.name = json.name;
    app.description = json.description;

    // let live = true;
    const mesh = new Frame360Mesh();
    mesh.position.y = scale * 0.5;
    mesh.scale.setScalar(scale);
    mesh.frustrumCulled = false;
    // (async () => {
      await mesh.load({
        frame360ImageUrl: item360ImageUrl,
      });
      // if (!live) return;

      app.add(mesh);
      mesh.updateMatrixWorld();

      // physics
      let physicsObject = null;
      {
        const height = 0.5;
        const width = 0.5;

        const capsuleRadius = width / 2;
        const capsuleHalfHeight = height / 2;

        const halfAvatarCapsuleHeight = (height + width) / 2; // (full world height of the capsule) / 2

        localMatrix.compose(
          localVector.set(0, halfAvatarCapsuleHeight, 0), // start position
          localQuaternion.setFromAxisAngle(localVector2.set(0, 0, 1), Math.PI / 2), // rotate 90 degrees 
          localVector2.set(capsuleRadius, halfAvatarCapsuleHeight, capsuleRadius)
        )
          .premultiply(app.matrixWorld)
          .decompose(localVector, localQuaternion, localVector2);

        physicsObject = physics.addCapsuleGeometry(
          localVector,
          localQuaternion,
          capsuleRadius,
          capsuleHalfHeight,
          false
        );
        physicsTracker.addAppPhysicsObject(app, physicsObject);
        // engineRenderer.scene.add(physicsObject);
        physicsObject.updateMatrixWorld();

        physicsObject.name = app.name;
        physicsObject.description = app.description;
      }

      // lore
      const k = app.instanceId + ':' + (physicsObject.physicsId + '').padStart(5, '0')
;
      loreManager.addItemSpec(k, {
        name: json.name,
        description: json.description,
      });
      useCleanup(() => {
        loreManager.removeItemSpec(k);
      });

      useCleanup(() => {
        // live = false;
        // physicsObject.parent.remove(physicsObject);

        physics.removeGeometry(physicsObject);
        physicsTracker.removeAppPhysicsObject(app, physicsObject);
      });
    // })();
  })());

  return app;
};