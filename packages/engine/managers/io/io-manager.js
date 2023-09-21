/*
io manager reads inputs from the browser.
some inputs are implicit, like resize.
the functionality is implemented in other managers.
*/

import * as THREE from 'three';
import physicsManager from '../../physics/physics-manager.js';
import {cameraSpeed} from '../../constants/camera-constants.js';

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector2D = new THREE.Vector2();
// const localEuler = new THREE.Euler();
// const localMatrix2 = new THREE.Matrix4();
// const localMatrix3 = new THREE.Matrix4();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
// const localQuaternion3 = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
// const localPlane = new THREE.Plane();
// const localFrustum = new THREE.Frustum();
const localRaycaster = new THREE.Raycaster();
const localObject = new THREE.Object3D();

const zeroVector = new THREE.Vector3(0, 0, 0);
const upVector = new THREE.Vector3(0, 1, 0);

const doubleTapTime = 200;

//

const freeCameraSpeed = 0.05;
const freeCameraSpeedRunMultiplier = 5;

//

export class IoManager extends EventTarget {
  lastAxes = [[0, 0, 0, 0], [0, 0, 0, 0]];
  lastButtons = [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]];
  currentWeaponValue = 0;
  lastWeaponValue = 0;
  currentTeleport = false;
  lastTeleport = false;
  currentMenuDown = false;
  lastMenuDown = false;
  menuExpanded = false;
  lastMenuExpanded = false;
  currentWeaponGrabs = [false, false];
  lastWeaponGrabs = [false, false];
  currentWalked = false;
  lastMouseButtons = 0;
  movementEnabled = true;

  freeCamera = false;
  freeCameraVector = new THREE.Vector3();
  freeCameraEuler = new THREE.Euler();

  keysDirection = new THREE.Vector3();

  keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    forward: false,
    backward: false,
    shift: false,
    doubleTap: false,
    space: false,
    ctrl: false,
    keyE: false,
  };

  lastKeysDownTime = {
    keyW: 0,
    keyA: 0,
    keyS: 0,
    keyD: 0,
    keyE: 0,
  };

  constructor({
    engine,
    cameraManager,
    pointerLockManager,
    raycastManager,
    engineRenderer,
    playersManager,
    storyManager,
    zTargetingManager,
    // controlsManager,
    // ioBus,
  }) {
    super();
    
    if (!engine || !cameraManager || !pointerLockManager || !raycastManager || !engineRenderer || !playersManager || !storyManager || !zTargetingManager /*|| !controlsManager || !ioBus*/) {
      console.warn('missing managers', {
        engine,
        cameraManager,
        pointerLockManager,
        raycastManager,
        engineRenderer,
        playersManager,
        storyManager,
        zTargetingManager,
        // controlsManager,
        // ioBus,
      });
      debugger;
      throw new Error('missing managers');
    }
    this.engine = engine;
    this.cameraManager = cameraManager;
    this.pointerLockManager = pointerLockManager;
    this.raycastManager = raycastManager;
    this.engineRenderer = engineRenderer;
    this.playersManager = playersManager;
    this.storyManager = storyManager;
    this.zTargetingManager = zTargetingManager;

    this.eventHandlers = new Map();

    this.#listen();
  }

  #listen() {
    // XXX this should be moved to its own manager (pointerlock manager?)
    this.pointerLockManager.addEventListener('pointerlockchange', e => {
      const {
        pointerLockElement,
      } = e.data;
      if (!pointerLockElement) {
        // update movements
        this.engine.game.setMovements();

        // update sprint/naruto run
        {
          const oldShift = this.keys.shift;
          const oldDoubleTap = this.keys.doubleTap;

          oldShift && this.engine.game.setSprint(false);
          oldDoubleTap && this.engine.game.menuUnDoubleTap();
        }

        this.resetKeys();
      }
    });

    // handle events from the iframe
    this.addEventListener('ioBus', e => {
      this[e.data.type](e.data);
    });
  }

  registerEventHandler(type, handler) {
    let eventHandlers = this.eventHandlers.get(type);
    if (!eventHandlers) {
      eventHandlers = [];
      this.eventHandlers.set(type, eventHandlers);
    }
    eventHandlers.push(handler);
  }
  unregisterEventHandler(type, handler) {
    const eventHandlers = this.eventHandlers.get(type);
    if (eventHandlers) {
      const index = eventHandlers.indexOf(handler);
      if (index !== -1) {
        eventHandlers.splice(index, 1);
        if (eventHandlers.length === 0) {
          this.eventHandlers.delete(type);
        }
      } else {
        console.warn('failed to find handler to unregister', handler);
      }
    } else {
      console.warn('failed to find event handlers to unregister', type);
    }
  }
  handleCustomEvent(e) {
    const eventHandlers = this.eventHandlers.get(e.type);
    if (eventHandlers) {
      for (let i = 0; i < eventHandlers.length; i++) {
        const eventHandler = eventHandlers[i];
        const result = eventHandler(e);
        if (result !== false) {
          return true;
        }
      }
    }
    return false;
  }

  inputFocused() {
    return document.activeElement &&
      (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.getAttribute('contenteditable') !== null
      )
    };

  update(timeDiff, xrAvatarPose) {
    const {engineRenderer} = this;
    const {renderer, camera} = engineRenderer;
    const session = renderer.xr.getSession();
    const xrCamera = session ?
      renderer.xr.getCamera(camera)
    :
      camera;

    // latch the update functions
    let _updateHorizontal, _updateVertical;
    if (session) {
      const localDirection = new THREE.Vector3();
      let localJumpButton = false;

      const inputSources = Array.from(session.inputSources);
      for (let i = 0; i < inputSources.length; i++) {
        const inputSource = inputSources[i];
        const {handedness, gamepad} = inputSource;
        if (gamepad && gamepad.buttons.length >= 2) {
          const index = handedness === 'right' ? 1 : 0;

          // axes
          const {axes: axesSrc, buttons: buttonsSrc} = gamepad;
          const axes = [
            axesSrc[0] || 0,
            axesSrc[1] || 0,
            axesSrc[2] || 0,
            axesSrc[3] || 0,
          ];
          const buttons = [
            buttonsSrc[0] ? buttonsSrc[0].value : 0,
            buttonsSrc[1] ? buttonsSrc[1].value : 0,
            buttonsSrc[2] ? buttonsSrc[2].value : 0,
            buttonsSrc[3] ? buttonsSrc[3].value : 0,
            buttonsSrc[4] ? buttonsSrc[4].value : 0,
            buttonsSrc[5] ? buttonsSrc[5].value : 0,
          ];
          if (handedness === 'left') {
            const dx = axes[0] + axes[2];
            const dy = axes[1] + axes[3];
            if (Math.abs(dx) >= 0.01 || Math.abs(dy) >= 0.01) {
              const [[p, q]] = xrAvatarPose;
              localQuaternion.fromArray(q);
              localVector.set(dx, 0, dy)
                .applyQuaternion(localQuaternion);

              /* camera.matrix
                // .premultiply(localMatrix2.makeTranslation(-xrCamera.position.x, -xrCamera.position.y, -xrCamera.position.z))
                .premultiply(localMatrix3.makeTranslation(localVector.x, localVector.y, localVector.z))
                // .premultiply(localMatrix2.copy(localMatrix2).invert())
                .decompose(camera.position, camera.quaternion, camera.scale); */
              localDirection.add(localVector);
              this.currentWalked = true;
            }

            this.currentWeaponGrabs[1] = buttons[1] > 0.5;
          } else if (handedness === 'right') {
            const _applyRotation = r => {
              // console.log('rotate', r);
              
              /* camera.matrix
                .premultiply(localMatrix2.makeTranslation(-xrCamera.position.x, -xrCamera.position.y, -xrCamera.position.z))
                .premultiply(localMatrix3.makeRotationFromQuaternion(localQuaternion.setFromAxisAngle(localVector.set(0, 1, 0), r)))
                .premultiply(localMatrix2.copy(localMatrix2).invert())
                .decompose(camera.position, camera.quaternion, camera.scale); */
            };
            if (
              (axes[0] < -0.75 && !(this.lastAxes[index][0] < -0.75)) ||
              (axes[2] < -0.75 && !(this.lastAxes[index][2] < -0.75))
            ) {
              _applyRotation(Math.PI * 0.2);
            } else if (
              (axes[0] > 0.75 && !(this.lastAxes[index][0] > 0.75)) ||
              (axes[2] > 0.75 && !(this.lastAxes[index][2] > 0.75))
            ) {
              _applyRotation(-Math.PI * 0.2);
            }
            this.currentTeleport = (axes[1] < -0.75 || axes[3] < -0.75);
            this.currentMenuDown = (axes[1] > 0.75 || axes[3] > 0.75);

            this.currentWeaponDown = buttonsSrc[0].pressed;
            this.currentWeaponValue = buttons[0];
            this.currentWeaponGrabs[0] = buttonsSrc[1].pressed;

            if (
              buttons[3] >= 0.5 && this.lastButtons[index][3] < 0.5 &&
              !(Math.abs(axes[0]) > 0.5 || Math.abs(axes[1]) > 0.5 || Math.abs(axes[2]) > 0.5 || Math.abs(axes[3]) > 0.5) // &&
              // !this.engine.game.isJumping() &&
              // !this.engine.game.isSitting()
            ) {
              // this.engine.game.jump();
              localJumpButton = true;
            }
          }

          this.lastAxes[index][0] = axes[0];
          this.lastAxes[index][1] = axes[1];
          this.lastAxes[index][2] = axes[2];
          this.lastAxes[index][3] = axes[3];

          this.lastButtons[index][0] = buttons[0];
          this.lastButtons[index][1] = buttons[1];
          this.lastButtons[index][2] = buttons[2];
          this.lastButtons[index][3] = buttons[3];
          this.lastButtons[index][4] = buttons[4];
        }
      }
      _updateHorizontal = (direction) => {
        direction.add(localDirection);
      };
      _updateVertical = (direction) => {
        if (localJumpButton) {
          direction.y += 1;
        }
      };
    } else {
      _updateHorizontal = direction => {
        if (this.keys.left) {
          direction.x -= 1;
        }
        if (this.keys.right) {
          direction.x += 1;
        }
        if (this.keys.up) {
          direction.z -= 1;
        }
        if (this.keys.down) {
          direction.z += 1;
        }
      };
      _updateVertical = direction => {
        if (this.keys.space) {
          direction.y += 1;
        }
        if (this.keys.ctrl) {
          direction.y -= 1;
        }
      };
    }

    // perform the update
    const _performUpdate = () => {
      this.keysDirection.set(0, 0, 0);

      const localPlayer = this.playersManager.getLocalPlayer();

      _updateHorizontal(this.keysDirection);

      if (!this.freeCamera) {
        if (this.keysDirection.equals(zeroVector)) {
          if (localPlayer.actionManager.hasActionType('narutoRun')) {
            this.keysDirection.copy(this.cameraManager.lastNonzeroDirectionVector);
          }
        } else {
          this.cameraManager.lastNonzeroDirectionVector.copy(this.keysDirection);
        }

        if (localPlayer.actionManager.hasActionType('fly') || localPlayer.actionManager.hasActionType('swim')) {
          this.keysDirection.applyQuaternion(xrCamera.quaternion);
          _updateVertical(this.keysDirection);
        } else {
          const _applyCameraRelativeKeys = () => {
            const transformCameraForwardDirection = localVector.set(0, 0, -1)
              .applyQuaternion(xrCamera.quaternion);
            transformCameraForwardDirection.y = 0;
            if (transformCameraForwardDirection.x === 0 && transformCameraForwardDirection.z === 0) {
              transformCameraForwardDirection.z = -1;
            }
            transformCameraForwardDirection.normalize();
            const backQuaternion = localQuaternion2.setFromRotationMatrix(
              localMatrix.lookAt(zeroVector, transformCameraForwardDirection, upVector)
            );

            this.keysDirection.applyQuaternion(backQuaternion);
          };
          _applyCameraRelativeKeys();

          const _updateCrouch = () => {
            if (this.keys.ctrl && !this.lastCtrlKey && this.engine.game.isGrounded()) {
              this.engine.game.toggleCrouch();
            }
            this.lastCtrlKey = this.keys.ctrl;
          };
          _updateCrouch();
        }
        const physicsScene = physicsManager.getScene();
        if (physicsScene.getPhysicsEnabled() && this.movementEnabled) {
          if (xrAvatarPose && localPlayer.xrRoot.equals(zeroVector)) {
            localPlayer.xrRoot.copy(localPlayer.position);
            // localPlayer.xrRoot.y -= localPlayer.avatar.height;
          }
          if (xrAvatarPose && !this.keysDirection.equals(zeroVector)) {
            const [[p, q]] = xrAvatarPose;

            const lastXrRoot = localVector.copy(localPlayer.xrRoot);
            localPlayer.xrRoot.fromArray(p);
            const xrRootDelta = localVector2.copy(localPlayer.xrRoot)
              .sub(lastXrRoot);

            localPlayer.position.add(xrRootDelta);
            localPlayer.updateMatrixWorld();
            
            localPlayer.characterPhysics.setPosition(localPlayer.position);
          }

          const speed = this.engine.game.getSpeed();
          const velocity = this.keysDirection.normalize()
            .multiplyScalar(speed);
          localPlayer.characterPhysics.applyWasd(velocity, xrCamera, timeDiff);
        }
      } else {
        const speed = freeCameraSpeed * (this.keys.shift ? freeCameraSpeedRunMultiplier : 1);
        const velocity = localVector.copy(this.keysDirection)
          .normalize()
          .multiplyScalar(speed);
        
        const velocity2 = localVector2.setScalar(0);
        if (this.keys.space) {
          velocity2.y += 1;
        }
        if (this.keys.ctrl) {
          velocity2.y -= 1;
        }
        velocity2.normalize()
          .multiplyScalar(speed);

        const {
          camera,
        } = this.engineRenderer;
        camera.quaternion.setFromEuler(this.freeCameraEuler);
        velocity.applyQuaternion(camera.quaternion);
        
        camera.position.add(velocity);
        camera.position.add(velocity2);

        camera.updateMatrixWorld();
      }
    };
    _performUpdate();
  };

  updatePost() {
    this.lastTeleport = this.currentTeleport;
    this.lastMenuDown = this.currentMenuDown;
    this.lastWeaponDown = this.currentWeaponDown;
    this.lastWeaponValue = this.currentWeaponValue;
    this.lastMenuExpanded = this.menuExpanded;
    for (let i = 0; i < 2; i++) {
      this.lastWeaponGrabs[i] = this.currentWeaponGrabs[i];
    }
  };

  setMovementEnabled(newMovementEnabled) {
    const {camera} = this.engineRenderer;

    this.movementEnabled = newMovementEnabled;
    if (!this.movementEnabled) {
      const localPlayer = metaversefile.useLocalPlayer();
      localPlayer.characterPhysics.applyWasd(zeroVector, camera, 0);
    }
  };

  resetKeys() {
    for (const k in this.keys) {
      this.keys[k] = false;
    }
  };

  keydown(e) {
    if (this.inputFocused() || e.repeat) {
      return;
    }
    if (this.handleCustomEvent(e)) return;

    if (e.keyCode === 18) { // alt
      // e.preventDefault();
      // e.stopPropagation();
      return;
    }

    switch (e.which) {
      case 9: { // tab
        break;
      }
      /* case 49: // 1
      case 50: // 2
      case 51: // 3
      case 52: // 4
      case 53: // 5
      case 54: // 6
      case 55: // 7
      case 56: // 8
      {
        this.engine.game.selectLoadout(e.which - 49);
        break;
      } */
      case 13: { // enter
        // if (this.pointerLockManager.pointerLockElement) {
        //   this.pointerLockManager.exitPointerLock();
        // }
        if (this.storyManager.getConversation()) {
          this.storyManager.progressConversation();
        }
        break;
      }
      /* case 191: { // / 
        if (this.pointerLockManager.pointerLockElement) {
          this.pointerLockManager.exitPointerLock();
        }
        break;
      } */
      case 87: // W
      case 38: // arrow up
      {
        this.keys.up = true;
        this.engine.game.setMovements();

        const now = performance.now();
        const timeDiff = now - this.lastKeysDownTime.keyW;
        if (timeDiff < doubleTapTime && this.keys.shift) {
          this.keys.doubleTap = true;
          this.engine.game.menuDoubleTap();
        }
        this.lastKeysDownTime.keyW = now;
        this.lastKeysDownTime.keyS = 0;
        break;
      }
      case 65: // A
      case 37: // arrow left
      {
        this.keys.left = true;
        this.engine.game.setMovements();

        const now = performance.now();
        const timeDiff = now - this.lastKeysDownTime.keyA;
        if (timeDiff < doubleTapTime && this.keys.shift) {
          this.keys.doubleTap = true;
          this.engine.game.menuDoubleTap();
        }
        this.lastKeysDownTime.keyA = now;
        this.lastKeysDownTime.keyD = 0;
        break;
      }
      case 83: // S
      case 40: // arrow down
      {
        if (e.ctrlKey) {
          // e.preventDefault();
          // e.stopPropagation();

          this.engine.game.saveScene();
        } else {
          this.keys.down = true;
          this.engine.game.setMovements();

          const now = performance.now();
          const timeDiff = now - this.lastKeysDownTime.keyS;
          if (timeDiff < doubleTapTime && this.keys.shift) {
            this.keys.doubleTap = true;
            this.engine.game.menuDoubleTap();
          }
          this.lastKeysDownTime.keyS = now;
          this.lastKeysDownTime.keyW = 0;
        }
        break;
      }
      case 68: // D
      case 39: // arrow right
      {
        this.keys.right = true;
        this.engine.game.setMovements();

        const now = performance.now();
        const timeDiff = now - this.lastKeysDownTime.keyD;
        if (timeDiff < doubleTapTime && this.keys.shift) {
          this.keys.doubleTap = true;
          this.engine.game.menuDoubleTap();
        }
        this.lastKeysDownTime.keyD = now;
        this.lastKeysDownTime.keyA = 0;
        break;
      }
      case 90: { // Z
        const {camera} = this.engine.engineRenderer;
        const {cameraManager} = this.engine;
        const mode = cameraManager.getMode();
        if (mode === 'firstperson') {
          localRaycaster.setFromCamera(localVector2D, camera);

          localObject.position.copy(localRaycaster.ray.origin);
          localObject.quaternion.setFromRotationMatrix(
            localMatrix.lookAt(
              localVector.set(0, 0, 0),
              localRaycaster.ray.direction,
              localVector2.set(0, 1, 0)
            )
          );
          this.zTargetingManager.handleRayFocus(localObject);
        } else if (mode === 'isometric') {
          this.zTargetingManager.toggle();
        }
        break;
      }
      case 70: { // F
        // e.preventDefault();
        // e.stopPropagation();

        if (this.engine.interactionManager.canPush()) {
          this.keys.forward = true;
        } else {
          this.engine.game.toggleFly();
        }
        break;
      }
      /* case 88: { // X
        if (!e.ctrlKey) {
          // this.engine.game.menuDelete();
          this.engine.interactionManager.menuDelete();
        }
        break;
      } */
      case 67: { // C
        if (this.engine.interactionManager.canPush()) {
          this.keys.backward = true;
        } else {
          this.keys.ctrl = true;
        }
        break;
      }
      /* case 71: { // G
        this.engine.game.menuSwitchCharacter();
        break;
      }
      case 86: { // V
        // e.preventDefault();
        // e.stopPropagation();
        this.engine.game.menuVDown(e);
        break;
      }
      case 85: { // U
        // e.preventDefault();
        // e.stopPropagation();
        this.engine.game.worldClear();
        break;
      }
      case 73: { // I
        // e.preventDefault();
        // e.stopPropagation();
        this.engine.game.worldOpen();
        break;
      } */
      /* case 79: { // O
        this.engine.game.equipTest();
        break;
      } */
      /* case 80: { // P
        this.engine.game.dropTest();
        break;
      } */
      /* case 66: { // B
        this.engine.game.menuBDown(e);
        break;
      } */
      case 69: { // E
        this.engine.game.menuMiddleRelease();
        
        // const now = performance.now();
        // const timeDiff = now - this.lastKeysDownTime.keyE;
        const canRotate = this.engine.interactionManager.canRotate();
        /* if (timeDiff < doubleTapTime && !canRotate) {
          this.engine.game.menuMiddleToggle();
        } else { */
          if (canRotate) {
            this.engine.interactionManager.menuRotate(-1);
          } else {
            this.engine.game.menuActivateDown();
          }
        // }
        // this.lastKeysDownTime.keyE = now;
        this.keys.keyE = true;
        break;
      }
      case 84: { // T
        this.engine.game.toggleMic(e);
        break;
      }
      case 89: { // Y
        this.engine.game.toggleSpeech(e);
        break;
      }
      case 82: { // R
        if (this.pointerLockManager.pointerLockElement) {
          if (this.engine.transformControlsManager.isEnabled()) {
            this.engine.transformControlsManager.toggleMode();
          } else if (!e.ctrlKey) {
            this.engine.game.dropSelectedApp();
          }
        }
        break;
      }
      case 80: { // P
        if (!this.freeCamera) {
          this.freeCamera = true;
          const {camera} = this.engine.engineRenderer;
          this.freeCameraVector.copy(camera.position);
          this.freeCameraEuler.setFromQuaternion(camera.quaternion, 'YXZ');

          this.cameraManager.setControllerFn(() => {
            // camera.position.copy(this.freeCameraVector);
            // camera.quaternion.setFromEuler(this.freeCameraEuler);
            // camera.updateMatrixWorld();
          });
        } else {
          this.freeCamera = false;

          this.cameraManager.setControllerFn(null);
        }
        break;
      }
      case 16: { // shift
        this.keys.shift = true;
        this.engine.game.setSprint(true);
        break;
      }
      case 32: { // space
        this.keys.space = true;

        if (!this.freeCamera) {
          if (this.engine.game.isGlidering()) {
            this.engine.game.unglider();
          } else if (this.engine.game.isSkydiving()) {
            this.engine.game.glider();
          } else if (!this.engine.game.isJumping()) {
            this.engine.game.jump('jump');
          } else if (!this.engine.game.isDoubleJumping()) {
            this.engine.game.doubleJump();
          }
        }
        break;
      }
      case 81: { // Q
        if (e.ctrlKey) {
          if (this.pointerLockManager.pointerLockElement) {
            this.pointerLockManager.exitPointerLock();
          } else {
            this.pointerLockManager.requestPointerLock();
          }
        } else {
          if (this.engine.game.canToggleAxis()) {
            this.engine.game.toggleAxis();
          } else {
            // clear conflicting aim with quick menu
            this.engine.game.menuUnaim();
          }
        }
        break;
      }
      case 74: { // J
        this.engine.game.inventoryHack = !this.engine.game.inventoryHack;
        break;
      }
      case 27: { // esc
        this.engine.game.setContextMenu(false);
        break;
      }
      /* case 72: { // H
        const debug = metaversefile.useDebug();
        debug.toggle();
        break;
      } */
      case 192: { // tilde
        this.engine.interactionManager.toggleEditMode();
        break;
      }
      /* case 77: { // M
        if (e.ctrlKey) {
          // e.preventDefault();
          // e.stopPropagation();
          this.realmManager.enterMultiplayer();
        }
        break;
      } */
      /* case 221: { // }
        if (e.shiftKey) {
          // e.preventDefault();
          // e.stopPropagation();

          console.debug('>>>>>>> game');
          console.debug('>>>>... world apps:', [...this.realmManager.getRootRealm().appManager.apps.keys()],
            this.realmManager.getRootRealm().appManager);
          const localPlayer = this.engine.playersManager.getLocalPlayer();
          console.debug('>>>>... local player:', localPlayer.playerId, [...localPlayer.appManager.apps.keys()], localPlayer);
          const actions = localPlayer.actionManager.getActionsArray();
          console.debug('>>>>... local player actions:', actions);
          const remotePlayers = this.engine.playersManager.getRemotePlayers();
          for (const remotePlayer of remotePlayers) {
            console.debug('>>>>... remote player:', remotePlayer.playerId, [...remotePlayer.appManager.apps.keys()],
              remotePlayer);
            const actions = remotePlayer.actionManager.getActionsArray();
            console.debug('>>>>... remote player actions:', actions);
          }

          const realms = this.realmManager.getRootRealm().realms;
          if (realms) {
            console.debug('>>>>>>> realms');
            console.debug('>>>>... apps:', realms.world.worldApps.getKeys(), realms.world.worldApps);
          }
        }
        break;
      } */
    }
  }

  keypress = e => {
    if (this.handleCustomEvent(e)) return;

    // XXX
  };

  wheel = e => {
    if (this.handleCustomEvent(e)) return;

    // const physicsScene = physicsManager.getScene();
    // if (physicsScene.getPhysicsEnabled()) {
      this.cameraManager.handleWheelEvent(e);
    // }
  }

  keyup = e => {
    if (this.inputFocused() || e.repeat) {
      return;
    }
    if (this.handleCustomEvent(e)) return;

    if (e.keyCode === 18) { // alt
      // e.preventDefault();
      // e.stopPropagation();
      return;
    }

    switch (e.which) {
      case 87: // W
      case 38: // arrow up
      {
        this.keys.up = false;
        if (!this.freeCamera) {
          this.engine.game.setMovements();
        }
        break;
      }
      case 65: // A
      case 37: // arrow left
      {
        this.keys.left = false;
        if (!this.freeCamera) {
          this.engine.game.setMovements();
        }
        break;
      }
      case 83: // S
      case 40: // arrow down
      {
        this.keys.down = false;
        if (!this.freeCamera) {
          this.engine.game.setMovements();
        }
        break;
      }
      case 68: // D
      case 39: // arrow right
      {
        this.keys.right = false;
        if (!this.freeCamera) {
          this.engine.game.setMovements();
        }
        break;
      }
      case 32: { // space
        this.keys.space = false;
        break;
      }
      case 69: { // E
        if (this.pointerLockManager.pointerLockElement) {
          this.engine.game.menuActivateUp();
        }
        this.keys.keyE = false.
        break;
      }
      case 70: { // F
        this.keys.forward = false;
        break;
      }
      case 67: { // C
        this.keys.backward = false;
        this.keys.ctrl = false;
        break;
      }
      /* case 86: { // V
        // e.preventDefault();
        // e.stopPropagation();
        this.engine.game.menuVUp();
        break;
      } */
      /* case 66: { // B
        // e.preventDefault();
        // e.stopPropagation();
        this.engine.game.menuBUp();
        break;
      } */
      case 16: { // shift
        const oldShift = this.keys.shift;
        const oldDoubleTap = this.keys.doubleTap;

        this.keys.shift = false;
        this.keys.doubleTap = false;

        oldShift && this.engine.game.setSprint(false);
        oldDoubleTap && this.engine.game.menuUnDoubleTap();
        break;
      }
      /* case 46: { // delete
        const object = this.engine.game.getMouseSelectedObject();
        if (object) {
          this.engine.game.setMouseHoverObject(null);
          this.engine.game.setMouseSelectedObject(null);
          world.removeObject(object.instanceId);
        } else if (!e.ctrlKey) {
          this.engine.game.deleteSelectedApp();
        }
        break;
      } */
      case 27: {
        this.engine.game.setMouseSelectedObject(null);
        break;
      }
    }
  };

  mousemove = e => {
    if (this.handleCustomEvent(e)) return;

    if (!this.freeCamera) {
      // if (!this.controlsManager.handleMouseMove(e)) {
        if (this.pointerLockManager.pointerLockElement) {
          this.cameraManager.handleMouseMove(e);
        } else {
          if (this.engine.game.dragging) {
            this.engine.game.menuDrag(e);
            this.engine.game.menuDragRight(e);
          }
        }
        this.raycastManager.setLastMouseEvent(e);
      // }
    } else {
      if (this.pointerLockManager.pointerLockElement) {
        this.freeCameraEuler.x -= e.movementY * cameraSpeed;
        this.freeCameraEuler.x = Math.min(Math.max(this.freeCameraEuler.x, -Math.PI / 2), Math.PI / 2);
        this.freeCameraEuler.y -= e.movementX * cameraSpeed;
      }
    }
  };

  mouseenter = e => {
    if (this.handleCustomEvent(e)) return;

    // XXX
  };
  mouseleave = e => {
    if (this.handleCustomEvent(e)) return;

    // this.controlsManager.handleMouseLeave(e);
  };

  click = e => {
    if (e.defaultPrevented) return;
    if (this.handleCustomEvent(e)) return;

    // if (!this.controlsManager.handleClick(e)) {
      if (this.pointerLockManager.pointerLockElement) {
        if (this.storyManager.getConversation()) {
          this.storyManager.progressConversation();
        } else if (this.zTargetingManager.hasSelectedApp()) {
          this.zTargetingManager.click();
        } else {
          this.engine.interactionManager.menuClick(e);
        }
      } else /*if (!this.engine.game.hoverEnabled)*/ {
        // this.pointerLockManager.requestPointerLock();
      }

      this.raycastManager.setLastMouseEvent(e);
    // }
  };

  dblclick = e => {
    if (this.handleCustomEvent(e)) return;
  };

  mousedown = e => {
    if (e.defaultPrevented) return;
    if (this.handleCustomEvent(e)) return;

    const changedButtons = this.lastMouseButtons ^ e.buttons;
    if (this.pointerLockManager.pointerLockElement) {
      if ((changedButtons & 1) && (e.buttons & 1)) { // left
        this.engine.game.menuMouseDown();
      }
      if ((changedButtons & 2) && (e.buttons & 2)) { // right
        this.engine.game.menuAim();
      }
    } else {
      // if ((changedButtons & 1) && (e.buttons & 1)) { // left
      //   const raycaster = this.raycastManager.getMouseRaycaster(e);
      //   if (raycaster) {
      //     transformControls.handleMouseDown(raycaster);
      //   }
      // }
      if ((changedButtons & 1) && (e.buttons & 2)) { // right
        this.engine.game.menuDragdownRight();
        this.engine.game.setContextMenu(false);
      }
    }
    if ((changedButtons & 4) && (e.buttons & 4)) { // middle
      // e.preventDefault();
      if (!this.pointerLockManager.pointerLockElement) {
        this.pointerLockManager.requestPointerLock();
      }
      // this.engine.game.menuMiddleDown();
    }
    this.lastMouseButtons = e.buttons;
    this.raycastManager.setLastMouseEvent(e);
  };

  mouseup = e => {
    if (e.defaultPrevented) return;
    if (this.handleCustomEvent(e)) return;

    const changedButtons = this.lastMouseButtons ^ e.buttons;
    if (this.pointerLockManager.pointerLockElement) {
      if ((changedButtons & 1) && !(e.buttons & 1)) { // left
        this.engine.game.menuMouseUp();
      }
      if ((changedButtons & 2) && !(e.buttons & 2)) { // right
        this.engine.game.menuUnaim();
      }
    } else {
      if ((changedButtons & 2) && !(e.buttons & 2)) { // right
        this.engine.game.menuDragupRight();
      }
    }
    if ((changedButtons & 4) && !(e.buttons & 4)) { // middle
      // this.engine.game.menuMiddleUp();
    }
    this.lastMouseButtons = e.buttons;
    this.raycastManager.setLastMouseEvent(e);
  };

  pointerdown = e => {
    if (e.defaultPrevented) return;
    if (this.handleCustomEvent(e)) return;
    this.engine.transformControlsManager.pointerDown(e);
  };
  pointerup = e => {
    if (e.defaultPrevented) return;
    if (this.handleCustomEvent(e)) return;
    // console.log('pointer up default prevented', e.defaultPrevented);
    
    if (!this.engine.transformControlsManager.pointerUp(e)) {
      this.pointerLockManager.requestPointerLock();
    }
  };
  pointermove = e => {
    if (e.defaultPrevented) return;
    if (this.handleCustomEvent(e)) return;
    // console.log('pointer up default prevented', e.defaultPrevented);
    this.engine.transformControlsManager.pointerMove(e);
  };
  // pointerhover = e => {
  //   if (this.handleCustomEvent(e)) return;
  //   // console.log('pointer up default prevented', e.defaultPrevented);
  //   this.engine.transformControlsManager.pointerHover(e);
  // };

  /*pointerDown(e) {
    for (const transformControls of this.transformControls) {
      transformControls._onPointerDown(e);
    }
  }
  pointerUp(e) {
    for (const transformControls of this.transformControls) {
      transformControls._onPointerUp(e);
    }
  }
  pointerMove(e) {
    for (const transformControls of this.transformControls) {
      transformControls._onPointerMove(e);
    }
  }
  pointerHover(e) {
    for (const transformControls of this.transformControls) {
      transformControls._onPointerHover(e);
    }
  } */

  //

  dragover(e) {
    if (this.handleCustomEvent(e)) return;

    // XXX
  }
  dragenter(e) {
    if (this.handleCustomEvent(e)) return;

    // XXX
  }
  dragleave(e) {
    if (this.handleCustomEvent(e)) return;

    // XXX
  }
  async drop(e) {
    if (this.handleCustomEvent(e)) return;

    console.log('got drop', e);
    // const [file] = e.files;
    // await file.uint8
    // debugger;
    document.dispatchEvent(new MessageEvent('drop', {
      data: e,
    }));
  }
  dragstart(e) {
    if (this.handleCustomEvent(e)) return;

    // XXX
  }
  drag(e) {
    if (this.handleCustomEvent(e)) return;

    // XXX
  }
  dragend(e) {
    if (this.handleCustomEvent(e)) return;

    // XXX
  }

  //

  paste = e => {
    if (this.handleCustomEvent(e)) return;
    
    if (!globalThis.document.activeElement) {
      const items = Array.from(e.clipboardData.items);
      if (items.length > 0) {
        // e.preventDefault();
        console.log('paste items', items);
      }
    }
  };
}