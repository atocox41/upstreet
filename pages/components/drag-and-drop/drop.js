import * as THREE from 'three';
import {
  sha256,
} from 'js-sha256';
import physicsManager from '../../../packages/engine/physics/physics-manager.js';

import {
  SupabaseFsWorker,
} from '../../../packages/engine/supabase-fs-worker.js';

import loaders from '../../../packages/engine/loaders.js';
import {
  addDefaultLights,
} from '../../../packages/engine/util.js';

//

const localVector = new THREE.Vector3();
const localVector2D = new THREE.Vector2();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4();
const localRaycaster = new THREE.Raycaster();

const zeroVector = new THREE.Vector3();
const upVector = new THREE.Vector3(0, 1, 0);

// drop methods

export const handleDropFn = ({
  engine,
  supabaseClient,
  sessionUserId,
}) => async e => {
  const { files, items } = e.dataTransfer;
  const file = files?.[0];
  const item = items?.[0];
  let f;
  let source;
  // console.log('file/item', {f, file, item});
  if (file) {
    f = file;
    source = 'file';
  } else if (item) {
    const ext = item.type.match(/([^\/]*)$/)[1];
    const fileName = item.type.replace(/([^\/]+)$/, 'file.$1');

    // read string
    const s = await new Promise((accept, reject) => {
      item.getAsString(accept);
    });

    f = new File([s], fileName, {
      type: 'application/' + ext,
    });
    source = 'json';
  } else {
    throw new Error('no file dropped');
  }

  console.log('got file name', f.name, source);

  // handle file upload to inventory
  if (source === 'file') {
    console.log('load file', f);

    const match = f.name.match(/^(.+)\.([^\.]*)$/)
    const ext = match[2];
    await importFileType(ext)(f, supabaseClient, sessionUserId);
    refreshItems();
  // handle npc drop from inventory
  // } else if (match = f.name.match(/^(.+)\.npc$/)) {
  } else if (source === 'json') {
    console.log('load internal', f);

    const physicsScene = physicsManager.getScene();
    const {engineRenderer, appManagerContext} = engine;
    const {renderer, camera} = engineRenderer;
    const canvas = renderer.domElement;

    const pixelRatio = renderer.getPixelRatio();

    const localMouse = localVector2D.set(
      e.clientX / canvas.width * pixelRatio * 2 - 1,
      -(e.clientY / canvas.height * pixelRatio) * 2 + 1,
    );
    localRaycaster.setFromCamera(localMouse, camera);

    const p = localRaycaster.ray.origin.clone();
    const q = localQuaternion.setFromRotationMatrix(
      localMatrix.lookAt(
        zeroVector,
        localRaycaster.ray.direction,
        upVector,
      ),
    );

    const intersection = physicsScene.raycast(p, q);
    if (intersection) {
      const appManager = appManagerContext.getAppManager();
      const position = localVector.fromArray(intersection.point);
      localEuler.setFromQuaternion(q, 'YXZ');
      localEuler.x = 0;
      localEuler.z = 0;
      const quaternion = localQuaternion2.setFromEuler(localEuler);

      dropFile(f, appManager, position, quaternion);
    } else {
      console.warn('no intersection', {
        p,
        q,
      });
    }
  } else {
    console.warn('unknown file source: ' + f.name + ' ' + source);
  }
};

// screenshot methods

