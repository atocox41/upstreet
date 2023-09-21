import {
  PlaneGeometry,
  BufferGeometry,
	ShaderMaterial,
	UniformsUtils,
	Vector3,
  InstancedMesh,
  DoubleSide,
  InstancedBufferAttribute
} from 'three';

import * as THREE from 'three';

const PARTICLE_COUNT = 150;
const FOG_RADIUS = 2000;
const _getGeometry = (geometry, attributeSpecs, particleCount) => {
  const geometry2 = new BufferGeometry();
  ['position', 'normal', 'uv'].forEach(k => {
  geometry2.setAttribute(k, geometry.attributes[k]);
  });
  geometry2.setIndex(geometry.index);

  const positions = new Float32Array(particleCount * 3);
  const positionsAttribute = new InstancedBufferAttribute(positions, 3);
  geometry2.setAttribute('positions', positionsAttribute);

  for(const attributeSpec of attributeSpecs){
      const {
          name,
          itemSize,
      } = attributeSpec;
      const array = new Float32Array(particleCount * itemSize);
      geometry2.setAttribute(name, new InstancedBufferAttribute(array, itemSize));
  }

  return geometry2;
};

class Fog extends InstancedMesh {

	constructor() {
    const attributeSpecs = [];
    attributeSpecs.push({name: 'scales', itemSize: 3});
    attributeSpecs.push({name: 'opacity', itemSize: 1});
    attributeSpecs.push({name: 'distortion', itemSize: 1});
    attributeSpecs.push({name: 'textureRotation', itemSize: 1});
    const geometry2 = new THREE.PlaneBufferGeometry(100, 100);
    const geometry = _getGeometry(geometry2, attributeSpecs, PARTICLE_COUNT);

    const shader = Fog.FogShader;

    const material = new ShaderMaterial({
      fragmentShader: shader.fragmentShader,
			vertexShader: shader.vertexShader,
			uniforms: UniformsUtils.clone(shader.uniforms),
			side: DoubleSide,
			depthWrite: false,
      transparent: true,
    });

		super(geometry, material, PARTICLE_COUNT);
    this.info = {
      velocity: [PARTICLE_COUNT],
      fadeOut: [PARTICLE_COUNT],
      maxOp: [PARTICLE_COUNT],
      rotateDir: [PARTICLE_COUNT],
    }
    
    this.fogRadius = FOG_RADIUS;
    this.initialFogInfo();

	}
  initialFogInfo() {
    for(let i = 0; i < PARTICLE_COUNT; i++){
      this.info.velocity[i] = new THREE.Vector3();
      this.info.fadeOut[i] = false;
      this.info.maxOp[i] = 0.7 + Math.random();
    }
  }
  update() {
    const scalesAttribute = this.geometry.getAttribute('scales');
    const positionsAttribute = this.geometry.getAttribute('positions');
    const opacityAttribute = this.geometry.getAttribute('opacity');
    const textureRotationAttribute = this.geometry.getAttribute('textureRotation');
    for (let i = 0; i < PARTICLE_COUNT; i ++) {
      if (opacityAttribute.getX(i) <= 0) {
        scalesAttribute.setXYZ(
          i, 
          1 + Math.random() * 3, 
          1 + Math.random() * 1, 
          1 + Math.random() * 3
        );
        positionsAttribute.setXYZ(
          i, 
          (Math.random() - 0.5) * FOG_RADIUS,
          20 + Math.random() * 20,
          (Math.random() - 0.5) * FOG_RADIUS
        );
        const speed = Math.random();
        this.info.velocity[i].set(
          -0.1 - speed,
          Math.random() * 0.01,
          -0.1 - speed
        )
        this.info.fadeOut[i] = false; 
        this.info.maxOp[i] = 0.5 + Math.random() * 0.5;
        this.info.rotateDir[i] = Math.random();
        textureRotationAttribute.setX(i, Math.random() * 2 * Math.PI);
        opacityAttribute.setX(i, 0);
      }
      if (opacityAttribute.getX(i) >= this.info.maxOp[i]) {
        this.info.fadeOut[i] = true;
      } 
      if (!this.info.fadeOut[i]) {
        opacityAttribute.setX(i, opacityAttribute.getX(i) + 0.01);
      }
      else {
        opacityAttribute.setX(i, opacityAttribute.getX(i) - 0.001);
      }
      
      positionsAttribute.setXYZ(
        i, 
        positionsAttribute.getX(i) + this.info.velocity[i].x,
        positionsAttribute.getY(i) + this.info.velocity[i].y,
        positionsAttribute.getZ(i) + this.info.velocity[i].z
      );
      const rotDir = this.info.rotateDir[i] > 0.5 ? 0.005 : -0.005;
      textureRotationAttribute.setX(i, textureRotationAttribute.getX(i) + rotDir);
    }
    scalesAttribute.needsUpdate = true;
    positionsAttribute.needsUpdate = true; 
    opacityAttribute.needsUpdate = true; 
    textureRotationAttribute.needsUpdate = true; 
  }

}
Fog.FogShader = {
  uniforms: {
    uTime: { value: 0 },
    cameraBillboardQuaternion: {
      value: new THREE.Quaternion(),
    },
    smokeTexture: {
      value: null
    },
  },
  vertexShader:`
    ${THREE.ShaderChunk.common}
    ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
    uniform float uTime;
    uniform vec4 cameraBillboardQuaternion;
    
    attribute vec3 scales;
    attribute float opacity;
    attribute float distortion;
    attribute float textureRotation;
    attribute vec3 positions;
    

    varying float vOpacity;
    varying float vDistortion;
    varying float vTextureRotation;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    vec3 rotateVecQuat(vec3 position, vec4 q) {
      vec3 v = position.xyz;
      return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
    }
    void main() { 
      
      vOpacity = opacity;
      vDistortion = distortion; 
      vTextureRotation = textureRotation;

      vUv = uv;
      vec3 pos = position;
      pos = rotateVecQuat(pos, cameraBillboardQuaternion);
      pos *= scales;
      pos += positions;
      vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = modelPosition.xyz;
      vec4 viewPosition = viewMatrix * modelPosition;
      vec4 projectionPosition = projectionMatrix * viewPosition;
      gl_Position = projectionPosition;
      ${THREE.ShaderChunk.logdepthbuf_vertex}
    }
  `,
  fragmentShader: `
    ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
    uniform float uTime;
    uniform sampler2D smokeTexture;
    
    varying float vOpacity;
    varying float vDistortion;
    varying float vTextureRotation;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    void main() {
      float mid = 0.5;
      vec2 rotated = vec2(
        cos(vTextureRotation) * (vUv.x - mid) - sin(vTextureRotation) * (vUv.y - mid) + mid,
        cos(vTextureRotation) * (vUv.y - mid) + sin(vTextureRotation) * (vUv.x - mid) + mid
      );
      vec4 smoke = texture2D(
        smokeTexture, 
        rotated
      ); 
      
      float cutOut = 200.;
      float disatnceFade = clamp(distance(vWorldPosition.xz, vec2(0., 0.)) / cutOut, 0.0, 1.0);
      float opFade = clamp((vWorldPosition.y + cutOut) / cutOut, 0.0, 1.0);
      gl_FragColor = vec4(vec3(1.0), vOpacity * smoke.r * opFade * disatnceFade);

      ${THREE.ShaderChunk.logdepthbuf_fragment}
    }
  `
}
export {Fog};