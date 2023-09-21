import * as THREE from 'three';
// import {
//   getRenderer,
// } from './renderer.js';
// import metaversefile from 'metaversefile';

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();

const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localQuaternion3 = new THREE.Quaternion();

const localMatrix = new THREE.Matrix4();

const localArray = [];
const localArray2 = [];
const localArray3 = [];
const localArray4 = [];

const sessionMode = 'immersive-vr';
const sessionOpts = {
  requiredFeatures: [
    'local-floor',
    // 'bounded-floor',
  ],
  optionalFeatures: [
    //'hand-tracking',
  ],
};

export class XRManager extends EventTarget {
  constructor({
    engineRenderer,
    cameraManager,
    // ioBus,
  }) {
    super();

    if (!engineRenderer || !cameraManager /*|| !ioBus*/) {
      console.warn('xr manager missing args', {
        engineRenderer,
        cameraManager,
        // ioBus,
      });
      debugger;
    }

    this.engineRenderer = engineRenderer;
    this.cameraManager = cameraManager;
    // this.ioBus = ioBus;

    // globalThis.enterXr = this.enterXr.bind(this);

    // this.#listen();
  }
  // #listen() {
  //   // handle events from the iframe
  //   this.ioBus.registerHandler('requestXrSession', async e => {
  //     console.log('got requestXrSession', e);
      
  //     await this.enterXr();
  //   });
  // }
  /* async isXrSupported() {
    if (navigator.xr) {
      let ok = false;
      try {
        ok = await navigator.xr.isSessionSupported(sessionMode);
      } catch (err) {
        console.warn(err);
      }
      return ok;
    } else {
      return false;
    }
  } */
  // update(timestamp, timeDiff) {
  //   const {renderer} = this.engineRenderer;
  //   const session = renderer.xr.getSession();
  //   if (session) {
  //     this.cameraManager.decapitateLocalPlayer();
  //   }
  // }
  static getXrAvatarPose(session, referenceSpace, frame) {
    // const referenceSpace = renderer.xr.getReferenceSpace();

    let leftGamepadPosition, leftGamepadQuaternion, leftGamepadPointer, leftGamepadGrip, leftGamepadEnabled;
    let rightGamepadPosition, rightGamepadQuaternion, rightGamepadPointer, rightGamepadGrip, rightGamepadEnabled;

    // const {renderer} = this.engineRenderer;
    // const session = renderer.xr.getSession();
    // if (session) {
      let inputSources = Array.from(session.inputSources);
      inputSources = ['right', 'left']
        .map(handedness => inputSources.find(inputSource => inputSource.handedness === handedness));
      
      let pose;
      if (inputSources[0] && (pose = frame.getPose(inputSources[0].gripSpace, referenceSpace))) {
        localMatrix.fromArray(pose.transform.matrix)
          .decompose(localVector2, localQuaternion2, localVector3);
        if (inputSources[0].profiles.includes('oculus-touch-v2')) {
          localQuaternion2.multiply(localQuaternion3.setFromAxisAngle(localVector3.set(1, 0, 0), -Math.PI*0.5));
        } else if (!inputSources[0].profiles.includes('oculus-hand')) {
          localQuaternion2.multiply(localQuaternion3.setFromAxisAngle(localVector3.set(1, 0, 0), -Math.PI));
        } else {
          localQuaternion2.multiply(localQuaternion3.setFromAxisAngle(localVector3.set(0, 0, 1), Math.PI*0.5)).multiply(localQuaternion3.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI*0.2));
        }
        leftGamepadPosition = localVector2.toArray(localArray);
        leftGamepadQuaternion = localQuaternion2.toArray(localArray2);

        const {gamepad} = inputSources[0];
        if (gamepad && gamepad.buttons.length >= 2) {
          const {buttons} = gamepad;
          leftGamepadPointer = buttons[0].value;
          leftGamepadGrip = buttons[1].value;
        } else {
          leftGamepadPointer = 0;
          leftGamepadGrip = 0;
        }
        leftGamepadEnabled = true;
      } else {
        leftGamepadEnabled = false;
      }

