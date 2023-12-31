/* this file implements avatar optimization and THREE.js Object management + rendering */
import * as THREE from 'three';
// import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
// import {clone as sceneClone} from './SkeletonUtils.js';
// import * as avatarSpriter from '../avatar-spriter.js';
import {getAvatarHeight, getAvatarWidth, getModelBones} from './util.mjs';
import loaders from '../loaders.js';
// import {WebaverseShaderMaterial} from '../materials.js';
import {abortError} from '../lock-manager.js';
import {minAvatarQuality, maxAvatarQuality} from '../constants.js';
import settingsManager from '../settings-manager.js';
// import {
//   createSpriteAvatarMesh,
//   crunchAvatarModel,
//   optimizeAvatarModel,
// } from '../offscreen-engine-runtime/fns/avatar-renderer-fns.js';

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localMatrix =  new THREE.Matrix4();
const localMatrix2 =  new THREE.Matrix4();
const localSphere = new THREE.Sphere();
const localFrustum = new THREE.Frustum();

const parallelTraverse = ( a, b, callback ) => {

	callback( a, b );

	for ( let i = 0; i < a.children.length; i ++ ) {

		parallelTraverse( a.children[ i ], b.children[ i ], callback );

	}

}

const sceneClone = gltf => {
  const source = gltf.scene;

  const sourceLookup = new Map();
	const cloneLookup = new Map();

	const clone = source.clone();

	parallelTraverse( source, clone, function ( sourceNode, clonedNode ) {

		sourceLookup.set( clonedNode, sourceNode );
		cloneLookup.set( sourceNode, clonedNode );

	} );

  const threeNodes = gltf.parser.cacheSync.get('node');
  const rootSpringBones = [];
  gltf.userData.gltfExtensions.VRM.secondaryAnimation.boneGroups.forEach(boneGroup => {
    boneGroup.bones.forEach(boneIndex => {
      rootSpringBones.push(threeNodes[boneIndex])
    })
  })
  const springBones = [];
  rootSpringBones.forEach(rootSpringBone => {
    rootSpringBone.traverse(child => {
      if (child.isBone) {
        springBones.push(child);
      }
    })
  })

	clone.traverse( function ( node ) {

		if ( ! node.isSkinnedMesh ) return;

		const clonedMesh = node;
		const sourceMesh = sourceLookup.get( node );
		const sourceBones = sourceMesh.skeleton.bones;

		clonedMesh.skeleton = sourceMesh.skeleton.clone();
		clonedMesh.bindMatrix.copy( sourceMesh.bindMatrix );

		clonedMesh.skeleton.bones = sourceBones.map( function ( bone ) {

      if (rootSpringBones.includes(bone)) {
        const boneParant = cloneLookup.get(bone.parent);
        if (boneParant) {
          boneParant.add(bone);
          boneParant.remove(cloneLookup.get(bone));
        }
      }
      
			if (springBones.includes(bone)) { // note: don't clone hair bones.
				return bone;
			} else {
				return cloneLookup.get( bone );
			}

		} );

		clonedMesh.bind( clonedMesh.skeleton, clonedMesh.bindMatrix );

	} );

	return clone;
}

const gltfClone = gltf => {
  if (gltf) {
    const o = {
      ...gltf,
    };

    o.scene = sceneClone(gltf);
    o.scenes = [
      o.scene,
    ];

    return o;
  } else {
    return gltf;
  }
};

// const greenColor = new THREE.Color(0x43a047);

