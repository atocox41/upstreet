import * as THREE from 'three';
// import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
// import easing from './easing.js';
// import metaversefile from 'metaversefile';
// import {getCaretAtPoint} from 'troika-three-text';

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

// const localVector = new THREE.Vector3();
// const localVector2 = new THREE.Vector3();
// const localQuaternion = new THREE.Quaternion();
// const localEuler = new THREE.Euler();
// const localEuler2 = new THREE.Euler();
// const localMatrix = new THREE.Matrix4();

// const forward = new THREE.Vector3(0, 0, -1);
// const y180Quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
// const hitSpeed = 6;

export default ctx => {
  const {
    useApp,
    useFrame,
    usePhysics,
    // useScene,
    useEngine,
    useCleanup,
    useImportManager,
  } = ctx;

  //

  const app = useApp();
  const engine = useEngine();
  const physics = usePhysics();
  const importManager = useImportManager();

  let lisk = null;
  let mixer = null;
  let actions = {};
  // const speed = 0.03;
  // const angularSpeed = 0.02;
  (async () => {
    // const appContext = engine.engineAppContextFactory.makeAppContext({
    //   app,
    // });
    
    lisk = await importManager.createAppAsync({
      start_url: `${baseUrl}lisk_export.glb`,
      // appContext,
      components: [
        {
          key: 'physics',
          value: false,
        },
      ],
    });
    lisk.frustumCulled = false;
    app.add(lisk);
    lisk.updateMatrixWorld();
    // console.log('got lisk', lisk);
    
    mixer = new THREE.AnimationMixer(lisk);
    for (const clip of lisk.glb.animations) {
      const action = mixer.clipAction(clip);
      actions[clip.name] = action;
    }
    // console.log('got actions', actions);

    actions.flying.play();
  })();

  // this function returns a float representing the player look direction of the given vector, as a rotation around the y axis.
  // the value 0 means forward, left is negative, and right is positive.

  // this function moves the y-axis angle of the quaternion towards the given direction, by the given amount of radians.
  // the rotation should not overshoot the direction; if it does, it will be clamped to the direction.

  let animationSpec = null;
  const _idle = timestamp => {
    animationSpec = {
      name: 'idle',
      startTime: timestamp,
      duration: 1000 + Math.random() * 3 * 1000,
    };
  };
  const _walk = timestamp => {
    animationSpec = {
      name: 'walk',
      startTime: timestamp,
      duration: 3000 + Math.random() * 3 * 1000,
    };
  };
  const _takeOff = timestamp => {
    animationSpec = {
      name: 'take_off',
      startTime: timestamp,
      duration: 3000 + Math.random() * 3 * 1000,
    };
  };
  const _land = timestamp => {
    animationSpec = {
      name: 'land',
      startTime: timestamp,
      duration: 3000 + Math.random() * 3 * 1000,
    };
  };
  const _glide = timestamp => {
    animationSpec = {
      name: 'glide',
      startTime: timestamp,
      duration: 3000 + Math.random() * 3 * 1000,
    };
  };

  /* const nextIdleFns = [
    // _idle,
    _walk,
    _takeOff,
  ];
  const _idleNext = timestamp => {
    const r = Math.random();
    const nextIdleIndex = Math.floor(r * nextIdleFns.length);
    const nextIdle = nextIdleFns[nextIdleIndex];
    nextIdle(timestamp);
  };
  const nextWalkFns = [
    _takeOff,
  ];
  const _walkNext = timestamp => {
    const r = Math.random();
    const nextWalkIndex = Math.floor(r * nextWalkFns.length);
    const nextWalk = nextWalkFns[nextWalkIndex];
    nextWalk(timestamp);
  };
  const _updateAnimationSpec = timestamp => {
    if (animationSpec) {
      const f = animationSpec ? ((animationSpec.startTime - timestamp) / animationSpec.duration) : 1;
      if (f < 1) { // continuation of animation
        // nothing
      } else {
        // animationSpec = null;

        {
          const action = actions[animationSpec.name];
          if (!action.paused) {
            action.stop();
          }
        }

        switch (animationSpec.type) {
          case 'idle': {
            _idleNext(timestamp);
            break;
          }
          case 'walk': {
            _walkNext(timestamp);
            break;
          }
          default: {
            _walkNext(timestamp);
            // console.log('unknown animation type', animationSpec.type);
            break;
          }
        }

        {
          const action = actions[animationSpec.name];
          action.play();
        }
      }
    } else {
      _idle(timestamp);
    }
  }; */
  const _updateAnimation = (timestamp, timeDiff) => {
    // const timeDiff = animationSpec;
    // const action = actions[animationSpec.name];
    const timeDiffS = timeDiff / 1000;
    mixer.update(timeDiffS);
    // console.log('get action', action);
  };
  /* const hitAction = (hitDirection, hitVelocity) => {
  }; */

  useFrame((timestamp, timeDiff) => {
    // console.log('start 1');
    if (lisk) {
      const height = 50;
      const radius = 100;
      const fullLoopDuration = 60000;

      // rotate arpound in a circle
      {
        const f = ((timestamp % fullLoopDuration) / fullLoopDuration);
        const angle = f * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        lisk.position.set(x, height, z);
        lisk.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
      }

      _updateAnimation(timestamp, timeDiff);
      lisk.updateMatrixWorld();
    }

    // console.log('start 2');

    /* for (const physicsObject of physicsIds) {
      physicsObject.position.copy(app.position);
      physicsObject.quaternion.copy(app.quaternion);
      physicsObject.updateMatrixWorld();
      physics.setTransform(physicsObject);
    } */
    // console.log('start 3');
  });

  /* app.addEventListener('hit', e => {
    console.log('lisk hit', e);
  });

  const physicsIds = [];

  window.liskApp = app;
  window.liskPhysicsIds = physicsIds;

  const physicsMaterial = [0.5, 0.5, 1];
  const materialAddress = physics.createMaterial(physicsMaterial);
  const physicsObject = physics.addCapsuleGeometry(app.position, app.quaternion, 3, 0, materialAddress);
  physicsObject.detached = true;
  physicsIds.push(physicsObject);
  
  // app.getPhysicsObjects = () => lisk ? lisk.getPhysicsObjects() : [];

  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
    physics.destroyMaterial(materialAddress);
  }); */

  return app;
};