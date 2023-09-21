import * as THREE from 'three';

//

console.log('adventure camera 1');

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector2D = new THREE.Vector2();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localPlane = new THREE.Plane();
const localMatrix = new THREE.Matrix4();
const localRaycaster = new THREE.Raycaster();
const localObject = new THREE.Object3D();

const upVector = new THREE.Vector3(0, 1, 0);
const rightVector = new THREE.Vector3(1, 0, 0);
const oneVector = new THREE.Vector3(1, 1, 1);
const identityQuaternion = new THREE.Quaternion();
const downQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2);
const y180Quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

//

class StoryTargetMesh extends THREE.Mesh {
  constructor({
    BufferGeometryUtils,
  }) {
    const baseHeight = 0.2;
    const baseWidth = 0.03;
    const centerSpacing = baseWidth;
    
    const _addYs = geometry => {
      const ys = new Float32Array(geometry.attributes.position.array.length / 3);
      for (let i = 0; i < ys.length; i++) {
        ys[i] = 1 - geometry.attributes.position.array[i * 3 + 1] / baseHeight;
      }
      geometry.setAttribute('y', new THREE.BufferAttribute(ys, 1));
    };
    const _addDirection = (geometry, direction) => {
      const directions = new Float32Array(geometry.attributes.position.array.length);
      for (let i = 0; i < directions.length / 3; i++) {
        directions[i + 0] = direction.x;
        directions[i + 1] = direction.y;
        directions[i + 2] = direction.z;
      }
      geometry.setAttribute('direction', new THREE.BufferAttribute(directions, 3));
    };
    const _addMonocolor = (geometry, v) => {
      const monocolor = new Float32Array(geometry.attributes.position.array.length / 3).fill(v);
      geometry.setAttribute('monocolor', new THREE.BufferAttribute(monocolor, 1));
    };

    // top geometry
    const topGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseWidth)
      .translate(0, baseHeight / 2 + centerSpacing, 0);
    _addYs(topGeometry);
    _addDirection(topGeometry, new THREE.Vector3(0, 1, 0));
    _addMonocolor(topGeometry, 0);
    // other geometries
    const leftGeometry = topGeometry.clone()
      .rotateZ(Math.PI / 2);
    _addDirection(leftGeometry, new THREE.Vector3(-1, 0, 0));
    _addMonocolor(leftGeometry, 0);
    const bottomGeometry = topGeometry.clone()
      .rotateZ(Math.PI);
    _addDirection(bottomGeometry, new THREE.Vector3(0, -1, 0));
    _addMonocolor(bottomGeometry, 0);
    const rightGeometry = topGeometry.clone()
      .rotateZ(-Math.PI / 2);
    _addDirection(rightGeometry, new THREE.Vector3(1, 0, 0));
    _addMonocolor(rightGeometry, 0);
    const forwardGeometry = topGeometry.clone()
      .rotateX(-Math.PI / 2);
    _addDirection(forwardGeometry, new THREE.Vector3(0, 0, -1));
    _addMonocolor(forwardGeometry, 0);
    const backGeometry = topGeometry.clone()
      .rotateX(Math.PI / 2);
    _addDirection(backGeometry, new THREE.Vector3(0, 0, 1));
    _addMonocolor(backGeometry, 0);
    // same thing, but scaled and inverted
    const f = 0.015;
    const baseWidth2 = baseWidth + f;
    const baseHeight2 = baseHeight + f;
    const topGeometry2 = new THREE.BoxGeometry(baseWidth2, baseHeight2, baseWidth2)
      .scale(-1, -1, -1)
      .translate(0, baseHeight / 2 + centerSpacing, 0);
    _addYs(topGeometry2);
    _addDirection(topGeometry2, new THREE.Vector3(0, 1, 0));
    _addMonocolor(topGeometry2, 1);
    const leftGeometry2 = topGeometry2.clone()
      .rotateZ(Math.PI / 2);
    _addDirection(leftGeometry2, new THREE.Vector3(-1, 0, 0));
    _addMonocolor(leftGeometry2, 1);
    const bottomGeometry2 = topGeometry2.clone()
      .rotateZ(Math.PI);
    _addDirection(bottomGeometry2, new THREE.Vector3(0, -1, 0));
    _addMonocolor(bottomGeometry2, 1);
    const rightGeometry2 = topGeometry2.clone()
      .rotateZ(-Math.PI / 2);
    _addDirection(rightGeometry2, new THREE.Vector3(1, 0, 0));
    _addMonocolor(rightGeometry2, 1);
    const forwardGeometry2 = topGeometry2.clone()
      .rotateX(-Math.PI / 2);
    _addDirection(forwardGeometry2, new THREE.Vector3(0, 0, -1));
    _addMonocolor(forwardGeometry2, 1);
    const backGeometry2 = topGeometry2.clone()
      .rotateX(Math.PI / 2);
    _addDirection(backGeometry2, new THREE.Vector3(0, 0, 1));
    _addMonocolor(backGeometry2, 1);
    // merged geometry
    const geometries = [
      topGeometry2,
      leftGeometry2,
      bottomGeometry2,
      rightGeometry2,
      forwardGeometry2,
      backGeometry2,
      topGeometry,
      leftGeometry,
      bottomGeometry,
      rightGeometry,
      forwardGeometry,
      backGeometry,
    ];
    const geometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: {
          value: 0,
          needsUpdate: true,
        },
        uPress: {
          value: 0,
          needsUpdate: true,
        },
      },
      vertexShader: `\
        uniform float uTime;
        uniform float uPress;
        attribute float y;
        attribute vec3 direction;
        attribute float monocolor;
        varying float vY;
        varying vec2 vUv;
        varying vec3 vDirection;
        varying float vMonocolor;

        void main() {
          vUv = uv;
          vY = y;
          vDirection = direction; // XXX offset by direction and time
          vMonocolor = monocolor;

          vec3 p = position * (0.5 + (1. - uPress) * 0.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `\
        varying vec2 vUv;
        varying float vY;
        varying vec3 vDirection;
        varying float vMonocolor;

        void main() {
          vec3 c = vec3(0.1, 0.1, 0.1);
          gl_FragColor = vec4(c, 1.);
          gl_FragColor.rgb += vY * 0.15;
          gl_FragColor.rgb += vMonocolor;
          // gl_FragColor.rg += vUv * 0.2;
        }
      `,
      transparent: true,
    });

    super(geometry, material);

    this.name = 'storyTargetMesh';
  }
}

//

const makeHitMesh = hitMap => {
  // instanced cube mesh
  const baseGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const baseMaterial = new THREE.MeshBasicMaterial({
    color: 0x0000ff,
  });
  const instancedMesh = new THREE.InstancedMesh(baseGeometry, baseMaterial, hitMap.hit.length);
  instancedMesh.frustumCulled = false;
  instancedMesh.name = 'instancedMesh';
  instancedMesh.count = 0;

  for (let i = 0; i < hitMap.hit.length; i++) {
    const hit = hitMap.hit[i];
    if (hit) {
      const point = new THREE.Vector3().fromArray(hitMap.point, i * 3);
      instancedMesh.setMatrixAt(
        i,
        localMatrix
          .makeTranslation(point.x, point.y, point.z)
      );
    }
    instancedMesh.count++;
  }
  instancedMesh.instanceMatrix.needsUpdate = true;

  return instancedMesh;
};
const makeObjectWithPhysics = (object, physics) => {
  object = {
    ...object,
  };
  if (!object.components) {
    object.components = [];
  }
  object.components.push({
    key: 'physics',
    value: physics,
  });
  return object;
};

//

const makeRenderer = canvas => {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.sortObjects = false;
  renderer.physicallyCorrectLights = true;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  return renderer;
};
const reinterpretFloatImageData = imageData => {
  const result = new Float32Array(
    imageData.data.buffer,
    imageData.data.byteOffset,
    imageData.data.byteLength / Float32Array.BYTES_PER_ELEMENT
  );
  const {width, height} = imageData;
  // flip Y
  for (let y = 0; y < height / 2; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const j = (height - 1 - y) * width + x;
      const tmp = result[i];
      result[i] = result[j];
      result[j] = tmp;
    }
  }
  return result;
};
export const depthVertexShader = `\
  precision highp float;
  precision highp int;

  // HEADER

  void main() {
    // PRE
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // POST
  }