/* let avatarPlaceholderImagePromise = null;
const waitForAvatarPlaceholderImage = () => {
  avatarPlaceholderImagePromise = (async () => {
    const res = await fetch('/images/user.png');
    if (res.ok) {
      const blob = await res.blob();
      const options = {imageOrientation: 'flipY'};
      const avatarPlaceholderImage = await createImageBitmap(blob, options);
      return avatarPlaceholderImage;
    } else {
      throw new Error('failed to load image: ' + res.status);
    }
  })();
  return avatarPlaceholderImagePromise;
} */
/* const _makeAvatarPlaceholderMesh = (() => {
  // geometry
  const planeGeometry = new THREE.PlaneBufferGeometry(0.2, 0.2);
  {
    const angles = new Float32Array(planeGeometry.attributes.position.count).fill(-100);
    planeGeometry.setAttribute('angle', new THREE.BufferAttribute(angles, 1));
  }
  const ringGeometry = new THREE.RingGeometry(0.135, 0.15, 32, 1);
  {
    const angles = new Float32Array(ringGeometry.attributes.position.count);
    // compute the angle, starting from the 0 at the top of the ring
    for (let i = 0; i < ringGeometry.attributes.position.count; i++) {
      const x = ringGeometry.attributes.position.array[i * 3];
      const y = ringGeometry.attributes.position.array[i * 3 + 1];
      const angle = (Math.atan2(-x, -y) + Math.PI) / (Math.PI * 2);
      angles[i] = angle;
    }
    ringGeometry.setAttribute('angle', new THREE.BufferAttribute(angles, 1));
  }
  const geometry = BufferGeometryUtils.mergeBufferGeometries([
    planeGeometry,
    ringGeometry,
  ]);

  const avatarPlaceholderTexture = new THREE.Texture();
  let textureLoaded = false;

  // material
  const material = new WebaverseShaderMaterial({
    uniforms: {
      uTime: {
        value: 0,
        needsUpdate: true,
      },
      map: {
        value: avatarPlaceholderTexture,
        needsUpdate: true,
      },
    },
    vertexShader: `\
      uniform float uTime;
      attribute float angle;
      varying vec2 vUv;
      varying float vAngle;

      const float q = 0.1;

      void main() {
        vec3 p = position;
        vUv = uv;
        vAngle = angle;
        if (angle > -50.) {
          vAngle = mod(vAngle - uTime, 1.);
          vAngle = min(max(vAngle - 0.5, 0.), 1.) * 2.;
        } else {
          float t = uTime;
          t = mod(t * 2., 1.);
          float f = t < q ?
            pow(t/q, 0.1)
          :
            1. - (t - q)/(1. - q);

          p *= (1. + f * 0.2);
        }
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `\
      uniform float uTime;
      uniform sampler2D map;
      varying vec2 vUv;
      varying float vAngle;

      #define PI 3.1415926535897932384626433832795

      const vec4 green = vec4(${
        greenColor.clone()
          // .multiplyScalar(1.3)
          .toArray()
          .map(n => n.toFixed(8))
          .join(', ')
      }, 1.0);

      void main() {
        if (vAngle > -50.) {
          float f = vAngle;
          // f = pow(f, 0.2);
          // float f = (vAngle - uTime);
          // f = mod(f, 1.);

          gl_FragColor = green;
          gl_FragColor.rgb *= pow(f * 1.3, 0.5);
          // gl_FragColor = green;
          // gl_FragColor.r = f;
          gl_FragColor.a = f;
        } else {
          vec4 c = texture2D(map, vUv);
          gl_FragColor = c;
          gl_FragColor.rgb = (1. - gl_FragColor.rgb) * green.rgb;

          if (gl_FragColor.a < 0.9) {
            discard;
          }
        }

        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }
    `,
    side: THREE.DoubleSide,
    // alphaTest: 0.9,
    alphaToCoverage: true,
    transparent: true,
  });

  // make fn
  return () => {
    if (!textureLoaded) {
      textureLoaded = true;
      (async() => {
        const avatarPlaceholderImage = await waitForAvatarPlaceholderImage();
        avatarPlaceholderTexture.image = avatarPlaceholderImage;
        avatarPlaceholderTexture.needsUpdate = true;
      })();
    }

    const mesh = new THREE.Mesh(geometry, material);
    let startTime = 0;
    const animationTime = 1000;
    mesh.start = () => {
      startTime = performance.now();
    };
    mesh.update = timestamp => {
      material.uniforms.uTime.value = ((timestamp - startTime) / animationTime) % 1;
      material.uniforms.uTime.needsUpdate = true;
    };
    mesh.frustumCulled = false;
    return mesh;
  };
})(); */
/* const parseVrm = (arrayBuffer, srcUrl) => new Promise((accept, reject) => {
  const {gltfLoader} = loaders;
  gltfLoader.parse(arrayBuffer, srcUrl, accept, reject);
}); */
const _unfrustumCull = o => {
  o.frustumCulled = false;
};
const _enableShadows = o => {
  o.castShadow = true;
  o.receiveShadow = true;
};
const _setDepthWrite = o => {
  o.material.depthWrite = true;
  o.material.alphaToCoverage = true;
  // o.material.alphaTest = 0.5;
};

