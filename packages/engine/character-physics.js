/* this is the character physics implementation.
it sets up and ticks the physics loop for our local character */

import * as THREE from 'three';
import physicsManager from './physics/physics-manager.js';
import {applyVelocity} from './util.js';
import {groundFriction, flyFriction, swimFriction, flatGroundJumpAirTime, jumpHeight, startSkydiveTimeS} from './constants.js';
// import {getRenderer, camera} from './renderer.js';
// import metaversefileApi from 'metaversefile';
import avatarsWasmManager from './avatars/avatars-wasm-manager.js';

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
// const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4();
const localVector2D = new THREE.Vector2();
const localVector2D2 = new THREE.Vector2();
const localVector2D3 = new THREE.Vector2();

// const localOffset = new THREE.Vector3();
// const localOffset2 = new THREE.Vector3();

// const localArray = [];
// const localVelocity = new THREE.Vector3();

const zeroVector = new THREE.Vector3();
const upVector = new THREE.Vector3(0, 1, 0);
const leftHandOffset = new THREE.Vector3(0.2, -0.2, -0.4);
const rightHandOffset = new THREE.Vector3(-0.2, -0.2, -0.4);
const z22Quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI/8);
const groundStickOffset = 0.03;

export class CharacterPhysics {
  constructor(character) {
    this.character = character;

    this.targetVelocity = new THREE.Vector3(); // note: set by user input ( WASD ).
    this.lastTargetVelocity = new THREE.Vector3(); // note: targetVelocity of last frame.
    this.wantVelocity = new THREE.Vector3(); // note: damped lastTargetVelocity ( mainly used for smooth animation transition ).
    this.velocity = new THREE.Vector3(); // after moveCharacterController, the result actual velocity.
    this.targetMoveDistancePerFrame = new THREE.Vector3(); // note: see velocity.
    this.lastTargetMoveDistancePerFrame = new THREE.Vector3(); // note: see velocity.
    this.wantMoveDistancePerFrame = new THREE.Vector3(); // note: see velocity.
    this.targetCameraQuaternion = new THREE.Quaternion();
    
    // this.lastJumpTime = 0;
    this.grounded = null;
    this.lastGrounded = null;
    this.lastGroundedTime = 0;
    this.lastCharacterControllerY = null;
    this.sitOffset = new THREE.Vector3();
    this.lastFallLoopAction = false;
    this.fallLoopStartTimeS = 0;
    this.lastGravityH = 0;

    this.lastPistolUse = false;
    this.lastPistolUseStartTime = -Infinity;
  }

  loadCharacterController(characterWidth, characterHeight) {
    this.characterWidth = characterWidth;
    this.characterHeight = characterHeight;

    this.capsuleWidth = characterWidth / 2;
    this.capsuleHeight = characterHeight - characterWidth;

    const contactOffset = 0.01 * this.capsuleHeight;
    const stepOffset = 0.1 * this.capsuleHeight;

    const position = this.character.position.clone();

    const physicsScene = physicsManager.getScene();
    if (this.characterController) {
      physicsScene.destroyCharacterController(this.characterController);
      this.characterController = null;
    }

    this.characterController = physicsScene.createCharacterController(
      this.capsuleWidth,
      this.capsuleHeight,
      contactOffset,
      stepOffset,
      position
    );
  }

  setPosition(p) {
    localVector.copy(p);
    // if (typeof this.characterHeight !== 'number') {
    //   debugger;
    // }
    localVector.y -= this.characterHeight * 0.5;
    
    const physicsScene = physicsManager.getScene();
    physicsScene.setCharacterControllerPosition(
      this.characterController,
      localVector
    );
  }

  /* apply the currently held keys to the character */
  applyWasd(velocity, camera, timeDiff) {
    // if (this.character.avatar) {
      this.targetVelocity.copy(velocity);
      this.targetMoveDistancePerFrame.copy(this.targetVelocity)
        .multiplyScalar(timeDiff / 1000);
      this.targetCameraQuaternion.copy(camera.quaternion);
    // }
  }

