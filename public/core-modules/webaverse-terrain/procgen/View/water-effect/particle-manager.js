import * as THREE from 'three';

import { WATER_HEIGHT } from '../../utils/constants.js';
import { 
  getDivingRipple,
  getIdleRipple,
  getDivingLowerSplash,
  getDivingHigherSplash,
  getTrailRipple,
  getTrailSplash,
  getBubble,
 } from './particle/mesh.js';

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();

const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();

const floatingCenter = new THREE.Vector3(); // the floating animation would move the avatar position forward a bit

const IDLE_SPEED_THRESHOLD = 0.1;
const IDLE_TIME_THRESHOLD = 1500;

export default class ParticleManager {
  constructor(player, camera, scene, texturePacks) {
    this.player = player;
    this.camera = camera;
    this.scene = scene;
    this.texturePacks = texturePacks;
    this.contactWater = false;

    this.lastIdleTime = null;
    this.isIdle = false;
    
    this.initDivingRippleMesh();
    this.initIdleRippleMesh();
    this.initDivingLowerSplash();
    this.initDivingHigherSplash();
    this.initTrailRipple();
    this.initTrailSplash();
    this.initBubble();
  }

  getTexureByName(textureName) {
    return this.texturePacks.find(x => x.name === textureName).texture;
  }

  update(timestamp) {
    this.hasSwim = this.player.actionManager.hasActionType('swim');
    this.hasSprint = this.player.actionManager.hasActionType('sprint');
    
    // get player direction 
    localVector2.set(0, 0, -1);
    this.playerDir = localVector2.applyQuaternion(this.player.quaternion);
    this.playerDir.normalize();

    // set player floating center position
    floatingCenter.set(
      this.player.position.x + this.playerDir.x * 0.1,
      WATER_HEIGHT + 0.01,
      this.player.position.z + this.playerDir.z * 0.1
    )
    
    const isContactWater = this.player.position.y - this.player.avatar.height <= WATER_HEIGHT;
    const fallingSpeed = 0 - this.player.characterPhysics.velocity.y;
    const isDiving = fallingSpeed > 6 && isContactWater && isContactWater !== this.contactWater;
    if (isDiving) {
      this.emitDivingRippleMesh();
      this.emitDivingLowerSplash();
      this.emitDivingHigherSplash();
    }

    // handel idle in water
    this.currentSpeed = localVector.set(this.player.avatar.velocity.x, 0, this.player.avatar.velocity.z).length() * 0.1;
    
    const isIdling = this.hasSwim && this.currentSpeed <= IDLE_SPEED_THRESHOLD;
    if (isIdling) {
      if (this.lastIdleTime === null) {
        this.lastIdleTime = timestamp;
      }
      const isIdleInWater = timestamp - this.lastIdleTime > IDLE_TIME_THRESHOLD;
      if (isIdleInWater && this.isIdle !== isIdleInWater) {
        this.emitIdleRippleMesh();
        this.isIdle = isIdleInWater;
      }
    }
    else {
      this.lastIdleTime = null;
      this.isIdle = false;
      this.disableIdleRippleMesh();
    }

    const isSwimming = this.hasSwim && this.currentSpeed > IDLE_SPEED_THRESHOLD;
    if (isSwimming) {
      this.emitTrailRipple();
      this.emitTrailSplash();
      
    }
    if (this.hasSwim) {
      this.emitBubble();
    }

    // update particle
    this.isIdle && this.updateIdleRippleMesh(timestamp);
    this.divingRippleMesh.visible && this.updateDivingRippleMesh();
    this.divingLowerSplash.visible && this.updateDivingLowerSplash();
    this.divingHigherSplash.visible && this.updateDivingHigherSplash();
    this.trailRipple.visible && this.updateTrailRipple();
    this.trailSplash.visible && this.updateTrailSplash();
    this.bubble.visible && this.updateBubble();
    
    this.contactWater = isContactWater;
  }



