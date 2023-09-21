import * as THREE from 'three';

import State from "../State/state.js";
import View from './view.js';
import Grass from './instanced-objects/grass.js';
import Flower from './instanced-objects/flower.js';
import Bush from './instanced-objects/bush.js';
import Reed from './instanced-objects/reed.js';
import Tree from './instanced-objects/tree.js';
import Rock from './instanced-objects/rock.js';
import InstanceObject from './instanced-objects/object.js';
import InstanceAvatar from './instanced-objects/avatar.js';
import InstanceMob from './instanced-objects/mob.js';

import objectRegistry from './registries/object-registry.js';
import avatarRegistry from './registries/avatar-registry.js'
import mobRegistry from './registries/mob-registry.js';

import { skySettings } from '../utils/constants.js';

// const localVector = new THREE.Vector3();
const localMatrix = new THREE.Matrix4();

import { grassVertexShader, grassFragmentShader } from './Material/grass/shader.js';

import { flowerVertexShader, flowerFragmentShader } from './Material/flower/shader.js';

import { bushVertexShader, bushFragmentShader } from './Material/bush/shader.js';

import { reedVertexShader, reedFragmentShader } from './Material/reed/shader.js';

import { treeVertexShader, treeFragmentShader } from './Material/tree/shader.js';
import { customSahdowShader } from './Material/tree/custom-shadow-shader.js';

import { rockVertexShader, rockFragmentShader } from './Material/rock/shader.js';

export default class InstancesManager {
  constructor() {
    
    this.grasses = new Map();
    this.flowers = new Map();
    this.bushes = new Map();
    this.reeds = new Map();
    this.rocks = new Map();
    this.treeOnes = new Map();
    this.treeTwos = new Map();
    this.treeThrees = new Map();
    this.objects = new Map();
    this.avatars = new Map();
    this.mobs = new Map();
    
    this.chunksInScene = new Map();

    this.plantFadeSpeed = 0.01;
    this.plantFadeOutThreshold = 1;
    this.plantFadeInThreshold = 0;

    this.state = State.getInstance();
    this.view = View.getInstance();
    this.skyManager = this.view.skyManager;
    this.player = this.view.player;
    this.camera = this.view.camera;
    this.layers = this.view.layers;
    this.texturePacks = this.view.texturePacks;
    this.physics = this.view.physics;

    this.globalUniforms = {
      uTime: {
        value: 0
      },
      isDay: {
        value: true
      },
      fadePosition: {
        value: 0
      },
      eye: {
        value: new THREE.Vector3()
      },
      playerPosition: {
        value: new THREE.Vector3()
      },
      sunPosition: {
        value: new THREE.Vector3()
      },
      noiseTexture: {
        value: this.getTexureByName('noise3')
      },
      waveNoiseTexture: {
        value: this.getTexureByName('noise4')
      },
      uDayCycleProgress: {
        value: 0
      }
    }

    this.setGrassGeometry();
    this.setGrassMaterial();

    this.setFlowerGeometry();
    this.setFlowerMaterial();

    this.setBushGeometry();
    this.setBushMaterial();

    this.setReedGeometry();
    this.setReedMaterial();

    this.setRockGeometry();
    this.setRockMaterial();

    this.setTreeGeometry();
    this.setTreeMaterial();
    
    this.frustum = new THREE.Frustum();
    
    this.state.terrains.events.on('create', (engineTerrain) => {
      const grass = new Grass(this, engineTerrain);
      const flower = new Flower(this, engineTerrain);
      const bush = new Bush(this, engineTerrain);
      const reed = new Reed(this, engineTerrain);
      const rock = new Rock(this, engineTerrain);
      const treeOne = new Tree(this, engineTerrain, '1');
      const treeTwo = new Tree(this, engineTerrain, '2');
      const treeThree = new Tree(this, engineTerrain, '3');
      const instanceObject = this.layers.object ? new InstanceObject(this, engineTerrain, objectRegistry) : null;
      const instanceAvatar = this.layers.avatar ? new InstanceAvatar(this, engineTerrain, avatarRegistry) : null;
      const instanceMob = this.layers.mob ? new InstanceMob(this, engineTerrain, mobRegistry) : null;
      
      this.grasses.set(engineTerrain.id, grass);
      this.flowers.set(engineTerrain.id, flower);
      this.bushes.set(engineTerrain.id, bush);
      this.reeds.set(engineTerrain.id, reed);
      this.rocks.set(engineTerrain.id, rock);
      this.treeOnes.set(engineTerrain.id, treeOne);
      this.treeTwos.set(engineTerrain.id, treeTwo);
      this.treeThrees.set(engineTerrain.id, treeThree);
      instanceObject && this.objects.set(engineTerrain.id, instanceObject);
      instanceAvatar && this.avatars.set(engineTerrain.id, instanceAvatar);
      instanceMob && this.mobs.set(engineTerrain.id, instanceMob);
      
      engineTerrain.events.on('destroy', () => {
        grass.destroy();
        flower.destroy();
        bush.destroy();
        reed.destroy();
        rock.destroy();
        treeOne.destroy();
        treeTwo.destroy();
        treeThree.destroy();
        instanceObject && instanceObject.destroy();
        instanceAvatar && instanceAvatar.destroy();
        instanceMob && instanceMob.destroy();
        
        this.grasses.delete(engineTerrain.id);
        this.flowers.delete(engineTerrain.id);
        this.bushes.delete(engineTerrain.id);
        this.reeds.delete(engineTerrain.id);
        this.rocks.delete(engineTerrain.id);
        this.treeOnes.delete(engineTerrain.id);
        this.treeTwos.delete(engineTerrain.id);
        this.treeThrees.delete(engineTerrain.id);
        this.objects.delete(engineTerrain.id);
        this.avatars.delete(engineTerrain.id);
        this.mobs.delete(engineTerrain.id);
      })
    })
  }

