import * as THREE from 'three';

import { waterVertexShader, waterFragmentShader } from '../Material/water/shader.js';

const _createWaterMaterial = () => {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: {
        value: 0
      },
      tDepth: {
        value: null
      },
      tMask: {
        value: null
      },
      cameraNear: {
        value: 0
      },
      cameraFar: {
        value: 0
      },
      resolution: {
        value: new THREE.Vector2()
      },
      mirror: {
        value: null
      },
      textureMatrix: {
        value: null
      },
      eye: {
        value: new THREE.Vector3()
      },
      playerPosition: {
        value: new THREE.Vector3()
      },
      waterNormalTexture: {
        value: null
      },
      sunPosition: {
        value: new THREE.Vector3()
      },
      lightIntensity: {
        value: 0
      },
      lightColor: {
        value: new THREE.Color()
      },
      isDay: {
        value: true
      },
      uDayCycleProgress: {
        value: 0
      },
    },
    vertexShader: waterVertexShader,
    fragmentShader: waterFragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    // blending: THREE.AdditiveBlending,
  });
  return material;
};

export default _createWaterMaterial;