const _setLinearEncoding = o => {
  const enableEncoding = m => {
    if (m.constructor.name === 'MToonMaterial' && m.uniforms.map) {
      if (m.uniforms.map.value) {
        m.uniforms.map.value.encoding = THREE.LinearEncoding;
      }
    }
    else {
      if (m.map) {
        m.map.encoding = THREE.LinearEncoding;
      }
    }
  }

  if (Array.isArray(o.material)) {
    for (const m of o.material) {
      enableEncoding(m);
    }
  }
  else {
    enableEncoding(o.material);
  }
}

const _abortablePromise = async (promise, {
  signal = null
} = {}) => {
  const signalPromise = new Promise((accept, reject) => {
    const abort = () => {
      signal.removeEventListener('abort', abort);
      reject(signal.reason);
    };
    signal.addEventListener('abort', abort);

    promise.then((result) => {
      signal.removeEventListener('abort', abort);
      accept(result);
    }).catch(err => {
      signal.removeEventListener('abort', abort);
      reject(err);
    });
  });
  return await signalPromise;
};

const _loadGlbObject = async (glbData, srcUrl, {
  signal = null,
} = {}) => {
  const promise = new Promise((accept, reject) => {
    const {gltfLoader} = loaders;
    gltfLoader.parse(glbData, srcUrl, accept, reject);
  });
  return await _abortablePromise(promise, {signal});
};

const mapTypes = [
  'alphaMap',
  'aoMap',
  'bumpMap',
  'displacementMap',
  'emissiveMap',
  'envMap',
  'lightMap',
  'map',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
];
const _addAnisotropy = (o, anisotropyLevel) => {
  for (const mapType of mapTypes) {
    if (o.material[mapType]) {
      o.material[mapType].anisotropy = anisotropyLevel;
    }
  }
};
const _forAllMeshes = (o, fn) => {
  o.traverse(o => {
    o.isMesh && fn(o);
  });
};

