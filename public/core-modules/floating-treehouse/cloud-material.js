import * as THREE from 'three';

const _createCloudMaterial = () => {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: {
        value: 0
      },
      noiseTexture: {
        value: null
      },
      flowTexture: {
        value: null
      },
      tDepth: {
        value: null
      },
      tMask: {
        value: null
      },
      cameraNear: {
        value: 0
      },
      cameraFar: {
        value: 0
      },
      resolution: {
        value: new THREE.Vector2()
      },
    },
    vertexShader: `\
        
      ${THREE.ShaderChunk.common}
      ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
      varying vec3 vWorldPosition;
      varying float vNoise;
      
      uniform float uTime;
      uniform sampler2D noiseTexture;
      uniform sampler2D flowTexture;
      
      float remap(float target, vec2 InMinMax, vec2 OutMinMax) {
        return OutMinMax.x + (target - InMinMax.x) * (OutMinMax.y - OutMinMax.x) / (InMinMax.y - InMinMax.x);
      }
      vec3 FlowUVW (vec2 uv, vec2 flowVector, vec2 jump, float flowOffset, float tiling, float time, bool flowB) {
        float phaseOffset = flowB ? 0.5 : 0.;
        float progress = fract(time + phaseOffset);
        vec3 uvw;
        uvw.xy = uv - flowVector * (progress + flowOffset);
        uvw.xy *= tiling;
        uvw.xy += phaseOffset;
        uvw.xy += (time - progress) * jump;
        uvw.z = 1. - abs(1. - 2. * progress);
        return uvw;
      }
      void main() {
        vec3 pos = position; 

        vec3 tempPos = (modelMatrix * vec4(pos, 1.0)).xyz;
        vec2 jump = vec2(0.24, 0.2);
        float tiling = 1.;
        float speed = 0.15;
        float flowStrength = 0.1;
        float flowOffset = 0.;

        float noiseScale = 0.002;
        vec2 posUv = tempPos.xz * noiseScale;
        vec2 flowVector = texture2D(flowTexture, posUv).rg * 2. - 1.;
        flowVector *= flowStrength;
        float noise = texture2D(flowTexture, posUv).a;
        float time = uTime * speed + noise;

        
        vec3 uvwA = FlowUVW(posUv, flowVector, jump, flowOffset, tiling, time, false);
        vec3 uvwB = FlowUVW(posUv, flowVector, jump, flowOffset, tiling, time, true);

        vec3 noise1 = texture2D(noiseTexture, uvwA.xy + uTime * 0.03).xyz * uvwA.z;
        vec3 noise2 = texture2D(noiseTexture, uvwB.xy + uTime * 0.03).xyz * uvwB.z;
        noise = (noise1 + noise2).x;



        float baseNoiseScale = 0.00045;
        float baseNoiseSpeed = 0.00045;
        float baseNoiseStrength = 1.1;
        float baseNoise = texture2D(noiseTexture, tempPos.xz * baseNoiseScale + uTime * baseNoiseSpeed).r;
        baseNoise *= baseNoiseStrength;

        noise += baseNoise / (baseNoiseStrength + 1.0);

        vec3 N = vec3(noise) * vec3(0.0, 0.0, 1.0);
        float noiseHeight = 20.;
        pos += N * noiseHeight;
        vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectionPosition = projectionMatrix * viewPosition;
        vWorldPosition = modelPosition.xyz;
        vNoise = noise;
        gl_Position = projectionPosition;
        ${THREE.ShaderChunk.logdepthbuf_vertex}
      }
    `,
    fragmentShader: `\
      ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
      #include <common>
      #include <packing>
      
      uniform float uTime;
      uniform sampler2D noiseTexture;

      uniform sampler2D tDepth;
      uniform sampler2D tMask;
      uniform float cameraNear;
      uniform float cameraFar;
      uniform vec2 resolution;

      varying vec3 vWorldPosition;
      varying float vNoise;

      float getDepth(const in vec2 screenPosition) {
        return unpackRGBAToDepth(texture2D(tDepth, screenPosition));
      }
      float getViewZ(const in float depth) {
        return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
      }  
      float getDepthFade(float fragmentLinearEyeDepth, float linearEyeDepth, float depthScale, float depthFalloff) {
        return pow(saturate(1. - (fragmentLinearEyeDepth - linearEyeDepth) / depthScale), depthFalloff);
      }
      float readDepth( sampler2D depthSampler, vec2 coord ) {
        float fragCoordZ = texture2D( depthSampler, coord ).x;
        float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
        return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
      }

      void main() {
        float cloudWidth = 2500.;
        cloudWidth *= 0.5;
        float distanceLerp = clamp(distance(vWorldPosition.xz, vec2(0., 0.)) / cloudWidth, 0.0, 1.0);
        vec3 cloudValleyColor = mix(vec3(0.310, 0.585, 0.970), vec3(1.0, 1.0, 1.0), distanceLerp);
        vec3 cloudPeakColor = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 1.0, 1.0), distanceLerp);
        
        gl_FragColor.rgb = mix(cloudValleyColor, cloudPeakColor, vNoise);

        vec2 screenUV = gl_FragCoord.xy / resolution;

        float fragmentLinearEyeDepth = getViewZ(gl_FragCoord.z);
        float linearEyeDepth = getViewZ(getDepth(screenUV));

        float depthScale = 25.;
        float depthFalloff = 3.;
        float sceneDepth = getDepthFade(fragmentLinearEyeDepth, linearEyeDepth, depthScale, depthFalloff);

        float mask = readDepth(tMask, screenUV);

        gl_FragColor.a = mask < 1. ? 1. - sceneDepth : 1.0;
        ${THREE.ShaderChunk.logdepthbuf_fragment}
      }
    `,
    side: THREE.DoubleSide,
    transparent: true,
  });
  return material;
};

export default _createCloudMaterial;