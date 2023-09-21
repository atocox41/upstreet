import * as THREE from 'three';
// import metaversefile from 'metaversesfile';
import _createCloudMaterial from './cloud-material.js';

// const {useInternals} = metaversefile;
// const {renderer, camera, scene} = useInternals();

export class CloudMesh extends THREE.Mesh {
  constructor({
    depthInvisibleList,
    renderer,
    camera,
    scene,
  }) {
    const geometry = new THREE.PlaneGeometry(2500, 2500, 2048, 2048);
    const material = _createCloudMaterial();
    super(geometry, material);

    this.depthInvisibleList = depthInvisibleList;
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;

    const pixelRatio = renderer.getPixelRatio();
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

    this.material.uniforms.tMask.value = this.depthRenderTarget.depthTexture; 
    this.material.uniforms.tDepth.value = this.depthRenderTarget.texture; 
    this.material.uniforms.cameraNear.value = camera.near;
    this.material.uniforms.cameraFar.value = camera.far;
    this.material.uniforms.resolution.value.set(
        window.innerWidth * window.devicePixelRatio,
        window.innerHeight * window.devicePixelRatio
    );

    window.addEventListener('resize', () => this.resize());
  }
  
  renderDepth () {
    this.renderer.setRenderTarget(this.depthRenderTarget);
    this.renderer.clear();
    
    for (const i of this.depthInvisibleList) {
      i.visible = false;
    }
    this.visible = false;

    this.scene.overrideMaterial = this.depthMaterial;

    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);

    this.scene.overrideMaterial = null;

    for (const i of this.depthInvisibleList) {
      i.visible = true;
    }

    this.visible = true;
  }
  resize () {
    const pixelRatio = this.renderer.getPixelRatio();
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