  applyGravity(nowS, timeDiffS) {
    // if (this.character) {
      const fallLoopAction = this.character.actionManager.getActionType('fallLoop');
      if (fallLoopAction) {
        const physicsScene = physicsManager.getScene();
        if (!this.lastFallLoopAction) {
          this.fallLoopStartTimeS = nowS;
          this.lastGravityH = 0;
          if (fallLoopAction.from === 'jump') {
            const aestheticJumpBias = 1;
            const t = flatGroundJumpAirTime / 1000 / 2 + aestheticJumpBias;
            this.fallLoopStartTimeS -= t;
            const previousT = t - timeDiffS;
            this.lastGravityH = 0.5 * physicsScene.getGravity().y * previousT * previousT;
          }
        }
        let t = nowS - this.fallLoopStartTimeS;
        if (t > startSkydiveTimeS) {
          if (
            !this.character.actionManager.hasActionType('skydive') &&
            !this.character.actionManager.hasActionType('glider') &&
            !this.character.actionManager.hasActionType('swim')
          ) {
            const newSkydiveAction = {type: 'skydive'};
            this.character.actionManager.addAction(newSkydiveAction);
          }
          t = startSkydiveTimeS;
          this.wantVelocity.y = t * physicsScene.getGravity().y;
          this.wantMoveDistancePerFrame.y = this.wantVelocity.y * timeDiffS;
        } else {
          const h = 0.5 * physicsScene.getGravity().y * t * t;
          this.wantMoveDistancePerFrame.y = h - this.lastGravityH;
          this.wantVelocity.y = t * physicsScene.getGravity().y;
          
          this.lastGravityH = h;
        }
      }
      this.lastFallLoopAction = fallLoopAction;
    // }
  }

  updateVelocity(timeDiffS) {
    this.applyVelocityDamping(this.velocity, timeDiffS);
  }