const screenhotRenderers = {
  vrm: async (renderer, scene, camera, f) => {
    const srcUrl = URL.createObjectURL(f);
    const res = await fetch(srcUrl);
    const arrayBuffer = await res.arrayBuffer();
    URL.revokeObjectURL(srcUrl);

    const {
      gltfLoader,
    } = loaders;

    const gltf = await new Promise((accept, reject) => {
      gltfLoader.parse(arrayBuffer, srcUrl, accept, reject);
    });
  
    const headBone = gltf.userData.vrm.humanoid.humanBones.head.node;
    const position = new THREE.Vector3().setFromMatrixPosition(headBone.matrixWorld);
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(headBone.matrixWorld);
  
    camera.position.copy(position)
      .add(
        new THREE.Vector3(0, 0, -0.4)
          .applyQuaternion(quaternion)
      );
    camera.lookAt(position);
    camera.updateMatrixWorld();
  
    addDefaultLights(scene);
    scene.add(gltf.scene);
    scene.updateMatrixWorld();
  
    //
  
    renderer.render(scene, camera);
  },
  glb: async (renderer, scene, camera, f) => {
    const srcUrl = URL.createObjectURL(f);
    const res = await fetch(srcUrl);
    const arrayBuffer = await res.arrayBuffer();
    URL.revokeObjectURL(srcUrl);

    const {
      gltfLoader,
    } = loaders;

    const gltf = await new Promise((accept, reject) => {
      gltfLoader.parse(arrayBuffer, srcUrl, accept, reject);
    });

    // get the bounding box

    const bbox = new THREE.Box3().setFromObject(gltf.scene);

    // move the camera into position

    // Calculate dimensions of the bounding box
    const size = new THREE.Vector3();
    bbox.getSize(size);

    // Get the camera's aspect ratio
    const aspect = camera.aspect;

    // Compute the distance needed to fit the object based on its bounding box size
    let distance = Math.max(size.x / aspect, size.y) / (2 * Math.tan((camera.fov * Math.PI) / 360));

    // Account for zoom level; zoom = 1 is the current camera setting
    distance = distance / camera.zoom;

    // Set the camera's position
    camera.position.set(0, 0, distance);

    // Optional: set the camera to look at the center of the bounding box
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    camera.lookAt(center);
    camera.updateMatrixWorld();

    // set up the scene

    addDefaultLights(scene);
    scene.add(gltf.scene);
    scene.updateMatrixWorld();
  
    //
  
    renderer.render(scene, camera);
  },
};
const getScreenshotBlob = async (f, ext) => {
  // snapshot the VRM preview screenshot
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
  });

  const scene = new THREE.Scene();
  // scene.background = new THREE.Color(0xEEEEEE);
  scene.autoUpdate = false;

  const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);

  //

  const screenshotRendererFn = screenhotRenderers[ext];
  if (screenshotRendererFn) {
    await screenshotRendererFn(renderer, scene, camera, f);
  } else {
    throw new Error('unknown screenshot renderer: ' + ext);
  }

  //

//   canvas.style.cssText = `\
// position: fixed;
// top: 0;
// left: 0;
// width: 512px;
// height: 512px;
// `;
//   document.body.appendChild(canvas);

  // get the canvas blob
  const blob = await new Promise((accept, reject) => {
    canvas.toBlob(accept, 'image/png');
  });

  return blob;
};

// file import methods

export const importFileType = ext => async (f, supabaseClient, sessionUserId) => {
  // get the name part
  // const name = f.name.replace(/\.[^\.]*$/, '');
  const {name} = f;

  // compute the sha256 hash of the file
  const sha256Sum = await (async () => {
    const arrayBuffer = await f.arrayBuffer();
    // get the sha hash of the file
    const hash = sha256.create();
    hash.update(arrayBuffer);
    const sha256Sum = hash.hex();
    return sha256Sum;
  })();

  // initialize the supabase fs worker
  const supabaseFsWorker = new SupabaseFsWorker({
    supabase: supabaseClient.supabase,
    bucketName: 'public',
  });

  //

  const [
    start_url,
    preview_url,
  ] = await Promise.all([
    (async () => {
      // upload the vrm file to supabase storage
      const keyPath = ['assets', sha256Sum, name];
      const start_url = await supabaseFsWorker.writeFile(keyPath, f);
      return start_url;
    })(),
    (async () => {
      // take the screenshot
      const blob = await getScreenshotBlob(f, ext);

      // upload the preview image file to supabase storage
      const previewFileName = `${name}.png`;
      const keyPath = ['previews', sha256Sum, previewFileName];
      const preview_url = await supabaseFsWorker.writeFile(keyPath, blob);

      // console.log('got preview url', [blob, keyPath, preview_url]);
      return preview_url;
    })(),
  ]);

  //

  // write asset to supabase db
  const id = crypto.randomUUID();
  const asset = {
    id,
    type: ext,
    name,
    start_url,
    preview_url,
    user_id: sessionUserId,
  };
  const result = await supabaseClient.supabase
    .from('assets')
    .upsert(asset);
};
const dropFile = async (f, appManager, p, q) => {
  // read file as JSON
  const j = await new Promise((accept, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const s = e.target.result;
      const j = JSON.parse(s);
      accept(j);
    };
    reader.readAsText(f);
  });

  const app = await appManager.addAppAsync({
    start_url: j.start_url,
    position: p,
    quaternion: q,
  });
};