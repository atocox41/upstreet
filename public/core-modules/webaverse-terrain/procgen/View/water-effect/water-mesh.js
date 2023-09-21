import * as THREE from 'three';

// import metaversefile from 'metaversefile';

import _createWaterMaterial from './water-material.js';
import { WATER_HEIGHT } from '../../utils/constants.js';

// const {useInternals} = metaversefile;
// const {renderer, camera, scene} = useInternals();

const INITIAL_TEXTURE_MATRIX = new THREE.Matrix4();
INITIAL_TEXTURE_MATRIX.set(
  0.5,
  0.0,
  0.0,
  0.5,
  0.0,
  0.5,
  0.0,
  0.5,
  0.0,
  0.0,
  0.5,
  0.5,
  0.0,
  0.0,
  0.0,
  1.0
);
class Water extends THREE.Mesh {

	constructor(oceanSize, player, instancedScene, particleScene, internals, underWaterMask) {
    const {scene, camera} = internals;
		const geometry = new THREE.PlaneGeometry(oceanSize, oceanSize);
		const material = _createWaterMaterial();
		super(geometry, material);

		this.instancedScene = instancedScene;
    this.particleScene = particleScene;
    this.internals = internals;
		this.player = player;
    this.underWaterMask = underWaterMask;
		// for depth
    const pixelRatio = window.devicePixelRatio;
    this.depthRenderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth * pixelRatio,
      window.innerHeight * pixelRatio
    );
    
    this.depthRenderTarget.texture.minFilter = THREE.NearestFilter;
    this.depthRenderTarget.texture.magFilter = THREE.NearestFilter;
    this.depthRenderTarget.texture.generateMipmaps = false;
    this.depthRenderTarget.stencilBuffer = false;

    this.depthRenderTarget.depthTexture = new THREE.DepthTexture();
    this.depthRenderTarget.depthTexture.type = THREE.UnsignedShortType;
    this.depthRenderTarget.depthTexture.minFilter = THREE.NearestFilter;
    this.depthRenderTarget.depthTexture.maxFilter = THREE.NearestFilter;

		this.depthMaterial = new THREE.MeshDepthMaterial();
    this.depthMaterial.depthPacking = THREE.RGBADepthPacking;
    this.depthMaterial.blending = THREE.NoBlending;