const _bindControl = (dstModel, srcObject) => {
  const srcModel = srcObject.scene;

  const _findBoneInSrc = (srcBoneName) => {
    let result = null;
    const _recurse = o => {
      if (o.isBone && o.name === srcBoneName) {
        result = o;
        return false;
      }
      for (const child of o.children) {
        if (_recurse(child) === false) {
          return false;
        }
      }
      return true;
    };
    _recurse(srcModel);
    return result;
  };
  const _findSrcSkeletonFromBoneName = (boneName) => {
    let skeleton = null;

    const bone = _findBoneInSrc(boneName);
    if (bone !== null) {
      const _recurse = o => {
        if (o.isSkinnedMesh) {
          if (o.skeleton.bones.includes(bone)) {
            skeleton = o.skeleton;
            return false;
          }
        }
        for (const child of o.children) {
          if (_recurse(child) === false) {
            return false;
          }
        }
        return true;
      };
      _recurse(srcModel);
    }

    return skeleton;
  };
  const _findSrcSkeletonFromDstSkeleton = skeleton => {
    return _findSrcSkeletonFromBoneName(skeleton.bones[0].name);
  };
  const _findMorphMeshInSrc = () => {
    const srcBlendShapeGroups = srcObject?.userData?.gltfExtensions?.VRM?.blendShapeMaster?.blendShapeGroups;
    const numSrcBlendShapeGroups = srcBlendShapeGroups?.length ?? 0;

    let result = null;
    const _recurse = o => {
      if (
        o.isMesh &&
        o.morphTargetDictionary &&
        o.morphTargetInfluences &&
        o.morphTargetInfluences.length >= numSrcBlendShapeGroups
      ) {
        result = o;
        return false;
      }
      for (const child of o.children) {
        if (!_recurse(child)) {
          return false;
        }
      }
      return true;
    };
    _recurse(srcModel);
    return result;
  };

  const uncontrolFns = [];
  dstModel.traverse(o => {
    // bind skinned meshes to skeletons
    if (o.isSkinnedMesh) {
      const oldSkeleton = o.skeleton;
      const newSkeleton = _findSrcSkeletonFromDstSkeleton(oldSkeleton);

      o.skeleton = newSkeleton;

      uncontrolFns.push(() => {
        o.skeleton = oldSkeleton;
      });
    }
    // bind blend shapes to controls
    if (o.isMesh) {
      const oldMorphTargetDictionary = o.morphTargetDictionary;
      const oldMorphTargetInfluences = o.morphTargetInfluences;

      // const morphMesh = _findMorphMeshInSrc();
      const morphMesh = srcObject.scene.getObjectByName(o.name);
      if (morphMesh) {
        o.morphTargetDictionary = morphMesh.morphTargetDictionary;
        o.morphTargetInfluences = morphMesh.morphTargetInfluences;

        uncontrolFns.push(() => {
          o.morphTargetDictionary = oldMorphTargetDictionary;
          o.morphTargetInfluences = oldMorphTargetInfluences;
        });
      }
    }
  });
  return () => {
    for (const uncontrolFn of uncontrolFns) {
      uncontrolFn();
    }
    uncontrolFns.length = 0;
  };
};

const _getMergedBoundingSphere = o => {
  const sphere = new THREE.Sphere();
  o.updateMatrixWorld();
  o.traverse(o => {
    if (o.isMesh) {
      if (!o.geometry.boundingSphere) {
        o.geometry.computeBoundingSphere();
      }
      sphere.union(
        localSphere.copy(o.geometry.boundingSphere)
          .applyMatrix4(o.matrixWorld)
      );
    }
  });
  return sphere;
};

export class AvatarQuality {
  #gltf = null;

  constructor({
    gltf = null,
    // camera = null, // if null, do not frustum cull
    quality = settingsManager.getCharacterQuality(),
    controlled = false,
  } = {})	{
    this.#gltf = gltf;

    //

    // this.arrayBuffer = arrayBuffer;
    // this.srcUrl = srcUrl;
    // this.camera = camera;
    this.quality = quality;
    this.isControlled = controlled;

    //

    this.scene = new THREE.Object3D();
    this.scene.name = 'avataQualityScene';
    // this.placeholderMesh = _makeAvatarPlaceholderMesh();

    //

    this.spriteAvatarMeshPromise = null;
    this.crunchedModelPromise = null;
    this.optimizedModelPromise = null;
    this.meshPromise = null;

    this.spriteAvatarMesh = null;
    this.crunchedModel = null;
    this.optimizedModel = null;
    this.mesh = null;
    this.currentMesh = null;

    //

    this.controlObject = null;
    this.controlObjectLoaded = false;
    this.uncontrolFnMap = new Map();
    this.height = 0;

    //

    this.abortController = null;

    //

    // this.loadPromise = null;

    this.setQuality(quality);
  }