`;
export const depthFragmentShader = `\
  uniform float cameraNear;
  uniform float cameraFar;
  uniform float isPerspective;

  #define FLOAT_MAX  1.70141184e38
  #define FLOAT_MIN  1.17549435e-38

  lowp vec4 encode_float(highp float v) {
    highp float av = abs(v);

    //Handle special cases
    if(av < FLOAT_MIN) {
      return vec4(0.0, 0.0, 0.0, 0.0);
    } else if(v > FLOAT_MAX) {
      return vec4(127.0, 128.0, 0.0, 0.0) / 255.0;
    } else if(v < -FLOAT_MAX) {
      return vec4(255.0, 128.0, 0.0, 0.0) / 255.0;
    }

    highp vec4 c = vec4(0,0,0,0);

    //Compute exponent and mantissa
    highp float e = floor(log2(av));
    highp float m = av * pow(2.0, -e) - 1.0;

    //Unpack mantissa
    c[1] = floor(128.0 * m);
    m -= c[1] / 128.0;
    c[2] = floor(32768.0 * m);
    m -= c[2] / 32768.0;
    c[3] = floor(8388608.0 * m);

    //Unpack exponent
    highp float ebias = e + 127.0;
    c[0] = floor(ebias / 2.0);
    ebias -= c[0] * 2.0;
    c[1] += floor(ebias) * 128.0;

    //Unpack sign bit
    c[0] += 128.0 * step(0.0, -v);

    //Scale back to range
    return c / 255.0;
  }

  // note: the 0.1s here an there are voodoo related to precision
  float decode_float(vec4 v) {
    vec4 bits = v * 255.0;
    float sign = mix(-1.0, 1.0, step(bits[3], 128.0));
    float expo = floor(mod(bits[3] + 0.1, 128.0)) * 2.0 +
                floor((bits[2] + 0.1) / 128.0) - 127.0;
    float sig = bits[0] +
                bits[1] * 256.0 +
                floor(mod(bits[2] + 0.1, 128.0)) * 256.0 * 256.0;
    return sign * (1.0 + sig / 8388607.0) * pow(2.0, expo);
  }

  float perspectiveDepthToViewZ( const in float invClipZ, const in float near, const in float far ) {
    return ( near * far ) / ( ( far - near ) * invClipZ - far );
  }
  float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
    return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
  }
  
  float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
    return ( viewZ + near ) / ( near - far );
  }
  float orthographicDepthToViewZ( const in float linearClipZ, const in float near, const in float far ) {
    return linearClipZ * ( near - far ) - near;
  }

  // HEADER

  void main() {
    // PRE

    // get the view Z
    // first, we need to reconstruct the depth value in this fragment
    float depth = gl_FragCoord.z;
    float viewZ;
    if (isPerspective > 0.) {
      viewZ = perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
    } else {
      viewZ = orthographicDepthToViewZ(depth, cameraNear, cameraFar);
    }
    
    // convert to orthographic depth
    // float orthoZ = viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
    // gl_FragColor = encode_float(orthoZ).abgr;

    gl_FragColor = encode_float(viewZ).abgr;

    // POST
  }