  getTexureByName(textureName) {
    return this.texturePacks.find(x => x.name === textureName).texture;
  }

  isObjectVisible(boundingBox) {
    this.frustum.setFromProjectionMatrix(localMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
    return this.frustum.intersectsBox(boundingBox);
  }

  setGrassGeometry() {
    this.view.models.particleModels.grass.scene.traverse(o => {
      if (o.isMesh) {
        this.grassGeometry = o.geometry;
      }
    });
  }

  setGrassMaterial() {
    const grassUniforms = {

    }
    const uniforms = Object.assign({}, THREE.UniformsLib.lights, grassUniforms);
    this.grassMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader:grassVertexShader,
      fragmentShader: grassFragmentShader,
      side: THREE.DoubleSide,
      lights: true,
    });
    this.grassMaterial.uniforms.uTime = this.globalUniforms.uTime;
    this.grassMaterial.uniforms.isDay = this.globalUniforms.isDay;
    this.grassMaterial.uniforms.fadePosition = this.globalUniforms.fadePosition;
    this.grassMaterial.uniforms.eye = this.globalUniforms.eye;
    this.grassMaterial.uniforms.playerPosition = this.globalUniforms.playerPosition;
    this.grassMaterial.uniforms.sunPosition = this.globalUniforms.sunPosition;
    this.grassMaterial.uniforms.noiseTexture = this.globalUniforms.noiseTexture;
    this.grassMaterial.uniforms.waveNoiseTexture = this.globalUniforms.waveNoiseTexture;

