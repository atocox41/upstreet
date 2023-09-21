import * as THREE from 'three';
// import metaversefile from 'metaversefile';
// const {useApp, useFrame, useMaterials, usePhysics, useCleanup} = metaversefile;

const localVector = new THREE.Vector3();
const localMatrix = new THREE.Matrix4();

function _loadImage(u) {
  return new Promise(function(resolve, reject) {
    var img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = reject;
    img.src = u;
  });
}

export default (ctx) => {
  const {useApp, useFrame, useThreeUtils, useMaterials, usePhysics, useCleanup} = ctx;

  const app = useApp();
  app.name = 'street';
  app.description = 'The digital street.';

  const {
    BufferGeometryUtils,
  } = useThreeUtils();

  const w = 8;
	const h = 0.2;
	const d = 10000;
  // make the base geometry
  const baseGeometry = new THREE.BoxBufferGeometry(w, h, d)
	  .applyMatrix4(
	    localMatrix.makeTranslation(0, -h/2, 0)
		);
  // make the full geometry by stacking the base geometry 100 times in the z direction
  const geometries = [];
  for (let i = 0; i < 100; i++) {
    const geometry = baseGeometry.clone()
      .applyMatrix4(
        localMatrix.makeTranslation(0, 0, -d/2 + i * d)
      );
    geometries.push(geometry);
  }
  const geometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
	
  // console.log('got bounding box', boundingBox);
  
	const tex = new THREE.Texture();
	// tex.minFilter = THREE.NearestFilter;
	tex.magFilter = THREE.NearestFilter;
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	tex.anisotropy = 16;
	(async () => {
    const u = `${import.meta.url.replace(/(\/)[^\/]*$/, '$1')}street.png`;
    const img = await _loadImage(u);
    tex.image = img;
    tex.needsUpdate = true;
  })();
  
	const material = new THREE.ShaderMaterial({
    uniforms: {
      tex: {
        type: 't',
        value: tex,
        needsUpdate: true,
      },
			uTime: {
        type: 'f',
        value: 0,
        needsUpdate: true,
      },
    },
    vertexShader: `\
      precision highp float;
      precision highp int;

      varying vec2 vUv;
      varying vec3 vNormal;
			varying vec3 vPosition;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
				
				vUv = uv;
				vNormal = normal;
				vPosition = position;
      }
    `,
    fragmentShader: `\
      precision highp float;
      precision highp int;

      #define PI 3.1415926535897932384626433832795

      uniform sampler2D tex;
			uniform float uTime;
      varying vec2 vUv;
			varying vec3 vNormal;

      vec4 sam(sampler2D tex, vec2 uv, float t) {
				vec4 a = texture2D(tex, vec2(uv.x * 1./3., uv.y - t));
				vec4 b = texture2D(tex, vec2(uv.x * 1./3. + 1./3., uv.y + t));
			  return vec4(a.rgb * a.a + b.rgb * b.a, 1.);
			}

			// const vec2 resolution = vec2(1000., 1000.);
			const float size = 1000.;

			float letter(vec2 coord)
			{
					// float size = resolution.x / 25.;
          // const float size = 400.;

					vec2 gp = floor(coord / size * 7.); // global
					vec2 rp = floor(fract(coord / size) * 7.); // repeated

					vec2 odd = fract(rp * 0.5) * 2.;
					float rnd = fract(sin(dot(gp, vec2(12.9898, 78.233))) * 43758.5453);

					float c = max(odd.x, odd.y) * step(0.5, rnd); // random lines
					c += min(odd.x, odd.y); // corder and center points

					c *= rp.x * (6. - rp.x); // cropping
					c *= rp.y * (6. - rp.y);

					return clamp(c, 0., 1.);
			}
			
			vec3 blend(vec4 a, vec4 b) {
			  return a.rgb * a.a + b.rgb * b.a;
			}
			float random2d(vec2 n) { 
				return fract(sin(dot(n, vec2(129.9898, 4.1414))) * 2398.5453);
			}
			vec2 getCellIJ(vec2 uv, float gridDims){
				return floor(uv * gridDims)/ gridDims;
			}
			vec2 rotate2D(vec2 position, float theta)
			{
				mat2 m = mat2( cos(theta), -sin(theta), sin(theta), cos(theta) );
				return m * position;
			}
			float letter2(vec2 coord, float cellRand, float size) {
				vec2 gp = floor(coord / size * 7.); // global
				vec2 rp = floor(fract(coord / size) * 7.); // repeated
				vec2 odd = fract(rp * 0.5) * 2.;
				float rnd = random2d(gp + floor(cellRand * uTime * 10.));
				float c = max(odd.x, odd.y) * step(0.5, rnd); // random lines
				c += min(odd.x, odd.y); // fill corner and center points
				c *= rp.x * (6. - rp.x); // cropping
				c *= rp.y * (6. - rp.y);
				return clamp(c, 0., 1.);
			}
			vec3 pattern(vec2 uv) {
				const vec3 color = vec3(0.1);
				
			  // vec2 uv = fragCoord.xy / iResolution.xy;    
				//correct aspect ratio
				// uv.x *= iResolution.x/iResolution.y;
				uv /= 3.;
				uv.x *= 4.;

				// float t = uTime;
				// float scrollSpeed = 0.3;
				float dims = 2.0;
				int maxSubdivisions = 3;
				
				// uv = rotate2D(uv,PI/12.0);
				// uv.y -= uTime * scrollSpeed;
				
				float cellRand;
				vec2 ij;
				
				for(int i = 0; i <= maxSubdivisions; i++) { 
						ij = getCellIJ(uv, dims);
						cellRand = random2d(ij);
						dims *= 2.0;
						//decide whether to subdivide cells again
						float cellRand2 = random2d(ij + 454.4543);
						if (cellRand2 > 0.3){
							break; 
						}
				}
			 
				//draw letters
				// float showPos = -ij.y + cellRand;
				float b = letter2(uv, cellRand, 1.0 / (dims));
				
				// if (cellRand < 0.1) b = 0.0;
				
				return vec3(1. - (b * color));

				/* vec2 coord = uv * size;
				coord.x *= 5.;

				float c; // MSAA with 2x2 RGSS sampling pattern
				c  = letter(coord + vec2(-3.0 / 8., -1.0 / 8.));
				c += letter(coord + vec2( 1.0 / 8., -3.0 / 8.));
				c += letter(coord + vec2( 3.0 / 8.,  1.0 / 8.));
				c += letter(coord + vec2(-1.0 / 8.,  3.0 / 8.));
				return vec3(1.-c / 4.); */
			}
			
			vec3 hsv2rgb(vec3 c) {
				vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
				vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
				return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
			}

      void main() {
				vec2 uv = vUv;
				if (vNormal.x != 0.) {
					float z = uv.x;
					uv.x = uv.y;
					uv.y = z;
					uv.y *= ${d.toFixed(8)};
					// uv.x *= (${d.toFixed(8)} / 10.);
					// uv.y /= 0.1;
					gl_FragColor = sam(tex, uv, uTime * 2.);
				} else {
					uv.y *= (${d.toFixed(8)} / 10.);
					if (vNormal.y > 0.) {
						uv.y /= 0.2;

						if (uv.x > 0.9) {
							uv.x -= 0.9;
							uv.x /= 0.1;
							uv.y = 1. - uv.y;
							gl_FragColor = sam(tex, uv, uTime);
						} else if (uv.x > 0.8) {
							vec4 t = texture2D(tex, vec2((1. - uv.x) * 1./3. + 2./3., uv.y * 0.25));
							if (t.r < 0.5) { // black
								gl_FragColor = vec4(t.rgb + 0.25, 1.);
							} else {
								gl_FragColor = vec4(pattern(uv), 1.);
							}
					  } else if (
						  (uv.x > 0.75 && uv.x < 0.76) ||
						  (uv.x > 0.24 && uv.x < 0.25)
						) {
						  gl_FragColor = vec4(hsv2rgb(vec3(uv.y * 0.1, 1., 1.)), 1.);
						} else if (uv.x < 0.1) {
							uv.x /= 0.1;
							gl_FragColor = sam(tex, uv, uTime);
						} else if (uv.x < 0.2) {
							vec4 t = texture2D(tex, vec2(uv.x * 1./3. + 2./3., uv.y * 0.25));
							if (t.r < 0.5) { // black
								gl_FragColor = vec4(t.rgb + 0.25, 1.);
							} else {
								gl_FragColor = vec4(pattern(uv), 1.);
							}
						} else {
							gl_FragColor = vec4(pattern(uv), 1.);
						}
					} else if (vNormal.y < 0.) {
						uv.y *= (${d.toFixed(8)} / 10.);
						gl_FragColor = vec4(pattern(uv), 1.);
					} else {
						gl_FragColor = vec4(1., 1., 1., 1.);
					}

					gl_FragColor.rgb = vec3(1.) - gl_FragColor.rgb;
		    }

        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }
    `,
    // transparent: true,
    // polygonOffset: true,
    // polygonOffsetFactor: -1,
    // polygonOffsetUnits: 1,

		clipping: false,
		fog: false,
		lights: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  useFrame(() => {
	  material.uniforms.uTime.value = (Date.now() % 2000) / 2000;
	});

  const waveMesh = (() => {
		const geometry = new THREE.BufferGeometry();
			/* .applyMatrix4(
				new THREE.Matrix4()
					.makeRotationFromQuaternion(
						new THREE.Quaternion()
							.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI)
					)
			); */
		const positions = new Float32Array(8 * 1024);
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		let positionIndex = 0;
		
		/* let z = d/2;
		while (z >= -d/2) {
			const numTris = 3 + Math.floor(Math.random() * 5);
		  for (let i = 0; i < numTris; i++) {
			  const l = (0.5 + Math.random() * 0.5);
				const m = l * (0.4 + Math.random() * 0.2);
				
				if (i === 0) {
					const s = (0.2 + Math.random() * 0.8) * (Math.random() > 0.5 ? 1 : -1);
					
					localVector.set(0, h/2 + 0.01, z)
						.toArray(positions, positionIndex);
					positionIndex += 3;
					
					localVector.set(s, h/2 + 0.01, z - m)
						.toArray(positions, positionIndex);
					positionIndex += 3;
					
					localVector.set(0, h/2 + 0.01, z - l)
						.toArray(positions, positionIndex);
					positionIndex += 3;
			  } else {
					localRay.set(
					  localVector.fromArray(positions, positionIndex - 3*2),
					  localVector2.fromArray(positions, positionIndex - 3)
						  .sub(localVector)
							.normalize()
					);

					localVector.set(0, h/2 + 0.01, z)
						.toArray(positions, positionIndex);
					positionIndex += 3;
					
					localPlane.setFromNormalAndCoplanarPoint(
					  localVector.set(0, 0, 1),
					  localVector2.set(0, h/2 + 0.01, z - m)
					);
					localRay.intersectPlane(localPlane, localVector);
				  localVector
						.toArray(positions, positionIndex);
					positionIndex += 3;
					
					localVector.set(0, h/2 + 0.01, z - l)
						.toArray(positions, positionIndex);
					positionIndex += 3;
				}
				
				z -= l;
			}
			z -= 2.;
		} */
		
		let z = d/2;
		while (z >= -d/2) {
			const numTris = 3 + Math.floor(Math.random() * 5);
		  for (let i = 0; i < numTris; i++) {
			  const l = (0.2 + Math.random() * 0.8);
				const m = l * (0.2 + Math.random() * 0.8);
				const s = (-1 + Math.random() * 2);
				
				localVector.set(0, 0.01, z)
			    .toArray(positions, positionIndex);
				positionIndex += 3;
				
				localVector.set(s, 0.01, z - m)
			    .toArray(positions, positionIndex);
				positionIndex += 3;
				
				localVector.set(0, 0.01, z - l)
			    .toArray(positions, positionIndex);
				positionIndex += 3;
				
				z -= l;
			}
			z -= 2.;
		}
		
		geometry.setDrawRange(0, positionIndex / 3);
		
		const material = new THREE.MeshBasicMaterial({
		  color: 0x000000,
			side: THREE.DoubleSide,
		});
		/* const material = new WebaverseShaderMaterial({
			uniforms: {
				tex: {
					type: 't',
					value: tex,
					needsUpdate: true,
				},
				uTime: {
					type: 'f',
					value: 0,
					needsUpdate: true,
				},
			},
			vertexShader: `\
				precision highp float;
				precision highp int;

				varying vec2 vUv;
				varying vec3 vNormal;
				varying vec3 vPosition;

				void main() {
					vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
					gl_Position = projectionMatrix * mvPosition;
					
					vUv = uv;
					vNormal = normal;
					vPosition = position;
				}
			`,
			fragmentShader: `\
				precision highp float;
				precision highp int;

				#define PI 3.1415926535897932384626433832795

				uniform sampler2D tex;
				uniform float uTime;
				varying vec2 vUv;
				varying vec3 vNormal;

				vec4 sam(sampler2D tex, vec2 uv) {
					vec4 a = texture2D(tex, vec2(uv.x * 0.5, uv.y));
					vec4 b = texture2D(tex, vec2(uv.x * 0.5 + 0.5, uv.y));
					return vec4(a.rgb * a.a + b.rgb * b.a, 1.);
				}

				void main() {
					vec2 uv = vUv;
					if (vNormal.y > 0.) {
						uv.y /= 0.1;
						uv.y += uTime;
						if (uv.x > 0.9) {
							uv.x -= 0.9;
							uv.x /= 0.1;
							uv.y -= uTime;
							uv.y = 1. - uv.y;
							uv.y += uTime;
							gl_FragColor = sam(tex, uv);
						} else if (uv.x < 0.1) {
							uv.x /= 0.1;
							gl_FragColor = sam(tex, uv);
						} else {
							gl_FragColor = vec4(1., 1., 1., 1.);
						}
					} else if (vNormal.y < 0.) {
						gl_FragColor = vec4(1., 1., 1., 1.);
					} else if (vNormal.x != 0.) {
						float z = uv.x;
						uv.x = uv.y;
						uv.y = z;
						uv.y /= 0.1;
						uv.y += uTime;
						gl_FragColor = sam(tex, uv);
					} else {
						gl_FragColor = vec4(1., 1., 1., 1.);
					}
				}
			`,
		}); */
		const mesh = new THREE.Mesh(geometry, material);
		mesh.receiveShadow = true;
        mesh.castShadow = true;
		mesh.frustumCulled = false;
		return mesh;
	})();
	mesh.add(waveMesh);
	
    app.add(mesh);

	const physics = usePhysics();

	const matrix = new THREE.Matrix4().compose(
		app.position.clone().add(new THREE.Vector3(0, -h/2, 0)),
		app.quaternion,
		new THREE.Vector3(w, h, d).multiplyScalar(0.5),
	);
	const p = new THREE.Vector3();
	const q = new THREE.Quaternion();
	const s = new THREE.Vector3();
	matrix.decompose(p, q, s);

	const floorPhysicsId = physics.addBoxGeometry(
		p,
		q,
		s,
		false
	);

	useCleanup(() => {
		physics.removeGeometry(floorPhysicsId);
	});
  
  return app;
};