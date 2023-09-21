/*
this file contains the main objects we use for rendering.
the purpose of this file is to hold these objects and to make sure they are correctly configured (e.g. handle canvas resize)
*/

import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
// import {makePromise} from '../util.js';
import {minFov, minCanvasSize} from '../constants.js';
import {WebaverseScene} from '../webaverse-scene.js';
import {
  makeDefaultPerspectiveCamera,
} from '../renderer-utils.js';

// XXX enable this when the code is stable; then, we will have many more places to add missing matrix updates
// THREE.Object3D.DefaultMatrixAutoUpdate = false;

// let offscreenCanvas = null;
// let canvas = null;
// let context = null;
// let renderer = null;
// let composer = null;

/* function bindCanvas(c) {
  // initialize renderer
  canvas = c;
  // context = canvas && canvas.getContext('webgl2', {
  //   antialias: true,
  //   alpha: true,
  //   xrCompatible: true,
  // });

  // get canvas context as a bitmap renderer
  context = canvas && canvas.getContext('bitmaprenderer');
} */

// function getRenderer() {
//   return renderer;
// }
// function getContainerElement() {
//   const container = canvas.parentNode;
//   return container;
// }

// function getComposer() {
//   return composer;
// }

//

const isMobile = typeof  globalThis.orientation !== 'undefined';

//

const defaultSize = 1024;
export class EngineRenderer extends EventTarget {
  constructor() {
    super();

    const scene = new THREE.Scene();
    scene.name = 'scene';
    this.scene = scene;

    const sceneHighPriority = new THREE.Scene();
    sceneHighPriority.name = 'highPriorioty';
    this.sceneHighPriority = sceneHighPriority;

    const sceneLowPriority = new THREE.Scene();
    sceneLowPriority.name = 'lowPriorioty';
    this.sceneLowPriority = sceneLowPriority;

    const sceneLowerPriority = new THREE.Scene();
    sceneLowerPriority.name = 'lowerPriorioty';
    this.sceneLowerPriority = sceneLowerPriority;

    const sceneLowestPriority = new THREE.Scene();
    sceneLowestPriority.name = 'lowestPriorioty';
    this.sceneLowestPriority = sceneLowestPriority;
    
    const rootScene = new WebaverseScene();
    rootScene.name = 'root';
    rootScene.autoUpdate = false;
    rootScene.add(sceneHighPriority);
    rootScene.add(scene);
    rootScene.add(sceneLowPriority);
    rootScene.add(sceneLowerPriority);
    rootScene.add(sceneLowestPriority);
    this.rootScene = rootScene;

    const camera = makeDefaultPerspectiveCamera();
    scene.add(camera);
    this.camera = camera;

    this.renderer = null;
    this.renderTarget = null;
    this.composer = null;

    window.addEventListener('pagehide', () => {
      navigator.sendBeacon('/log/pagehide');

      if (this.renderer) {
        if (this.renderer.domElement) {
          this.renderer.domElement.width = 0;
          this.renderer.domElement.height = 0;
          // remove from the dom
          this.renderer.domElement.parentNode && this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        this.renderer.forceContextLoss();
        this.renderer.dispose();
      }
    });
  }
  setCanvas(canvas) {
    if (canvas) {
      // renderer
      this.renderer = new THREE.WebGLRenderer({
        // canvas: this.offscreenCanvas,
        canvas,
        antialias: true,
        alpha: true,
        rendererExtensionFragDepth: true,
      });
      
      this.renderer.autoClear = false;
      this.renderer.sortObjects = false;
      this.renderer.physicallyCorrectLights = true;
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      // this.renderer.premultipliedAlpha = false;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      // this.renderer.xr.enabled = true;
      this.renderer.xr.cameraAutoUpdate = false;
    
      // initialize post-processing
      const renderTarget = new THREE.WebGLRenderTarget(
        defaultSize,
        defaultSize,
        {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          encoding: THREE.sRGBEncoding,
        },
      );
      renderTarget.name = 'effectComposerRenderTarget';
      const context = this.renderer.getContext();
      renderTarget.samples = context.MAX_SAMPLES;
      renderTarget.texture.generateMipmaps = false;
      this.renderTarget = renderTarget;

      this.composer = new EffectComposer(this.renderer, this.renderTarget);

      // initialize camera
      const pixelRatio = 1;
      this.setCameraSize(defaultSize, defaultSize, pixelRatio);

      this.setSizes(canvas);
      this.bindCanvasEvents(canvas);
    } else {
      if (this.composer) {
        this.composer = null;
      }

      if (this.renderTarget) {
        this.renderTarget.dispose();
        this.renderTarget = null;
      }

      if (this.renderer) {
        this.renderer.domElement.unobserveEvents();
        this.renderer.forceContextLoss();
        this.renderer.dispose();
        this.renderer = null;
      }
    }
  }
  bindCanvasEvents(canvas) {
    // resize observer
    const resizeObserver = new ResizeObserver(entries => {
      // for (const entry of entries) {
      //   const {
      //     width,
      //     height,
      //   } = entry.contentRect;
        this.setSizes(canvas);
      // }
    });
    resizeObserver.observe(canvas);
    canvas.unobserveEvents = () => {
      resizeObserver.disconnect();
    };

    this.setSizes(canvas);
  }
  setSizes(canvas) {
    const rect = canvas.getBoundingClientRect();
    let {
      width,
      height,
    } = rect;
    width = Math.max(width, minCanvasSize);
    height = Math.max(height, minCanvasSize);
    
    const pixelRatio = globalThis.devicePixelRatio;
    this.setRendererSize(width, height, pixelRatio);
    this.setRenderTargetSize(width, height, pixelRatio);
    this.setComposerSize(width, height, pixelRatio);
    this.setCameraSize(width, height, pixelRatio);
  }
  setRendererSize(width, height, pixelRatio) {
    const {renderer} = this;
    if (renderer.xr.getSession()) {
      renderer.xr.isPresenting = false;
    }

    renderer.setSize(width, height, false);
    renderer.setPixelRatio(isMobile ? 1 : globalThis.devicePixelRatio);

    // resume XR
    if (renderer.xr.getSession()) {
      renderer.xr.isPresenting = true;
    }
  }
  setRenderTargetSize(width, height, pixelRatio) {
    this.renderTarget.setSize(width * pixelRatio, height * pixelRatio);
  }
  setComposerSize(width, height, pixelRatio) {
    const {composer} = this;
    if (composer) {
      composer.setSize(width, height);
      composer.setPixelRatio(pixelRatio);
    }
  }
  setCameraSize(width, height, pixelRatio) {
    const aspect = width / height;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
  render() {
    const {renderer} = this;
    // renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(
      this.rootScene,
      this.camera
    );

    this.dispatchEvent(new MessageEvent('render'));
  }
  async waitForRender() {
    await new Promise((accept, reject) => {
      const render = e => {
        accept();
        cleanup();
      };
      this.addEventListener('render', render);

      const cleanup = () => {
        this.removeEventListener('render', render);
      };
    });
  }
}