  // get arrayBuffer() {
  //   debugger;
  // }
  // set arrayBuffer(arrayBuffer) {
  //   debugger;
  // }
  // get srcUrl() {
  //   debugger;
  // }
  // set srcUrl(srcUrl) {
  //   debugger;
  // }
  // XXX camera for frustum culling
  /* get camera() {
    debugger;
  }
  set camera(camera) {
    debugger;
  } */

  getAvatarSize() {
    const model = this.controlObject.scene;
    model.updateMatrixWorld();
    const modelBones = getModelBones(this.controlObject);
    const height = getAvatarHeight(modelBones);
    const width = getAvatarWidth(modelBones);
    return {height, width};
  }

  #getCurrentMesh() {
    switch (this.quality) {
      case 1: {
        return this.spriteAvatarMesh;
      }
      case 2: {
        return this.crunchedModel;
      }
      case 3: {
        return this.optimizedModel;
      }
      case 4: {
        return this.mesh;
      }
      default: {
        return null;
      }
    }
  }

  async #ensureControlObject() {
    if (!this.controlObjectLoaded) {
      this.controlObjectLoaded = true;

      // this.controlObject = gltfClone(this.#gltf);
      this.controlObject = this.#gltf;

      const {height} = this.getAvatarSize();
      this.height = height;
    }
  }

  setControlled(controlled) {
    this.isControlled = controlled;

    if (controlled) {
      for (const glb of [
        this.spriteAvatarMesh,
        this.crunchedModel,
        this.optimizedModel,
        this.mesh,
      ]) {
        if (!!glb && !this.uncontrolFnMap.has(glb)) {
          const uncontrolFn = _bindControl(glb, this.controlObject);
          this.uncontrolFnMap.set(glb, uncontrolFn);
        }
      }
    } else {
      for (const uncontrolFn of this.uncontrolFnMap.values()) {
        uncontrolFn();
      }
      this.uncontrolFnMap.clear();
    }
  }

  #bindControlObject() {
    this.setControlled(this.isControlled);
  }

  async setQuality(quality) {
    // set new quality
    this.quality = quality;

    // cancel old load
    if (this.abortController) {
      this.abortController.abort(abortError);
      this.abortController = null;
    }

    // clear old avatar scene
    // XXX destroy old avatars?
    this.scene.clear();
    // add placeholder
    // this.scene.add(this.placeholderMesh);
    // this.placeholderMesh.start();

    // start loading
    this.abortController = new AbortController();

    // load
    /* this.loadPromise = (async () => */{
      const signal = this.abortController.signal;
      switch (this.quality) {
        case 1: {
          if (!this.spriteAvatarMeshPromise) {
            this.spriteAvatarMeshPromise = (async () => {
              await Promise.all([
                (async () => {
                  const {
                    textureImages,
                  } = await createSpriteAvatarMesh({
                    arrayBuffer: this.arrayBuffer,
                    srcUrl: this.srcUrl,
                  });
                  const glb = avatarSpriter.createSpriteAvatarMeshFromTextures(textureImages);
                  _forAllMeshes(glb, _unfrustumCull);
                  glb.boundingSphere = _getMergedBoundingSphere(glb);

                  this.spriteAvatarMesh = glb;
                })(),
                this.#ensureControlObject(),
              ]);
              this.#bindControlObject();
            })();
          }
          {
            try {
              await this.spriteAvatarMeshPromise;
            } catch (err) {
              this.spriteAvatarMeshPromise = null;
              throw err;
            }
          }
          break;
        }
        case 2: {
          if (!this.crunchedModelPromise) {
            this.crunchedModelPromise = (async () => {
              await Promise.all([
                (async () => {
                  const {
                    glbData,
                  } = await crunchAvatarModel({
                    arrayBuffer: this.arrayBuffer,
                    srcUrl: this.srcUrl,
                  });
                  const object = await _loadGlbObject(glbData, this.srcUrl, {signal});
                  // downloadFile(new Blob([glbData], {type: 'application/octet-stream'}), 'avatar.glb');
                  const glb = object.scene;
                  _forAllMeshes(glb, o => {
                    _unfrustumCull(o);
                    _setDepthWrite(o);
                  });
                  glb.boundingSphere = _getMergedBoundingSphere(glb);

                  this.crunchedModel = glb;
                })(),
                this.#ensureControlObject(),
              ]);
              this.#bindControlObject();
            })();
          }
          {
            try {
              await this.crunchedModelPromise;
            } catch (err) {
              this.crunchedModelPromise = null;
              throw err;
            }
          }
          break;
        }
        case 3: {
          if (!this.optimizedModelPromise) {
            this.optimizedModelPromise = (async () => {
              await Promise.all([
                (async () => {
                  const {
                    glbData,
                  } = await optimizeAvatarModel({
                    arrayBuffer: this.arrayBuffer,
                    srcUrl: this.srcUrl,
                  });
                  const object = await _loadGlbObject(glbData, this.srcUrl, {signal});
                  const glb = object.scene;
                  _forAllMeshes(glb, o => {
                    _enableShadows(o);
                    _unfrustumCull(o);
                  });
                  glb.boundingSphere = _getMergedBoundingSphere(glb);

                  this.optimizedModel = glb;
                })(),
                this.#ensureControlObject(),
              ]);
              this.#bindControlObject();
            })();
          }
          {
            try {
              await this.optimizedModelPromise;
            } catch (err) {
              this.optimizedModelPromise = null;
              throw err;
            }
          }
          break;
        }
        case 4: {
          // if (!this.meshPromise) {
            // this.meshPromise = (async () => {
              const object = this.#gltf;
              const glb = object.scene;

              _forAllMeshes(glb, o => {
                _addAnisotropy(o, 16);
                _enableShadows(o);
                _unfrustumCull(o);
                _setLinearEncoding(o);
              });

              glb.boundingSphere = _getMergedBoundingSphere(glb);

              this.mesh = glb;

              this.#ensureControlObject();

              this.#bindControlObject();
            // })();
          // }
          /* {
            try {
              await this.meshPromise;
            } catch (err) {
              this.meshPromise = null;
              throw err;
            }
          } */
          break;
        }
        default: {
          throw new Error('unknown avatar quality: ' + this.quality);
        }
      }
    }/*)();*/
    if (this.loadPromise) {
      throw new Error('did not expect load');

      // wait for load
      let caughtError = null;
      try {
        await this.loadPromise;
      } catch (err) {
        caughtError = err;
      }
      // handle errors
      if (caughtError) {
        if (caughtError.isAbortError) {
          return; // bail
        } else {
          console.warn(caughtError);
        }
      } else {
        this.abortController = null;
        // set the new avatar mesh
      }

      // remove the placeholder mesh
      this.placeholderMesh.parent.remove(this.placeholderMesh);
    }

    // add the avatar mesh
    this.currentMesh = this.#getCurrentMesh();
    this.scene.add(this.currentMesh);
  }

  adjustQuality(delta) {
    const newQuality = Math.min(Math.max(this.quality + delta, minAvatarQuality), maxAvatarQuality);
    if (newQuality !== this.quality) {
      this.setQuality(newQuality);
    }
  }

  update(timestamp, timeDiff, avatar) {
    // avatar can be undefined if it's not bound
    // we apply the root transform if avatar is undefined
    // this.#updatePlaceholder(timestamp, timeDiff, avatar);
    this.#updateAvatar(timestamp, timeDiff, avatar);
    // this.#updateFrustumCull(avatar);
  }

  #getAvatarHeadPosition(avatar) {
    let headPosition = null;
    if (avatar) {
      // get avatar head position
      headPosition = avatar.inputs.hmd.position;
    } else {
      // calculate head position with zero pose if it's not bound
      localVector.set(0, this.height, 0).applyMatrix4(this.scene.matrixWorld);
      headPosition = localVector;
    }
    return headPosition;
  }

  #getAvatarCentroid(avatar) {
    if (avatar) {
      // get the centroid of avatar
      localVector.set(avatar.inputs.hmd.position.x,
        avatar.inputs.hmd.position.y - this.height / 2,
        avatar.inputs.hmd.position.z);
    } else {
      // estimate the hip position if it's not bound
      localVector.set(0, this.height / 2, 0).applyMatrix4(this.scene.matrixWorld);
    }
    return localVector;
  }

  #updatePlaceholder(timestamp, timeDiff, avatar) {
    debugger;
    const headPosition = this.#getAvatarHeadPosition(avatar);
    if (this.camera && this.placeholderMesh.parent) {
      localMatrix.copy(this.placeholderMesh.parent.matrixWorld).invert();
      headPosition.applyMatrix4(localMatrix);

      this.placeholderMesh.position.copy(headPosition);
      this.placeholderMesh.updateMatrixWorld();
      // this.placeholderMesh.position.y -= this.height;

      this.placeholderMesh.matrixWorld.decompose(
        localVector,
        localQuaternion,
        localVector2
      );
      this.placeholderMesh.parent.matrixWorld.decompose(
        localVector2,
        localQuaternion,
        localVector3
      );

      // placeholder orients to the mesh world position
      // local quaternion should consider parent quaternion
      localQuaternion.invert().multiply(
        localQuaternion2
          .setFromRotationMatrix(
            localMatrix.lookAt(
              this.camera.position,
              localVector,
              localVector2.set(0, 1, 0)
            )
          )
      );
      localEuler.setFromQuaternion(localQuaternion, 'YXZ');
      localEuler.x = 0;
      localEuler.z = 0;
      this.placeholderMesh.quaternion.setFromEuler(localEuler);
      this.placeholderMesh.updateMatrixWorld();

      this.placeholderMesh.update(timestamp);
    }
  }

  #updateAvatar(timestamp, timeDiff, avatar) {
    if (this.camera) {
      const currentMesh = this.#getCurrentMesh();
      if (currentMesh && currentMesh === this.spriteAvatarMesh) {
        // const xrCamera = this.renderer.xr.getSession() ?
        //   this.renderer.xr.getCamera(this.camera)
        // :
        //   this.camera;
        this.spriteAvatarMesh.update(timestamp, timeDiff, avatar, this.camera);
        // this.spriteAvatarMesh.update(timestamp, timeDiff, avatar, xrCamera);
      }
    }
  }

  #updateFrustumCull(avatar) {
    console.warn('frustum cull avatars externally');
    debugger;
    
    const centroidPosition = this.#getAvatarCentroid(avatar);
    if (this.camera) {
      const currentMesh = this.#getCurrentMesh();
      if (currentMesh) {
        // XXX this can be optimized by initializing the frustum only once per frame and passing it in
        const xrCamera = this.renderer.xr.getSession() ?
          this.renderer.xr.getCamera(this.camera)
        :
          this.camera;
        const projScreenMatrix = localMatrix2.multiplyMatrices(
          this.camera.projectionMatrix,
          this.camera.matrixWorldInverse,
          // xrCamera.projectionMatrix,
          // xrCamera.matrixWorldInverse,
        );
        localFrustum.setFromProjectionMatrix(projScreenMatrix);

        localMatrix.makeTranslation(
          centroidPosition.x,
          centroidPosition.y,
          centroidPosition.z,
        );
        const boundingSphere = localSphere.copy(currentMesh.boundingSphere)
          .applyMatrix4(localMatrix);
        this.scene.visible = localFrustum.intersectsSphere(boundingSphere);
      } else {
        this.scene.visible = true;
      }
    } else {
      this.scene.visible = true;
    }
  }

  // waitForLoad() {
  //   return this.loadPromise;
  // }

  // destroy() {
  //   this.abortController && this.abortController.abort(abortError);
  // }
}