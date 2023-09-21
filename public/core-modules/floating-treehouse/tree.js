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

const treeInfo = [
  {x: 0, y: -4.7, z: 23, scale: 0.35, rotation: 0.1, leafType: 2},
  {x: -10, y: -3, z: -12, scale: 0.25, rotation: 1.7, leafType: 1},
]

const PARTICLE_COUNT = treeInfo.length;

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

class TreeMesh extends InstancedMesh {

	constructor(glbGeometry) {
    const attributeSpecs = [];
    attributeSpecs.push({name: 'scales', itemSize: 3});
    attributeSpecs.push({name: 'rotation', itemSize: 1});
    attributeSpecs.push({name: 'leafType', itemSize: 1});
    const geometry = _getGeometry(glbGeometry, attributeSpecs, PARTICLE_COUNT);
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Uint16Array(glbGeometry.attributes.color.array.length), 4)
    );
    const vertexColorAttribute = geometry.getAttribute('color');
    for(let i = 0; i < glbGeometry.attributes.color.array.length; i++){
      geometry.attributes.color.array[i] = glbGeometry.attributes.color.array[i];
    }
    vertexColorAttribute.needsUpdate = true;
    geometry.attributes.color.normalized = true;


    const shader = TreeMesh.TreeShader;

    const material = new ShaderMaterial({
      fragmentShader: shader.fragmentShader,
			vertexShader: shader.vertexShader,
			uniforms: UniformsUtils.clone(shader.uniforms),
			side: DoubleSide,
      transparent: true,
    });
		super(geometry, material, PARTICLE_COUNT);
    
    this.initialTreeAttribute(this);
	}
  
  initialTreeAttribute(trees) { // initialize the cloud based on the cloud-data.js
    const scalesAttribute = trees.geometry.getAttribute('scales');
    const positionsAttribute = trees.geometry.getAttribute('positions');
    const rotationAttribute = trees.geometry.getAttribute('rotation');
    const leafTypeAttribute = trees.geometry.getAttribute('leafType');
    for (let i = 0; i < PARTICLE_COUNT; i ++) {
      positionsAttribute.setXYZ(i, treeInfo[i].x, treeInfo[i].y, treeInfo[i].z);
      scalesAttribute.setX(i, treeInfo[i].scale);
      rotationAttribute.setX(i, treeInfo[i].rotation);
      leafTypeAttribute.setX(i, treeInfo[i].leafType)
    }
    scalesAttribute.needsUpdate = true;
    positionsAttribute.needsUpdate = true; 
    rotationAttribute.needsUpdate = true; 
    leafTypeAttribute.needsUpdate = true;
  }

}
TreeMesh.TreeShader = {
  uniforms: {
    uTime: {
      value: 0
    },
    noiseTexture: {
      value: null
    },
    leafTexture1: {
      value: null
    },
    leafTexture2: {
      value: null
    },
    leafTexture3: {
      value: null
    },
    map: {
      value: null
    },
    lightPos: {
      value: new THREE.Vector3()
    },
    eye: {
      value: new THREE.Vector3()
    }
  },
  vertexShader: `\ 
    ${THREE.ShaderChunk.common}
    ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
    attribute vec4 color;
    attribute float scales;
    attribute float rotation;
    attribute float leafType;
    attribute vec3 positions;
      
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec4 vColor;
    varying vec3 vNormal;
    varying float vLeafType;

    uniform float uTime;
    uniform sampler2D noiseTexture;

    void main() {
      mat3 rotY = mat3(
        cos(rotation), 0.0, -sin(rotation), 
        0.0, 1.0, 0.0, 
        sin(rotation), 0.0, cos(rotation)
      );
      vUv = uv;
      vColor = color;
      vNormal = normal;
      vLeafType = leafType;

      vec3 pos = position;
      pos *= scales;
      pos *= rotY;
      vNormal *= rotY;
      pos += positions; 
      
      if (vColor.r > 0.1) {
        // vec3 offset = uv.x * sin(uv.y + uTime) * vec3(1., 0., 1.);
        vec4 tempPos = modelMatrix * vec4(pos, 1.0);
        float noiseScale = 0.1;
        vec2 texUv = vec2(
          tempPos.x * noiseScale + uTime * 0.01,
          tempPos.z * noiseScale + uTime * 0.01
        );
        vec4 noise = texture2D(noiseTexture, texUv);
        pos += noise.r * vec3(2., 0., 2.);
      }
      
      vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
      vec4 viewPosition = viewMatrix * modelPosition;
      vec4 projectionPosition = projectionMatrix * viewPosition;
      vWorldPosition = modelPosition.xyz;
      gl_Position = projectionPosition;
      ${THREE.ShaderChunk.logdepthbuf_vertex}
    }
  `,
  fragmentShader: `\
    ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
    #include <common>

    uniform float uTime;
    uniform vec3 eye;
    uniform vec3 lightPos;
    uniform sampler2D map;
    uniform sampler2D leafTexture1;
    uniform sampler2D leafTexture2;
    uniform sampler2D leafTexture3;
    
    varying vec2 vUv;
    varying vec4 vColor;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying float vLeafType;

    float DGGX(float a2, float NoH){
        float d = (NoH * a2 - NoH) * NoH + 1.; 
        return a2 / (PI * d * d);         
    }

    float WrapRampNL(float nl, float threshold, float smoothness) {
      nl = smoothstep(threshold - smoothness * 0.5, threshold + smoothness * 0.5, nl);
      return nl;
    }

    // cosine gradient 
    const float TAU = 2. * 3.14159265;
    const vec4 phases = vec4(0.34, 0.48, 0.27, 0);
    const vec4 amplitudes = vec4(4.02, 0.34, 0.65, 0);
    const vec4 frequencies = vec4(0.00, 0.48, 0.08, 0);
    const vec4 offsets = vec4(0.21, 0.33, 0.06, -0.38);

    vec4 cosGradient(float x, vec4 phase, vec4 amp, vec4 freq, vec4 offset){
      phase *= TAU;
      x *= TAU;

      return vec4(
        offset.r + amp.r * 0.5 * cos(x * freq.r + phase.r) + 0.5,
        offset.g + amp.g * 0.5 * cos(x * freq.g + phase.g) + 0.5,
        offset.b + amp.b * 0.5 * cos(x * freq.b + phase.b) + 0.5,
        offset.a + amp.a * 0.5 * cos(x * freq.a + phase.a) + 0.5
      );
    }

    vec4 getLeafTex(float number, vec2 uv) { 
      vec4 tex;
      if (number < 1.5) {
        tex = texture2D(leafTexture1, uv);
      }
      else if (number < 2.5) {
        tex = texture2D(leafTexture2, uv);
      }
      return tex;
    }
    void main() {
      vec3 eyeDirection = normalize(eye - vWorldPosition);
      vec3 surfaceNormal = normalize(vNormal);
      vec3 lightDir = normalize(lightPos);
      float NdotL = max(0.0, dot(lightDir, surfaceNormal));

      vec4 treeColor;
      if (vColor.r > 0.1) {
        vec2 uv = vUv;
        uv.x += 0.05;
        uv.y -= 0.24;
        uv *= 1.25;
        treeColor = getLeafTex(vLeafType, uv);
        
        gl_FragColor.a = treeColor.a;
        if (gl_FragColor.a < 0.9) {
          discard;
        }
      }
      else {
        treeColor = texture2D(map, vUv * 10.);
        gl_FragColor.a = treeColor.a;
        if (gl_FragColor.a < 0.99) {
          discard;
        }
      }
      
      vec4 cosGradColor = cosGradient(NdotL, phases, amplitudes, frequencies, offsets);
      vec3 ambient = cosGradColor.rgb;

      float albedoLerp = 0.7;
      vec3 albedo = mix(vec3(0.0399, 0.570, 0.164), vec3(0.483, 0.950, 0.171), NdotL + albedoLerp).rgb;
      vec3 diffuse = mix(ambient.rgb * albedo.rgb, albedo.rgb, NdotL);

      vec3 lightToEye = normalize(lightPos + eye);
      float specularReflection = dot(surfaceNormal, lightToEye);
      float specularRoughness = 0.6;
      float specularIntensity = 0.9;
      float specular = DGGX(specularRoughness * specularRoughness, specularReflection);
      // vec3 specularColor = albedo * specular * specularIntensity;
      vec3 specularColor = vColor.r > 0.1 ? albedo * specular * specularIntensity : vec3(specular * specularIntensity);

      vec3 backLightDir = normalize(surfaceNormal + lightPos);
      float backSSS = saturate(dot(eyeDirection, -backLightDir));
      float backSSSIntensity = smoothstep(0.8, 1.0, backSSS) * 0.5;
      backSSS = saturate(dot(pow(backSSS, 1.), backSSSIntensity));

      float colorIntensity = 0.3;
      if (vColor.r > 0.1) {
        gl_FragColor.rgb = (diffuse + albedo + specularColor) * colorIntensity;
        gl_FragColor.rgb = mix(gl_FragColor.rgb * 0.8, gl_FragColor.rgb, treeColor.r);
        
        float topColor = dot(vec3(0.0, 1.0, 0.0), surfaceNormal) * 0.5 + 0.5;
        gl_FragColor.rgb *= smoothstep(0.1, 0.99, topColor);
        
        gl_FragColor.rgb += backSSS;
      }
      else {
        gl_FragColor.rgb = (treeColor.rgb + specularColor) * colorIntensity * 0.5;
      }
      ${THREE.ShaderChunk.logdepthbuf_fragment}
    }
  `
}
export {TreeMesh};