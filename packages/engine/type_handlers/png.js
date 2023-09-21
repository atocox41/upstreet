import * as THREE from 'three';

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();

//

const planeWidth = 1;
const planeHeight = 1;
const heightOffset = planeHeight / 2;

//

const planeGeometry = new THREE.PlaneBufferGeometry(planeWidth, planeHeight)
class ImageMesh extends THREE.Mesh {
  constructor() {
    const geometry = planeGeometry;
    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: {
          value: new THREE.Texture(),
          needsUpdate: true,
        },
        planeSize: { // plane width, height
          value: new THREE.Vector2(planeWidth, planeHeight),
          needsUpdate: true,
        },
        imageScale: { // image width, height
          value: new THREE.Vector2(1, 1),
          needsUpdate: true,
        },
      },
      vertexShader: `\
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        }
      `,
      fragmentShader: `\
        uniform sampler2D map;
        uniform vec2 planeSize;
        uniform vec2 imageScale;
        
        varying vec2 vUv;

        void main() {
          // use CSS-style 'contain' mode to bound the image to the plane's aspect ratio

          vec2 uv = vUv;

          vec2 planeAspect = planeSize.x > planeSize.y ? vec2(1., planeSize.y / planeSize.x) : vec2(planeSize.x / planeSize.y, 1.);
          vec2 imageAspect = imageScale.x > imageScale.y ? vec2(1., imageScale.y / imageScale.x) : vec2(imageScale.x / imageScale.y, 1.);
          vec2 aspect = planeAspect / imageAspect;

          vec2 offset = vec2(0.5) - vec2(0.5) * aspect;
          uv = uv * aspect + offset;

          // if in range
          if (uv.x >= 0. && uv.x <= 1. && uv.y >= 0. && uv.y <= 1.) {
            gl_FragColor = texture2D(map, uv);
          } else {
            gl_FragColor = vec4(0.);
          }

          // black out backface
          if (gl_FrontFacing == false) {
            gl_FragColor.rgb = vec3(0.);
          }

          // discard based on alpha
          if (gl_FragColor.a < 0.5) {
            discard;
          }
        }
      `,
      side: THREE.DoubleSide,
    });
    super(geometry, material);
  }
  async load({
    imageUrl,
  }) {
    const res = await fetch(imageUrl);
    const blob = await res.blob();

    const imageBitmap = await createImageBitmap(blob, {
      imageOrientation: 'flipY',
    });

    this.material.uniforms.planeSize.value.set(planeWidth, planeHeight);
    this.material.uniforms.planeSize.value.needsUpdate = true;

    this.material.uniforms.imageScale.value.set(imageBitmap.width, imageBitmap.height);
    this.material.uniforms.imageScale.value.needsUpdate = true;

    this.material.uniforms.map.value.image = imageBitmap;
    this.material.uniforms.map.value.needsUpdate = true;
  }
}

//

export default srcUrl => ctx => {
  const {
    useApp,
  } = ctx;

  const app = useApp();

  app.appType = 'png';

  app.setVolume = v => {
    // console.log('set volume', v);
  };
  app.setEmotion = e => {
    // console.log('set emotion', e);
  };

  ctx.waitUntil((async () => {
    const mesh = new ImageMesh();
    // mesh.position.y = heightOffset;
    mesh.position.y = 1.5;
    mesh.quaternion.setFromAxisAngle(localVector.set(0, 1, 0), Math.PI);

    const headBone = new THREE.Object3D();
    headBone.position.y = heightOffset;
    app.add(headBone);
    headBone.updateMatrixWorld();
    app.headBone = headBone;

    await mesh.load({
      imageUrl: srcUrl,
    });

    app.add(mesh);
    mesh.updateMatrixWorld();

    // physics
    {
      const height = 1.6;
      const width = 0.6;

      const widthPadding = 0; // Padding around the avatar since the base width is computed from shoulder distance

      const capsuleRadius = (width / 2) + widthPadding;

      const halfAvatarCapsuleHeight = (height + width) / 2; // (full world height of the capsule) / 2

      localMatrix.compose(
        localVector.set(0, heightOffset, 0), // start position
        localQuaternion.setFromAxisAngle(localVector2.set(0, 0, 1), Math.PI / 2), // rotate 90 degrees
        localVector2.set(capsuleRadius, halfAvatarCapsuleHeight, capsuleRadius)
      )
        .premultiply(app.matrixWorld)
        .decompose(localVector, localQuaternion, localVector2);
    }
  })());

  return app;
};