		// for reflection
    this.eye = new THREE.Vector3(0, 0, 0);
    this.reflectorPlane = new THREE.Plane();
    this.normal = new THREE.Vector3();
    this.reflectorWorldPosition = new THREE.Vector3();
    this.cameraWorldPosition = new THREE.Vector3();
    this.rotationMatrix = new THREE.Matrix4();
    this.lookAtPosition = new THREE.Vector3(0, 0, -1);
    this.clipPlane = new THREE.Vector4();
    this.view = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.q = new THREE.Vector4();
    this.textureMatrix = new THREE.Matrix4();
    this.reflectionVirtualCamera = new THREE.PerspectiveCamera();
    const parameters = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false,
    };
    this.mirrorRenderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio,
      parameters
    );

		// depth
		this.material.uniforms.tMask.value = this.depthRenderTarget.depthTexture; 
    this.material.uniforms.tDepth.value = this.depthRenderTarget.texture; 
    this.material.uniforms.cameraNear.value = camera.near;
    this.material.uniforms.cameraFar.value = camera.far;
    this.material.uniforms.resolution.value.set(
			window.innerWidth * window.devicePixelRatio,
			window.innerHeight * window.devicePixelRatio
    );

		// reflection refraction
    // this.material.uniforms.refractionTexture.value = this.refractionRenderTarget.texture;
    this.material.uniforms.mirror.value = this.mirrorRenderTarget.texture;
    this.material.uniforms.textureMatrix.value = this.textureMatrix;
    this.material.uniforms.eye.value = this.eye;

		window.addEventListener('resize', () => this.resize());
	}
	renderDepth () {
    const {
      renderer,
      scene,
      camera,
    } = this.internals;
    renderer.setRenderTarget(this.depthRenderTarget);
    renderer.clear();
    
    this.visible = false;
    this.underWaterMask.visible = false;
    this.instancedScene.visible = false;
    this.particleScene.visible = false;

    scene.overrideMaterial = this.depthMaterial;

    // do not render any objects with a custom depth material, as they can interferere with water quality
    const pushCustomDepth = () => {
      const cleanups = [];
      scene.traverse(o => {
        if (o.isMesh && o.customDepthMaterial) {
          if (o.visible) {
            o.visible = false;

            cleanups.push(() => {
              o.visible = true;
            });
          }
        }
      });
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          cleanups[i]();
        }
      };
    };
    const popCustomDepth = pushCustomDepth();

    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    popCustomDepth();

    scene.overrideMaterial = null;
    this.visible = true;
    this.underWaterMask.visible = true;
    this.instancedScene.visible = true;
    this.particleScene.visible = true;
  }
	renderMirror(renderer, scene, camera) {
    this.reflectorWorldPosition.setFromMatrixPosition(this.matrixWorld);
    this.cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);

    this.rotationMatrix.extractRotation(this.matrixWorld);

    this.normal.set(0, 0, 1);
    this.normal.applyMatrix4(this.rotationMatrix);

    this.view.subVectors(this.reflectorWorldPosition, this.cameraWorldPosition);

    // Avoid rendering when mirror is facing away

    if (this.view.dot(this.normal) > 0) return;

    this.view.reflect(this.normal).negate();
    this.view.add(this.reflectorWorldPosition);

    this.rotationMatrix.extractRotation(camera.matrixWorld);

    this.lookAtPosition.set(0, 0, -1);
    this.lookAtPosition.applyMatrix4(this.rotationMatrix);
    this.lookAtPosition.add(this.cameraWorldPosition);

    this.target.subVectors(this.reflectorWorldPosition, this.lookAtPosition);
    this.target.reflect(this.normal).negate();
    this.target.add(this.reflectorWorldPosition);

    this.reflectionVirtualCamera.position.copy(this.view);
    this.reflectionVirtualCamera.up.set(0, 1, 0);
    this.reflectionVirtualCamera.up.applyMatrix4(this.rotationMatrix);
    this.reflectionVirtualCamera.up.reflect(this.normal);
    this.reflectionVirtualCamera.lookAt(this.target);

    this.reflectionVirtualCamera.far = camera.far; // Used in WebGLBackground

    this.reflectionVirtualCamera.updateMatrixWorld();
    this.reflectionVirtualCamera.projectionMatrix.copy(camera.projectionMatrix);

    // Update the texture matrix
    this.textureMatrix.copy(INITIAL_TEXTURE_MATRIX);
    this.textureMatrix.multiply(this.reflectionVirtualCamera.projectionMatrix);
    this.textureMatrix.multiply(
      this.reflectionVirtualCamera.matrixWorldInverse
    );
    this.textureMatrix.multiply(this.matrixWorld);

    // Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
    // Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
    this.reflectorPlane.setFromNormalAndCoplanarPoint(
      this.normal,
      this.reflectorWorldPosition
    );
    this.reflectorPlane.applyMatrix4(
      this.reflectionVirtualCamera.matrixWorldInverse
    );

    this.clipPlane.set(
      this.reflectorPlane.normal.x,
      this.reflectorPlane.normal.y,
      this.reflectorPlane.normal.z,
      this.reflectorPlane.constant,
    );

    const projectionMatrix = this.reflectionVirtualCamera.projectionMatrix;

    this.q.x =
      (Math.sign(this.clipPlane.x) + projectionMatrix.elements[8]) /
      projectionMatrix.elements[0];
    this.q.y =
      (Math.sign(this.clipPlane.y) + projectionMatrix.elements[9]) /
      projectionMatrix.elements[5];
    this.q.z = -1.0;
    this.q.w =
      (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

    // Calculate the scaled plane vector
    this.clipPlane.multiplyScalar(2.0 / this.clipPlane.dot(this.q));

    // Replacing the third row of the projection matrix
    const clipBias = 0.00001;
    projectionMatrix.elements[2] = this.clipPlane.x;
    projectionMatrix.elements[6] = this.clipPlane.y;
    projectionMatrix.elements[10] = this.clipPlane.z + 1.0 - clipBias;
    projectionMatrix.elements[14] = this.clipPlane.w;

    this.eye.setFromMatrixPosition(camera.matrixWorld);

    // Render

    // this.mirrorRenderTarget.texture.encoding = renderer.outputEncoding;
    // if (this.player.avatar) {
    //   this.player.avatar.app.visible = false;
    // }
    this.instancedScene.visible = false;
    this.particleScene.visible = false;
    this.visible = false;

    const currentRenderTarget = renderer.getRenderTarget();

    const currentXrEnabled = renderer.xr.enabled;
    const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

    renderer.xr.enabled = false; // Avoid camera modification and recursion
    renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

    renderer.setRenderTarget(this.mirrorRenderTarget);

    renderer.state.buffers.depth.setMask(true); // make sure the depth buffer is writable so it can be properly cleared, see #18897
    if (renderer.autoClear === false) renderer.clear();
    renderer.render(scene, this.reflectionVirtualCamera);

    renderer.xr.enabled = currentXrEnabled;
    renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;

    renderer.setRenderTarget(currentRenderTarget);

    // Restore viewport

    const viewport = camera.viewport;

    if (viewport !== undefined) {
      renderer.state.viewport(viewport);
    }

    // if (this.player.avatar) {
    //   this.player.avatar.app.visible = true;
    // }
    this.instancedScene.visible = true;
    this.particleScene.visible = true;
    this.visible = true;
  }
	onBeforeRender(renderer, scene, camera) {
    if(camera.position.y > WATER_HEIGHT) {
      this.renderMirror(renderer, scene, camera);
    }
  }
  resize () {
    const pixelRatio = window.devicePixelRatio;
    this.depthRenderTarget.setSize(
      window.innerWidth * pixelRatio,
      window.innerHeight * pixelRatio
    );
    this.material.uniforms.resolution.value.set(
      window.innerWidth * pixelRatio,
      window.innerHeight * pixelRatio
    );
  }

}
export { Water };