  applyCharacterPhysicsDetail(velocityAvatarDirection, updateRig, now, timeDiffS) {
    if (this.character.avatar) {
      // move character controller
      const minDist = 0;
      localVector3.copy(this.wantMoveDistancePerFrame);

      // if (
      //   this.character.actionManager.hasActionType('jump') ||
      //   this.character.actionManager.hasActionType('doubleJump') ||
      //   this.character.actionManager.hasActionType('fallLoop')
      // ) {
      //   this.lastJumpTime = now;
      // }

      let fallLoopFromJump = false;
      const _updateJump = () => {
        const jumpAction = this.character.actionManager.getActionType('jump');
        if (jumpAction) {
          this.grounded = false;

          const doubleJumpAction = this.character.actionManager.getActionType('doubleJump');
          if (doubleJumpAction) {
            const doubleJumpTime =
              avatarsWasmManager.physxWorker.getActionInterpolantAnimationAvatar(this.character.avatar.animationAvatarPtr, 'doubleJump', 0);
            localVector3.y =
              Math.sin(doubleJumpTime * (Math.PI / flatGroundJumpAirTime)) *
                jumpHeight +
              doubleJumpAction.startPositionY -
              this.lastCharacterControllerY;
            if (doubleJumpTime >= flatGroundJumpAirTime) {
              this.character.actionManager.removeActionType('jump');
              this.character.actionManager.removeActionType('doubleJump');
              fallLoopFromJump = true;              
            }
          } else {
            const jumpTime = avatarsWasmManager.physxWorker.getActionInterpolantAnimationAvatar(this.character.avatar.animationAvatarPtr, 'jump', 0);
            localVector3.y =
              Math.sin(jumpTime * (Math.PI / flatGroundJumpAirTime)) *
                jumpHeight +
              jumpAction.startPositionY -
              this.lastCharacterControllerY;
            // console.log('apply jump', jumpTime, flatGroundJumpAirTime);
            if (jumpTime >= flatGroundJumpAirTime) {
              this.character.actionManager.removeActionType('jump');
              fallLoopFromJump = true;            
            }
          }
        }
      };
      _updateJump();

      const _updateAir = () => {
        const localPlayer = this.character;
        
        const _updateLand = () => {
          // console.log('update grounded', localPlayer.characterPhysics.grounded, new Error().stack);
          if (this.grounded) {
            if (!localPlayer.actionManager.hasActionType('land')) {
              const newLandAction = {
                type: 'land',
                time: now,
                isMoving: localPlayer.avatar.idleWalkFactor > 0,
              }
              localPlayer.actionManager.addAction(newLandAction);
              localPlayer.actionManager.hasActionType('fallLoop') && localPlayer.actionManager.removeActionType('fallLoop');
              localPlayer.actionManager.hasActionType('skydive') && localPlayer.actionManager.removeActionType('skydive');
              localPlayer.actionManager.hasActionType('glider') && localPlayer.actionManager.removeActionType('glider');
            }
          } else if (localPlayer.actionManager.hasActionType('land')) {
            localPlayer.actionManager.removeActionType('land');
          }
        };
        _updateLand();
  
        const _updateFallLoop = () => {
          if (
            !localPlayer.actionManager.hasActionType('fallLoop') &&
            !localPlayer.actionManager.hasActionType('jump') &&
            !localPlayer.actionManager.hasActionType('doubleJump') &&
            !localPlayer.actionManager.hasActionType('fly') &&
            !localPlayer.actionManager.hasActionType('glider') &&
            !localPlayer.actionManager.hasActionType('swim') &&
            !localPlayer.characterPhysics.grounded &&
            (now - localPlayer.characterPhysics.lastGroundedTime) > 200
          ) {
            if (fallLoopFromJump) {
              const newFallLoopAction = {type: 'fallLoop', from: 'jump'};
              localPlayer.actionManager.addAction(newFallLoopAction);
            } else {
              const newFallLoopAction = {type: 'fallLoop'};
              localPlayer.actionManager.addAction(newFallLoopAction);
            }
          }
        };
        _updateFallLoop();
      };
      _updateAir();

      const _updateSwim = () => {
        // console.log('got local vector', this.velocity.toArray().join(','), localVector3.toArray().join(','), timeDiffS);
        if (
          this.character.actionManager.hasActionType('swim') &&
          this.character.actionManager.getActionType('swim').onSurface &&
          !this.character.actionManager.hasActionType('fly')
        ) {
          if (this.character.characterPhysics.velocity.y >= 0) {
            localVector3.y = 0;
          }
        }
      };
      _updateSwim();

      const positionXZBefore = localVector2D.set(this.characterController.position.x, this.characterController.position.z);
      const positionYBefore = this.characterController.position.y;
      const physicsScene = physicsManager.getScene();

      const swimAction = this.character.actionManager.getActionType('swim');
      if (swimAction) {
        localVector3.y = 0;
        localVector5.copy(this.characterController.position);
        localVector5.y = swimAction.waterCharacterControllerHeight;
        physicsScene.setCharacterControllerPosition(this.characterController, localVector5);
      }

      const flags = physicsScene.moveCharacterController(
        this.characterController,
        localVector3,
        minDist,
        timeDiffS,
        this.characterController.position
      );
      const positionXZAfter = localVector2D2.set(this.characterController.position.x, this.characterController.position.z);
      const positionYAfter = this.characterController.position.y;
      const wantMoveDistancePerFrameXZ = localVector2D3.set(this.wantMoveDistancePerFrame.x, this.wantMoveDistancePerFrame.z);
      const wantMoveDistancePerFrameY = this.wantMoveDistancePerFrame.y;
      const wantMoveDistancePerFrameXZLength = wantMoveDistancePerFrameXZ.length();
      const wantMoveDistancePerFrameYLength = wantMoveDistancePerFrameY;
      this.velocity.copy(this.wantVelocity);
      if (wantMoveDistancePerFrameXZLength > 0) { // prevent divide 0, and reduce calculations.
        const movedRatioXZ = (positionXZAfter.sub(positionXZBefore).length()) / wantMoveDistancePerFrameXZLength;
        if (movedRatioXZ < 1) {
          this.velocity.x *= movedRatioXZ;
          this.velocity.z *= movedRatioXZ;
        }
      }
      if (wantMoveDistancePerFrameYLength > 0) { // prevent divide 0, and reduce calculations.
        const movedRatioY = (positionYAfter - positionYBefore) / wantMoveDistancePerFrameYLength;
        if (movedRatioY < 1) {
          this.velocity.y *= movedRatioY;
        }
      }

      // console.log('got velocity', this.velocity.toArray());

      // const collided = flags !== 0;
      this.grounded = !!(flags & 0x1);

      if (
        !this.grounded &&
        !this.character.actionManager.getActionType('jump') &&
        !this.character.actionManager.getActionType('fly') &&
        !this.character.actionManager.hasActionType('swim')
      ) {
        // prevent jump when go down slope
        const oldY = this.characterController.position.y;
        const physicsScene = physicsManager.getScene();
        const flags = physicsScene.moveCharacterController(
          this.characterController,
          localVector3.set(0, -groundStickOffset, 0),
          minDist,
          0,
          localVector4
        );
        const newGrounded = !!(flags & 0x1);
        if (newGrounded) {
          this.grounded = true;
          this.characterController.position.copy(localVector4);
        } else {
          this.characterController.position.y = oldY;
        }
      }
      
      if (this.grounded) {
        this.lastGroundedTime = now;
      }

      this.characterController.updateMatrixWorld();
      this.characterController.matrixWorld.decompose(
        localVector,
        localQuaternion,
        localVector2
      );
      localQuaternion.copy(this.character.quaternion);

      // adjusting the position of the character
      const halfCharacterHeight = this.characterHeight * 0.5;
      localVector.y += halfCharacterHeight;

      // capsule physics
      if (!this.character.actionManager.hasActionType('sit')) {
        // avatar facing direction
        if (velocityAvatarDirection) {
          const horizontalVelocity = localVector5.set(
            this.velocity.x,
            0,
            this.velocity.z
          );
          if (horizontalVelocity.lengthSq() > 0.001) {
            localQuaternion.setFromRotationMatrix(
              localMatrix.lookAt(zeroVector, horizontalVelocity, upVector)
            );
          }
        } else {
          localQuaternion.copy(this.targetCameraQuaternion);
        }

      } else {
        // Outdated vehicle code
        this.velocity.y = 0;

        const sitAction = this.character.actionManager.getActionType('sit');

        const objInstanceId = sitAction.controllingId;
        const controlledApp =
          metaversefileApi.getAppByInstanceId(objInstanceId);

        const sitComponent = controlledApp.getComponent('sit');

        // Patch fix to fix vehicles and mounts for now
        let rideMesh = null;
        controlledApp.traverse((o) => {
          if (rideMesh === null && o.isSkinnedMesh) {
            rideMesh = o;
          }
        });

        // NOTE: We had a problem with sending the entire bone in the message buffer, so we're just sending the bone name
        const sitPos = sitComponent.sitBone
          ? rideMesh.skeleton.bones.find(
              (bone) => bone.name === sitComponent.sitBone
            )
          : controlledApp;
        const {
          sitOffset = [0, 0, 0],
          // damping,
        } = sitComponent;
        this.sitOffset.fromArray(sitOffset);

        applyVelocity(controlledApp.position, this.velocity, timeDiffS);
        if (this.velocity.lengthSq() > 0) {
          controlledApp.quaternion
            .setFromUnitVectors(
              localVector4.set(0, 0, -1),
              localVector5.set(this.velocity.x, 0, this.velocity.z).normalize()
            )
            .premultiply(
              localQuaternion2.setFromAxisAngle(
                localVector3.set(0, 1, 0),
                Math.PI
              )
            );
        }
        controlledApp.updateMatrixWorld();

        localMatrix
          .copy(sitPos.matrixWorld)
          .decompose(localVector, localQuaternion, localVector2);

        localVector.add(this.sitOffset);
        localVector.y += this.characterHeight * 0.5;

        const physicsScene = physicsManager.getScene();
        physicsScene.setCharacterControllerPosition(
          this.characterController,
          localVector
        );
        localVector.y += this.characterHeight * 0.5;

        localQuaternion.premultiply(
          localQuaternion2.setFromAxisAngle(localVector3.set(0, 1, 0), Math.PI)
        );
      }
      // localOffset2.set(0, 0.05, 0); // Feet offset: Or feet will be in ground, only cosmetical, works for all avatars
      // localVector.add(localOffset2);
      localMatrix.compose(localVector, localQuaternion, localVector2);

      // apply to character
      if (updateRig) {
        this.character.matrix.copy(localMatrix);
      } else {
        this.character.matrix.identity();
      }
      // const oldPosition = this.character.position.clone(); // XXX
      this.character.matrix.decompose(
        this.character.position,
        this.character.quaternion,
        this.character.scale
      );
      this.character.matrixWorld.copy(this.character.matrix);
      
      // this.character.updateMatrixWorld();

      /* if (this.avatar) {
        if (this.character.actionManager.hasActionType('jump')) {
          this.avatar.setFloorHeight(-0xFFFFFF);
        } else {
          this.avatar.setFloorHeight(localVector.y - this.character.avatar.height);
        }
        this.avatar.updateMatrixWorld();
      } */

      this.lastGrounded = this.grounded;
      this.lastCharacterControllerY =
      this.characterController.position.y;
    }
  }