  // ######################################################### init particle ###################################################################
  initDivingRippleMesh() {
    this.divingRippleMesh = getDivingRipple();
    this.divingRippleMesh.rotation.x = -Math.PI / 2;
    this.divingRippleMesh.material.uniforms.noiseMap2.value = this.getTexureByName('noise3');
    this.scene.add(this.divingRippleMesh);
    this.divingRippleMesh.visible = false;
  } 

  initIdleRippleMesh() {
    this.idleRippleMesh = getIdleRipple();
    this.idleRippleMesh.rotation.x = -Math.PI / 2;
    this.idleRippleMesh.material.uniforms.noiseMap2.value = this.getTexureByName('noise3');
    this.scene.add(this.idleRippleMesh);
    this.idleRippleMesh.visible = false;
  } 

  initDivingLowerSplash() {
    this.divingLowerSplash = getDivingLowerSplash();
    this.divingLowerSplash.material.uniforms.splashTexture1.value = this.getTexureByName('splash1');
    this.divingLowerSplash.material.uniforms.splashTexture2.value = this.getTexureByName('splash2');
    this.divingLowerSplash.material.uniforms.dropletTexture.value = this.getTexureByName('droplet');
    this.divingLowerSplash.material.uniforms.waterSurfacePos.value = WATER_HEIGHT;
    this.scene.add(this.divingLowerSplash);
    this.divingLowerSplash.visible = false;
  } 

  initDivingHigherSplash() {
    this.divingHigherSplash = getDivingHigherSplash();
    this.divingHigherSplash.material.uniforms.splashTexture.value = this.getTexureByName('splash3');
    this.divingHigherSplash.material.uniforms.noiseMap.value = this.getTexureByName('noise3');
    this.divingHigherSplash.material.uniforms.waterSurfacePos.value = WATER_HEIGHT;
    this.scene.add(this.divingHigherSplash);
    this.divingHigherSplash.visible = false;
  } 

  initTrailRipple() {
    this.trailRipple = getTrailRipple();
    this.trailRipple.material.uniforms.rippleTexture.value = this.getTexureByName('ripple');
    this.scene.add(this.trailRipple);
    this.trailRipple.visible = false;
  }

  initTrailSplash() {
    this.trailSplash = getTrailSplash();
    this.trailSplash.material.uniforms.splashTexture.value = this.getTexureByName('splash5');
    this.scene.add(this.trailSplash);
    this.trailSplash.visible = false;
  }

  initBubble() {
    this.bubble = getBubble();
    this.bubble.material.uniforms.bubbleTexture.value = this.getTexureByName('droplet');
    this.bubble.material.uniforms.waterSurfacePos.value = WATER_HEIGHT;
    this.scene.add(this.bubble);
    this.bubble.visible = false;
  } 

  // ######################################################### handle particle ###################################################################
  // handle diving ripple
  emitDivingRippleMesh() {
    this.divingRippleMesh.position.copy(floatingCenter);
    this.divingRippleMesh.scale.set(1, 1, 1);
    this.divingRippleMesh.visible = true;
    this.divingRippleMesh.material.uniforms.uTime.value = 0;
  } 
  updateDivingRippleMesh() {
    if (this.divingRippleMesh.material.uniforms.uTime.value > 1.5) {
      this.divingRippleMesh.visible = false;
    }
    else {
      this.divingRippleMesh.material.uniforms.uTime.value += 0.02;
      this.divingRippleMesh.scale.set(
        this.divingRippleMesh.scale.x + 0.005,
        this.divingRippleMesh.scale.y + 0.005,
        1
      );
    }
  } 

  // handle idle ripple
  emitIdleRippleMesh() {
    this.idleRippleMesh.visible = true;
    this.idleRippleMesh.material.uniforms.fadeIn.value = 0.1;
  } 
  updateIdleRippleMesh(timestamp) {
    this.idleRippleMesh.position.copy(floatingCenter);
    this.idleRippleMesh.material.uniforms.uTime.value = timestamp / 1000;
    if (this.idleRippleMesh.material.uniforms.fadeIn.value < 1) {
      this.idleRippleMesh.material.uniforms.fadeIn.value += 0.025;
    }
    
  } 
  disableIdleRippleMesh() {
    if (this.idleRippleMesh.visible)
      this.idleRippleMesh.visible = false;
  }