`;
const renderMeshesDepth = (meshes, width, height, camera) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const renderer = makeRenderer(canvas);

  // const cleanups = [];

  const depthScene = new THREE.Scene();
  depthScene.autoUpdate = false;
  for (const mesh of meshes) {
    // const oldParent = depthMesh.parent;
    const {geometry, matrixWorld} = mesh;

    let vertexShader = depthVertexShader;
    let fragmentShader = depthFragmentShader;
    /* if (clipZ) {
      vertexShader = vertexShader.replace('// HEADER', `\
        // HEADER
        attribute float maskZ;
        varying float vMaskZ;
      `).replace('// POST', `\
        // POST
        vMaskZ = maskZ;
      `);
      fragmentShader = fragmentShader.replace('// HEADER', `\
        // HEADER
        varying float vMaskZ;
      `).replace('// POST', `\
        // POST
        if (vMaskZ < 0.5) {
          gl_FragColor = vec4(0., 0., 0., 0.);
        }
      `);
    } */
    const material = new THREE.ShaderMaterial({
      uniforms: {
        cameraNear: {
          value: camera.near,
          needsUpdate: true,
        },
        cameraFar: {
          value: camera.far,
          needsUpdate: true,
        },
        isPerspective: {
          value: +camera.isPerspectiveCamera,
          needsUpdate: true,
        },
      },
      vertexShader,
      fragmentShader,
      side: THREE.FrontSide,
    });
    
    const depthMesh = new THREE.Mesh(geometry, material);
    depthMesh.name = 'depthMesh';
    if (matrixWorld) {
      depthMesh.matrixWorld.copy(matrixWorld);
      depthMesh.matrix.copy(matrixWorld)
        .decompose(depthMesh.position, depthMesh.quaternion, depthMesh.scale);
    }
    depthMesh.frustumCulled = false;
    
    depthScene.add(depthMesh);

    // cleanups.push(() => {
    //   if (oldParent) {
    //     oldParent.add(depthMesh);
    //   } else {
    //     depthScene.remove(depthMesh);
    //   }
    // });
  }

  // render target
  const depthRenderTarget = new THREE.WebGLRenderTarget(
    width,
    height,
    {
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
    }
  );

  // real render to the render target
  renderer.setRenderTarget(depthRenderTarget);
  renderer.setPixelRatio(1);
  // renderer.clear();
  renderer.render(depthScene, camera);
  renderer.setRenderTarget(null);
  
  // read back image data
  const imageData = {
    data: new Uint8Array(depthRenderTarget.width * depthRenderTarget.height * 4),
    width,
    height,
  };
  renderer.readRenderTargetPixels(depthRenderTarget, 0, 0, depthRenderTarget.width, depthRenderTarget.height, imageData.data);

  // if (imageData.data.some(v => isNaN(v))) {
  //   debugger;
  // }

  // latch rendered depth data
  let oldDepthFloatImageData = reinterpretFloatImageData(imageData); // viewZ

  // cleanup
  renderer.dispose();
  renderer.forceContextLoss();

  // for (const cleanupFn of cleanups) {
  //   cleanupFn();
  // }

  return oldDepthFloatImageData;
};
export function bilinearInterpolate(
  values,
  width,
  height,
  px,
  pz,
) {
  // first, compute the sample coordinates:
  const x = Math.floor(px * (width - 1));
  const z = Math.floor(pz * (height - 1));
  const x1 = Math.min(x + 1, width - 1);
  const z1 = Math.min(z + 1, height - 1);
  const index = z * width + x;
  const index1 = z * width + x1;
  const index2 = z1 * width + x;
  const index3 = z1 * width + x1;
  
  // then, compute the interpolation coefficients:
  const fx = px * width - x;
  const fz = pz * height - z;
  const fx1 = 1 - fx;
  const fz1 = 1 - fz;

  // finally, interpolate:
  const v = (
    values[index] * fx1 * fz1 +
    values[index1] * fx * fz1 +
    values[index2] * fx1 * fz +
    values[index3] * fx * fz
  );
  return v;
}
const reconstructPointCloudFromDepthField = (
  depthFieldArrayBuffer,
  width,
  height,
  fov,
) => {
  const depthField = new Float32Array(depthFieldArrayBuffer);
  const focal = height / 2 / Math.tan((fov / 2.0) * Math.PI / 180);
  const pointCloud = new Float32Array(width * height * 3);
  const cu = width / 2;
  const cv = height / 2;
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const index = dy * width + dx;
      const depth = depthField[index];

      const u = dx;
      const v = dy;
      const x = (u - cu) * depth / focal;
      const y = (v - cv) * depth / focal;
      const z = depth;

      pointCloud[index * 3 + 0] = x;
      pointCloud[index * 3 + 1] = y;
      pointCloud[index * 3 + 2] = z;
    }
  }
  return pointCloud;
};
const getDepthFloatsFromPointCloud = (pointCloudArrayBuffer, width, height) => {
  const geometryPositions = new Float32Array(width * height * 3);
  const scaleFactor = getScaleFactor(width, height);
  pointCloudArrayBufferToPositionAttributeArray(
    pointCloudArrayBuffer,
    width,
    height,
    scaleFactor,
    geometryPositions,
  );
  return getGepthFloatsFromGeometryPositions(geometryPositions);
};
function pointCloudArrayBufferToPositionAttributeArray(
  srcArrayBuffer,
  width,
  height,
  scaleFactor,
  dstFloat32Array,
) { 
  const srcFloat32Array = new Float32Array(srcArrayBuffer);
  for (let i = 0, j = 0; i < srcFloat32Array.length; i += 3) {
    let x = srcFloat32Array[i];
    let y = srcFloat32Array[i + 1];
    let z = srcFloat32Array[i + 2];

    x *= scaleFactor;
    y *= -scaleFactor;
    z *= -scaleFactor;

    dstFloat32Array[j + 0] = x;
    dstFloat32Array[j + 1] = y;
    dstFloat32Array[j + 2] = z;

    j += 3;
  }
}
function depthFloat32ArrayToPositionAttributeArray(
  depthFloat32Array,
  width,
  height,
  camera,
  float32Array,
) { // result in float32Array
  for (let i = 0; i < depthFloat32Array.length; i++) {
    const x = (i % width) / width;
    let y = Math.floor(i / width) / height;
    y = 1 - y;
  
    const viewZ = depthFloat32Array[i];
    const worldPoint = setCameraViewPositionFromViewZ(x, y, viewZ, camera, localVector);
    const target = worldPoint.applyMatrix4(camera.matrixWorld);

    target.toArray(float32Array, i * 3);
  }
}
function depthFloat32ArrayToGeometry(
  depthFloat32Array,
  width,
  height,
  camera,
) { // result in float32Array
  const widthSegments = width - 1;
  const heightSegments = height - 1;
  // geometry is camera-relative
  const geometry = new THREE.PlaneGeometry(1, 1, widthSegments, heightSegments);
  depthFloat32ArrayToPositionAttributeArray(
    depthFloat32Array,
    width,
    height,
    camera,
    geometry.attributes.position.array,
  );
  return geometry;
}
function viewZToOrthographicDepth(viewZ, near, far) {
  return ( viewZ + near ) / ( near - far );
}
const setCameraViewPositionFromViewZ = (x, y, viewZ, camera, target) => {
  const {near, far, projectionMatrix, projectionMatrixInverse} = camera;
  
  const depth = viewZToOrthographicDepth(viewZ, near, far);

  const clipW = projectionMatrix.elements[2 * 4 + 3] * viewZ + projectionMatrix.elements[3 * 4 + 3];
  const clipPosition = new THREE.Vector4(
    (x - 0.5) * 2,
    (y - 0.5) * 2,
    (depth - 0.5) * 2,
    1
  );
  clipPosition.multiplyScalar(clipW);
  const viewPosition = clipPosition.applyMatrix4(projectionMatrixInverse);
  
  target.x = viewPosition.x;
  target.y = viewPosition.y;
  target.z = viewPosition.z;
  return target;
};
const renderDepth = (ctx) => {
  const engine = ctx.useEngine();
  const engineRenderer = engine.engineRenderer;
  const {scene, camera} = engineRenderer;

  const appManager = engine.appManagerContext.getAppManager();
  const apps = Array.from(appManager.apps.values());
  const blockadelabsSkyboxApps = apps.filter(app => app.appType === 'blockadelabsskybox');

  const pixelScale = 16;
  let width = engineRenderer.renderer.domElement.width / pixelScale;
  let height = engineRenderer.renderer.domElement.height / pixelScale;

  const meshes = [];
  for (const app of blockadelabsSkyboxApps) {
    app.traverse(o => {
      if (o.isMesh) {
        meshes.push(o);
      }
    });
  }
  const depthField = renderMeshesDepth(meshes, width, height, camera);
  const geometry2 = depthFloat32ArrayToGeometry(
    depthField,
    width,
    height,
    camera,
  );
  globalThis.depthField = depthField;
  globalThis.geometry2 = geometry2;
  geometry2.computeVertexNormals();
  const material2 = new THREE.MeshPhongMaterial({
    color: 0x0000ff,
    opacity: 0.2,
    transparent: true,
    // side: THREE.DoubleSide,
    side: THREE.FrontSide,
  });
  const mesh2 = new THREE.Mesh(geometry2, material2);
  mesh2.frustrumCulled = false;
  scene.add(mesh2);
};
const useCameraTracking = (ctx) => {
  const {
    useApp,
    useCamera,
    useFrame,
    useCleanup,
    useEngineRenderer,
    useThreeUtils,
    useZTargetingManager,
    useIoManager,
    usePhysics,
    useEasing,
    useVqa,
  } = ctx;

  const app = useApp();
  const camera = useCamera();
  const engineRenderer = useEngineRenderer();
  const scene = engineRenderer.scene;
  const {
    BufferGeometryUtils,
  } = useThreeUtils();
  const zTargetingManager = useZTargetingManager();
  const ioManager = useIoManager();
  const physicsScene = usePhysics();
  const bezier = useEasing();
  const cubicBezier = bezier(0, 1, 0, 1);

  //

  let mouseX = 0, mouseY = 0;
  globalThis.addEventListener('mousemove', e => {
    if (document.pointerLockElement) {
      mouseX += e.movementX * 0.005;
      mouseX = Math.min(Math.max(mouseX, -1), 1);

      mouseY -= e.movementY * 0.005;
      mouseY = Math.min(Math.max(mouseY, -1), 1);
    }
  });

  // click

  let mouseZ = 0;
  let mouseDown = false;
  let lastMouseZTime = 0;
  globalThis.addEventListener('mousedown', e => {
    const now = performance.now();

    // renderDepth(ctx);
    {
      const engine = ctx.useEngine();
      // const engineRenderer = engine.engineRenderer;

      const appManager = engine.appManagerContext.getAppManager();
      const apps = Array.from(appManager.apps.values());
      const blockadelabsSkyboxApps = apps.filter(app => app.appType === 'blockadelabsskybox');
      // raycast against skybox
      let mesh = null;
      for (const app of blockadelabsSkyboxApps) {
        app.traverse(o => {
          if (mesh === null && o.isMesh) {
            mesh = o;
          }
        });
      }
      localRaycaster.ray.origin.copy(camera.position);
      localRaycaster.ray.direction.copy(storyTargetMesh.position)
        .sub(camera.position)
        .normalize();
      
      // intersect
      const intersections = localRaycaster.intersectObject(mesh);
      if (intersections.length > 0) {
        const intersection = intersections[0];
        // get the uv
        const {uv, object} = intersection;
        let {x, y} = uv;
        x = 1 - x;
        y = 1 - y;

        const app = object.parent;

        (async () => {
          const texture = app.children[0].material.uniforms.map.value;
          const imageBitmap = texture.source.data;

          const largeCanvas = document.createElement('canvas');
          largeCanvas.width = imageBitmap.width;
          largeCanvas.height = imageBitmap.height;
          const largeCtx = largeCanvas.getContext('2d');
          largeCtx.drawImage(imageBitmap, 0, 0);

          const smallCanvas = document.createElement('canvas');
          const maxW = 512;
          const maxH = Math.floor(maxW * imageBitmap.height / imageBitmap.width);
          smallCanvas.width = maxW;
          smallCanvas.height = maxH;
          smallCanvas.style.cssText = `\
            position: fixed;
            top: 0;
            left: 0;
            width: 256px;
            z-index: 2;
          `;
          document.body.appendChild(smallCanvas);
          // globalThis.smallCanvas = smallCanvas;
          const ctx = smallCanvas.getContext('2d');
          // flip y
          ctx.translate(smallCanvas.width, smallCanvas.height);
          ctx.scale(-1, -1);
          ctx.drawImage(
            imageBitmap,
            0, 0, imageBitmap.width, imageBitmap.height,
            0, 0, smallCanvas.width, smallCanvas.height
          );
          ctx.resetTransform();
          const blob = await new Promise((accept, reject) => {
            smallCanvas.toBlob(accept, 'image/jpeg');
          });

          const vqa = useVqa();
          const result2 = await vqa.imageSelection(
            // animated image
            blob,
            [
              [
                Math.floor(x * smallCanvas.width),
                Math.floor(y * smallCanvas.height),
              ],
            ],
            // labels (foreground vs background)
            [
              1,
            ],
            // bbox
            // boxes_filt[0],
          );
          const {bbox} = result2;
          const [
            x1, y1, x2, y2,
          ] = bbox;

          const maskImageData = ctx.createImageData(smallCanvas.width, smallCanvas.height);
          for (let i = 0; i < maskImageData.data.length; i++) {
            const v = result2.uint8Array[i];
            if (v) {
              maskImageData.data[i * 4 + 0] = 255;
              maskImageData.data[i * 4 + 1] = 255;
              maskImageData.data[i * 4 + 2] = 255;
              maskImageData.data[i * 4 + 3] = 0;
            } else {
              maskImageData.data[i * 4 + 0] = 0;
              maskImageData.data[i * 4 + 1] = 0;
              maskImageData.data[i * 4 + 2] = 0;
              maskImageData.data[i * 4 + 3] = 255;
            }
          }
          ctx.putImageData(maskImageData, 0, 0);
          for (let i = 0; i < maskImageData.data.length; i++) {
            const v = result2.uint8Array[i];
            if (v) {
              maskImageData.data[i * 4 + 0] = 255;
              maskImageData.data[i * 4 + 1] = 255;
              maskImageData.data[i * 4 + 2] = 255;
              maskImageData.data[i * 4 + 3] = 255;
            } else {
              maskImageData.data[i * 4 + 0] = 0;
              maskImageData.data[i * 4 + 1] = 0;
              maskImageData.data[i * 4 + 2] = 0;
              maskImageData.data[i * 4 + 3] = 255;
            }
          }
          ctx.putImageData(maskImageData, 0, 0);

          //

          // large image canvas
          const canvas2 = document.createElement('canvas');
          canvas2.width = largeCanvas.width;
          canvas2.height = largeCanvas.height;
          const ctx2 = canvas2.getContext('2d');
          // flip y
          ctx2.translate(canvas2.width, canvas2.height);
          ctx2.scale(-1, -1);
          ctx2.drawImage(largeCanvas, 0, 0);
          ctx2.resetTransform();
          ctx2.globalCompositeOperation = 'multiply';
          ctx2.imageSmoothingEnabled = false;
          ctx2.drawImage(
            smallCanvas,
            0, 0, smallCanvas.width, smallCanvas.height,
            0, 0, largeCanvas.width, largeCanvas.height
          );
          ctx2.globalCompositeOperation = 'source-over';
          ctx2.imageSmoothingEnabled = true;
          canvas2.style.cssText = `\
            position: fixed;
            top: 0;
            left: 256px;
            width: 256px;
            z-index: 2;
          `;
          document.body.appendChild(canvas2);

          /* // clip to bounding box, but scaled to the original canvas resolution
          const canvas3 = document.createElement('canvas');
          const paddingPercent = 0.05;
          canvas3.width = (x2 - x1) * (largeCanvas.width / smallCanvas.width) * (1 + paddingPercent * 2);
          canvas3.height = (y2 - y1) * (largeCanvas.height / smallCanvas.height) * (1 + paddingPercent * 2);
          const ctx3 = canvas3.getContext('2d');
          ctx3.drawImage(
            canvas2,
            x1 * (largeCanvas.width / smallCanvas.width) - paddingPercent * largeCanvas.width,
            y1 * (largeCanvas.height / smallCanvas.height) - paddingPercent * largeCanvas.height,
            canvas3.width,
            canvas3.height,
            0,
            0,
            canvas3.width,
            canvas3.height
          );
          canvas3.style.cssText = `\
            position: fixed;
            top: 0;
            left: 512px;
            width: 256px;
            z-index: 2;
          `;
          document.body.appendChild(canvas3); */

          // flip x
          ctx.translate(smallCanvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(smallCanvas, 0, 0);
          app.setHighlightImage(smallCanvas);

          //

          // console.log('lol', canvas4.width, canvas4.height);

          const largeCanvas0 = document.createElement('canvas');
          largeCanvas0.width = largeCanvas.width;
          largeCanvas0.height = largeCanvas.height;
          const ctx0 = largeCanvas0.getContext('2d');
          // flip y
          ctx0.translate(largeCanvas.width, largeCanvas.height);
          ctx0.scale(-1, -1);
          ctx0.drawImage(largeCanvas, 0, 0);
          ctx0.resetTransform();

          //

          const canvas4 = document.createElement('canvas');
          // canvas4.width = largeCanvas.width;
          // canvas4.height = largeCanvas.height;
          const paddingPercent = 0.02;
          canvas4.width = (x2 - x1) / smallCanvas.width * largeCanvas.width * (1 + paddingPercent * 2);
          canvas4.height = (y2 - y1) / smallCanvas.height * largeCanvas.height * (1 + paddingPercent * 2);
          const ctx4 = canvas4.getContext('2d');

          ctx4.drawImage(
            largeCanvas0,
            (x1 / smallCanvas.width * largeCanvas.width) - paddingPercent * largeCanvas.width,
            (y1 / smallCanvas.height * largeCanvas.height) - paddingPercent * largeCanvas.height,
            (x2 - x1) / smallCanvas.width * largeCanvas.width + paddingPercent * largeCanvas.width * 2,
            (y2 - y1) / smallCanvas.height * largeCanvas.height + paddingPercent * largeCanvas.height * 2,
            0, 0, canvas4.width, canvas4.height
          );

          canvas4.style.cssText = `\
            position: fixed;
            top: 0;
            left: 768px;
            width: 256px;
            z-index: 1;
          `;
          document.body.appendChild(canvas4);

          const clipBlob = await new Promise((accept, reject) => {
            canvas4.toBlob(accept, 'image/jpeg');
          });
          const caption = await vqa.imageCaptioning(clipBlob);
          console.log(caption);
        })();
      }

      // 

      // get the vqa
      // const x = Math.floor((boxes_filt[0][0] + boxes_filt[0][2]) / 2);
      // const y = Math.floor((boxes_filt[0][1] + boxes_filt[0][3]) / 2);

      /* (async () => {
        const res = await fetch();
        const blob = await res.blob();

        const vqa = useVqa();
        const result2 = await vqa.imageSelection(
          // animated image
          blob,
          [
            [x, y],
          ],
          // labels (foreground vs background)
          [
            1,
          ],
          // bbox
          // boxes_filt[0],
        );
        console.log('got result 2', result2);
      })(); */
    }

    const focusedApp = zTargetingManager.getFocusedApp();
    if (focusedApp !== null) {
      storyManager.clickApp(focusedApp);
    } else {
      if (ioManager.keys.keyE) {
        localRaycaster.setFromCamera(localVector2D, camera);

        localObject.position.copy(localRaycaster.ray.origin);
        localObject.quaternion.setFromRotationMatrix(
          localMatrix.lookAt(
            localVector.set(0, 0, 0),
            localRaycaster.ray.direction,
            localVector2.set(0, 1, 0)
          )
        );
        zTargetingManager.handleRayFocus(localObject);
      } else {
        mouseDown = true;
      }
    }
    lastMouseZTime = now;
  });
  globalThis.addEventListener('mouseup', e => {
    mouseDown = false;
  });

  //

  const storyTargetMesh = new StoryTargetMesh({
    BufferGeometryUtils,
  });
  storyTargetMesh.frustumCulled = false;
  scene.add(storyTargetMesh);
  storyTargetMesh.updateMatrixWorld();

  useFrame(() => {
    const now = performance.now();
    const timeDiff = now - lastMouseZTime;
    const rate = 0.0005;
    if (mouseDown) {
      mouseZ += timeDiff * rate;
    } else {
      mouseZ -= timeDiff * rate;
    }
    mouseZ = Math.min(Math.max(mouseZ, 0), 1);

    //

    // -1 .. 1
    localVector2D.set(
      mouseX,
      mouseY
    );
    
    // raycast
    {
      localRaycaster.setFromCamera(localVector2D, camera);

      let result;
      {
        result = physicsScene.raycast(
          localRaycaster.ray.origin,
          localQuaternion.setFromRotationMatrix(
            localMatrix.lookAt(
              localVector.set(0, 0, 0),
              localRaycaster.ray.direction,
              localVector2.set(0, 1, 0)
            )
          )
        );
        // popRaycast();
      }
      if (result) {
        storyTargetMesh.position.fromArray(result.point);

        // console.log('set position', storyTargetMesh.position.toArray());

        const z = mouseZ;
        const z2 = cubicBezier(z);
        storyTargetMesh.material.uniforms.uPress.value = z2;
        storyTargetMesh.material.uniforms.uPress.needsUpdate = true;
      }
      // storyTargetMesh.position.y = Math.sin(now / 1000) * 3;
      storyTargetMesh.visible = !!result;
    }
    storyTargetMesh.updateMatrixWorld();

    // console.log('update', storyTargetMesh.position.toArray());
  });

  useCleanup(() => {
    debugger;
    scene.remove(storyTargetMesh);
  });
};

//

export default (ctx) => {
  console.log('adventure camera 2');
  
  useCameraTracking(ctx);

  const app = ctx.useApp();
  return app;
};
const lol = () => {
  const {
    useApp,
    useLocalPlayer,
    useCameraManager,
    usePhysicsWorkerManager,
    usePlayersManager,
    useRealmManager,
    useSpawnManager,
    useFrame,
    useCleanup,
    useAlea,
    useRouter,
    useEndpoints,
    useEasing,
    useThreeUtils,
    usePhysics,
    useCharacterCardParser,
    useDropManager,
    useZTargetingManager,
    useStoryManager,
    useIoManager,
    useSceneContextManager,
  } = ctx;

  const app = useApp();

  const objects = app.getComponent('worlds');
  const npcs = app.getComponent('npcs');
  const cameraLocked = app.getComponent('cameraLocked');

  const alea = useAlea();
  const r = alea('lol');

  const bezier = useEasing();
  const cubicBezier = bezier(0, 1, 0, 1);

  const cameraManager = useCameraManager();
  const physicsWorkerManager = usePhysicsWorkerManager();
  // const physicsTracker = usePhysicsTracker();
  // const playersManager = usePlayersManager();
  const realmManager = useRealmManager();
  const spawnManager = useSpawnManager();
  const rootRealm = realmManager.getRootRealm();
  const router = useRouter();
  const endpoints = useEndpoints();
  const globalPhysicsScene = usePhysics();
  // const characterCardParser = useCharacterCardParser();
  // const dropManager = useDropManager();
  const zTargetingManager = useZTargetingManager();
  const storyManager = useStoryManager();
  const ioManager = useIoManager();
  const sceneContextManager = useSceneContextManager();
  // const env = useEnv();
  const {
    BufferGeometryUtils,
  } = useThreeUtils();

  //

  const storyTargetMesh = new StoryTargetMesh({
    BufferGeometryUtils,
  });
  storyTargetMesh.frustumCulled = false;
  scene.add(storyTargetMesh);
  storyTargetMesh.updateMatrixWorld();

  //

  const getHitMapAsync = async (app, r) => {
    const raycastResolution = 128;
    const boundingBox = new THREE.Box3(
      new THREE.Vector3(-10, 0, -10),
      new THREE.Vector3(10, 0, 10)
    );
    boundingBox.translate(app.position);
    const size = boundingBox.getSize(new THREE.Vector3());

    const sceneId = Math.random();
    const physicsScene = await physicsWorkerManager.getScene(sceneId);

    const mesh = app.children[0];
    const physicsMesh = await physicsScene.addGeometry(mesh);

    const ps = [];
    const qs = [];
    for (let h = 0; h < raycastResolution; h++) {
      for (let w = 0; w < raycastResolution; w++) {
        const p = new THREE.Vector3()
          .copy(boundingBox.min)
          .add(new THREE.Vector3(
            w / raycastResolution * size.x,
            0,
            h / raycastResolution * size.z
          ));
        // p.y = boundingBox.max.y + 1;
        p.y = 0;
        const q = downQuaternion;
        ps.push(p); 
        qs.push(q);
      }
    }
    const hitMap = await physicsScene.raycastArray(ps, qs, ps.length);

    await physicsScene.removeGeometry(physicsMesh);

    hitMap.coords = Array(hitMap.hit.length);
    hitMap.validCoords = new Set();
    for (let i = 0; i < hitMap.hit.length; i++) {
      const hit = hitMap.hit[i];
      if (hit) {
        const x = i % raycastResolution;
        const y = Math.floor(i / raycastResolution);

        let hasAllNeighbors = true;
        for (let dx = -5; dx <= 5; dx++) {
          for (let dy = -5; dy <= 5; dy++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < raycastResolution && ny >= 0 && ny < raycastResolution) {
              const ni = ny * raycastResolution + nx;
              if (!hitMap.hit[ni]) {
                hasAllNeighbors = false;
                break;
              }
            }
          }
        }

        const position = new THREE.Vector3().fromArray(hitMap.point, i * 3);
        hitMap.coords[i] = position;

        if (hasAllNeighbors) {
          const quaternion = new THREE.Quaternion()
            .setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * 2 * r());
          hitMap.validCoords.add({
            position,
            quaternion,
          });
        }
      } else {
        hitMap.coords[i] = null;
      }
    }

    return hitMap;
  };
  const _listenPortalApp = portalApp => {
    let lastDistance = NaN;
    const recurse = () => {
      if (portalApp.ownerObject === currentObject) {
        portalApp.matrixWorld.decompose(
          localVector,
          localQuaternion,
          localVector2
        );

        const portalPlane = localPlane.setFromNormalAndCoplanarPoint(
          localVector2.set(0, 0, 1)
            .applyQuaternion(localQuaternion),
          localVector
        );
        const distance = portalPlane.distanceToPoint(localPlayer.position);

        // check if we passed through the portal plane
        if (lastDistance >= 0 && distance < 0) {
          // now check whether we passed through the portal bounding square (within 2m of each side)
          const projectedPoint = localPlane.projectPoint(localPlayer.position, localVector3);
          const distanceToCenter = projectedPoint.sub(localVector);
          distanceToCenter.x = Math.sqrt(distanceToCenter.x * distanceToCenter.x + distanceToCenter.z * distanceToCenter.z);
          distanceToCenter.y = Math.abs(distanceToCenter.y);
          
          // console.log('got distance', distanceToCenter.x, distanceToCenter.y);
          if (distanceToCenter.x <= 0.5 && distanceToCenter.y <= 1) {
            const nextObject = portalApp.otherPortalApp.ownerObject;
            // setCurrentObject(nextObject);

            const multiplayerEnabled = /^\/m\/$/.test(location.pathname);

            const u = new URL(location.href);
            u.pathname = `/${multiplayerEnabled ? 'm' : 'w'}/${nextObject.content.id}`;
            router.replaceUrl(u);
          }
        }

        lastDistance = distance;
      }
    };
    const cleanup = useFrame(recurse);

    return () => {
      cleanup();
    };
  };

  // portals
  let portalApps = [];
  useCleanup(() => {
    for (let i = 0; i < portalApps.length; i++) {
      const portalApp = portalApps[i];
      portalApp.unlisten();
    }
  });

  const makeWorldIdentityMeta = async (app, r) => {
    const hitMap = await getHitMapAsync(app, r);
    
    const candidates = [];

    const maxNumCandidates = 8;
    const minDistanceAwayFromCenter = 2;
    const minDistanceAwayFromOther = 2;
    for (let i = 0; i < maxNumCandidates; i++) {
      const numRetries = 10;
      let found = false;
      for (let j = 0; j < numRetries; j++) {
        const hitCoord = Array.from(hitMap.validCoords)[Math.floor(r() * hitMap.validCoords.size)];
        // ensure it's the minimum distance away from the center
        const centerDistance = Math.sqrt(
          hitCoord.position.x * hitCoord.position.x +
          hitCoord.position.z * hitCoord.position.z
        );
        if (centerDistance >= minDistanceAwayFromCenter) {
          if (candidates.every(hitCoord2 => {
            const distance = hitCoord.position.distanceTo(hitCoord2.position);
            return distance >= minDistanceAwayFromOther;
          })) {
            candidates.push(hitCoord);
            found = true;
            break;
          }
        }
      }
      if (!found) {
        break;
      }
    }

    const availableCandidates = candidates.slice();

    return {
      getCandidate() {
        return availableCandidates.shift();
      },
    };
  };

  const setCurrentObject = o => {
    // disable old physics
    if (currentObject) {
      currentObject.app.setComponent('physics', false);
    }

    // set the current object
    currentObject = o;

    // hide all objects
    hideAll();
    // link the portals in both directions
    linkObjectNeighborPortals(currentObject);
    showObject(currentObject);
    rootRealm.add(currentObject.app);

    // enable new physics
    currentObject.app.setComponent('physics', true);

    // set scene context world spec
    sceneContextManager.setWorldSpec(currentObject.content);
  };
  const linkObjectNeighborPortals = (currentObject) => {
    for (const portalApp of currentObject.portals) {
      const {
        otherPortalApp,
      } = portalApp;
      portalApp.portalScene.add(otherPortalApp.ownerObject.app);
      // otherPortalApp.visible = false;
    }
  };
  const alignNeighborPortals = (object) => {
    linkObjectNeighborPortals(object);

    for (const portalApp of object.portals) {
      portalApp.otherPortalApp.matrixWorld.decompose(
        localVector,
        localQuaternion,
        localVector2
      );
      portalApp.matrixWorld.decompose(
        localVector3,
        localQuaternion2,
        localVector4
      );

      for (const portalSceneChild of portalApp.portalScene.children) {
        portalSceneChild.matrix
          .premultiply(
            new THREE.Matrix4().compose(
              localVector.clone().negate(),
              new THREE.Quaternion(),
              new THREE.Vector3(1, 1, 1),
            )
          )
          .premultiply(
            new THREE.Matrix4().compose(
              new THREE.Vector3(0, 0, 0),
              localQuaternion.clone().invert(),
              new THREE.Vector3(1, 1, 1),
            )
          )
          .premultiply(
            new THREE.Matrix4().compose(
              new THREE.Vector3(0, 0, 0),
              localQuaternion2.clone().premultiply(y180Quaternion),
              new THREE.Vector3(1, 1, 1),
            )
          )
          .premultiply(
            new THREE.Matrix4().compose(
              localVector3,
              new THREE.Quaternion(),
              new THREE.Vector3(1, 1, 1),
            )
          )
          .decompose(portalSceneChild.position, portalSceneChild.quaternion, portalSceneChild.scale);

        // rootRealm.add(portalSceneChild);
        portalSceneChild.updateMatrixWorld();
      }
    }
  };
  const getNpcAppPhysicsObject = npcApp => {
    return npcApp.npc.physicsTracker.getAppPhysicsObjects(
      Array.from(npcApp.npc.appManager.apps.values())[0]
    )[0];
  };
  const enableNpcApp = npcApp => {
    if (!npcApp.npc.enabled) {
      const physicsObject = getNpcAppPhysicsObject(npcApp);
      globalPhysicsScene.enableActor(physicsObject);

      sceneContextManager.addPlayerSpec(npcApp.npc.playerSpec);
    }

    npcApp.npc.enabled = true;
    npcApp.npc.appManager.visible = true;
  };
  const disableNpcApp = npcApp => {
    if (npcApp.npc.enabled) {
      // enable the character controller physics
      const physicsObject = getNpcAppPhysicsObject(npcApp);
      globalPhysicsScene.disableActor(physicsObject);

      sceneContextManager.removePlayerSpec(npcApp.npc.playerSpec);
    }

    npcApp.npc.enabled = false;
    npcApp.npc.appManager.visible = false;
  };
  const showObject = (object) => {
    object.app.visible = true;
    for (const portalApp of object.portals) {
      portalApp.visible = true;
      portalApp.otherPortalApp.ownerObject.app.visible = true;
    }
    for (const npcApp of object.npcs) {
      enableNpcApp(npcApp);
    }
  };
  const hideAll = () => {
    for (const object of objects) {
      object.app.visible = false;
      for (const portal of object.portals) {
        portal.visible = false;
      }
      for (const npcApp of object.npcs) {
        disableNpcApp(npcApp);
      }
      for (const item of object.items) {
        item.visible = false;
      }
    }
  };

  // camera tracking

  const localPlayer = useLocalPlayer();
  const camera = cameraManager.getCamera();
  const setTargetPosition = p => {
    if (cameraSlide) {
      cameraSlide.getTargetPosition(p);
    } else {
      p.copy(currentObject.app.position);
    }
    return p;
  };
  const setTargetQuaternion = (() => {
    const localMatrix = new THREE.Matrix4();
    return q => q.setFromRotationMatrix(
      localMatrix.lookAt(
        camera.position,
        localPlayer.position,
        upVector
      )
    );
  })();

  let cameraSlide = null;
  let cameraAnimation = null;
  const loadWorldAsync = async (nextObject) => {
    const hadObject = !!currentObject;

    setCurrentObject(nextObject);

    if (!hadObject) {
      spawnManager.setSpawnPoint(
        nextObject.app.position,
        identityQuaternion,
      );
      await spawnManager.spawn();

      useFrame(() => {
        // -1 .. 1
        localVector2D.set(
          mouseX,
          mouseY
        );
        
        // raycast
        {
          localRaycaster.setFromCamera(localVector2D, camera);

          let result;
          {
            // const popRaycast = this.#pushRaycast(); // disable walls
            result = globalPhysicsScene.raycast(
              localRaycaster.ray.origin,
              localQuaternion.setFromRotationMatrix(
                localMatrix.lookAt(
                  localVector.set(0, 0, 0),
                  localRaycaster.ray.direction,
                  localVector2.set(0, 1, 0)
                )
              )
            );
            // popRaycast();
          }
          if (result) {
            storyTargetMesh.position.fromArray(result.point);

            const z = mouseZ;
            const z2 = cubicBezier(z);
            storyTargetMesh.material.uniforms.uPress.value = z2;
            storyTargetMesh.material.uniforms.uPress.needsUpdate = true;
          }
          storyTargetMesh.visible = !!result;
        }
        storyTargetMesh.updateMatrixWorld();
      });

      if (cameraLocked) {
        cameraManager.setControllerFn(() => {
          if (cameraSlide) {
            if (!cameraSlide.update()) {
              cameraSlide = null;
            }
          }

          let animated = false;
          if (cameraAnimation) {
            const ok = cameraAnimation.update();
            if (ok) {
              animated = true;
            } else {
              cameraAnimation = null;
            }
          }
          if (!animated) {
            setTargetPosition(camera.position);
            setTargetQuaternion(camera.quaternion);
          }

          // andle towards the mouse position
          {
            const hFov = camera.fov * camera.aspect * Math.PI / 180;
            const vFov = camera.fov * Math.PI / 180;

            camera.quaternion
              .multiply(
                localQuaternion2.setFromAxisAngle(
                  upVector,
                  // -mouseX * Math.PI / 8
                  -mouseX * hFov / 6
                )
              )
              .multiply(
                localQuaternion2.setFromAxisAngle(
                  rightVector,
                  // mouseY * Math.PI / 4
                  mouseY * vFov / 6
                )
              )
          }

          camera.updateMatrixWorld();
        });
      }
    } else {
      // camera slide
      {
        // find the closest portal
        let minDistance = Infinity;
        let closestPortal = null;
        for (let i = 0; i < currentObject.portals.length; i++) {
          const portal = currentObject.portals[i];

          portal.matrixWorld.decompose(localVector, localQuaternion, localVector2);

          const distance = localVector.distanceTo(localPlayer.position);
          if (distance < minDistance) {
            minDistance = distance;
            closestPortal = portal;
          }
        }

        closestPortal.matrixWorld.decompose(localVector, localQuaternion, localVector2);
        const portalWorldPosition = localVector.clone();
        const portalWorldQuaternion = localQuaternion.clone();
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
          currentObject.app.position.clone()
            .sub(portalWorldPosition)
            .normalize(),
          portalWorldPosition
        );

        const distance = plane.distanceToPoint(currentObject.app.position);
        // const distanceStartFactor = 1.2;
        const normal = camera.position.clone()
          .sub(currentObject.app.position)
          .normalize();
        // const startPosition = currentObject.app.position.clone()
        //   .add(
        //     normal.clone()
        //       .multiplyScalar(distance * distanceStartFactor)
        //   );
        const cameraDistance = 4;
        const cameraDirection = new THREE.Vector3(0, 0, -1)
          .applyQuaternion(camera.quaternion);
        const targetForward = cameraDirection.dot(normal) <= 0;
        const startPosition = portalWorldPosition.clone()
          .add(
            new THREE.Vector3(0, 0, cameraDistance * (targetForward ? -1 : 1))
              .applyQuaternion(portalWorldQuaternion)
          );
        const endPosition = currentObject.app.position.clone();

        let maxFactor = -Infinity;
        cameraSlide = {
          update() {
            let factor = plane.distanceToPoint(localPlayer.position);
            factor /= distance;
            factor = Math.min(Math.max(factor, 0), 1);

            maxFactor = Math.max(maxFactor, factor);

            return maxFactor < 1;
          },
          getTargetPosition(position) {
            position.lerpVectors(
              startPosition,
              endPosition,
              maxFactor
            );
            // position.copy(startPosition);
          },
        };
      }

      // camera animation
      {
        const animationDuration = 3000;
        const startTime = performance.now();
        const endTime = startTime + animationDuration;

        const startPosition = camera.position.clone();
        const startQuaternion = camera.quaternion.clone();

        cameraAnimation = {
          update() {
            const now = performance.now();
            let f = (now - startTime) / (endTime - startTime);
            if (f < 1) {
              const f2 = cubicBezier(f);

              const targetPosition = setTargetPosition(localVector);

              camera.position.lerpVectors(
                startPosition,
                targetPosition,
                f2
              );
              const targetQuaternion = setTargetQuaternion(localQuaternion);
              camera.quaternion.slerpQuaternions(
                startQuaternion,
                targetQuaternion,
                f2
              );
              // camera.updateMatrixWorld();

              return true;
            } else {
              return false;
            }
          },
        };
      }
    }
  };

  let currentObject = null;
  let loadPromise = null;
  const ensureLoaded = async () => {
    if (!loadPromise) {
      loadPromise = (async () => {
        // load objects
        await Promise.all(objects.map(async (object, i) => {
          const r2 = alea(r());

          const object2 = makeObjectWithPhysics(object, false);

          const app = await rootRealm.appManager.addAppAsync(object2);
          app.visible = false;
          object.app = app;

          const meta = await makeWorldIdentityMeta(app, r2);
          object.meta = meta;

          object.portals = [];
          object.npcs = [];
          object.items = [];
        }));

        // initialize portals
        await Promise.all(objects.map(async (object, i) => {
          let portals = object.portals;
          const nextObject = objects[i + 1];
          if (nextObject) { // if there is a next object, create a portal to it
            const hitCoord = object.meta.getCandidate();
            let {
              position,
              // quaternion,
            } = hitCoord;

            // create the outgoing portal
            position = position.clone();
            position.y += 1;
            const quaternion = new THREE.Quaternion()
              .setFromUnitVectors(
                new THREE.Vector3(0, 0, -1),
                new THREE.Vector3(position.x, 0, position.z).normalize()
              );
            const portalApp = await rootRealm.appManager.addAppAsync({
              type: 'application/portal',
              position,
              quaternion,
              content: {
                components: [
                  {
                    key: 'doubleSideEnabled',
                    value: true,
                  },
                ],
              },
            });
            portalApp.ownerObject = object;
            portalApp.visible = false;
            _listenPortalApp(portalApp);
            object.app.add(portalApp);
            portalApp.updateMatrixWorld();
            portals.push(portalApp);

            // create the reverse portal
            const otherHitCoord = nextObject.meta.getCandidate();
            let {
              position: reversePosition,
              // quaternion: reverseQuaternion,
            } = otherHitCoord;
            reversePosition = reversePosition.clone();
            reversePosition.y += 1;
            const reverseQuaternion = new THREE.Quaternion()
              .setFromUnitVectors(
                new THREE.Vector3(0, 0, -1),
                new THREE.Vector3(reversePosition.x, 0, reversePosition.z).normalize()
              );
            const reversePortalApp = await rootRealm.appManager.addAppAsync({
              type: 'application/portal',
              position: reversePosition,
              quaternion: reverseQuaternion,
              content: {
                components: [
                  {
                    key: 'doubleSideEnabled',
                    value: true,
                  },
                ],
              },
            });
            reversePortalApp.ownerObject = nextObject;
            reversePortalApp.visible = false;
            _listenPortalApp(reversePortalApp);
            nextObject.app.add(reversePortalApp);
            reversePortalApp.updateMatrixWorld();
            let otherPortals = nextObject.portals;
            otherPortals.push(reversePortalApp);

            // link the portals
            portalApp.otherPortalApp = reversePortalApp;
            reversePortalApp.otherPortalApp = portalApp;
          }
        }));

        // align apps and portals
        for (let i = 0; i < objects.length; i++) {
          const object = objects[i];
          alignNeighborPortals(object);
        }

        // initialize npcs
        const avatarUrls = [
          'Stevia_cl_a_1.03.vrm',
          // 'Scilly_FaceTracking_v1_Darling.vrm',
          'citrine.vrm',
          'Yoll2.vrm',
          'Buster_Rabbit_V1.1_Guilty.vrm',
          'ann.vrm',
          'NuQuiche.vrm',
          'Drake_hacker_v8_Guilty.vrm',
          'CornetVRM.vrm',
          'Scillia_Drophunter_V19.vrm',
          // 'scilly_drophunter_v31.10_Guilty.vrm',
        ].map(n => `/avatars/${n}`);
        await Promise.all(objects.map(async (object, i) => {
          const npcsSpec = npcs[i];
          await Promise.all(npcsSpec.npcs.map(async (npcSpec, j) => {
            // console.log('got npc spec', npcSpec);
            if (j >= 2) { // only create npcs for the first two objects
              return;
            }

            const {firstLastName: name, bio} = npcSpec;
            const r2 = alea(r());

            const hitCoord = object.meta.getCandidate();
            let {
              position,
              quaternion,
            } = hitCoord;

            const avatarUrl = avatarUrls[Math.floor(r2() * avatarUrls.length)];

            localMatrix.compose(
              position,
              quaternion,
              oneVector
            )
              .premultiply(object.app.matrixWorld)
              .decompose(localVector, localQuaternion, localVector2);

            // console.log('premultiply app', app.matrixWorld.toArray());

            const npcApp = await rootRealm.appManager.addAppAsync({
              type: 'application/npc',
              // app: npcApp,
              content: {
                avatarUrl,
                name,
                bio,
                voice: 'Rainbow Dash',
                // voicePack: 'ShiShi voice pack'
              },
              position: localVector,
              quaternion: localQuaternion,
            });
            npcApp.npc.appManager.visible = false;
            // console.log('got npc app', npcApp.npc.appManager);

            object.app.add(npcApp);
            npcApp.updateMatrixWorld();
            object.npcs.push(npcApp);
          }));
        }));
      })();
    }
    await loadPromise;
  };
  let multiplayerPromise = null;
  const ensureMultiplayer = async () => {
    if (!multiplayerPromise) {
      multiplayerPromise = (async () => {
        const multiplayer = realmManager.createMultiplayer();
        app.add(multiplayer);
        multiplayer.updateMatrixWorld();
    
        await multiplayer.connectMultiplayer({
          endpoint_url: endpoints.multiplayerEndpointUrl,
        });
    
        const tracker = multiplayer.createTracker({
          getKeySpec: () => {
            const id = currentObject.content.id + '';
            const realmsKeys = [id];
            const rootRealmKey = id;
            return {
              realmsKeys,
              rootRealmKey,
            };
          },
        });
        useCleanup(() => {
          tracker.stop();
        });
      })();
    }
    await multiplayerPromise;
  };

  ctx.waitUntil((async () => {
    router.registerRouteHandler(u => {
      const match = u.pathname.match(/^\/(w|m)\/(.*)$/);
      if (match) {
        const multiplayerEnabled = match[1] === 'm';
        const id = match[2] || (objects.length > 0 ? (objects[0].content.id + '') : null);

        const object = objects.find(o => o.content.id + '' === id);
        if (object) {
          return {
            id,
            multiplayerEnabled,
          };
        } else {
          throw new Error('404 not found');
        }
      } else {
        throw new Error('400 invalid url');
      }
    });
    router.addEventListener('route', e => {
      const route = e.data;
      e.waitUntil((async () => {
        await ensureLoaded();

        const {
          id,
          multiplayerEnabled,
        } = route;

        const startObject = objects.find(o => o.content.id + '' === id);
        await loadWorldAsync(startObject);

        if (multiplayerEnabled) {
          await ensureMultiplayer();
        }
      })());
    });
    await router.load();
  })());

  return app;
};