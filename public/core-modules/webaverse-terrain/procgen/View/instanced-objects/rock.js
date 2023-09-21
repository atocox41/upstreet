import * as THREE from 'three'

import View from '../view.js';

import { chunkMinSize } from '../../utils/constants.js';

const localUpVector = new THREE.Vector3(0, 1, 0);

const localVectorOfPosition = new THREE.Vector3();
const localVectorOfScale = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion(0, 0, 0, 1);

export default class Rock
{
  constructor(instancemanager, terrainState) {
    this.view = View.getInstance();
    this.scene = this.view.instancedScene;
    this.app = this.view.app;

    this.instancemanager = instancemanager;
    this.terrainState = terrainState;

    this.created = false;
    
    this.physics = this.view.physics;
    this.physicsTracker = this.view.physicsTracker;
    this.loreManager = this.view.loreManager;
    this.physicsIds = [];
    this.createPhysic = false;

    
    this.terrainState.events.on('ready', () => {
      this.rockLod1Geometry = this.view.instancesManager.rockLod1Geometry;
      this.rockLod0Geometry = this.view.instancesManager.rockLod0Geometry;
      this.rockPositions = this.terrainState.rockPositions;
      this.rockTerrainSlopes = this.terrainState.rockTerrainSlopes;
      this.rockInfos = this.terrainState.rockInfos;

      this.create()
    })
  }

  getGeometry(geometry, positions, slopes, infos) {
    const geometry2 = new THREE.BufferGeometry();
    ['position', 'normal', 'uv'].forEach(k => {
      geometry2.setAttribute(k, geometry.attributes[k]);
    });
    geometry2.setIndex(geometry.index);

    const positionsAttribute = new THREE.InstancedBufferAttribute(positions, 3);
    geometry2.setAttribute('positions', positionsAttribute);

    const slopesAttribute = new THREE.InstancedBufferAttribute(slopes, 3);
    geometry2.setAttribute('slopes', slopesAttribute);

    const infosAttribute = new THREE.InstancedBufferAttribute(infos, 4);
    geometry2.setAttribute('infos', infosAttribute);

    return geometry2;
  };


  create() {
    const particleCount = this.rockPositions.length / 3;

    if (particleCount > 0) {
      const lod1Geometry = this.getGeometry(
        this.rockLod1Geometry, 
        this.rockPositions,
        this.rockTerrainSlopes,
        this.rockInfos
      );
      
      this.lod1Mesh = new THREE.InstancedMesh(lod1Geometry, this.view.instancesManager.rockMaterial, particleCount);
      this.lod1Mesh.particleCount = particleCount;
      
      // // // cast shadow for lod1
      // this.lod1Mesh.customDepthMaterial = this.view.instancesManager.rockDepthMaterial
      // this.lod1Mesh.castShadow = true;
      this.lod1Mesh.receiveShadow = true;

      this.scene.add(this.lod1Mesh);
  
      
      const lod0Geometry = this.getGeometry(
        this.rockLod0Geometry, 
        this.rockPositions,
        this.rockTerrainSlopes,
        this.rockInfos
      );
      this.lod0Mesh = new THREE.InstancedMesh(lod0Geometry, this.view.instancesManager.rockMaterial, particleCount);
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

  handlePhysics() {
    const geometryBuffer = this.view.instancesManager.rockGeometryBuffer;

    if (geometryBuffer && geometryBuffer.length > 0) {
      const particleCount = this.terrainState.rockPositions.length / 3;
      for (let i = 0; i < particleCount; i ++) {
        localVectorOfPosition.set(
          this.terrainState.rockPositions[i * 3    ],
          this.terrainState.rockPositions[i * 3 + 1],
          this.terrainState.rockPositions[i * 3 + 2],
        );
        localVectorOfScale.set(
          this.terrainState.rockInfos[i * 4    ],
          this.terrainState.rockInfos[i * 4 + 1],
          this.terrainState.rockInfos[i * 4 + 2],
        );
        localQuaternion.setFromAxisAngle(localUpVector, this.terrainState.rockInfos[i * 4 + 3]);
        const physicsId = this.physics.addCookedGeometry(
          geometryBuffer,
          localVectorOfPosition,
          localQuaternion,
          localVectorOfScale
        );
        physicsId.name = 'Rock';
        physicsId.description = 'A normal anime-styled rock.';
        
        this.physicsIds.push(physicsId);
        this.physics.disableGeometryQueries(physicsId);
        this.physicsTracker.addAppPhysicsObject(this.app, physicsId);
        
        const k = this.app.instanceId + ':' + (physicsId.physicsId + '').padStart(5, '0');
        this.loreManager.addItemSpec(k, {
          name: physicsId.name,
          description: physicsId.description,
        }, physicsId);

        this.createPhysic = true;
      } 
    }
  }

  showLod0() {
    if (this.created && !this.createPhysic && this.terrainState.size === chunkMinSize) {
      this.handlePhysics();
    }
    if (this.lod0Mesh && !this.lod0Mesh.visible) {
      this.lod0Mesh.visible = true;
      for (const physicsId of this.physicsIds) {
        this.physics.enableGeometryQueries(physicsId);
      }
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
      for (const physicsId of this.physicsIds) {
        this.physics.disableGeometryQueries(physicsId);
      }
    }
  }

  destroy() {
    if (this.created) {
      this.lod1Mesh.geometry.dispose();
      this.scene.remove(this.lod1Mesh);

      this.lod0Mesh.geometry.dispose();
      this.scene.remove(this.lod0Mesh);

      for (const physicsId of this.physicsIds) {
        this.physics.removeGeometry(physicsId);
        this.physicsTracker.removeAppPhysicsObject(this.app, physicsId);

        const k = this.app.instanceId + ':' + (physicsId.physicsId + '').padStart(5, '0');
        this.loreManager.removeItemSpec(k);
      }
    }
    
  }
}