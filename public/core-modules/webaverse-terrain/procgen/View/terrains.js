import * as THREE from 'three';

import State from "../State/state.js";
import View from './view.js';
import Terrain from './terrain.js';

import {terrainVertexShader, terrainFragmentShader,} from './Material/terrain/shader.js';

import { skySettings } from '../utils/constants.js';

const localVectorOfPosition = new THREE.Vector3(0, 0, 0);
const localVectorOfScale = new THREE.Vector3(1, 1, 1);
const localQuaternion = new THREE.Quaternion(0, 0, 0, 1);

export default class Terrains
{
  constructor() {
    this.state = State.getInstance();
    this.view = View.getInstance();
    this.texturePacks = this.view.texturePacks;
    this.skyManager = this.view.skyManager
    
    
    this.setMaterial();

    this.state.terrains.events.on('create', (engineTerrain) => {
      const terrain = new Terrain(this, engineTerrain, localVectorOfPosition, localVectorOfScale, localQuaternion);

      engineTerrain.events.on('destroy', () => {
        terrain.destroy();
      })
    })
  }

  getTexureByName(textureName) {
    return this.texturePacks.find(x => x.name === textureName).texture;
  }

 
  setMaterial() {
    const terrainUniforms = {
      uTexture: {
        value: null
      },
      terrainRockTexture: {
        value: this.getTexureByName('terrain-rock')
      },
      terrainDirtTexture: {
        value: this.getTexureByName('terrain-dirt')
      },
      terrainSandTexture: {
        value: this.getTexureByName('terrain-sand')
      },
      terrainGrassTexture: {
        value: this.getTexureByName('terrain-grass')
      },
      terrainBrickTexture: {
        value: this.getTexureByName('terrain-brick')
      },
      terrainBrickNormalTexture: {
        value: this.getTexureByName('terrain-brick-normal')
      },
      playerPosition: {
        value: new THREE.Vector3()
      },
      sunPosition: {
        value: new THREE.Vector3()
      },
      isDay: {
        value: true
      },
      eye: {
        value: new THREE.Vector3()
      },
      uDayCycleProgress: {
        value: 0
      },
    }
    const uniforms = Object.assign({}, THREE.UniformsLib.lights, terrainUniforms);

    this.material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: terrainVertexShader,
      fragmentShader: terrainFragmentShader,
      // transparent: true,
      lights: true,
    });

    this.material.uniforms.uDawnAngleAmplitude = skySettings.uDawnAngleAmplitude;
    this.material.uniforms.uDawnElevationAmplitude = skySettings.uDawnElevationAmplitude; 
    this.material.uniforms.uSunAmplitude = skySettings.uSunAmplitude;
    this.material.uniforms.uSunMultiplier = skySettings.uSunMultiplier;
    
    this.material.uniforms.uColorDayCycleLow = skySettings.uColorDayCycleLow;
    this.material.uniforms.uColorDayCycleHigh = skySettings.uColorDayCycleHigh;
    this.material.uniforms.uColorNightLow = skySettings.uColorNightLow;
    this.material.uniforms.uColorNightHigh = skySettings.uColorNightHigh;
    this.material.uniforms.uColorSun = skySettings.uColorSun;
    this.material.uniforms.uColorDawn = skySettings.uColorDawn;
    
    this.material.onBeforeRender = (renderer, scene, camera, geometry, mesh) => {
      this.material.uniforms.uTexture.value = mesh.userData.texture;
      this.material.uniformsNeedUpdate = true;
    }
  }

  update(timestamp) {
    this.material.uniforms.isDay.value = this.skyManager.isDay;
    this.material.uniforms.sunPosition.value.copy(this.skyManager.sunPosition);
    this.material.uniforms.playerPosition.value.copy(this.view.player.position);
    this.material.uniforms.eye.value.copy(this.view.camera.position);
    this.material.uniforms.uDayCycleProgress.value = this.skyManager.azimuth;
  }
}