import * as THREE from 'three';
import Pusher from 'pusher-js';
import {
  aiProxyHost,
} from '../endpoints.js';

const skyboxStyles = [
  {
    "id": 5,
    "name": "Digital Painting",
    "max-char": 420,
    "negative-text-max-char": 200,
    "image": null,
    "sort_order": 1,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 9,
    "name": "Realistic",
    "max-char": 360,
    "negative-text-max-char": 200,
    "image": null,
    "sort_order": 2,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 3,
    "name": "Anime Art Style",
    "max-char": 425,
    "negative-text-max-char": 200,
    "image": "https://blockade-platform-production.s3.amazonaws.com/images/skybox/Ki2I4oxMHoZRiKzCCGJD7TbTjgQ69N7QICTzb2zx.png",
    "sort_order": 3,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 2,
    "name": "Fantasy Lands",
    "max-char": 350,
    "negative-text-max-char": 200,
    "image": "https://blockade-platform-production.s3.amazonaws.com/images/skybox/imG0GHHOlErLJzWE90hxK5cpmyoDofV0AVtDXAHa.png",
    "sort_order": 4,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 13,
    "name": "Advanced (no style)",
    "max-char": 540,
    "negative-text-max-char": 200,
    "image": null,
    "sort_order": 5,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 10,
    "name": "SciFi",
    "max-char": 360,
    "negative-text-max-char": 230,
    "image": null,
    "sort_order": 6,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 35,
    "name": "Cyberpunk",
    "max-char": 400,
    "negative-text-max-char": 220,
    "image": null,
    "sort_order": 7,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 20,
    "name": "Modern Computer Animation",
    "max-char": 480,
    "negative-text-max-char": 200,
    "image": null,
    "sort_order": 8,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 6,
    "name": "Scenic",
    "max-char": 420,
    "negative-text-max-char": 210,
    "image": null,
    "sort_order": 9,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 11,
    "name": "Dreamlike",
    "max-char": 400,
    "negative-text-max-char": 220,
    "image": null,
    "sort_order": 10,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 17,
    "name": "Oil Painting",
    "max-char": 320,
    "negative-text-max-char": 350,
    "image": null,
    "sort_order": 11,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 25,
    "name": "Manga",
    "max-char": 420,
    "negative-text-max-char": 210,
    "image": null,
    "sort_order": 12,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 16,
    "name": "Sky",
    "max-char": 350,
    "negative-text-max-char": 210,
    "image": null,
    "sort_order": 13,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 15,
    "name": "Interior Views",
    "max-char": 390,
    "negative-text-max-char": 200,
    "image": null,
    "sort_order": 14,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 4,
    "name": "Surreal Style",
    "max-char": 340,
    "negative-text-max-char": 210,
    "image": null,
    "sort_order": 15,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 22,
    "name": "Watercolor",
    "max-char": 375,
    "negative-text-max-char": 200,
    "image": null,
    "sort_order": 16,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 7,
    "name": "Nebula",
    "max-char": 420,
    "negative-text-max-char": 220,
    "image": null,
    "sort_order": 17,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 24,
    "name": "Pen & Ink",
    "max-char": 300,
    "negative-text-max-char": 200,
    "image": null,
    "sort_order": 18,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 23,
    "name": "Technical Drawing",
    "max-char": 300,
    "negative-text-max-char": 200,
    "image": null,
    "sort_order": 19,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 19,
    "name": "Low Poly",
    "max-char": 460,
    "negative-text-max-char": 220,
    "image": null,
    "sort_order": 20,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 26,
    "name": "Interior Archviz",
    "max-char": 370,
    "negative-text-max-char": 210,
    "image": null,
    "sort_order": 21,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 29,
    "name": "Cartoon",
    "max-char": 400,
    "negative-text-max-char": 200,
    "image": null,
    "sort_order": 22,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 30,
    "name": "Storybook",
    "max-char": 375,
    "negative-text-max-char": 200,
    "image": null,
    "sort_order": 23,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 31,
    "name": "Claymation",
    "max-char": 400,
    "negative-text-max-char": 220,
    "image": null,
    "sort_order": 24,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 32,
    "name": "Super Art",
    "max-char": 169,
    "negative-text-max-char": 200,
    "image": null,
    "sort_order": 25,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 33,
    "name": "Holographic",
    "max-char": 346,
    "negative-text-max-char": 190,
    "image": null,
    "sort_order": 26,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 34,
    "name": "CG Film",
    "max-char": 376,
    "negative-text-max-char": 230,
    "image": null,
    "sort_order": 27,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 18,
    "name": "Infrared Photography",
    "max-char": 420,
    "negative-text-max-char": 370,
    "image": "https://blockade-platform-production.s3.amazonaws.com/images/skybox/cMcfRvpPVKz3cZM5cWbKYICcyxvfPTeKzn5Yn0hY.jpg",
    "sort_order": 28,
    "premium": 0,
    "skybox_style_families": []
  },
  {
    "id": 28,
    "name": "testing",
    "max-char": 220,
    "negative-text-max-char": 200,
    "image": null,
    "sort_order": 29,
    "premium": 0,
    "skybox_style_families": []
  }
];
export const skyboxStyleNames = skyboxStyles.map(s => s.name);
// export const defaultSkyboxStyleName = 'Anime Art Style';
export const defaultSkyboxStyleName = 'Manga';
export const getSkyboxStyleId = name => {
  const styleSpec = skyboxStyles.find(s => s.name === name);
  return styleSpec ? styleSpec.id : null;
};

