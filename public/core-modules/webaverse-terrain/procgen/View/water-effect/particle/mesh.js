import * as THREE from 'three';
import {
  divingRippleVertex, divingRippleFragment,
  idleRippleVertex, idleRippleFragment,
  divingLowerSplashVertex, divingLowerSplashFragment,
  divingHigherSplashVertex, divingHigherSplashFragment,
  trailRippleVertex, trailRippleFragment,
  trailSplashVertex, trailSplashFragment,
  bubbleVertex, bubbleFragment,
} from './shader.js';

const _getGeometry = (geometry, attributeSpecs, particleCount) => {
  const geometry2 = new THREE.BufferGeometry();
  ['position', 'normal', 'uv'].forEach(k => {
    geometry2.setAttribute(k, geometry.attributes[k]);
  });
  geometry2.setIndex(geometry.index);
  const positions = new Float32Array(particleCount * 3);
  const positionsAttribute = new THREE.InstancedBufferAttribute(positions, 3);
  geometry2.setAttribute('positions', positionsAttribute);
  for(const attributeSpec of attributeSpecs){
    const {
      name,
      itemSize,
    } = attributeSpec;
    const array = new Float32Array(particleCount * itemSize);
    geometry2.setAttribute(name, new THREE.InstancedBufferAttribute(array, itemSize));
  }
  return geometry2;
};

const getDivingRipple = () => {
  const divingRippleGeometry = new THREE.PlaneGeometry(2, 2);
  const divingRippleMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: {
        value: 0
      },
      noiseMap2: {
        value: null
      },
    },
    vertexShader: divingRippleVertex,
    fragmentShader: divingRippleFragment,
    side: THREE.DoubleSide,
    transparent: true,
    // depthWrite: false,
    // blending: THREE.AdditiveBlending,
  });
  const divingRippleMesh = new THREE.Mesh(divingRippleGeometry, divingRippleMaterial);
  return divingRippleMesh;
}

const getIdleRipple = () => {
  const idleRippleGeometry = new THREE.PlaneGeometry(1.2, 1.2);
  const idleRippleMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: {
        value: 0
      },
      noiseMap2: {
        value: null
      },
      fadeIn: {
        value: 0
      },
    },
    vertexShader: idleRippleVertex,
    fragmentShader: idleRippleFragment,
    side: THREE.DoubleSide,
    transparent: true,
    // depthWrite: false,
    // blending: THREE.AdditiveBlending,
  });
  const idleRippleMesh = new THREE.Mesh(idleRippleGeometry, idleRippleMaterial);
  return idleRippleMesh;
}

const getDivingLowerSplash = () => {
  const particleCount = 30;
  const attributeSpecs = [];
  attributeSpecs.push({name: 'dissolve', itemSize: 1});
  attributeSpecs.push({name: 'scales', itemSize: 1});
  attributeSpecs.push({name: 'textureRotation', itemSize: 1});
  attributeSpecs.push({name: 'textureType', itemSize: 1});
  const geometry2 = new THREE.PlaneGeometry(0.25, 0.25);
  const geometry = _getGeometry(geometry2, attributeSpecs, particleCount);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      cameraBillboardQuaternion: {
        value: new THREE.Quaternion(),
      },
      splashTexture1: {
        value: null,
      },
      splashTexture2: {
        value: null,
      },
      dropletTexture: {
        value: null,
      },
      waterSurfacePos: {
        value: 0,
      },
    },
    vertexShader: divingLowerSplashVertex,
    fragmentShader: divingLowerSplashFragment,
    side: THREE.DoubleSide,
    transparent: true,
    // depthWrite: false,
    // blending: THREE.AdditiveBlending,
  });
  const divingLowerSplash = new THREE.InstancedMesh(geometry, material, particleCount);
  divingLowerSplash.info = {
    particleCount: particleCount,
    splashCount: 11,
    velocity: [particleCount],
    acc: -0.0018
  }
  for (let i = 0; i < particleCount; i++) {
    divingLowerSplash.info.velocity[i] = new THREE.Vector3();
  }
  return divingLowerSplash;
}

const getDivingHigherSplash = () => {
  const particleCount = 15;
  const attributeSpecs = [];
  attributeSpecs.push({name: 'dissolve', itemSize: 1});
  attributeSpecs.push({name: 'scales', itemSize: 1});
  attributeSpecs.push({name: 'rotation', itemSize: 1});
  const width = 0.25;
  const height = 0.65;
  const geometry2 = new THREE.PlaneGeometry(width, height);
  const geometry = _getGeometry(geometry2, attributeSpecs, particleCount);
  const material= new THREE.ShaderMaterial({
    uniforms: {
      splashTexture: {
        value: null,
      },
      waterSurfacePos: {
        value: 0,
      },
      noiseMap:{
        value: null
      },
    },
    vertexShader: divingHigherSplashVertex,
    fragmentShader: divingHigherSplashFragment,
    side: THREE.DoubleSide,
    // depthWrite: false,
    // blending: THREE.AdditiveBlending,
    transparent: true,
  });
  const divingHigherSplash = new THREE.InstancedMesh(geometry, material, particleCount);
  divingHigherSplash.info = {
    particleCount: particleCount,
    velocity: [particleCount],
    acc: -0.0034
  }
  return divingHigherSplash;
}

