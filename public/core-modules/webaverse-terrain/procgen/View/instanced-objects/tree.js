import * as THREE from 'three'

import View from '../view.js';
import { chunkMinSize } from '../../utils/constants.js';

const localUpVector = new THREE.Vector3(0, 1, 0);

const localVectorOfPosition = new THREE.Vector3();
const localVectorOfScale = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion(0, 0, 0, 1);

export default class Tree
{
  constructor(instancemanager, terrainState, treeType) {
    this.view = View.getInstance();
    this.scene = this.view.instancedScene;
    this.app = this.view.app;

    this.instancemanager = instancemanager;
    this.terrainState = terrainState;

    this.created = false;

    this.treeType = treeType;

    this.physics = this.view.physics;
    this.physicsTracker = this.view.physicsTracker;
    this.loreManager = this.view.loreManager;
    this.physicsIds = [];
    this.createPhysic = false;

    const treeData = {
      '1': {
        'treeLod1Geometry': this.view.instancesManager.treeOneLod1Geometry, 
        'treeLod0Geometry': this.view.instancesManager.treeOneLod0Geometry, 
        'treePositions': 'treeOnePositions',
        'treeTerrainSlopes': 'treeOneTerrainSlopes',
        'treeInfos': 'treeOneInfos',
      },
      '2': {
        'treeLod1Geometry': this.view.instancesManager.treeTwoLod1Geometry, 
        'treeLod0Geometry': this.view.instancesManager.treeTwoLod0Geometry, 
        'treePositions': 'treeTwoPositions',
        'treeTerrainSlopes': 'treeTwoTerrainSlopes',
        'treeInfos': 'treeTwoInfos',
      },
      '3': {
        'treeLod1Geometry': this.view.instancesManager.treeThreeLod1Geometry, 
        'treeLod0Geometry': this.view.instancesManager.treeThreeLod0Geometry, 
        'treePositions': 'treeThreePositions',
        'treeTerrainSlopes': 'treeThreeTerrainSlopes',
        'treeInfos': 'treeThreeInfos',
      },
    }

    this.terrainState.events.on('ready', () => {
      this.treeLod1Geometry = treeData[treeType].treeLod1Geometry;
      this.treeLod0Geometry = treeData[treeType].treeLod0Geometry;
      this.treePositions = this.terrainState[treeData[treeType].treePositions];
      this.treeTerrainSlopes = this.terrainState[treeData[treeType].treeTerrainSlopes];
      this.treeInfos = this.terrainState[treeData[treeType].treeInfos];

      this.create()
    })
  }

  getGeometry(geometry, positions, slopes, infos) {
    const geometry2 = new THREE.BufferGeometry();
    ['position', 'normal', 'color', 'uv', 'uv2'].forEach(k => {
      geometry2.setAttribute(k, geometry.attributes[k]);
    });
    geometry2.setIndex(geometry.index);

    const positionsAttribute = new THREE.InstancedBufferAttribute(positions, 3);
    geometry2.setAttribute('positions', positionsAttribute);

    const slopesAttribute = new THREE.InstancedBufferAttribute(slopes, 3);
    geometry2.setAttribute('slopes', slopesAttribute);

    const infosAttribute = new THREE.InstancedBufferAttribute(infos, 3);
    geometry2.setAttribute('infos', infosAttribute);

    return geometry2;
  };

  create() {
    const particleCount = this.treePositions.length / 3;

    if (particleCount > 0) {
      const lod1Geometry = this.getGeometry(
        this.treeLod1Geometry, 
        this.treePositions,
        this.treeTerrainSlopes,
        this.treeInfos
      );
      
      this.lod1Mesh = new THREE.InstancedMesh(lod1Geometry, this.view.instancesManager.treeMaterial, particleCount);
      this.lod1Mesh.particleCount = particleCount;
      // this.lod1Mesh.userData.treeType = treeTypeNuber;
      
      // // cast shadow for lod1
      this.lod1Mesh.customDepthMaterial = this.view.instancesManager.treeDepthMaterial
      this.lod1Mesh.castShadow = true;
      // this.lod1Mesh.receiveShadow = true;

      this.scene.add(this.lod1Mesh);



      const lod0Geometry = this.getGeometry(
        this.treeLod0Geometry, 
        this.treePositions,
        this.treeTerrainSlopes,
        this.treeInfos
      );
      this.lod0Mesh = new THREE.InstancedMesh(lod0Geometry, this.view.instancesManager.treeMaterial, particleCount);
      this.lod0Mesh.particleCount = particleCount;
      // this.lod0Mesh.userData.treeType = treeTypeNuber;
  
      // cast shadow for lod0
      this.lod0Mesh.customDepthMaterial = this.view.instancesManager.treeDepthMaterial
      this.lod0Mesh.castShadow = true;
      // this.lod0Mesh.receiveShadow = true;

      this.scene.add(this.lod0Mesh);
      this.lod0Mesh.visible = false;
  
      this.created = true;
    }
    
  }

  handlePhysics() {
    const trunkData = {
      '1': this.view.instancesManager.treeOneTrunkGeometryBuffer,
      '2': this.view.instancesManager.treeTwoTrunkGeometryBuffer,
      '3': this.view.instancesManager.treeThreeTrunkGeometryBuffer,
    }
    const geometryBuffer = trunkData[this.treeType];

    if (geometryBuffer && geometryBuffer.length > 0) {
      const particleCount = this.treePositions.length / 3;
      for (let i = 0; i < particleCount; i ++) {
        localVectorOfPosition.set(
          this.treePositions[i * 3    ],
          this.treePositions[i * 3 + 1],
          this.treePositions[i * 3 + 2],
        );
        localVectorOfScale.set(
          this.treeInfos[i * 3],
          this.treeInfos[i * 3],
          this.treeInfos[i * 3],
        );
        localQuaternion.setFromAxisAngle(localUpVector, this.treeInfos[i * 3 + 1]);
        const physicsId = this.physics.addCookedGeometry(
          geometryBuffer,
          localVectorOfPosition,
          localQuaternion,
          localVectorOfScale
        );
        physicsId.name = 'Tree';
        physicsId.description = 'A normal anime-styled tree.';
        
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