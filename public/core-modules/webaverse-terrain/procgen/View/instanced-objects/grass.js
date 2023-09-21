import * as THREE from 'three'

import View from '../view.js';
import { chunkMinSize, chunkMaxDepth } from '../../utils/constants.js';

export default class Grass {
  constructor(instancemanager, terrainState) {
    this.view = View.getInstance();
    this.scene = this.view.instancedScene;

    this.created = false;

    this.instancemanager = instancemanager;
    this.terrainState = terrainState;
    this.terrainState.events.on('ready', () => {
      this.create()
    })
  }

  getGeometry(geometry, positions, slopes) {
    const geometry2 = new THREE.BufferGeometry();
    ['position', 'normal', 'uv'].forEach(k => {
    geometry2.setAttribute(k, geometry.attributes[k]);
    });
    geometry2.setIndex(geometry.index);

    const positionsAttribute = new THREE.InstancedBufferAttribute(positions, 3);
    geometry2.setAttribute('positions', positionsAttribute);

    const slopesAttribute = new THREE.InstancedBufferAttribute(slopes, 3);
    geometry2.setAttribute('slopes', slopesAttribute);

    return geometry2;
  };


  create() {
    const particleCount = this.terrainState.grassPositions.length / 3;
    if (particleCount > 0 && this.terrainState.size === chunkMinSize) {
      const geometry = this.getGeometry(
        this.view.instancesManager.grassGeometry, 
        this.terrainState.grassPositions, 
        this.terrainState.grassTerrainSlopes, 
      );
      this.mesh = new THREE.InstancedMesh(geometry, this.view.instancesManager.grassMaterial, particleCount);
      this.mesh.particleCount = particleCount;
      this.mesh.userData.fadePosition = this.view.instancesManager.plantFadeOutThreshold;
      this.mesh.receiveShadow = true;
      this.scene.add(this.mesh);
      this.mesh.visible = false;
      this.created = true;
    }
  }

  setFadePosition(fadePosition) {
    if (this.created) {
      this.mesh.userData.fadePosition = fadePosition;
    }
  }
  
  showMesh() {
    if (this.mesh && !this.mesh.visible) {
      this.mesh.visible = true;
    }
  }

  hideMesh() {
    if (this.mesh && this.mesh.visible) {
      this.mesh.visible = false;
    }
  }

  destroy() {
    if (this.created) {
      this.mesh.geometry.dispose();
      this.scene.remove(this.mesh);
    }
  }
}