  // handle diving lower splash
  emitDivingLowerSplash() {
    this.divingLowerSplash.visible = true;
    this.divingLowerSplash.position.copy(floatingCenter);
    const dissolveAttribute = this.divingLowerSplash.geometry.getAttribute('dissolve');
    const positionsAttribute = this.divingLowerSplash.geometry.getAttribute('positions');
    const scalesAttribute = this.divingLowerSplash.geometry.getAttribute('scales');
    const textureRotationAttribute = this.divingLowerSplash.geometry.getAttribute('textureRotation');
    const textureTypeAttribute = this.divingLowerSplash.geometry.getAttribute('textureType');
    const particleCount = this.divingLowerSplash.info.particleCount;
    for (let i = 0; i < particleCount; i ++) {
      const splashCount = this.divingLowerSplash.info.splashCount;
      const isSplash = i < splashCount;
      const isTexture1 = isSplash && i % 2 === 0;
      const isTexture2 = isSplash && i % 2 !== 0;
      if (isTexture1) { //splash 1
        textureTypeAttribute.setX(i, 0);
      }
      else if (isTexture2) { // splash 2
        textureTypeAttribute.setX(i, 1);
      }
      else { // droplet
        textureTypeAttribute.setX(i, 2);
      }

      if (isSplash) {
        const radius = 0.07;
        const ratio = (i / splashCount) * Math.PI * 2;
        const vx = Math.sin(ratio) * radius + (Math.random() - 0.5) * 0.001;
        const vy = 0.2 + 0.01 * Math.random();
        const vz = Math.cos(ratio) * radius + (Math.random() - 0.5) * 0.001;
        this.divingLowerSplash.info.velocity[i].x = vx;
        this.divingLowerSplash.info.velocity[i].y = vy;
        this.divingLowerSplash.info.velocity[i].z = vz;
        positionsAttribute.setXYZ(  
          i, 
          vx,
          -0.3 + 0.1 * Math.random(),
          vz
        );
        this.divingLowerSplash.info.velocity[i].divideScalar(5);
        const initScale = 0.6; 
        scalesAttribute.setX(i, initScale);
        textureRotationAttribute.setX(i, Math.random() * 2);
  
        dissolveAttribute.setX(i, 0.1 + Math.random() * 0.15);
      }
      else { // droplet
        const radius = 0.25;
        const vx = (Math.random() - 0.5) * radius;
        const vy = 0.2 + 0.1 * Math.random();
        const vz = (Math.random() - 0.5) * radius;
        this.divingLowerSplash.info.velocity[i].x = vx;
        this.divingLowerSplash.info.velocity[i].y = vy;
        this.divingLowerSplash.info.velocity[i].z = vz;
        positionsAttribute.setXYZ(  
          i, 
          vx,
          -0.27 + 0.1 * Math.random(),
          vz
        );
        this.divingLowerSplash.info.velocity[i].divideScalar(5);
        const initScale = 0.15 + Math.random() * 0.2; 
        scalesAttribute.setX(i, initScale);
      }
    }
    positionsAttribute.needsUpdate = true;
    scalesAttribute.needsUpdate = true;
    textureRotationAttribute.needsUpdate = true;
    dissolveAttribute.needsUpdate = true;
    textureTypeAttribute.needsUpdate = true;

    this.divingLowerSplash.visible = true;
  } 