    this.grassMaterial.onBeforeRender = (renderer, scene, camera, geometry, mesh) => {
      this.grassMaterial.uniforms.fadePosition.value = mesh.userData.fadePosition;
      this.grassMaterial.uniformsNeedUpdate = true;
    }
  }

  setFlowerGeometry() {
    this.view.models.particleModels.flower.scene.traverse(o => {
      if (o.isMesh) {
        this.flowerGeometry = o.geometry;
        this.flowerTexture = o.material.map;
      }
    });
  }

  setFlowerMaterial() {
    this.flowerMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMap: {
          value: this.flowerTexture
        }
      },
      vertexShader:flowerVertexShader,
      fragmentShader: flowerFragmentShader,
      side: THREE.DoubleSide,
    });
    this.flowerMaterial.uniforms.uTime = this.globalUniforms.uTime;
    this.flowerMaterial.uniforms.isDay = this.globalUniforms.isDay;
    this.flowerMaterial.uniforms.fadePosition = this.globalUniforms.fadePosition;
    this.flowerMaterial.uniforms.eye = this.globalUniforms.eye;
    this.flowerMaterial.uniforms.playerPosition = this.globalUniforms.playerPosition;
    this.flowerMaterial.uniforms.sunPosition = this.globalUniforms.sunPosition;
    this.flowerMaterial.uniforms.noiseTexture = this.globalUniforms.noiseTexture;
    this.flowerMaterial.uniforms.waveNoiseTexture = this.globalUniforms.waveNoiseTexture;

    this.flowerMaterial.onBeforeRender = (renderer, scene, camera, geometry, mesh) => {
      this.flowerMaterial.uniforms.fadePosition.value = mesh.userData.fadePosition;
      this.flowerMaterial.uniformsNeedUpdate = true;
    }
  }

  setBushGeometry() {
    this.view.models.particleModels.bushLod0.scene.traverse(o => {
      if (o.isMesh) {
        this.bushLod0Geometry = o.geometry;
      }
    });
    this.view.models.particleModels.bushLod1.scene.traverse(o => {
      if (o.isMesh) {
        this.bushLod1Geometry = o.geometry;
      }
    });
  }

  setBushMaterial() {
    const bushUniforms = {
      bushTexture: {
        value: this.getTexureByName('leaf7')
      },
    }
    const uniforms = Object.assign({}, THREE.UniformsLib.lights, bushUniforms);
    this.bushMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader:bushVertexShader,
      fragmentShader: bushFragmentShader,
      side: THREE.DoubleSide,
      lights: true,
    });
    this.bushMaterial.uniforms.uTime = this.globalUniforms.uTime;
    this.bushMaterial.uniforms.isDay = this.globalUniforms.isDay;
    this.bushMaterial.uniforms.fadePosition = this.globalUniforms.fadePosition;
    this.bushMaterial.uniforms.eye = this.globalUniforms.eye;
    this.bushMaterial.uniforms.playerPosition = this.globalUniforms.playerPosition;
    this.bushMaterial.uniforms.sunPosition = this.globalUniforms.sunPosition;
    this.bushMaterial.uniforms.noiseTexture = this.globalUniforms.noiseTexture;
    this.bushMaterial.uniforms.waveNoiseTexture = this.globalUniforms.waveNoiseTexture;

    this.bushMaterial.uniforms.uDawnAngleAmplitude = skySettings.uDawnAngleAmplitude;
    this.bushMaterial.uniforms.uDawnElevationAmplitude = skySettings.uDawnElevationAmplitude; 
    this.bushMaterial.uniforms.uSunAmplitude = skySettings.uSunAmplitude;
    this.bushMaterial.uniforms.uSunMultiplier = skySettings.uSunMultiplier;
    
    this.bushMaterial.uniforms.uColorDayCycleLow = skySettings.uColorDayCycleLow;
    this.bushMaterial.uniforms.uColorDayCycleHigh = skySettings.uColorDayCycleHigh;
    this.bushMaterial.uniforms.uColorNightLow = skySettings.uColorNightLow;
    this.bushMaterial.uniforms.uColorNightHigh = skySettings.uColorNightHigh;
    this.bushMaterial.uniforms.uColorSun = skySettings.uColorSun;
    this.bushMaterial.uniforms.uColorDawn = skySettings.uColorDawn;

    this.bushMaterial.uniforms.uDayCycleProgress = this.globalUniforms.uDayCycleProgress;
  }

  setReedGeometry() {
    this.view.models.particleModels.reed.scene.traverse(o => {
      if (o.isMesh) {
        this.reedGeometry = o.geometry;
        this.reedTexture = o.material.map;
      }
    });
  }

  setReedMaterial() {
    const reedUniforms = {
      reedTexture: {
        value: this.reedTexture
      },
    }
    const uniforms = Object.assign({}, THREE.UniformsLib.lights, reedUniforms);
    this.reedMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader:reedVertexShader,
      fragmentShader: reedFragmentShader,
      side: THREE.DoubleSide,
      lights: true,
    });
    this.reedMaterial.uniforms.uTime = this.globalUniforms.uTime;
    this.reedMaterial.uniforms.isDay = this.globalUniforms.isDay;
    this.reedMaterial.uniforms.fadePosition = this.globalUniforms.fadePosition;
    this.reedMaterial.uniforms.eye = this.globalUniforms.eye;
    this.reedMaterial.uniforms.playerPosition = this.globalUniforms.playerPosition;
    this.reedMaterial.uniforms.sunPosition = this.globalUniforms.sunPosition;
    this.reedMaterial.uniforms.noiseTexture = this.globalUniforms.noiseTexture;
    this.reedMaterial.uniforms.waveNoiseTexture = this.globalUniforms.waveNoiseTexture;


    this.reedMaterial.onBeforeRender = (renderer, scene, camera, geometry, mesh) => {
      this.reedMaterial.uniforms.fadePosition.value = mesh.userData.fadePosition;
      this.reedMaterial.uniformsNeedUpdate = true;
    }
  }

  setRockGeometry() {
    this.view.models.particleModels.rockLod0.scene.traverse(o => {
      if (o.isMesh) {
        this.rockLod0Geometry = o.geometry;
      }
    });

    this.view.models.particleModels.rockLod1.scene.traverse(o => {
      if (o.isMesh) {
        this.rockLod1Geometry = o.geometry;
        const cookGeometryBuffer = async () => {
          this.rockGeometryBuffer = await this.physics.cookGeometryAsync(
            o
          );
        }
        cookGeometryBuffer();
      }
    });
  }

  setRockMaterial() {
    const rockUniforms = {
      rockTexture: {
        value: this.getTexureByName('stone')
      },
    }
    const uniforms = Object.assign({}, THREE.UniformsLib.lights, rockUniforms);
    this.rockMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader:rockVertexShader,
      fragmentShader: rockFragmentShader,
      side: THREE.DoubleSide,
      lights: true,
    });
    this.rockMaterial.uniforms.uTime = this.globalUniforms.uTime;
    this.rockMaterial.uniforms.isDay = this.globalUniforms.isDay;
    this.rockMaterial.uniforms.fadePosition = this.globalUniforms.fadePosition;
    this.rockMaterial.uniforms.eye = this.globalUniforms.eye;
    this.rockMaterial.uniforms.playerPosition = this.globalUniforms.playerPosition;
    this.rockMaterial.uniforms.sunPosition = this.globalUniforms.sunPosition;
    this.rockMaterial.uniforms.noiseTexture = this.globalUniforms.noiseTexture;
    this.rockMaterial.uniforms.waveNoiseTexture = this.globalUniforms.waveNoiseTexture;


    this.rockMaterial.uniforms.uDawnAngleAmplitude = skySettings.uDawnAngleAmplitude;
    this.rockMaterial.uniforms.uDawnElevationAmplitude = skySettings.uDawnElevationAmplitude; 
    this.rockMaterial.uniforms.uSunAmplitude = skySettings.uSunAmplitude;
    this.rockMaterial.uniforms.uSunMultiplier = skySettings.uSunMultiplier;
    
    this.rockMaterial.uniforms.uColorDayCycleLow = skySettings.uColorDayCycleLow;
    this.rockMaterial.uniforms.uColorDayCycleHigh = skySettings.uColorDayCycleHigh;
    this.rockMaterial.uniforms.uColorNightLow = skySettings.uColorNightLow;
    this.rockMaterial.uniforms.uColorNightHigh = skySettings.uColorNightHigh;
    this.rockMaterial.uniforms.uColorSun = skySettings.uColorSun;
    this.rockMaterial.uniforms.uColorDawn = skySettings.uColorDawn;

    this.rockMaterial.uniforms.uDayCycleProgress = this.globalUniforms.uDayCycleProgress;

  }

  setTreeGeometry() {
    // treeOne lod0
    this.view.models.particleModels.treeOneLod0.scene.traverse(o => {
      if (o.isMesh) {
        this.treeOneLod0Geometry = o.geometry;
      }
    });
    // treeOne lod1
    this.view.models.particleModels.treeOneLod1.scene.traverse(o => {
      if (o.isMesh) {
        this.treeOneLod1Geometry = o.geometry;
      }
    });
    //treeOne trunk
    this.view.models.particleModels.treeOneTrunk.scene.traverse(o => {
      if (o.isMesh) {
        const cookGeometryBuffer = async () => {
          this.treeOneTrunkGeometryBuffer = await this.physics.cookGeometryAsync(
            o
          );
        }
        cookGeometryBuffer();
      }
    });
    //treeTwo lod0
    this.view.models.particleModels.treeTwoLod0.scene.traverse(o => {
      if (o.isMesh) {
        this.treeTwoLod0Geometry = o.geometry;
      }
    });
    //treeTwo lod1
    this.view.models.particleModels.treeTwoLod1.scene.traverse(o => {
      if (o.isMesh) {
        this.treeTwoLod1Geometry = o.geometry;
      }
    });
    //treeTwo trunk
    this.view.models.particleModels.treeTwoTrunk.scene.traverse(o => {
      if (o.isMesh) {
        const cookGeometryBuffer = async () => {
          this.treeTwoTrunkGeometryBuffer = await this.physics.cookGeometryAsync(
            o
          );
        }
        cookGeometryBuffer();
      }
    });
    //treeThree lod0
    this.view.models.particleModels.treeThreeLod0.scene.traverse(o => {
      if (o.isMesh) {
        this.treeThreeLod0Geometry = o.geometry;
      }
    });
    //treeThree lod1
    this.view.models.particleModels.treeThreeLod1.scene.traverse(o => {
      if (o.isMesh) {
        this.treeThreeLod1Geometry = o.geometry;
      }
    });
    //treeThree trunk
    this.view.models.particleModels.treeThreeTrunk.scene.traverse(o => {
      if (o.isMesh) {
        const cookGeometryBuffer = async () => {
          this.treeThreeTrunkGeometryBuffer = await this.physics.cookGeometryAsync(
            o
          );
        }
        cookGeometryBuffer();
      }
    });
    
  }

  setTreeMaterial() {
    const treeUniforms = {
      playerPosition: {
        value: new THREE.Vector3()
      },
      leaveTexture1: {
        value: this.getTexureByName('leaf6')
      },
      leaveTexture2: {
        value: this.getTexureByName('leaf2')
      },
      leaveTexture3: {
        value: this.getTexureByName('leaf6')
      },
      leaveTexture4: {
        value: this.getTexureByName('leaf4')
      },
      barkTexture: {
        value: this.getTexureByName('bark1')
      },
    }
    const uniforms = Object.assign({}, THREE.UniformsLib.lights, treeUniforms);

    this.treeMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader:treeVertexShader,
      fragmentShader: treeFragmentShader,
      side: THREE.DoubleSide,
      // transparent: true,
      lights: true,
    });
    
    
    this.treeMaterial.uniforms.uDawnAngleAmplitude = skySettings.uDawnAngleAmplitude;
    this.treeMaterial.uniforms.uDawnElevationAmplitude = skySettings.uDawnElevationAmplitude; 
    this.treeMaterial.uniforms.uSunAmplitude = skySettings.uSunAmplitude;
    this.treeMaterial.uniforms.uSunMultiplier = skySettings.uSunMultiplier;
    
    this.treeMaterial.uniforms.uColorDayCycleLow = skySettings.uColorDayCycleLow;
    this.treeMaterial.uniforms.uColorDayCycleHigh = skySettings.uColorDayCycleHigh;
    this.treeMaterial.uniforms.uColorNightLow = skySettings.uColorNightLow;
    this.treeMaterial.uniforms.uColorNightHigh = skySettings.uColorNightHigh;
    this.treeMaterial.uniforms.uColorSun = skySettings.uColorSun;
    this.treeMaterial.uniforms.uColorDawn = skySettings.uColorDawn;

    this.treeMaterial.uniforms.uDayCycleProgress = this.globalUniforms.uDayCycleProgress;

    this.treeMaterial.uniforms.uTime = this.globalUniforms.uTime;
    this.treeMaterial.uniforms.isDay = this.globalUniforms.isDay;
    this.treeMaterial.uniforms.eye = this.globalUniforms.eye;
    this.treeMaterial.uniforms.playerPosition = this.globalUniforms.playerPosition;
    this.treeMaterial.uniforms.sunPosition = this.globalUniforms.sunPosition;
    this.treeMaterial.uniforms.noiseTexture = this.globalUniforms.noiseTexture;
    this.treeMaterial.uniforms.waveNoiseTexture = this.globalUniforms.waveNoiseTexture;


    // this.treeMaterial.onBeforeRender = (renderer, scene, camera, geometry, mesh) => {
    //   this.treeMaterial.uniforms.treeType.value = mesh.userData.treeType;
    //   this.treeMaterial.uniformsNeedUpdate = true;
    // }

    // material for cast shadow
    this.treeDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });
    this.treeDepthMaterial.onBeforeCompile = shader => {
      shader.uniforms.noiseTexture = this.globalUniforms.noiseTexture;
      shader.uniforms.leaveTexture1 = this.treeMaterial.uniforms.leaveTexture1;
      shader.uniforms.leaveTexture2 = this.treeMaterial.uniforms.leaveTexture2;
      shader.uniforms.leaveTexture3 = this.treeMaterial.uniforms.leaveTexture3;
      shader.uniforms.leaveTexture4 = this.treeMaterial.uniforms.leaveTexture4;
      shader.uniforms.uTime = this.globalUniforms.uTime;
      customSahdowShader(shader);
    };
  }

  handelNearObjects(key) {
    const treeOne = this.treeOnes.get(key);
    const treeTwo = this.treeTwos.get(key);
    const treeThree = this.treeThrees.get(key);
    const rock = this.rocks.get(key);
    const bush = this.bushes.get(key);
    
    treeOne && treeOne.showLod0();
    treeTwo && treeTwo.showLod0();
    treeThree && treeThree.showLod0();
    rock && rock.showLod0();
    bush && bush.showLod0();
  }

  handelFarObjects(key) {
    const treeOne = this.treeOnes.get(key);
    const treeTwo = this.treeTwos.get(key);
    const treeThree = this.treeThrees.get(key);
    const rock = this.rocks.get(key);
    const bush = this.bushes.get(key);

    treeOne && treeOne.showLod1();
    treeTwo && treeTwo.showLod1();
    treeThree && treeThree.showLod1();
    rock && rock.showLod1();
    bush && bush.showLod1();
  }

  

  handelFadeInOfPlants(key) {
    const grass = this.grasses.get(key);
    const flower = this.flowers.get(key);
    const reed = this.reeds.get(key);
   
    if (!grass || !flower || !reed) {
      return;
    }

    if (!grass.created) {
      this.chunksInScene.delete(key);
      return;
    }
    this.handelNearObjects(key);

    if (grass.mesh.userData.fadePosition > this.plantFadeInThreshold) {
      const fadeInPosition = grass.mesh.userData.fadePosition - this.plantFadeSpeed;

      grass.setFadePosition(fadeInPosition);
      flower.setFadePosition(fadeInPosition);
      reed.setFadePosition(fadeInPosition);

      grass.showMesh();
      flower.showMesh();
      reed.showMesh();
    }
    else {
      grass.setFadePosition(this.plantFadeInThreshold);
      flower.setFadePosition(this.plantFadeInThreshold);
      reed.setFadePosition(this.plantFadeInThreshold);
    }
  }

  handelFadeOutOfPlants(key) {
    const grass = this.grasses.get(key);
    const flower = this.flowers.get(key);
    const reed = this.reeds.get(key);
   
    if (!grass || !flower || !reed) {
      return;
    }

    if (!grass.created) {
      this.chunksInScene.delete(key);
      return;
    }
    this.handelFarObjects(key);

    if (grass.mesh.userData.fadePosition < this.plantFadeOutThreshold) {
      const fadeOutPosition = grass.mesh.userData.fadePosition + this.plantFadeSpeed;
      grass.setFadePosition(fadeOutPosition);
      flower.setFadePosition(fadeOutPosition);
      reed.setFadePosition(fadeOutPosition);
    }
    else {
      grass.setFadePosition(this.plantFadeOutThreshold);
      flower.setFadePosition(this.plantFadeOutThreshold);
      reed.setFadePosition(this.plantFadeOutThreshold);
      
      grass.hideMesh();
      flower.hideMesh();
      reed.hideMesh();

      this.chunksInScene.delete(key);
    }
  }

  resetChunkInScene() {
    for (const key of this.chunksInScene.keys()) {
      this.chunksInScene.set(key, false);
    }
  }

  
  update(timestamp) {
    this.resetChunkInScene();
    const engineChunks = this.state.chunks;
    const aChunkState = engineChunks.getDeepestChunkForPosition(this.camera.position.x, this.camera.position.z);

    if (aChunkState && aChunkState.terrain && aChunkState.terrain.renderInstance.texture) {

      if (this.isObjectVisible(aChunkState.terrain.boundingBox)) {
        this.chunksInScene.set(aChunkState.terrain.id, true);
      }
      
      const chunkPositionRatioX = (this.camera.position.x - aChunkState.x + aChunkState.size * 0.5) / aChunkState.size
      const chunkPositionRatioZ = (this.camera.position.z - aChunkState.z + aChunkState.size * 0.5) / aChunkState.size

      const bChunkState = aChunkState.neighbours.get(chunkPositionRatioX < 0.5 ? 'w' : 'e');
      if(bChunkState && bChunkState.terrain && bChunkState.terrain.renderInstance.texture) {
        if (this.isObjectVisible(bChunkState.terrain.boundingBox)) {
          this.chunksInScene.set(bChunkState.terrain.id, true);
        }
      }
      
      const cChunkState = aChunkState.neighbours.get(chunkPositionRatioZ < 0.5 ? 'n' : 's');
      if(cChunkState && cChunkState.terrain && cChunkState.terrain.renderInstance.texture) {
        if (this.isObjectVisible(cChunkState.terrain.boundingBox)) {
          this.chunksInScene.set(cChunkState.terrain.id, true);
        }
      }
      
      if (bChunkState) {
        const dChunkState = bChunkState.neighbours.get(chunkPositionRatioZ < 0.5 ? 'n' : 's');
        if(dChunkState && dChunkState.terrain && dChunkState.terrain.renderInstance.texture) {
          if (this.isObjectVisible(dChunkState.terrain.boundingBox)) {
            this.chunksInScene.set(dChunkState.terrain.id, true);
          }
        }
      }
    }

    for (const [key, value] of this.chunksInScene.entries()) {
      if (value) {
        // this.handelNearObjects(key);
        this.handelFadeInOfPlants(key);
      }
      else {
        // this.handelFarObjects(key);
        this.handelFadeOutOfPlants(key);
      }
    }

    this.globalUniforms.uTime.value = timestamp / 1000;
    this.globalUniforms.eye.value.copy(this.camera.position);
    this.globalUniforms.isDay.value = this.view.skyManager.isDay;
    this.globalUniforms.playerPosition.value.copy(this.player.position);
    // this.globalUniforms.playerPosition.value.y -= this.player.avatar.height;
    this.globalUniforms.sunPosition.value.copy(this.view.skyManager.sunPosition);
    this.globalUniforms.uDayCycleProgress.value = this.skyManager.azimuth;
  }
}