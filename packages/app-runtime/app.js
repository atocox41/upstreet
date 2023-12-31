import * as THREE from 'three';
// import murmurhash from 'murmurhash';

export class App extends THREE.Object3D {
  constructor() {
    super();

    this.isApp = true;
    this.spec = {};
    this.components = [];
    this.name = '';
    this.description = '';
    this.appType = 'none';
    this.lastMatrix = new THREE.Matrix4();
  }

  getName() {
    return this.spec.content.name;
  }
  getDescription() {
    return this.spec.content.description;
  }

  getComponent(key) {
    const component = this.components.find(component => component.key === key);
    return component ? component.value : null;
  }

  #setComponentInternal(key, value) {
    let component = this.components.find(component => component.key === key);
    if (!component) {
      component = {key, value};
      this.components.push(component);
    }
    component.key = key;
    component.value = value;
    this.dispatchEvent({
      type: 'componentupdate',
      key,
      value,
    });
  }

  setComponent(key, value = true) {
    this.#setComponentInternal(key, value);
    this.dispatchEvent({
      type: 'componentsupdate',
      keys: [key],
    });
  }

  setComponents(o) {
    if (Array.isArray(o)) {
      const keys = [];
      for (const {key, value} of o) {
        this.#setComponentInternal(key, value);
        keys.push(key);
      }
      keys.length > 0 && this.dispatchEvent({
        type: 'componentsupdate',
        keys,
      });
    } else {
      const keys = Object.keys(o);
      for (const k of keys) {
        const v = o[k];
        this.#setComponentInternal(k, v);
      }
      keys.length > 0 && this.dispatchEvent({
        type: 'componentsupdate',
        keys,
      });
    }
  }

  hasComponent(key) {
    return this.components.some(component => component.key === key);
  }

  removeComponent(key) {
    const index = this.components.findIndex(component => component.key === key);
    if (index !== -1) {
      this.components.splice(index, 1);
      this.dispatchEvent({
        type: 'componentupdate',
        key,
        value: null,
      });
    }
  }

  get contentId() {
    const contentIdComponent = this.getComponent('contentId');
    return (contentIdComponent !== null) ? contentIdComponent : '';
  }

  set contentId(contentId) {
    this.setComponent('contentId', contentId + '');
  }

  get instanceId() {
    const instanceIdComponent = this.getComponent('instanceId');
    return (instanceIdComponent !== null) ? instanceIdComponent : '';
  }

  set instanceId(instanceId) {
    this.setComponent('instanceId', instanceId + '');
  }

  /* getPhysicsObjects() {
    return this.physicsObjects;
  } */

  /* addPhysicsObject(object) {
    this.physicsObjects.push(object);
  }

  removePhysicsObject(object) {
    const removeIndex = this.physicsObjects.indexOf(object);
    if (removeIndex !== -1) {
      this.physicsObjects.splice(removeIndex);
    }
  }

  setPhysicsObject(object) {
    this.physicsObjects.length = 0;
    this.physicsObjects.push(object);
  } */

  /* hit(damage, opts) {
    this.hitTracker && this.hitTracker.hit(damage, opts);
  } */

  getRenderSettings() {
    if (this.hasSubApps) {
      return renderSettingsManager.findRenderSettings(this);
    } else {
      return null;
    }
  }

  activate({
    physicsId = -1,
  } = {}) {
    this.dispatchEvent({
      type: 'activate',
      physicsId,
    });
  }

  wear() {
    const localPlayer = playersManager.getLocalPlayer();
    localPlayer.wear(this);
  }

  unwear() {
    const localPlayer = playersManager.getLocalPlayer();
    localPlayer.unwear(this);
  }

  use() {
    this.dispatchEvent({
      type: 'use',
      use: true,
    });
  }

  destroy() {
    this.dispatchEvent({
      type: 'destroy',
    });
  }
}