  updateDivingLowerSplash() {
    const dissolveAttribute = this.divingLowerSplash.geometry.getAttribute('dissolve');
    const positionsAttribute = this.divingLowerSplash.geometry.getAttribute('positions');
    const scalesAttribute = this.divingLowerSplash.geometry.getAttribute('scales');
    const particleCount = this.divingLowerSplash.info.particleCount;
    
    let minDissolve = Infinity; // get the minimum dissolve value, if the value is larger than 1 then we know all the splash finish their dissolution
    for (let i = 0; i < particleCount; i ++) {
      const splashCount = this.divingLowerSplash.info.splashCount;
      const isSplash = i < splashCount;
      const isTexture1 = isSplash && i % 2 === 0;
      
      positionsAttribute.setXYZ(  
        i, 
        positionsAttribute.getX(i) + this.divingLowerSplash.info.velocity[i].x,
        positionsAttribute.getY(i) + this.divingLowerSplash.info.velocity[i].y,
        positionsAttribute.getZ(i) + this.divingLowerSplash.info.velocity[i].z
      );
      this.divingLowerSplash.info.velocity[i].y += (this.divingLowerSplash.info.acc);
      if (isSplash) {
        scalesAttribute.setX(i, scalesAttribute.getX(i) + 0.05);

        if (dissolveAttribute.getX(i) < 0.8) {
          if (isTexture1) {
            dissolveAttribute.setX(i, dissolveAttribute.getX(i) + 0.015);
          }
          else {
            dissolveAttribute.setX(i, dissolveAttribute.getX(i) + 0.03);
          }
        } 
        else if (dissolveAttribute.getX(i) < 1.0) {
          dissolveAttribute.setX(i, dissolveAttribute.getX(i) + 0.008);
        }
        minDissolve = dissolveAttribute.getX(i) < minDissolve ? dissolveAttribute.getX(i) : minDissolve;
      }
      else { // droplet
        if (scalesAttribute.getX(i) > 0)
          scalesAttribute.setX(i, scalesAttribute.getX(i) - 0.005);
      }
    }
    positionsAttribute.needsUpdate = true;
    scalesAttribute.needsUpdate = true;
    dissolveAttribute.needsUpdate = true;

    this.divingLowerSplash.material.uniforms.cameraBillboardQuaternion.value.copy(this.camera.quaternion);
    
    if (minDissolve >= 1) {
      this.divingLowerSplash.visible = false;
    }
  } 

  // handle diving higher splash
  emitDivingHigherSplash() {
    this.divingHigherSplash.visible = true;
    this.divingHigherSplash.position.copy(floatingCenter);

    const dissolveAttribute = this.divingHigherSplash.geometry.getAttribute('dissolve');
    const positionsAttribute = this.divingHigherSplash.geometry.getAttribute('positions');
    const scalesAttribute = this.divingHigherSplash.geometry.getAttribute('scales');
    const rotationAttribute = this.divingHigherSplash.geometry.getAttribute('rotation');
    const particleCount = this.divingHigherSplash.info.particleCount;
    for (let i = 0; i < particleCount; i ++) {
      const velocityY = 0.09 + Math.floor(i * 0.4) * 0.007;
      const initDistortion = 0.2 + Math.random() * 0.08;
      const initScale = 0.45 + Math.random() * 0.45;
      this.divingHigherSplash.info.velocity[i] = velocityY;
      dissolveAttribute.setX(i, initDistortion);
      scalesAttribute.setX(i, initScale);

      const radius = 0.03;
      const initialHeight = -1.5;
      const theta = 2. * Math.PI * (i / particleCount);
      positionsAttribute.setXYZ(
        i,
        Math.sin(theta) * radius,
        initialHeight,
        Math.cos(theta) * radius
      ) 
      rotationAttribute.setX(i, theta); 
    }
    dissolveAttribute.needsUpdate = true;
    positionsAttribute.needsUpdate = true;
    scalesAttribute.needsUpdate = true;
    rotationAttribute.needsUpdate = true;
  }