//

const APP_KEY = 'a6a7b7662238ce4494d5';
const APP_CLUSTER = 'mt1';

//

export const generateSkybox = async ({
  prompt = 'Grassy field',
  styleName = defaultSkyboxStyleName,
}) => {
  const styleId = getSkyboxStyleId(styleName);
  if (styleId === null) {
    throw new Error(`unknown skybox style ${JSON.stringify(styleName)}`);
  }

  // use fetch
  const url = `https://${aiProxyHost}/api/ai/blockadelabs/v1/skybox`;
  const body = new URLSearchParams();
  body.set('skybox_style_id', styleId);
  body.set('prompt', prompt);
  body.set('return_depth', true);
  const res = await fetch(url, {
    method: 'POST',
    body,
  });
  const j = await res.json();
  return j;
}
export const loadSkyboxImageSpecs = async (source) => {
  const _pusherWait = async source => {
    const {
      pusher_channel,
      pusher_event,
    } = source;
  
    const pusher = new Pusher(APP_KEY, {
      cluster: APP_CLUSTER,
    });
    
    const channel = pusher.subscribe(pusher_channel);
    
    const data = await new Promise((accept, reject) => {
      channel.bind(pusher_event, function(data) {
        console.log('pusher event', data);
        if (data.status === 'complete') {
          accept(data);
        }
      });
    });
    pusher.unsubscribe(pusher_channel);

    return data;
  };

  const {
    obfuscated_id,
  } = source;
  console.log('load source', source);
  const u = `https://${aiProxyHost}/api/ai/blockadelabs/v1/imagine/requests/obfuscated-id/${obfuscated_id}`;
  const res = await fetch(u);
  let spec = await res.json();
  spec = spec ? spec.request : {};
  let data;
  if (spec.status === 'complete') {
  // } else if (
  //   spec.status === 'aborted' ||
  //   spec.status === 'error'
    data = spec;
  } else if (
    spec.status === 'pending' ||
    spec.status === 'dispatched' ||
    spec.status === 'processing'
  ) {
    data = await _pusherWait(spec);
  }

  return data;
};

export const generateSkyboxFull = async imagePrompt => {
  const source = await generateSkybox({
    prompt: imagePrompt,
  });
  const {
    file_url,
    depth_map_url,
  } = await loadSkyboxImageSpecs(source);

  return {
    source,
    file_url,
    depth_map_url,
  };
}

//

