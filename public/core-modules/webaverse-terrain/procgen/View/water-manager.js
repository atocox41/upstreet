import * as THREE from 'three';

import State from "../State/state.js";

import View from './view.js';

import { Water } from './water-effect/water-mesh.js';
import { skySettings } from "../utils/constants.js";

import { underWaterMaskVertexShader, underWaterMaskFragmentShader } from './Material/underWaterMask/shader.js';

import ParticleManager from './water-effect/particle-manager.js';

import { WATER_HEIGHT, WATER_CHARACTERCONTROLLER_HEIGHT } from '../utils/constants.js';

export default class WaterManager {
  constructor() {
    this.state = State.getInstance();
    this.view = View.getInstance();
    this.texturePacks = this.view.texturePacks;
    
    this.instancedScene = this.view.instancedScene;
    this.player = this.view.player;
    this.camera = this.view.camera;
    this.scene = this.view.scene;
    this.particleScene = new THREE.Group();

    const underWaterMaskgeometry = new THREE.PlaneGeometry( 2, 2 );
    const underWaterMaskmaterial= new THREE.ShaderMaterial({
      uniforms: {
        waterHeight:{
          value: WATER_HEIGHT
        }
      },
      vertexShader: underWaterMaskVertexShader,
      fragmentShader: underWaterMaskFragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    this.underWaterMask = new THREE.Mesh(underWaterMaskgeometry, underWaterMaskmaterial);
    this.underWaterMask.position.set(0, 0, -0.2);
    this.view.internals.camera.add(this.underWaterMask);
    
    const oceanSize = 2000;
    this.ocean = new Water(oceanSize, this.player, this.instancedScene, this.particleScene, this.view.internals, this.underWaterMask);

    this.ocean.material.uniforms.waterNormalTexture.value = this.getTexureByName('waterNormal');

    this.ocean.material.uniforms.uDawnAngleAmplitude = skySettings.uDawnAngleAmplitude;
    this.ocean.material.uniforms.uDawnElevationAmplitude = skySettings.uDawnElevationAmplitude; 
    this.ocean.material.uniforms.uSunAmplitude = skySettings.uSunAmplitude;
    this.ocean.material.uniforms.uSunMultiplier = skySettings.uSunMultiplier;
    
    this.ocean.material.uniforms.uColorDayCycleLow = skySettings.uColorDayCycleLow;
    this.ocean.material.uniforms.uColorDayCycleHigh = skySettings.uColorDayCycleHigh;
    this.ocean.material.uniforms.uColorNightLow = skySettings.uColorNightLow;
    this.ocean.material.uniforms.uColorNightHigh = skySettings.uColorNightHigh;
    this.ocean.material.uniforms.uColorSun = skySettings.uColorSun;
    this.ocean.material.uniforms.uColorDawn = skySettings.uColorDawn;

    this.ocean.rotation.x = -Math.PI / 2;
   
    this.scene.add(this.ocean);
    this.setRenderDepth = false;

   
    this.scene.add(this.particleScene)
    this.waterPartclieMAnager = new ParticleManager(this.player, this.view.internals.camera, this.particleScene, this.texturePacks);
    
  }

  getTexureByName(textureName) {
    return this.texturePacks.find(x => x.name === textureName).texture;
  }

  update(timestamp) {

    if (this.player.avatar) {
      // TODO: this hack should be fixed
      if (!this.setRenderDepth && this.view.internals.composer.passes.length > 0) {
        const renderDepth = () => this.ocean.renderDepth();
        this.view.internals.composer.passes[0].onBeforeRenders.push(renderDepth);
        this.setRenderDepth = true;
      }

      // swim
      const hasSwimAction = this.player.actionManager.hasActionType('swim');
      if (this.player.characterPhysics.characterController.position.y <= WATER_CHARACTERCONTROLLER_HEIGHT) {
        if (!hasSwimAction && !this.player.actionManager.hasActionType('fly')) {
          const newSwimAction = {type: 'swim', waterCharacterControllerHeight: WATER_CHARACTERCONTROLLER_HEIGHT};
          this.player.actionManager.addAction(newSwimAction);
          if (this.player.actionManager.hasActionType('fallLoop')) this.player.actionManager.removeActionType('fallLoop');
          if (this.player.actionManager.hasActionType('skydive')) this.player.actionManager.removeActionType('skydive');
          if (this.player.actionManager.hasActionType('glider')) this.player.actionManager.removeActionType('glider');
        }
      } else {
        if (hasSwimAction) {
          this.player.actionManager.removeActionType('swim');
        }
      }

      // update ocean
      this.ocean.position.x = this.camera.position.x;
      this.ocean.position.z = this.camera.position.z;
      this.ocean.material.uniforms.uTime.value = timestamp / 1000;
      if (this.view.skyManager) {
        this.ocean.material.uniforms.sunPosition.value.copy(this.view.skyManager.sunPosition);
        if (this.view.skyManager.isDay) {
          this.ocean.material.uniforms.lightColor.value.set('#fff');
        }
        else {
          this.ocean.material.uniforms.lightColor.value.set('#1ab3e6');
        }
      }
      this.ocean.material.uniforms.uDayCycleProgress.value = this.view.skyManager.azimuth;
      this.ocean.material.uniforms.isDay.value = this.view.skyManager.isDay;
      this.ocean.material.uniforms.playerPosition.value.copy(this.view.player.position);
      
      // update water particle
      this.waterPartclieMAnager.update(timestamp);
    }
  }
  
}