  updateDivingHigherSplash() {
    const dissolveAttribute = this.divingHigherSplash.geometry.getAttribute('dissolve');
    const positionsAttribute = this.divingHigherSplash.geometry.getAttribute('positions');
    const scalesAttribute = this.divingHigherSplash.geometry.getAttribute('scales');
    const rotationAttribute = this.divingHigherSplash.geometry.getAttribute('rotation');
    const particleCount = this.divingHigherSplash.info.particleCount;
    const distortionRate = 1.03;
    const scaleRate = 0.02;
    const ascendingSpeed = 0.08;
    const positionThreshold = - 0.9;
    let minDissolve = Infinity; // get the minimum dissolve value, if the value is larger than 1 then we know all the splash finish their dissolution
    for (let i = 0; i < particleCount; i ++) {
      if (dissolveAttribute.getX(i) < 1.0) {
        if (positionsAttribute.getY(i) >= positionThreshold) {
          dissolveAttribute.setX(i, dissolveAttribute.getX(i) * distortionRate);
          scalesAttribute.setX(i, scalesAttribute.getX(i) + scaleRate);
          positionsAttribute.setY(i, positionsAttribute.getY(i) + this.divingHigherSplash.info.velocity[i]);
          this.divingHigherSplash.info.velocity[i] += this.divingHigherSplash.info.acc;
        }
        else {
          positionsAttribute.setY(i, positionsAttribute.getY(i) + ascendingSpeed);
        } 
      }
      minDissolve = dissolveAttribute.getX(i) < minDissolve ? dissolveAttribute.getX(i) : minDissolve;
    }
    dissolveAttribute.needsUpdate = true;
    positionsAttribute.needsUpdate = true;
    scalesAttribute.needsUpdate = true;
    rotationAttribute.needsUpdate = true;

    if (minDissolve >= 1) {
      this.divingHigherSplash.visible = false;
    }
  }

  // handle trail ripple
  emitTrailRipple() {
    if (!this.trailRipple.visible)
      this.trailRipple.visible = true;

    const particleCount = this.trailRipple.info.particleCount;
    const dissolveAttribute = this.trailRipple.geometry.getAttribute('dissolve');
    const positionsAttribute = this.trailRipple.geometry.getAttribute('positions');
    const scalesAttribute = this.trailRipple.geometry.getAttribute('scales');
    const playerRotationAttribute = this.trailRipple.geometry.getAttribute('playerRotation');

    const emitOffset = 0.07;

    const currentIndex = this.trailRipple.info.currentIndex;
    const previousIndex = currentIndex - 1 < 0 ? particleCount - 1 : currentIndex - 1;
    
    if (dissolveAttribute.getX(previousIndex) > emitOffset) {
      const particleRot = this.player.rotation.x !== 0 ?  Math.PI + this.player.rotation.y : -this.player.rotation.y;
      playerRotationAttribute.setX(currentIndex, particleRot);

      dissolveAttribute.setX(currentIndex, 0);
      scalesAttribute.setX(currentIndex, 1.1 + Math.random() * 0.1);
      positionsAttribute.setXYZ(
        currentIndex,
        this.player.position.x + 0.25 * this.playerDir.x + (Math.random() - 0.5) * 0.1, 
        WATER_HEIGHT + 0.01, 
        this.player.position.z + 0.25 * this.playerDir.z + (Math.random() - 0.5) * 0.1
      );
      
      this.trailRipple.info.currentIndex ++;
      if (this.trailRipple.info.currentIndex >= this.trailRipple.info.particleCount) {
        this.trailRipple.info.currentIndex = 0;
      }

    }
    positionsAttribute.needsUpdate = true;
    scalesAttribute.needsUpdate = true;
    dissolveAttribute.needsUpdate = true;
    playerRotationAttribute.needsUpdate = true;  
  }