      if (inputSources[1] && (pose = frame.getPose(inputSources[1].gripSpace, referenceSpace))) {
        localMatrix.fromArray(pose.transform.matrix)
          .decompose(localVector2, localQuaternion2, localVector3);
        if (inputSources[1].profiles.includes('oculus-touch-v2')) {
          localQuaternion2.multiply(localQuaternion3.setFromAxisAngle(localVector3.set(1, 0, 0), -Math.PI*0.5));
        } else if (!inputSources[1].profiles.includes('oculus-hand')) {
          localQuaternion2.multiply(localQuaternion3.setFromAxisAngle(localVector3.set(1, 0, 0), -Math.PI));
        } else {
          localQuaternion2.multiply(localQuaternion3.setFromAxisAngle(localVector3.set(0, 0, 1), -Math.PI*0.5)).multiply(localQuaternion3.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI*0.2));
        }
        rightGamepadPosition = localVector2.toArray(localArray3);
        rightGamepadQuaternion = localQuaternion2.toArray(localArray4);

        const {gamepad} = inputSources[1];
        if (gamepad && gamepad.buttons.length >= 2) {
          const {buttons} = gamepad;
          rightGamepadPointer = buttons[0].value;
          rightGamepadGrip = buttons[1].value;
        } else {
          rightGamepadPointer = 0;
          rightGamepadGrip = 0;
        }
        rightGamepadEnabled = true;
      } else {
        rightGamepadEnabled = false;
      }

      // const handOffsetScale = localPlayer.avatar ? localPlayer.avatar.height / 1.5 : 1;
      const handOffsetScale = 1;
      const leftHandOffset = new THREE.Vector3(0.2, -0.2, -0.4);
      const rightHandOffset = new THREE.Vector3(-0.2, -0.2, -0.4);
      if (!leftGamepadPosition) {
        leftGamepadPosition = localVector2.copy(localVector)
          .add(localVector3.copy(leftHandOffset).multiplyScalar(handOffsetScale).applyQuaternion(localQuaternion))
          .toArray();
        leftGamepadQuaternion = localQuaternion.toArray();
        leftGamepadPointer = 0;
        leftGamepadGrip = 0;
        leftGamepadEnabled = false;
      }
      if (!rightGamepadPosition) {
        rightGamepadPosition = localVector2.copy(localVector)
          .add(localVector3.copy(rightHandOffset).multiplyScalar(handOffsetScale).applyQuaternion(localQuaternion))
          .toArray();
        rightGamepadQuaternion = localQuaternion.toArray();
        rightGamepadPointer = 0;
        rightGamepadGrip = 0;
        rightGamepadEnabled = false;
      }

      pose = frame.getViewerPose(referenceSpace);
      localMatrix.fromArray(pose.transform.matrix)
        .decompose(localVector2, localQuaternion2, localVector3);
      let playerPosition = localVector2.toArray();
      let playerRotation = localQuaternion2.toArray();

      return [
        [playerPosition, playerRotation],
        [leftGamepadPosition, leftGamepadQuaternion, leftGamepadPointer, leftGamepadGrip, leftGamepadEnabled],
        [rightGamepadPosition, rightGamepadQuaternion, rightGamepadPointer, rightGamepadGrip, rightGamepadEnabled],
      ];
    // }
  }
  #injectRigInput(frame) {
    debugger;

    console.log('inject rig 1');
    let leftGamepadPosition, leftGamepadQuaternion, leftGamepadPointer, leftGamepadGrip, leftGamepadEnabled;
    let rightGamepadPosition, rightGamepadQuaternion, rightGamepadPointer, rightGamepadGrip, rightGamepadEnabled;

    const localPlayer = this.playersManager.getLocalPlayer();
    const {renderer} = this.engineRenderer;
    const session = renderer.xr.getSession();
    console.log('inject rig 2', !!session);
    if (session && localPlayer.avatar) {
      let inputSources = Array.from(session.inputSources);
      inputSources = ['right', 'left']
        .map(handedness => inputSources.find(inputSource => inputSource.handedness === handedness));
      
      console.log('inject rig 3', inputSources.length);

      let pose;
      if (inputSources[0] && (pose = frame.getPose(inputSources[0].gripSpace, renderer.xr.getReferenceSpace()))) {
        localMatrix.fromArray(pose.transform.matrix)
          .decompose(localVector2, localQuaternion2, localVector3);
        if (inputSources[0].profiles.includes('oculus-touch-v2')) {
          localQuaternion2.multiply(localQuaternion3.setFromAxisAngle(localVector3.set(1, 0, 0), -Math.PI*0.5));
        } else if (!inputSources[0].profiles.includes('oculus-hand')) {
          localQuaternion2.multiply(localQuaternion3.setFromAxisAngle(localVector3.set(1, 0, 0), -Math.PI));
        } else {
          localQuaternion2.multiply(localQuaternion3.setFromAxisAngle(localVector3.set(0, 0, 1), Math.PI*0.5)).multiply(localQuaternion3.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI*0.2));
        }
        leftGamepadPosition = localVector2.toArray(localArray);
        leftGamepadQuaternion = localQuaternion2.toArray(localArray2);

        const {gamepad} = inputSources[0];
        if (gamepad && gamepad.buttons.length >= 2) {
          const {buttons} = gamepad;
          leftGamepadPointer = buttons[0].value;
          leftGamepadGrip = buttons[1].value;
        } else {
          leftGamepadPointer = 0;
          leftGamepadGrip = 0;
        }
        leftGamepadEnabled = true;
      } else {
        leftGamepadEnabled = false;
      }

      console.log('inject rig 4');

      if (inputSources[1] && (pose = frame.getPose(inputSources[1].gripSpace, renderer.xr.getReferenceSpace()))) {
        localMatrix.fromArray(pose.transform.matrix)
          .decompose(localVector2, localQuaternion2, localVector3);
        if (inputSources[1].profiles.includes('oculus-touch-v2')) {
          localQuaternion2.multiply(localQuaternion3.setFromAxisAngle(localVector3.set(1, 0, 0), -Math.PI*0.5));
        } else if (!inputSources[1].profiles.includes('oculus-hand')) {
          localQuaternion2.multiply(localQuaternion3.setFromAxisAngle(localVector3.set(1, 0, 0), -Math.PI));
        } else {
          localQuaternion2.multiply(localQuaternion3.setFromAxisAngle(localVector3.set(0, 0, 1), -Math.PI*0.5)).multiply(localQuaternion3.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI*0.2));
        }
        rightGamepadPosition = localVector2.toArray(localArray3);
        rightGamepadQuaternion = localQuaternion2.toArray(localArray4);

        const {gamepad} = inputSources[1];
        if (gamepad && gamepad.buttons.length >= 2) {
          const {buttons} = gamepad;
          rightGamepadPointer = buttons[0].value;
          rightGamepadGrip = buttons[1].value;
        } else {
          rightGamepadPointer = 0;
          rightGamepadGrip = 0;
        }
        rightGamepadEnabled = true;
      } else {
        rightGamepadEnabled = false;
      }

      console.log('inject rig 5');

      const handOffsetScale = localPlayer.avatar ? localPlayer.avatar.height / 1.5 : 1;
      const leftHandOffset = new THREE.Vector3(0.2, -0.2, -0.4);
      const rightHandOffset = new THREE.Vector3(-0.2, -0.2, -0.4);
      if (!leftGamepadPosition) {
        leftGamepadPosition = localVector2.copy(localVector)
          .add(localVector3.copy(leftHandOffset).multiplyScalar(handOffsetScale).applyQuaternion(localQuaternion))
          .toArray();
        leftGamepadQuaternion = localQuaternion.toArray();
        leftGamepadPointer = 0;
        leftGamepadGrip = 0;
        leftGamepadEnabled = false;
      }
      if (!rightGamepadPosition) {
        rightGamepadPosition = localVector2.copy(localVector)
          .add(localVector3.copy(rightHandOffset).multiplyScalar(handOffsetScale).applyQuaternion(localQuaternion))
          .toArray();
        rightGamepadQuaternion = localQuaternion.toArray();
        rightGamepadPointer = 0;
        rightGamepadGrip = 0;
        rightGamepadEnabled = false;
      }

      console.log('inject rig 6');

      pose = frame.getViewerPose(renderer.xr.getReferenceSpace());
      localMatrix.fromArray(pose.transform.matrix)
        .decompose(localVector2, localQuaternion2, localVector3);
      let playerPosition = localVector2.toArray();
      let playerRotation = localQuaternion2.toArray();

      console.log('inject rig 7');

      return [
        [playerPosition, playerRotation],
        [leftGamepadPosition, leftGamepadQuaternion, leftGamepadPointer, leftGamepadGrip, leftGamepadEnabled],
        [rightGamepadPosition, rightGamepadQuaternion, rightGamepadPointer, rightGamepadGrip, rightGamepadEnabled],
      ];

      // localPlayer.avatar.setLocalAvatarPose([
      //   [playerPosition, playerRotation],
      //   [leftGamepadPosition, leftGamepadQuaternion, leftGamepadPointer, leftGamepadGrip, leftGamepadEnabled],
      //   [rightGamepadPosition, rightGamepadQuaternion, rightGamepadPointer, rightGamepadGrip, rightGamepadEnabled],
      // ]);

      console.log('inject rig 8');
    }
  }
  async enterXr() {
    const {renderer} = this.engineRenderer;
    const session = renderer.xr.getSession();
    console.log('initial session', session);
    if (session === null) {
      let session = null;
      try {
        console.log('try session 1', {sessionMode, sessionOpts});
        session = await navigator.xr.requestSession(sessionMode, sessionOpts);
        console.log('try session 2', {session});
      } catch (err) {
        try {
          console.log('try session 3', {sessionMode});
          session = await navigator.xr.requestSession(sessionMode);
          console.log('try session 4', {session});
        } catch (err) {
          console.warn(err);
        }
      }
      console.log('try request session', session);
      if (session) {
        // Called when we've successfully acquired a XRSession. In response we
        // will set up the necessary session state and kick off the frame loop.
        const onSessionStarted = async (session) => {
          console.log('on session started 1', session, this.playersManager);

          // const localPlayer = this.playersManager.getLocalPlayer();
          // localPlayer.enterXr();
          session.addEventListener('end', onSessionEnded);

          console.log('on session started 2', session);

          // Get a frame of reference, which is required for querying poses.
          /* session.requestReferenceSpace('local').then((refSpace) => {
            // Inform the session that we're ready to begin drawing.
            session.requestAnimationFrame(onXRFrame);
          }).catch(err => {
            console.warn(err);
          }); */

          // console.log('on session started 3', session);
        };

        // Called either when the user has explicitly ended the session (like in
        // onEndSession()) or when the UA has ended the session for any reason.
        // At this point the session object is no longer usable and should be
        // discarded.
        const onSessionEnded = (e) => {
          const localPlayer = this.playersManager.getLocalPlayer();
          localPlayer.exitXr();
          session.removeEventListener('end', onSessionEnded);
        };

        console.log('outer on session started 1');
        onSessionStarted(session);
        console.log('outer on session started 2');
        renderer.xr.setSession(session);
      }
    } else {
      await session.end();
    }
  }
};
// const xrManager = new XRManager();
// export default xrManager;