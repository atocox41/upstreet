import {
	BackSide,
	SphereGeometry,
	Mesh,
	ShaderMaterial,
	UniformsUtils,
	Vector3
} from 'three';

import { skySettings } from '../../utils/constants.js';

import {skyDomeVertexShader, skyDomeFragmentShader} from '../Material/sky-dome/shader.js';

import * as THREE from 'three';

class Sky extends Mesh {
	constructor() {
		const shader = Sky.SkyShader;

		const material = new ShaderMaterial({
			fragmentShader: shader.fragmentShader,
			vertexShader: shader.vertexShader,
			uniforms: UniformsUtils.clone(shader.uniforms),
			side: BackSide,
      transparent: true,
			depthWrite: false
		});
		super(new SphereGeometry(8000, 32, 32), material);
	}
}

Sky.prototype.isSky = true;

Sky.SkyShader = {
	uniforms: {
		uSunPosition: { value: new THREE.Vector3() },
    uDayCycleProgress: { value: 0 },
    uTime: { value: 0 },
    galaxyTexture: { value: null },
    noiseTexture: { value: null },
    noiseTexture2: { value: null },
    starTexture: { value: null },
	},
	vertexShader: skyDomeVertexShader,
	fragmentShader: skyDomeFragmentShader
};

export {Sky};