  /* dampen the velocity to make physical sense for the current avatar state */
  applyVelocityDamping(velocity, timeDiffS) {
    const doDamping = (factor) => {
      this.wantMoveDistancePerFrame.x = THREE.MathUtils.damp(this.wantMoveDistancePerFrame.x, this.lastTargetMoveDistancePerFrame.x, factor, timeDiffS);
      this.wantMoveDistancePerFrame.z = THREE.MathUtils.damp(this.wantMoveDistancePerFrame.z, this.lastTargetMoveDistancePerFrame.z, factor, timeDiffS);
      this.wantMoveDistancePerFrame.y = THREE.MathUtils.damp(this.wantMoveDistancePerFrame.y, this.lastTargetMoveDistancePerFrame.y, factor, timeDiffS);
      // this.wantMoveDistancePerFrame.y = this.targetMoveDistancePerFrame.y;

      this.wantVelocity.x = THREE.MathUtils.damp(this.wantVelocity.x, this.lastTargetVelocity.x, factor, timeDiffS);
      this.wantVelocity.z = THREE.MathUtils.damp(this.wantVelocity.z, this.lastTargetVelocity.z, factor, timeDiffS);
      this.wantVelocity.y = THREE.MathUtils.damp(this.wantVelocity.y, this.lastTargetVelocity.y, factor, timeDiffS);
      // this.wantVelocity.y = this.targetVelocity.y;
    }
    if (this.character.actionManager.hasActionType('fly')) {
      doDamping(flyFriction);
    } 
    else if(this.character.actionManager.hasActionType('swim')){
      doDamping(swimFriction);
    }
    else {
      doDamping(groundFriction);
    }
  }