  updateTrailRipple() {
    const particleCount = this.trailRipple.info.particleCount;
    const dissolveAttribute = this.trailRipple.geometry.getAttribute('dissolve');
    const scalesAttribute = this.trailRipple.geometry.getAttribute('scales');
    const positionsAttribute = this.trailRipple.geometry.getAttribute('positions');
    let minDissolve = Infinity; // get the minimum dissolve value, if the value is larger than 1 then we know all the splash finish their dissolution
    for (let i = 0; i < particleCount; i++) {
      if (dissolveAttribute.getX(i) < 1) {
        scalesAttribute.setX(i, scalesAttribute.getX(i) + 0.1 * (this.currentSpeed + 0.3));
        const dissolveRate = this.hasSprint ? 0.007 : 0.0045;
        dissolveAttribute.setX(i, dissolveAttribute.getX(i) + dissolveRate);
      }
      minDissolve = dissolveAttribute.getX(i) < minDissolve ? dissolveAttribute.getX(i) : minDissolve;
    }
    
    scalesAttribute.needsUpdate = true;
    dissolveAttribute.needsUpdate = true;
    positionsAttribute.needsUpdate = true;
    
    if (minDissolve >= 1) {
      this.trailRipple.visible = false;
    }
  }


  // handle trail splash
  emitTrailSplash() {
    if (!this.trailSplash.visible)
      this.trailSplash.visible = true;

    const particleCount = this.trailSplash.info.particleCount;
    const dissolveAttribute = this.trailSplash.geometry.getAttribute('dissolve');
    const positionsAttribute = this.trailSplash.geometry.getAttribute('positions');
    const scalesAttribute = this.trailSplash.geometry.getAttribute('scales');
    const textureRotationAttribute = this.trailSplash.geometry.getAttribute('textureRotation');

    const emitOffset = 0.15;

    const currentIndex = this.trailSplash.info.currentIndex;
    const previousIndex = currentIndex - 1 < 0 ? particleCount - 1 : currentIndex - 1;
    
    if (dissolveAttribute.getX(previousIndex) > emitOffset) {
      textureRotationAttribute.setX(currentIndex, Math.random() * 2);

      dissolveAttribute.setX(currentIndex, 0.05 + Math.random() * 0.1);
      const iniScale = this.hasSprint ? 0.5 : 0.8;
      scalesAttribute.setX(currentIndex, iniScale + Math.random() * 0.5);
      positionsAttribute.setXYZ(
        currentIndex,
        this.player.position.x + 0.25 * this.playerDir.x + (Math.random() - 0.5) * 0.1, 
        WATER_HEIGHT + 0.01, 
        this.player.position.z + 0.25 * this.playerDir.z + (Math.random() - 0.5) * 0.1
      );
      
      this.trailSplash.info.currentIndex ++;
      if (this.trailSplash.info.currentIndex >= this.trailSplash.info.particleCount) {
        this.trailSplash.info.currentIndex = 0;
      }

    }
    positionsAttribute.needsUpdate = true;
    scalesAttribute.needsUpdate = true;
    dissolveAttribute.needsUpdate = true;
    textureRotationAttribute.needsUpdate = true;  
  }

  updateTrailSplash() {
    const particleCount = this.trailSplash.info.particleCount;
    const dissolveAttribute = this.trailSplash.geometry.getAttribute('dissolve');
    const scalesAttribute = this.trailSplash.geometry.getAttribute('scales');
    const positionsAttribute = this.trailSplash.geometry.getAttribute('positions');
    let minDissolve = Infinity; // get the minimum dissolve value, if the value is larger than 1 then we know all the splash finish their dissolution
    for (let i = 0; i < particleCount; i++) {
      if (dissolveAttribute.getX(i) < 1) {
        scalesAttribute.setX(i, scalesAttribute.getX(i) + 0.1 * (this.currentSpeed + 0.3));
        const dissolveRate = this.hasSprint ? 0.01 : 0.007;
        dissolveAttribute.setX(i, dissolveAttribute.getX(i) + dissolveRate);
      }
      minDissolve = dissolveAttribute.getX(i) < minDissolve ? dissolveAttribute.getX(i) : minDissolve;
    }
    
    scalesAttribute.needsUpdate = true;
    dissolveAttribute.needsUpdate = true;
    positionsAttribute.needsUpdate = true;
    
    if (minDissolve >= 1) {
      this.trailSplash.visible = false;
    }
  }