const resizeImage = (image, width) => {
  // Calculate the new height while maintaining the aspect ratio
  const aspectRatio = image.width / image.height;
  const height = width / aspectRatio;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0, width, height);

  return canvas;
};

//

export default ctx => {
  const {
    useApp,
    usePhysics,
    usePhysicsTracker,
    // useFloorManager,
  } = ctx;

  const app = useApp();
  const physics = usePhysics();
  const physicsTracker = usePhysicsTracker();
  // const floorManager = useFloorManager();

  // const srcUrl = ${this.srcUrl};
  
  ctx.waitUntil((async () => {
    const res = await fetch(srcUrl);
    const json = await res.json();

    // console.log('got json', json);
    // debugger;

    const {
      imgSrc: imgUrl,
      // imgSrcs,
    } = json;

    if (!imgUrl) {
      console.warn('no imgSrc', {json});
      debugger;
    }

    const imgBlob = await (async () => {
      console.log('worldzine fetch image 1', imgUrl);
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      console.log('worldzine fetch image 2', blob.size, imgUrl);
      return blob;
    })();
    const img = await new Promise((accept, reject) => {
      const img = new Image();
      img.onload = () => {
        cleanup();
        accept(img);
      };
      img.onerror = err => {
        cleanup();
        reject(err);
      };
      const u = URL.createObjectURL(imgBlob);
      const cleanup = () => {
        URL.revokeObjectURL(u);
      };
      img.crossOrigin = 'Anonymous';
      img.src = u;
    });
    const imgTexture = new THREE.Texture(img);
    imgTexture.needsUpdate = true;

    // new THREE.TextureLoader().load(imgUrl)

    // octahedron mesh
    // (async () => {
      // const fileName = 'anime_art_style_top_of_a_skyscraper_looking_down_o.jfif';
      // const fileName = 'anime_art_style_nighttime_cyberpunk_forest_glowin (1).jfif';
      // const imgUrl = `/public/images/genesis/${fileName}`;
      // const imgUrl = imgSrc;
      // if (imgSrc) {
      //   imgUrl = imgSrc;
      // } else if (imgSrcs && imgSrcs.length > 0) {
      //   imgUrl = imgSrcs[Math.floor(Math.random() * imgSrcs.length)];
      // } else {
      //   console.warn('no imgSrc or imgSrcs', {json});
      //   throw new Error('no imgSrc or imgSrcs');
      // }

      const {
        width,
        height,
        arrayBuffer,
      } = await (async () => {
        // const width = 6144;
        // const height = 3072;
        // const res = await fetch('/images/worldzines/depth/test_image.dep');
        // const arrayBuffer = await res.arrayBuffer();




        // const res = await fetch(imgUrl);
        // const blob = await res.blob();

        // const res2 = await fetch(`https://${aiProxyHost}/midasDepth`, {
        //   method: 'POST',
        //   body: blob,
        // });
        // const width = parseInt(res2.headers.get('X-Width'), 10);
        // const height = parseInt(res2.headers.get('X-Height'), 10);
        // const arrayBuffer = await res2.arrayBuffer();

        const depthWidth = 1024;
        const img2 = resizeImage(img, depthWidth);
        const img2Blob = await new Promise((accept, reject) => {
          img2.toBlob(accept, 'image/jpeg');
        });

        console.log('worldzine fetch depth 1', img2Blob.size, imgUrl);
        const res2 = await fetch('https://local.webaverse.com/zoeDepth', {
          method: 'POST',
          body: img2Blob,
        });
        console.log('worldzine fetch depth 2', imgUrl);
        const width = parseInt(res2.headers.get('X-Width'), 10);
        const height = parseInt(res2.headers.get('X-Height'), 10);
        const arrayBuffer = await res2.arrayBuffer();
        console.log('worldzine fetch depth 3', arrayBuffer.byteLength, width, height, imgUrl);

        return {
          width,
          height,
          arrayBuffer,
        };
      })();

      // const res2 = await fetch(`https://${aiProxyHost}/midasDepth`, {
      //   method: 'POST',
      //   body: blob,
      // });
      // const width = parseInt(res2.headers.get('X-Width'), 10);
      // const height = parseInt(res2.headers.get('X-Height'), 10);
      // const arrayBuffer = await res2.arrayBuffer();

      let float32Array = new Float32Array(arrayBuffer);

      // get min max
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < float32Array.length; i++) {
        let v = float32Array[i];
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
      const delta = max - min;
      const minDelta = 20;
      if (delta < minDelta) {
        const scale = minDelta / delta;
        float32Array = float32Array.map(n => n * scale);
      }

      const octahedronMesh = OctahedronSphereCreator.Create({
        width,
        height,
        depthFloats: float32Array,
      });
      octahedronMesh.frustumCulled = false;
      app.add(octahedronMesh);
      octahedronMesh.updateMatrixWorld();
      
      //

      app.getMesh = () => octahedronMesh;

      //

      octahedronMesh.material.uniforms.depthTex.value = new THREE.DataTexture(
        float32Array,
        width,
        height,
        THREE.RedFormat,
        THREE.FloatType
      );

      octahedronMesh.material.uniforms.map.value = imgTexture;
      octahedronMesh.material.uniforms.map.value.needsUpdate = true;
      octahedronMesh.material.uniforms.map.needsUpdate = true;

      octahedronMesh.material.uniforms.depthTex.value.flipY = true;
      // octahedronMesh.material.uniforms.depthTex.value.encoding = THREE.LinearEncoding;
      octahedronMesh.material.uniforms.depthTex.value.wrapS = THREE.RepeatWrapping;
      octahedronMesh.material.uniforms.depthTex.value.wrapT = THREE.RepeatWrapping;
      // octahedronMesh.material.uniforms.depthTex.value.wrapS = THREE.ClampToEdgeWrapping;
      // octahedronMesh.material.uniforms.depthTex.value.wrapT = THREE.ClampToEdgeWrapping;
      octahedronMesh.material.uniforms.depthTex.value.needsUpdate = true;
      octahedronMesh.material.uniforms.depthTex.needsUpdate = true;

      octahedronMesh.material.uniforms.width.value = width;
      octahedronMesh.material.uniforms.width.needsUpdate = true;
      octahedronMesh.material.uniforms.height.value = height;
      octahedronMesh.material.uniforms.height.needsUpdate = true;

      // octahedronMesh.material.uniforms._Min.value = min;
      // octahedronMesh.material.uniforms._Min.needsUpdate = true;
      // octahedronMesh.material.uniforms._Max.value = max;
      // octahedronMesh.material.uniforms._Max.needsUpdate = true;
      // octahedronMesh.position.y = 5;
      // octahedronMesh.updateMatrixWorld();

      // scene physics
      {
        const scenePhysicsMesh = new THREE.Mesh(octahedronMesh.geometry, octahedronMesh.material);

        const scenePhysicsObject = physics.addGeometry(scenePhysicsMesh);
        scenePhysicsObject.update = () => {
          scenePhysicsMesh.matrixWorld.decompose(
            scenePhysicsObject.position,
            scenePhysicsObject.quaternion,
            scenePhysicsObject.scale
          );
          physics.setTransform(scenePhysicsObject, false);
        };
        physicsTracker.addAppPhysicsObject(app, scenePhysicsObject);
        
        // start off as not selected
        physics.disableActor(scenePhysicsObject);
        app.setSelected = selected => {
          if (selected) {
            // console.log('enable actor', scenePhysicsObject);
            physics.enableActor(scenePhysicsObject);
          } else {
            // console.log('disable actor', scenePhysicsObject);
            physics.disableActor(scenePhysicsObject);
          }
        };
      }
    // })();

  })());

  return app;
};
// export const contentId = ${this.contentId};
// export const name = ${this.name};
// export const description = ${this.description};
// export const type = 'blockadelabsskybox';
// export const components = ${this.components};