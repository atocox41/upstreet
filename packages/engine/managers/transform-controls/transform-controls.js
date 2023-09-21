import * as THREE from 'three';
import physicsManager from '../../physics/physics-manager.js';

import {
  TransformControls,
} from '../../transform-controls/TransformControls.js';

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector2D = new THREE.Vector2();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localRaycaster = new THREE.Raycaster();

//

export class TransformControlsManager extends EventTarget {
  constructor({
    engineRenderer,
    physicsTracker,
    appManagerContext,
  }) {
    super();

    this.engineRenderer = engineRenderer;
    this.physicsTracker = physicsTracker;
    this.appManagerContext = appManagerContext;

    this.transformControls = new Set();
    this.transformControlsEnabled = false;

    this.hoveredPhysicsApp = null;
    this.hoveredPhysicsObject = null;
  }

  createTransformControls() {
    const {renderer, scene, camera} = this.engineRenderer;
    const transformControls = new TransformControls(camera, renderer.domElement);
    scene.add(transformControls);
    transformControls.updateMatrixWorld();
    transformControls.setMode('translate');

    const modes = [
      'translate',
      'rotate',
      'scale',
    ];
    transformControls.toggleMode = function() {
      const mode = this.getMode();
      const index = modes.indexOf(mode);
      const newMode = modes[(index + 1) % modes.length];
      this.setMode(newMode);
    };

    this.transformControls.add(transformControls);

    return transformControls;
  }
  destroyTransformControls(transformControls) {
    transformControls.parent.remove(transformControls);

    this.transformControls.delete(transformControls);
  }

  isEnabled() {
    return this.transformControls.size > 0;
  }
  toggleMode() {
    for (const transformControls of this.transformControls) {
      transformControls.toggleMode();
    }
  }

  pointerDown(e) {
    let handled = false;
    for (const transformControls of this.transformControls) {
      if (transformControls._onPointerDown(e)) {
        handled = true;
      }
    }
    return handled;
  }
  pointerUp(e) {
    let handled = false;
    for (const transformControls of this.transformControls) {
      if (transformControls._onPointerUp(e)) {
        handled = true;
      }
    }

    // try to select hovered physics object
    if (!handled) {
      if (this.hoveredPhysicsObject) {
        globalThis.hoveredPhysicsApp = this.hoveredPhysicsApp;
        globalThis.hoveredPhysicsObject = this.hoveredPhysicsObject;

        this.dispatchEvent(new MessageEvent('select', {
          data: {
            app: this.hoveredPhysicsApp,
            physicsObject: this.hoveredPhysicsObject,
          },
        }));

        handled = true;
      } else {
        this.dispatchEvent(new MessageEvent('select', {
          data: {
            app: null,
            physicsObject: null,
          },
        }));
      }
    }

    return handled;
  }
  clearHoveredPhysicsObject() {
    if (this.hoveredPhyiscsApp) {
      this.hoveredPhysicsApp = null;
    }
    if (this.hoveredPhysicsObject) {
      this.hoveredPhysicsObject.parent.remove(this.hoveredPhysicsObject);
      this.hoveredPhysicsObject = null;
    }
  }
  pointerMove(e) {
    let handled = false;
    for (const transformControls of this.transformControls) {
      if (transformControls._onPointerMove(e)) {
        handled = true;
      }
    }

    // hover physics objects
    this.clearHoveredPhysicsObject();

    if (this.transformControlsEnabled) {
      const {scene, camera, renderer} = this.engineRenderer;
      // set raycaster from camera
      if (!document.pointerLockElement) {
        localVector2D.set(
          (e.clientX / renderer.domElement.width) * 2 - 1,
          -(e.clientY / renderer.domElement.height) * 2 + 1
        );
      } else {
        localVector2D.set(0, 0);
      }
      localRaycaster.setFromCamera(localVector2D, camera);
      const p = localRaycaster.ray.origin;
      const q = localQuaternion.setFromRotationMatrix(
        localMatrix.lookAt(
          localVector.set(0, 0, 0),
          localRaycaster.ray.direction,
          localVector2.set(0, 1, 0)
        )
      );
      const physicsScene = physicsManager.getScene();
      const intersection = physicsScene.raycast(p, q);
      if (intersection) {
        const [
          app,
          physicsObject,
        ] = this.physicsTracker.getPairByPhysicsId(intersection.objectId);

        const appManager = this.appManagerContext.getAppManager();
        const apps = appManager.getApps();
        if (app && apps.includes(app) && physicsObject && !physicsObject.isTerrain) {
          this.hoveredPhysicsApp = app;

          this.hoveredPhysicsObject = physicsObject;
          scene.add(this.hoveredPhysicsObject);
        }
      }
    }

    return handled;
  }
  pointerHover(e) {
    let handled = false;
    for (const transformControls of this.transformControls) {
      if (transformControls._onPointerHover(e)) {
        handled = true;
      }
    }
    return handled;
  }

  getControlsEnabled() {
    return this.transformControlsEnabled;
  }
  setControlsEnabled(enabled) {
    this.transformControlsEnabled = enabled;

    if (!enabled) {
      this.clearHoveredPhysicsObject();
    }
  }

  update(timestamp, timeDiff) {
    for (const transformControls of this.transformControls) {
      transformControls.updateMatrixWorld();
    }
  }
}