import * as THREE from 'three'

import View from './view.js';
import {Sky} from './sky-objects/skydome.js';
import {skySettings} from '../utils/constants.js';
import {Cloud} from './sky-objects/cloud.js';
import {Lensflare, LensflareElement} from './sky-objects/Lensflare.js';
import { initSkyLight } from '../utils/light.js';


const SUN_MOON_ROTATION_RADIUS = 4000;
const LIGHT_LOD1_SHADOW_PARAMS = [100, 4096, 0.1, 1000, 0, 0.2];
const LIGHT_LOD2_SHADOW_PARAMS = [35, 2048, 0.1, 1000, 0, 0.2];
const SKY_LIGHT_RADIUS = 200;

// const localVector = new THREE.Vector3();
// const localVector2 = new THREE.Vector3();

export default class SkyManager {
  constructor() {
    this.view = View.getInstance()
    this.texturePacks = this.view.texturePacks;
    
    this.scene = this.view.scene;
    this.camera = this.view.camera;
    this.player = this.view.player;
    this.timeRate = this.view.timeRate;

    this.azimuth = 0.0;
    this.inclination = 0.01; // add this for fixing shadow flickering issue
    this.sunPosition = new THREE.Vector3();
    
    this.isDay = false;
    
    this.skyGroup = new THREE.Group();
    this.scene.add(this.skyGroup);

    this.sky = new Sky();
    this.sky.material.uniforms.uColorDayCycleLow = skySettings.uColorDayCycleLow;
    this.sky.material.uniforms.uColorDayCycleHigh = skySettings.uColorDayCycleHigh;
    this.sky.material.uniforms.uColorNightLow = skySettings.uColorNightLow;
    this.sky.material.uniforms.uColorNightHigh = skySettings.uColorNightHigh;
    this.sky.material.uniforms.uColorSun = skySettings.uColorSun;
    this.sky.material.uniforms.uColorDawn = skySettings.uColorDawn;
    this.sky.material.uniforms.uAtmosphereElevation = skySettings.uAtmosphereElevation;
    this.sky.material.uniforms.uAtmospherePower = skySettings.uAtmospherePower; 
    this.sky.material.uniforms.uDawnAngleAmplitude = skySettings.uDawnAngleAmplitude; 
    this.sky.material.uniforms.uDawnElevationAmplitude = skySettings.uDawnElevationAmplitude;
    this.sky.material.uniforms.uSunAmplitude = skySettings.uSunAmplitude; 
    this.sky.material.uniforms.uSunMultiplier = skySettings.uSunMultiplier; 

    this.sky.material.uniforms.galaxyTexture.value = this.getTexureByName('galaxy');
    this.sky.material.uniforms.noiseTexture2.value = this.getTexureByName('noise2');
    this.sky.material.uniforms.starTexture.value = this.getTexureByName('star3');
    this.sky.material.uniforms.noiseTexture.value = this.getTexureByName('noise');
    this.skyGroup.add(this.sky);

    const moonGeometry = new THREE.PlaneGeometry( 350, 350 );
    const moonMaterial = new THREE.MeshBasicMaterial( { map: this.getTexureByName('moon2'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true} );
    this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
    this.skyGroup.add(this.moon);

    this.flareSun = new THREE.Object3D();
    this.lensflare = new Lensflare();
    this.mainFlare = new LensflareElement(this.getTexureByName('Flare32'), 800, 0, this.flareSun.color, 0.2);
    const flareTextur = this.getTexureByName('lensflare3');
    this.lensflare.addElement(this.mainFlare);
    this.lensflare.addElement(new LensflareElement(flareTextur, 60, 0.6));
    this.lensflare.addElement(new LensflareElement(flareTextur, 70, 0.7));
    this.lensflare.addElement(new LensflareElement(flareTextur, 120, 0.9));
    this.lensflare.addElement(new LensflareElement(flareTextur, 70, 1));
    this.flareSun.add(this.lensflare);

    const sunGeometry = new THREE.CircleGeometry(150, 32);
    const sunMaterial = new THREE.MeshBasicMaterial( {color: 0xF2C88A, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true} );
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.flareSun.add(this.sun);

    this.skyGroup.add(this.flareSun);
    this.flareSun.visible = false;

    //cloud
    this.cloud = new Cloud();
    this.cloud.material.uniforms.noiseTexture2.value = this.getTexureByName('noise2')
    this.cloud.material.uniforms.cloudTexture1.value = this.getTexureByName('cloud1');
    this.cloud.material.uniforms.cloudTexture2.value = this.getTexureByName('cloud2');
    this.cloud.material.uniforms.cloudTexture3.value = this.getTexureByName('cloud3');
    this.cloud.material.uniforms.cloudTexture4.value = this.getTexureByName('cloud4');
    this.skyGroup.add(this.cloud);

    //################### sky light ####################################
    this.skyLightLod2 = new THREE.DirectionalLight();
    initSkyLight(this.skyLightLod2, LIGHT_LOD2_SHADOW_PARAMS);
    this.scene.add(this.skyLightLod2);

    this.skyLightLod1 = new THREE.DirectionalLight();
    initSkyLight(this.skyLightLod1, LIGHT_LOD1_SHADOW_PARAMS);
    this.scene.add(this.skyLightLod1);
    
  }

  getTexureByName(textureName) {
    return this.texturePacks.find(x => x.name === textureName).texture;
  }

  update(timestamp) {
    this.azimuth = (timestamp / this.timeRate) % 1;
    const theta = Math.PI * (this.inclination - 0.5);
    const phi = 2 * Math.PI * (this.azimuth - 0.5);
    
    this.isDay = this.azimuth < 0.5;
    this.isAfterNoom = this.azimuth > 0.03 && this.azimuth < 0.47;

    // sun
    this.sunPosition.set(
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta),
      Math.sin(phi) * Math.cos(theta)
    );

    // don't want the shadow leave player, so increase the light height based on the angle of sunPosition
    // localVector.set(0, 1, 0);
    // localVector2.set(this.sunPosition.x, this.sunPosition.y, this.sunPosition.z).multiplyScalar((this.isDay ? 1 : -1));
    // const angle = Math.acos(localVector2.dot(localVector)) * 180 / Math.PI;
    if (this.isDay) {
      this.skyLightLod1.position.copy(this.sunPosition).multiplyScalar(SKY_LIGHT_RADIUS).add(this.player.position);
      this.skyLightLod1.target.position.copy(this.player.position);

      this.skyLightLod2.position.copy(this.sunPosition).multiplyScalar(SKY_LIGHT_RADIUS).add(this.player.position);
      this.skyLightLod2.target.position.copy(this.player.position);
    }
    else {
      this.skyLightLod1.position.copy(this.sunPosition).multiplyScalar(-SKY_LIGHT_RADIUS).add(this.player.position);
      this.skyLightLod1.target.position.copy(this.player.position);

      this.skyLightLod2.position.copy(this.sunPosition).multiplyScalar(-SKY_LIGHT_RADIUS).add(this.player.position);
      this.skyLightLod2.target.position.copy(this.player.position);
    }
    // this.skyLightLod1.updateMatrixWorld();
    // this.skyLightLod1.position.y *= 2 + (angle / 90) * 7;

    this.skyLightLod1.target.updateMatrixWorld();
    this.skyLightLod2.target.updateMatrixWorld();
    
    this.skyLightLod1.position.y *= 2;
    this.skyLightLod2.position.y *= 2;
    

    if (this.isDay) {
      if (this.isAfterNoom) {
        this.lensflare.visible = true;
      }
      else {
        this.lensflare.visible = false;
      }
      this.flareSun.visible = true;
      this.flareSun.position.set(this.sunPosition.x, this.sunPosition.y, this.sunPosition.z).multiplyScalar(SUN_MOON_ROTATION_RADIUS);
      this.mainFlare.rotation = this.camera.rotation.y;
      this.sun.rotation.copy(this.camera.rotation);
    }
    else {
      this.flareSun.visible = false;
    }


    // moon
    this.moon.position.set(this.sunPosition.x, this.sunPosition.y, this.sunPosition.z).multiplyScalar(-SUN_MOON_ROTATION_RADIUS);
    this.moon.rotation.copy(this.camera.rotation);

    // cloud
    this.cloud.material.uniforms.uTime.value = timestamp / 1000;
    this.cloud.material.uniforms.sunPosition.value.set(
      this.sunPosition.x * this.cloud.cloudRadius + this.camera.position.x, 
      this.sunPosition.y * this.cloud.cloudRadius, 
      this.sunPosition.z * this.cloud.cloudRadius + this.camera.position.z
    )

    // sky
    this.skyGroup.position.x = this.camera.position.x;
    this.skyGroup.position.z = this.camera.position.z;

    this.sky.material.uniforms.uSunPosition.value.set(this.sunPosition.x, this.sunPosition.y, this.sunPosition.z);
    this.sky.material.uniforms.uDayCycleProgress.value = this.azimuth;
    this.sky.material.uniforms.uTime.value = timestamp / 1000;
    
  }
}