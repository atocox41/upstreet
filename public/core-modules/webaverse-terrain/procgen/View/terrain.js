import * as THREE from 'three'

import View from './view.js'
import State from '../State/state.js';


export default class Terrain {
  constructor(terrains, terrainState, positionVector, scaleVector, quaternionVector) {
    this.state = State.getInstance();
    this.view = View.getInstance();
    this.scene = this.view.scene;
    this.physics = this.view.physics;
    this.physicsTracker = this.view.physicsTracker;
    this.loreManager = this.view.loreManager;
    this.app = this.view.app;
    this.physicsId = null;
    
    this.created = false;
    this.live = true;

    this.positionVector = positionVector;
    this.scaleVector = scaleVector;
    this.quaternionVector = quaternionVector;

    this.terrains = terrains;
    this.terrainState = terrainState;
    this.terrainState.renderInstance = this;
    this.terrainState.events.on('ready', () => {
      this.create()
    });
  }

  create() {
    const terrainsState = this.state.terrains;
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.terrainState.positions, 3));
    this.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.terrainState.uv, 2));
    this.geometry.setAttribute('weight', new THREE.Float32BufferAttribute(this.terrainState.biomeWeight, 4));
   
    this.geometry.setIndex(
      new THREE.BufferAttribute(this.terrainState.indices, 1)
    );

    this.texture = new THREE.DataTexture(
      this.terrainState.texture,
      terrainsState.segments,
      terrainsState.segments,
      THREE.RGBAFormat,
      THREE.FloatType,
      THREE.UVMapping,
      THREE.ClampToEdgeWrapping,
      THREE.ClampToEdgeWrapping,
      THREE.LinearFilter,
      THREE.LinearFilter
    );
    this.texture.flipY = false;
    this.texture.needsUpdate = true;

    
    // Create mesh
    this.mesh = new THREE.Mesh(this.geometry, this.terrains.material);
    this.mesh.receiveShadow = true;
    // this.mesh.castShadow = true;
    
    this.mesh.userData.texture = this.texture

    const _handlePhysics = async () => {
      const geometryBuffer = await this.physics.cookGeometryAsync(
        this.mesh,
      );
      if (!this.live) return;

      if (geometryBuffer && geometryBuffer.length !== 0) {
        const physicsId = this.physics.addCookedGeometry(
          geometryBuffer,
          this.positionVector,
          this.quaternionVector,
          this.scaleVector
        );
        physicsId.name = 'Terrain';
        physicsId.description = 'An epic landscape.';
        physicsId.isTerrain = true;
        this.physicsId = physicsId;
        
        this.physicsTracker.addAppPhysicsObject(this.app, physicsId);

        const k = this.app.instanceId + ':' + (physicsId.physicsId + '').padStart(5, '0');
        this.loreManager.addItemSpec(k, {
          name: physicsId.name,
          description: physicsId.description,
        }, physicsId);
      }
    }
    _handlePhysics();
    
    
    
    this.scene.add(this.mesh);
    
    this.created = true;
  }

  destroy() {
    this.live = false;

    if (this.created) {
      this.geometry.dispose();
      this.scene.remove(this.mesh);

      if (this.physicsId) {
        this.physics.removeGeometry(this.physicsId);
        this.physicsTracker.removeAppPhysicsObject(this.app, this.physicsId);

        const k = this.app.instanceId + ':' + (this.physicsId.physicsId + '').padStart(5, '0');
        this.loreManager.removeItemSpec(k);
      }
    }
  }
}