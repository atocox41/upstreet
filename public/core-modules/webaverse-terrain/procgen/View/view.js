import * as THREE from 'three';

import Terrains from './terrains.js';
import SkyManager from './sky-manager.js';
import WaterManager from './water-manager.js';
import InstancesManager from './instances-manager.js';
import AvatarManager from './avatar-manager.js';

export default class View {
  static instance;

  static getInstance() {
    return View.instance;
  }

  constructor(player, scene, camera, layers, timeRate, physics, physicsTracker, loreManager, importManager, texturePacks, models, internals) {
    if (View.instance) return View.instance;

    View.instance = this;
    this.player = player;
    this.internals = internals;
    this.app = scene;
    this.scene = scene;
    this.layers = layers;
    this.timeRate = timeRate;
    this.instancedScene = new THREE.Group(); // the scene contain the instanced mesh that are not render in water reflector
    this.scene.add(this.instancedScene);
    this.camera = camera;
    this.physics = physics;
    this.physicsTracker = physicsTracker;
    this.loreManager = loreManager;
    this.importManager = importManager;
    this.texturePacks = texturePacks;
    this.models = models;

    this.skyManager = new SkyManager();
    this.terrains = new Terrains(); 
    this.waterManager = new WaterManager();

    this.instancesManager = new InstancesManager();

    this.avatarManager = new AvatarManager();
    
  }
  
  update(timestamp) {
    this.waterManager.update(timestamp);
    this.skyManager.update(timestamp);
    this.terrains.update(timestamp);
    this.instancesManager.update(timestamp);
    this.avatarManager.update();
  }

  destroy() {
  }
}