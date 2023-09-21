import * as THREE from 'three'

import View from '../view.js';

export default class Bush
{
  constructor(instancemanager, terrainState) {
    this.view = View.getInstance();
    this.scene = this.view.instancedScene;

    this.instancemanager = instancemanager;
    this.terrainState = terrainState;

    this.created = false;

    
    this.terrainState.events.on('ready', () => {
      this.bushLod1Geometry = this.view.instancesManager.bushLod1Geometry;
      this.bushLod0Geometry = this.view.instancesManager.bushLod0Geometry;
      this.bushPositions = this.terrainState.bushPositions;
      this.bushTerrainSlopes = this.terrainState.bushTerrainSlopes;

      this.create()
    })
  }

  getGeometry(geometry, positions, slopes) {
    const geometry2 = new THREE.BufferGeometry();
    ['position', 'normal', 'uv', 'uv2'].forEach(k => {
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
    const particleCount = this.bushPositions.length / 3;

    if (particleCount > 0) {
      const lod1Geometry = this.getGeometry(
        this.bushLod1Geometry, 
        this.bushPositions,
        this.bushTerrainSlopes
      );
      
      this.lod1Mesh = new THREE.InstancedMesh(lod1Geometry, this.view.instancesManager.bushMaterial, particleCount);
      this.lod1Mesh.particleCount = particleCount;
      
      // // // cast shadow for lod1
      // this.lod1Mesh.customDepthMaterial = this.view.instancesManager.bushDepthMaterial
      // this.lod1Mesh.castShadow = true;
      this.lod1Mesh.receiveShadow = true;

      this.scene.add(this.lod1Mesh);
  
      
      const lod0Geometry = this.getGeometry(
        this.bushLod0Geometry, 
        this.bushPositions,
        this.bushTerrainSlopes
      );
      this.lod0Mesh = new THREE.InstancedMesh(lod0Geometry, this.view.instancesManager.bushMaterial, particleCount);
      this.lod0Mesh.particleCount = particleCount;
      
      // // cast shadow for lod0
      // this.lod0Mesh.customDepthMaterial = this.view.instancesManager.rockDepthMaterial
      // this.lod0Mesh.castShadow = true;
      this.lod0Mesh.receiveShadow = true;

      this.scene.add(this.lod0Mesh);
      this.lod0Mesh.visible = false;
  
      this.created = true;
    }
    
  }

  showLod0() {
    if (this.lod0Mesh && !this.lod0Mesh.visible) {
      this.lod0Mesh.visible = true;
    }
    if (this.lod1Mesh && this.lod1Mesh.visible) {
      this.lod1Mesh.visible = false;
    }
  }

  showLod1() {
    if (this.lod1Mesh && !this.lod1Mesh.visible) {
      this.lod1Mesh.visible = true;
    }
    if (this.lod0Mesh && this.lod0Mesh.visible) {
      this.lod0Mesh.visible = false;
    }
  }

  destroy() {
    if (this.created) {
      this.lod1Mesh.geometry.dispose();
      this.scene.remove(this.lod1Mesh);

      this.lod0Mesh.geometry.dispose();
      this.scene.remove(this.lod0Mesh);
    }
    
  }
}