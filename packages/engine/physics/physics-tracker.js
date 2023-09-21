import * as THREE from 'three';
// import {
//   getOwnerApp,
//   getOwnerScn,
// } from './physics-traverse-utils.js';
// import physicsManager from './physics-manager.js';

//

const localMatrix = new THREE.Matrix4();
const localMatrix2 = new THREE.Matrix4();

//

export class PhysicsTracker {
  constructor() {
    // nothing
  }
  #physicsObjects = new Map();
  #physicsObjectApps = new Map();
  #physicsObjectAppTransforms = new Map();

  getPhysicsObjects() {
    return Array.from(this.#physicsObjects.values());
  }

  addAppPhysicsObject(app, physicsObject) {
    this.#physicsObjects.set(physicsObject.physicsId, physicsObject);
    this.#physicsObjectApps.set(physicsObject.physicsId, app);
    this.#physicsObjectAppTransforms.set(physicsObject.physicsId, app.matrixWorld.clone());
  }
  removeAppPhysicsObject(app, physicsObject) {
    this.#physicsObjects.delete(physicsObject.physicsId);
    this.#physicsObjectApps.delete(physicsObject.physicsId);
    this.#physicsObjectAppTransforms.delete(physicsObject.physicsId);
  }
  getAppByPhysicsId(physicsId) {
    return this.#physicsObjectApps.get(physicsId) || null;
  }
  getPhysicsObjectByPhysicsId(physicsId) {
    return this.#physicsObjects.get(physicsId) || null;
  }
  getPairByPhysicsId(physicsId) {
    const app = this.getAppByPhysicsId(physicsId);
    const physicsObject = this.getPhysicsObjectByPhysicsId(physicsId);
    return [
      app,
      physicsObject,
    ];
  }

  getAppPhysicsObjects(app) {
    const result = [];
    for (const physicsObject of this.#physicsObjects.values()) {
      if (this.#physicsObjectApps.get(physicsObject.physicsId) === app) {
        result.push(physicsObject);
      }
    }
    return result;
  }

  syncPhysicsObjectTransformToApp(physicsObject) {
    const physicsId = physicsObject.physicsId;
    const app = this.getAppByPhysicsId(physicsId);
    if (app) {
      // compute matrix delta
      const physicsObjectAppTransform = this.#physicsObjectAppTransforms.get(physicsId);
      localMatrix.copy(physicsObjectAppTransform)
        .invert()
        .premultiply(app.matrixWorld);

      // apply matrix delta
      physicsObject.matrixWorld.premultiply(localMatrix);
      if (physicsObject.parent) {
        physicsObject.matrix.copy(physicsObject.matrixWorld)
          .premultiply(localMatrix2.copy(physicsObject.parent.matrixWorld).invert());
      } else {
        physicsObject.matrix.copy(physicsObject.matrixWorld);
      }
      physicsObject.matrix.decompose(physicsObject.position, physicsObject.quaternion, physicsObject.scale);

      // update children
      for (let i = 0; i < physicsObject.children.length; i++) {
        const child = physicsObject.children[i];
        child.updateMatrixWorld();
      }

      // latch new matrix
      physicsObjectAppTransform.copy(app.matrixWorld);
    } else {
      throw new Error('no app for physics object:' + physicsId);
    }
  }
}