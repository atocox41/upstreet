import * as THREE from 'three';
// import metaversefile from 'metaversefile';
// import {CloudMesh} from './cloud-mesh.js';
// import {TreeMesh} from './tree.js';
// import {Fog} from './fog.js';

export default e => {
  // const {useApp, useLoaders, useRenderer, usePhysics, useCleanup, useFrame, useLightsManager, usePostProcessing, useInternals, useRenderSettings} = metaversefile;
  
  const {
    useApp,
    useLoaders,
    useRenderer,
    usePhysics,
    useCleanup,
    useFrame,
    useLightingManager,
    useImportManager,
    usePostProcessing,
    // useInternals,
    useEngineRenderer,
    // useRenderSettings,
  } = e;
  
  const baseUrl = import.meta.url.replace(/(\/)[^\/\/]*$/, '$1');
  const textureLoader = new THREE.TextureLoader();
  
  const noiseTexture = textureLoader.load(baseUrl + `textures/Noise28.png`);
  noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
  
  const flowTexture = textureLoader.load(baseUrl + `textures/noise.png`);
  flowTexture.wrapS = flowTexture.wrapT = THREE.RepeatWrapping;
  
  const smokeTexture = textureLoader.load(baseUrl + `textures/Smoke18.png`);

  //

  const app = useApp();
  const physics = usePhysics();
  const lightingManager = useLightingManager();
  const importManager = useImportManager();
  const postProcessing = usePostProcessing();
  // const {camera, scene} = useInternals();
  const engineRenderer = useEngineRenderer();
  const {renderer, camera, scene} = engineRenderer;
  const depthInvisibleList = [];
  // const WorldLightPosition = new THREE.Vector3();
  // #################################################### homeSpace ################################################################
  {
    let physicsId;
    const uniforms = {
      uTime: {
        value: 0,
      },
      lightPos: {
        value: new THREE.Vector3(),
      },
    };
  e.waitUntil(
    (async () => {
      const u = `${baseUrl}assets/homespace2.glb`;
      /* const homespace = await new Promise((accept, reject) => {
        const {gltfLoader} = useLoaders();
        gltfLoader.load(u, accept, function onprogress() { }, reject);
      }); */
      const homespaceApp = await importManager.createAppAsync({
        start_url: u,
        position: app.position,
        quaternion: app.quaternion,
      });
      useCleanup(() => {
        homespaceApp.destroy();
      });
      const homespace = homespaceApp.glb;
      homespace.scene.traverse(o => {
        if (o.isMesh) {
          o.receiveShadow = true;
          o.castShadow = true;
          // o.material.transparent = true;
          const isGlass = o.name === 'glass';

          const renderer = useRenderer();

          const pmremGenerator = new THREE.PMREMGenerator(renderer);
          pmremGenerator.compileEquirectangularShader();

          textureLoader.load(`${baseUrl}textures/envmap_courtyard1.png`, function (texture) {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            const exrCubeRenderTarget = pmremGenerator.fromEquirectangular(texture);
            const newEnvMap = exrCubeRenderTarget.texture;
            o.material.envMap = newEnvMap;
            if(isGlass) {
              o.material.roughness = 0.1;
              o.material.metalness = 0.9;
            }
          });
        }
      });
      depthInvisibleList.push(homespace.scene);
      app.add(homespace.scene);
      homespace.scene.updateMatrixWorld();
      physicsId = physics.addGeometry(homespace.scene);
    })());

    /* let settingLight = false;
    useFrame(() => {
      if (!settingLight && lightingManager.lights.length > 0) {
        for (const light of lightingManager.lights) {
          if (light.isDirectionalLight) {
            WorldLightPosition.copy(light.position);
            uniforms.lightPos.value.copy(WorldLightPosition);
            break;
          }
        }
        settingLight = true;
      }
      app.updateMatrixWorld();
    }); */
    useCleanup(() => {
      physics.removeGeometry(physicsId);
    });
  }

  /* // ########################################### cloud sea #############################################
  {
    const cloudsea = new CloudMesh({
      depthInvisibleList,
      renderer,
      camera,
      scene,
    });
    cloudsea.rotation.x = -Math.PI / 2;
    cloudsea.position.y = -65;
    cloudsea.material.uniforms.noiseTexture.value = noiseTexture;
    cloudsea.material.uniforms.flowTexture.value = flowTexture;
    app.add(cloudsea);
    cloudsea.updateMatrixWorld();
    const renderDepth = () => cloudsea.renderDepth();
    postProcessing.defaultPasses[0].onBeforeRenders.push(renderDepth);
    useFrame(({timestamp}) => {
      cloudsea.material.uniforms.uTime.value = timestamp / 1000;
    });
  } */

  /* // ############################################ fog ##########################################################################
  {
    const fog = new Fog();
    fog.material.uniforms.smokeTexture.value = smokeTexture;
    app.add(fog);
    fog.position.y = -65;
    useFrame(() => {
      fog.update();
      fog.material.uniforms.cameraBillboardQuaternion.value.copy(camera.quaternion);
      app.updateMatrixWorld();
    });
  } */

  // ################################################ floating rock #############################################################
  {
    let islands = null;
    (async () => {
      const u = `${baseUrl}assets/island.glb`;
      const terrain = await new Promise((accept, reject) => {
        const {gltfLoader} = useLoaders();
        gltfLoader.load(u, accept, function onprogress() { }, reject);
      });
      islands = terrain.scene.children;
      if (islands && islands.length > 0) {
        for (const island of islands) {
          island.oringinPosY = island.position.y;
          island.max = 5 + Math.random() * 5;
          island.speed = 0.0125 + Math.random() * 0.0125;
          island.rotDir = Math.random() > 0.5 ? -1 : 1;
        }
        terrain.scene.position.z = -100;
        terrain.scene.position.y = -85;
        terrain.scene.rotation.y = -Math.PI / 2;
        terrain.scene.scale.set(6, 6, 6);
        /* if (useRenderSettings().findRenderSettings(scene)) {
          const fogsetting = useRenderSettings().findRenderSettings(scene).fog;
          if (fogsetting) {
            fogsetting.color.r = 30 / 255;
            fogsetting.color.g = 115 / 255;
            fogsetting.color.b = 255 / 255;
            fogsetting.density = 0.001;
          }
        } */
        app.add(terrain.scene);
        app.updateMatrixWorld();
      }
    })();
    useFrame(({timestamp}) => {
      if (!islands || islands.length === 0) return;
      for (const island of islands) {
        const speed = (timestamp / 1000) * island.speed;
        island.position.y = island.oringinPosY + Math.cos(speed) * island.max * island.rotDir;
        island.rotation.y = speed * island.rotDir;
      }
    });
  }
  return app;
}