  // handle bubble
  emitBubble() {
    if (!this.bubble.visible) {
      this.bubble.visible = true;
    }
      
    const particleCount = this.bubble.info.particleCount;
    const positionsAttribute = this.bubble.geometry.getAttribute('positions');
    const scalesAttribute = this.bubble.geometry.getAttribute('scales');
    
    const maxSpeed = 0.75;
    const clipBias = 0.1;
    const emitOffset = 2 / ((this.currentSpeed + clipBias) / maxSpeed);

    const currentIndex = this.bubble.info.currentIndex;
    const previousIndex = currentIndex - 1 < 0 ? particleCount - 1 : currentIndex - 1;
    
    if (scalesAttribute.getX(currentIndex) === 0  && this.bubble.info.life[previousIndex] > emitOffset) {
      const leftleg = localVector3.setFromMatrixPosition(this.player.avatar.modelBoneOutputs.Left_ankle.matrixWorld);
      const rightleg = localVector4.setFromMatrixPosition(this.player.avatar.modelBoneOutputs.Right_ankle.matrixWorld);
      const emitPos = leftleg.add(rightleg).divideScalar(2);

      const iniScale = 0.2;
      scalesAttribute.setX(currentIndex, iniScale + Math.random() * 0.1);

      this.bubble.info.velocity[currentIndex].set(
        -this.playerDir.x * this.currentSpeed,
        0.15 + (Math.random()) * 0.15,
        -this.playerDir.z * this.currentSpeed 
      )
      this.bubble.info.velocity[currentIndex].divideScalar(50);
      this.bubble.info.life[currentIndex] = 0;
      this.bubble.info.maxLife[currentIndex] = 40 + Math.random() * 40;

      const bubbleRadius = 0.5;
      positionsAttribute.setXYZ(
        currentIndex,
        emitPos.x + (Math.random() - 0.5) * bubbleRadius,
        emitPos.y + (Math.random() - 0.5) * bubbleRadius,
        emitPos.z + (Math.random() - 0.5) * bubbleRadius
      ) 

      this.bubble.info.currentIndex ++;
      if (this.bubble.info.currentIndex >= this.bubble.info.particleCount) {
        this.bubble.info.currentIndex = 0;
      }

    }
    positionsAttribute.needsUpdate = true;
    scalesAttribute.needsUpdate = true; 
  }

  updateBubble() {
    const particleCount = this.bubble.info.particleCount;
    const scalesAttribute = this.bubble.geometry.getAttribute('scales');
    const positionsAttribute = this.bubble.geometry.getAttribute('positions');
    let maxScale = -Infinity;
    for (let i = 0; i < particleCount; i++) {
      const vy = positionsAttribute.getY(i) >= WATER_HEIGHT ? WATER_HEIGHT : positionsAttribute.getY(i) + this.bubble.info.velocity[i].y;
      positionsAttribute.setXYZ(
        i,
        positionsAttribute.getX(i) + this.bubble.info.velocity[i].x,
        vy,
        positionsAttribute.getZ(i) + this.bubble.info.velocity[i].z
      )
      if (scalesAttribute.getX(i) > 0) {
        scalesAttribute.setX(i, scalesAttribute.getX(i) - 0.003);
      }
      this.bubble.info.life[i] ++;
      if (this.bubble.info.life[i] > this.bubble.info.maxLife[i]) {
        scalesAttribute.setX(i, 0);
      }
      maxScale = scalesAttribute.getX(i) > maxScale ? scalesAttribute.getX(i) : maxScale;
    }
    
    scalesAttribute.needsUpdate = true;
    positionsAttribute.needsUpdate = true;
    this.bubble.material.uniforms.cameraBillboardQuaternion.value.copy(this.camera.quaternion);

    if (maxScale <= 0) {
      this.bubble.visible = false;
    }
  }

}