const getTrailRipple = () => {
  const particleCount = 15;
  const attributeSpecs = [];
  attributeSpecs.push({name: 'scales', itemSize: 1});
  attributeSpecs.push({name: 'dissolve', itemSize: 1});
  attributeSpecs.push({name: 'playerRotation', itemSize: 1});
  attributeSpecs.push({name: 'quaternions', itemSize: 4});
  const geometry2 = new THREE.PlaneGeometry(0.28, 0.28);
  const geometry = _getGeometry(geometry2, attributeSpecs, particleCount);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      rippleTexture:{
        value: null
      },
    },
    vertexShader: trailRippleVertex,
    fragmentShader: trailRippleFragment,
    side: THREE.DoubleSide,
    transparent: true,
    // depthWrite: false,
  });
  const trailRipple = new THREE.InstancedMesh(geometry, material, particleCount);
  
  trailRipple.info = {
    particleCount: particleCount,
    currentIndex: 0,
  }
  const euler = new THREE.Euler(-Math.PI / 2, 0, 0);
  const quaternion = new THREE.Quaternion();
  const quaternionAttribute = trailRipple.geometry.getAttribute('quaternions');
  for (let i = 0; i < particleCount; i ++) {
    quaternion.setFromEuler(euler);
    quaternionAttribute.setXYZW(i, quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  }
  quaternionAttribute.needsUpdate = true;
  return trailRipple;
}

const getTrailSplash = () => {
  const particleCount = 15;
  const attributeSpecs = [];
  attributeSpecs.push({name: 'scales', itemSize: 1});
  attributeSpecs.push({name: 'dissolve', itemSize: 1});
  attributeSpecs.push({name: 'textureRotation', itemSize: 1});
  attributeSpecs.push({name: 'quaternions', itemSize: 4});
  const geometry2 = new THREE.PlaneGeometry(0.28, 0.28);
  const geometry = _getGeometry(geometry2, attributeSpecs, particleCount);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      splashTexture:{
        value: null
      },
    },
    vertexShader: trailSplashVertex,
    fragmentShader: trailSplashFragment,
    side: THREE.DoubleSide,
    transparent: true,
    // depthWrite: false,
  });
  const trailSplash = new THREE.InstancedMesh(geometry, material, particleCount);
  
  trailSplash.info = {
    particleCount: particleCount,
    currentIndex: 0,
  }
  const euler = new THREE.Euler(-Math.PI / 2, 0, 0);
  const quaternion = new THREE.Quaternion();
  const quaternionAttribute = trailSplash.geometry.getAttribute('quaternions');
  for (let i = 0; i < particleCount; i ++) {
    quaternion.setFromEuler(euler);
    quaternionAttribute.setXYZW(i, quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  }
  quaternionAttribute.needsUpdate = true;
  return trailSplash;
}

const getBubble = () => {
  const particleCount = 15;
  const attributeSpecs = [];
  attributeSpecs.push({name: 'scales', itemSize: 1});
  const geometry2 = new THREE.PlaneGeometry(0.28, 0.28);
  const geometry = _getGeometry(geometry2, attributeSpecs, particleCount);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      bubbleTexture:{
        value: null
      },
      cameraBillboardQuaternion: {
        value: new THREE.Quaternion(),
      },
      waterSurfacePos: {
        value: 0,
      },
    },
    vertexShader: bubbleVertex,
    fragmentShader: bubbleFragment,
    side: THREE.DoubleSide,
    transparent: true,
    // depthWrite: false,
  });
  const bubble = new THREE.InstancedMesh(geometry, material, particleCount);
  
  bubble.info = {
    particleCount: particleCount,
    currentIndex: 0,
    velocity: [particleCount],
    life: [particleCount],
    maxLife: [particleCount],
  }
  for (let i = 0; i < particleCount; i ++) {
    bubble.info.velocity[i] = new THREE.Vector3();
    bubble.info.life[i] = 0;
  }
  return bubble;
}

export {
  getDivingRipple,
  getIdleRipple,
  getDivingLowerSplash,
  getDivingHigherSplash,
  getTrailRipple,
  getTrailSplash,
  getBubble,
};