  applyCharacterPhysics(now, timeDiffS) {
    // const renderer = getRenderer();
    // const session = renderer.xr.getSession();

    /* if (session) {
      if (ioManager.currentWalked || this.character.actionManager.hasActionType('jump')) {
        // const originalPosition = avatarWorldObject.position.clone();

        this.applyCharacterPhysicsDetail(false, false, now, timeDiffS);

        // dolly.position.add(
          // avatarWorldObject.position.clone().sub(originalPosition)
        // );
      } else {
        // this.velocity.y = 0;
      }
    } else { */
    if (
      this.character.actionManager.hasActionType('firstperson') ||
      (this.character.actionManager.hasActionType('aim') && !this.character.actionManager.hasActionType('narutoRun')) ||
      (this.character.actionManager.hasActionType('behavior') && this.character.actionManager.getActionType('behavior').behaviorType === 'faceToward')
    ) {
      this.applyCharacterPhysicsDetail(false, true, now, timeDiffS);
    } else {
      this.applyCharacterPhysicsDetail(true, true, now, timeDiffS);
    }
    // }
  }

  applyCharacterActionKinematics(now, timeDiffS, xrAvatarPose) {
    // const renderer = getRenderer();
    // const session = renderer.xr.getSession();
    const session = null; // XXX add VR support
    const aimAction = this.character.actionManager.getActionType('aim');
    const aimComponent = (() => {
      for (const action of this.character.actionManager.getActionsArray()) {
        if (action.type === 'wear') {
          const app = this.character.appManager.getAppByInstanceId(
            action.instanceId
          );
          if (!app) {
            return null;
          }
          for (const {key, value} of app.components) {
            if (key === 'aim') {
              return value;
            }
          }
        }
      }
      return null;
    })();
    const useAction = this.character.actionManager.getActionType('use');

    const _updateHandsEnabled = () => {
      const isSession = !!session;
      const isPlayerAiming = !!aimAction && !aimAction.playerAnimation;
      const isObjectAimable = !!aimComponent;
      // const isPlayingEnvelopeIkAnimation = !!useAction && useAction.ik === 'bow';
      const isXrMode = !!xrAvatarPose;

      const isHandEnabled =
        isSession ||
        isXrMode ||
        (isPlayerAiming &&
          isObjectAimable); /* && !isPlayingEnvelopeIkAnimation */
      for (let i = 0; i < 2; i++) {
        const isExpectedHandIndex =
          i ===
          (aimComponent?.ikHand === 'left'
            ? 1
            : aimComponent?.ikHand === 'right'
            ? 0
            : null);
        const enabled = isHandEnabled && (isExpectedHandIndex || isXrMode);
        //
        if (this.character.hands[i].enabled !== enabled) {
          if (enabled) {
            if (i === 0) {
              if (!this.character.actionManager.hasActionType('rightHand')) {
                this.character.actionManager.addAction({type: 'rightHand'});
              }
            } else if (i === 1) {
              if (!this.character.actionManager.hasActionType('leftHand')) {
                this.character.actionManager.addAction({type: 'leftHand'});
              }
            }
          } else {
            if (i === 0) {
              if (!this.character.actionManager.hasActionType('rightHand')) {
                this.character.actionManager.removeActionType('rightHand');
              }
            } else if (i === 1) {
              if (!this.character.actionManager.hasActionType('leftHand')) {
                this.character.actionManager.removeActionType('leftHand');
              }
            }
          }
        }
        this.character.hands[i].enabled = enabled;
      }
    };
    _updateHandsEnabled();

    const _updateFakeHands = () => {
      if (!session) {
        localMatrix
          .copy(this.character.matrixWorld)
          .decompose(localVector, localQuaternion, localVector2);

        const avatarHeight = this.character.avatar ? this.characterHeight : 0;
        const handOffsetScale = this.character.avatar ? avatarHeight / 1.5 : 1;
        if (this.character.hands[0].enabled) {
          const leftGamepadPosition = localVector2
            .copy(localVector)
            .add(
              localVector3
                .copy(leftHandOffset)
                .multiplyScalar(handOffsetScale)
                .applyQuaternion(localQuaternion)
            );
          const leftGamepadQuaternion = localQuaternion;
          /* const leftGamepadPointer = 0;
          const leftGamepadGrip = 0;
          const leftGamepadEnabled = false; */

          this.character.leftHand.position.copy(leftGamepadPosition);
          this.character.leftHand.quaternion.copy(leftGamepadQuaternion);
        }
        if (this.character.hands[1].enabled) {
          const rightGamepadPosition = localVector2
            .copy(localVector)
            .add(
              localVector3
                .copy(rightHandOffset)
                .multiplyScalar(handOffsetScale)
                .applyQuaternion(localQuaternion)
            );
          const rightGamepadQuaternion = localQuaternion;
          /* const rightGamepadPointer = 0;
          const rightGamepadGrip = 0;
          const rightGamepadEnabled = false; */

          this.character.rightHand.position.copy(rightGamepadPosition);
          this.character.rightHand.quaternion.copy(rightGamepadQuaternion);
        }
      }
    };
    _updateFakeHands();

    const _updatePistolIkAnimation = () => {
      const kickbackTime = 300;
      const kickbackExponent = 0.05;
      const fakeArmLength = 0.2;

      const pistolUse = !!useAction && useAction.ik === 'pistol';
      // console.log('got use action', !!pistolUse, useAction?.ik);
      if (!this.lastPistolUse && pistolUse) {
        this.lastPistolUseStartTime = now;
      }
      this.lastPistolUse = pistolUse;

      if (isFinite(this.lastPistolUseStartTime)) {
        const lastUseTimeDiff = now - this.lastPistolUseStartTime;
        const f = Math.min(Math.max(lastUseTimeDiff / kickbackTime, 0), 1);
        const v = Math.sin(Math.pow(f, kickbackExponent) * Math.PI);
        localQuaternion.setFromRotationMatrix(
          localMatrix.lookAt(
            localVector.copy(this.character.leftHand.position),
            localVector2
              .copy(this.character.leftHand.position)
              .add(
                localVector3
                  .set(0, 1, -1)
                  .applyQuaternion(this.character.leftHand.quaternion)
              ),
            localVector3
              .set(0, 0, 1)
              .applyQuaternion(this.character.leftHand.quaternion)
          )
        );

        this.character.leftHand.position.sub(
          localVector
            .set(0, 0, -fakeArmLength)
            .applyQuaternion(this.character.leftHand.quaternion)
        );

        this.character.leftHand.quaternion.slerp(localQuaternion, v);

        this.character.leftHand.position.add(
          localVector
            .set(0, 0, -fakeArmLength)
            .applyQuaternion(this.character.leftHand.quaternion)
        );

        this.character.leftHand.updateMatrixWorld();

        if (f >= 1) {
          this.lastPistolUseStartTime = -Infinity;
        }
      }
    };
    _updatePistolIkAnimation();

    const _updateBowIkAnimation = () => {
      const bowUse = !!useAction && useAction.ik === 'bow';
      // console.log('got use action', !!pistolUse, useAction?.ik);
      if (!this.lastBowUse && bowUse) {
        this.lastBowUseStartTime = now;
      }
      if (!bowUse) {
        this.lastBowUseStartTime = -Infinity;
      }
      this.lastBowUse = bowUse;

      if (isFinite(this.lastBowUseStartTime)) {
        const lastUseTimeDiff = now - this.lastBowUseStartTime;
        // const fakeArmLength = 0.2;

        const v = Math.min(Math.max(lastUseTimeDiff / 300, 0), 1);

        const targetPosition = localVector
          .copy(this.character.rightHand.position)
          .add(
            localVector2
              .set(-rightHandOffset.x * 2, 0, -0.2)
              .applyQuaternion(this.character.rightHand.quaternion)
          );
        const targetQuaternion = localQuaternion
          .copy(this.character.rightHand.quaternion)
          .multiply(z22Quaternion);

        this.character.rightHand.position.lerp(targetPosition, v);
        this.character.rightHand.quaternion.slerp(targetQuaternion, v);

        /* this.character.rightHand.quaternion.slerp(localQuaternion, v);
        this.character.rightHand.position.add(
          localVector.set(0, 0, -fakeArmLength)
            .applyQuaternion(this.character.rightHand.quaternion)
        ); */

        this.character.rightHand.updateMatrixWorld();
      }
    };
    _updateBowIkAnimation();
  }

  update(now, timeDiffS, xrAvatarPose) {
    const nowS = now / 1000;
    this.updateVelocity(timeDiffS);
    this.applyGravity(nowS, timeDiffS);
    this.applyCharacterPhysics(now, timeDiffS);
    this.applyCharacterActionKinematics(now, timeDiffS, xrAvatarPose);

    this.character.velocity.copy(this.velocity);

    // console.log('character physics update');

    this.lastTargetVelocity.copy(this.targetVelocity);
    this.lastTargetMoveDistancePerFrame.copy(this.targetMoveDistancePerFrame);
  }

  reset() {
    if (this.character.avatar) {
      this.velocity.set(0, 0, 0);
    }
  }

  destroy() {
    if (this.characterController) {
      const physicsScene = physicsManager.getScene();
      physicsScene.destroyCharacterController(this.characterController);
      this.characterController = null;
    }
  }
}