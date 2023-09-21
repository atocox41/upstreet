import {cloudData} from './cloud-data.js';
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

import {cloudVertexShader, cloudFragmentShader} from '../Material/cloud/shader.js';

import * as THREE from 'three';

const CLOUD_RADIUS = 4900;
const TOTAL_RADIUS_CHUNK = 100; // divide the cloudRadius into 100 parts
const PARTICLE_COUNT = cloudData.length;

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

class Cloud extends InstancedMesh {

	constructor() {
    const attributeSpecs = [];
    attributeSpecs.push({name: 'textureNumber', itemSize: 1});
    attributeSpecs.push({name: 'distortionSpeed', itemSize: 1});
    attributeSpecs.push({name: 'distortionRange', itemSize: 1});
    attributeSpecs.push({name: 'scales', itemSize: 2});
    attributeSpecs.push({name: 'offset', itemSize: 2});
    attributeSpecs.push({name: 'rotationY', itemSize: 1});

    
    const geometry2 = new PlaneGeometry(10, 10);
    const geometry = _getGeometry(geometry2, attributeSpecs, PARTICLE_COUNT);

    const shader = Cloud.CloudShader;

    const material = new ShaderMaterial({
      fragmentShader: shader.fragmentShader,
			vertexShader: shader.vertexShader,
			uniforms: UniformsUtils.clone(shader.uniforms),
			side: DoubleSide,
			depthWrite: false,
      transparent: true,
    });
		super(geometry, material, PARTICLE_COUNT);
    this.initialCloudAttribute(this);
    this.cloudRadius = CLOUD_RADIUS;
	}
  
  initialCloudAttribute(cloud) { // initialize the cloud based on the cloud-data.js
    const scalesAttribute = cloud.geometry.getAttribute('scales');
    const positionsAttribute = cloud.geometry.getAttribute('positions');
    const rotationAttribute = cloud.geometry.getAttribute('rotationY');
    const offsetAttribute = cloud.geometry.getAttribute('offset');
    const distortionSpeedAttribute = cloud.geometry.getAttribute('distortionSpeed');
    const distortionRangeAttribute = cloud.geometry.getAttribute('distortionRange');
    const textureNumberAttribute = cloud.geometry.getAttribute('textureNumber');
    
    for(let i = 0; i < PARTICLE_COUNT; i++){
      const w = cloudData[i].width;
      const h = cloudData[i].height;
      const posY = cloudData[i].posY;
      const cloudNumber = cloudData[i].cloudNumber;
      scalesAttribute.setXY(i, w, h);
      const theta = 2. * Math.PI * cloudData[i].positionIndex / TOTAL_RADIUS_CHUNK;
      positionsAttribute.setXYZ(
                              i,
                              Math.sin(theta) * CLOUD_RADIUS,
                              posY,
                              Math.cos(theta) * CLOUD_RADIUS
      ) 
      const n = Math.cos(theta) > 0 ? 1 : -1;
      rotationAttribute.setX(i, -Math.sin(theta) * n * (Math.PI / 2));
      offsetAttribute.setXY(
        i,
        (cloudNumber % 2) * (1. / 2.),
        (3 / 4) - Math.floor(cloudNumber / 2) * (1 / 4)
      );
      distortionSpeedAttribute.setX(i, cloudData[i].distortionSpeed);
      distortionRangeAttribute.setX(i, (1. - cloudData[i].distortionRange) * 2);
      textureNumberAttribute.setX(i, cloudData[i].textureNumber);
    }
    scalesAttribute.needsUpdate = true;
    positionsAttribute.needsUpdate = true; 
    rotationAttribute.needsUpdate = true;
    offsetAttribute.needsUpdate = true;
    distortionSpeedAttribute.needsUpdate = true;
    distortionRangeAttribute.needsUpdate = true;
    textureNumberAttribute.needsUpdate = true;
  }

}
Cloud.CloudShader = {
  uniforms: {
    uTime: { 
      value: 0 
    },
    sunPosition: {
      value: new Vector3()
    },
    noiseTexture2: {
      value: null
    },
    cloudRadius: {
      value: CLOUD_RADIUS
    },
    cloudTexture1: {
      value: null
    },
    cloudTexture2: {
      value: null
    },
    cloudTexture3: {
      value: null
    },
    cloudTexture4: {
      value: null
    },
  },
  vertexShader:cloudVertexShader,
  fragmentShader: cloudFragmentShader
}
export {Cloud};