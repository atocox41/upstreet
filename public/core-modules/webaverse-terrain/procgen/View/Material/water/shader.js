import { getSkyFogColor } from "../fog/fog.js";

const waterVertexShader = `\   
  uniform mat4 textureMatrix;

  varying vec4 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying float vDepth;

  void main() {
    vec3 pos = position;
    vPos = position;
    vUv = textureMatrix * vec4( pos, 1.0 );
    
    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vDepth = - viewPosition.z;
    vec4 projectionPosition = projectionMatrix * viewPosition;
    vWorldPosition = modelPosition.xyz;
    gl_Position = projectionPosition;
  }
`;
const waterFragmentShader = `\
  #include <common>
  #include <packing>

  uniform mat4 textureMatrix;
  uniform vec3 eye;
  uniform sampler2D mirror;

  uniform vec3 uColorDayCycleLow;
  uniform vec3 uColorDayCycleHigh;
  uniform vec3 uColorNightLow;
  uniform vec3 uColorNightHigh;
  uniform float uDawnAngleAmplitude;
  uniform float uDawnElevationAmplitude;
  uniform vec3 uColorDawn;
  uniform vec3 uColorSun;
  uniform bool isDay;
  uniform float uDayCycleProgress;
  uniform float uSunAmplitude;
  uniform float uSunMultiplier;

  uniform float uTime;
  uniform sampler2D tDepth;
  uniform sampler2D tMask;
  uniform float cameraNear;
  uniform float cameraFar;
  uniform vec2 resolution;
  uniform vec3 playerPosition;

  uniform sampler2D waterNormalTexture;

  uniform vec3 sunPosition;
  uniform vec3 lightColor;
  uniform float lightIntensity;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec4 vUv;
  varying vec3 vPos;
  varying float vDepth;

  // cosine gradient 
  const float TAU = 2. * 3.14159265;
  const vec4 phases = vec4(0.28, 0.50, 0.07, 0);
  const vec4 amplitudes = vec4(4.02, 0.34, 0.65, 0);
  const vec4 frequencies = vec4(0.00, 0.48, 0.08, 0);
  const vec4 offsets = vec4(0.00, 0.25, 0.00, 0);
  vec4 cosGradient(float x, vec4 phase, vec4 amp, vec4 freq, vec4 offset){
    phase *= TAU;
    x *= TAU;
    return vec4(
      offset.r + amp.r * 0.5 * cos(x * freq.r + phase.r) + 0.5,
      offset.g + amp.g * 0.5 * cos(x * freq.g + phase.g) + 0.5,
      offset.b + amp.b * 0.5 * cos(x * freq.b + phase.b) + 0.5,
      offset.a + amp.a * 0.5 * cos(x * freq.a + phase.a) + 0.5
    );
  }

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

  vec4 getNoise(vec2 uv, float time) {
    vec2 uv0 = ( uv / 103.0 ) + vec2(time / 17.0, time / 29.0);
    vec2 uv1 = uv / 107.0-vec2( time / -19.0, time / 31.0 );
    vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );
    vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );
    vec4 noise = texture2D( waterNormalTexture, uv0 ) +
      texture2D( waterNormalTexture, uv1 ) +
      texture2D( waterNormalTexture, uv2 ) +
      texture2D( waterNormalTexture, uv3 );
    return noise * 0.5 - 1.0;
  }

  void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {
    vec3 sunDirection = isDay ? sunPosition : - sunPosition;
    
    vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );
    float direction = max( 0.0, dot( eyeDirection, reflection ) );
    specularColor += pow( direction, shiny ) * lightColor * spec;
    diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * lightColor * diffuse;
  }

  ${getSkyFogColor}

  void main() {
    vec2 screenUV = gl_FragCoord.xy / resolution;
    float fragmentLinearEyeDepth = getViewZ(gl_FragCoord.z);
    float linearEyeDepth = getViewZ(getDepth(screenUV));

    float disToCamera = distance(vWorldPosition, eye);
    float disToCameraThrehold = 100.;
    float waterOpColorLerp = clamp(1. - disToCamera / disToCameraThrehold, 0.01, 1.0);

    float opDepthScale = 15.;
    float opDepthFalloff = 3.;
    float opDepth = getDepthFade(fragmentLinearEyeDepth, linearEyeDepth, opDepthScale, opDepthFalloff);
    float mask = readDepth(tMask, screenUV);
    float op = mask < 1. ? 1. - opDepth : 1.0;
    // op = clamp(op, 0.7, 1.0);
    op = mix(1.0, op, waterOpColorLerp);

    float colorDepthScale = 50.;
    float colorDepthFalloff = 3.;
    float colorDepth = getDepthFade(fragmentLinearEyeDepth, linearEyeDepth, colorDepthScale, colorDepthFalloff);

    float colorLerp = mask < 1. ? colorDepth : 0.0;
    colorLerp = mix(0.0, colorLerp, waterOpColorLerp);
    vec4 waterColor = cosGradient(colorLerp, phases, amplitudes, frequencies, offsets);
    waterColor = clamp(waterColor, vec4(0.), vec4(1.));

    vec4 noise = getNoise(vWorldPosition.xz * 5., uTime);
    vec3 surfaceNormal = normalize(noise.xzy * vec3(1.5, 1.0, 1.5));

    vec3 diffuseLight = vec3(0.0);
    vec3 specularLight = vec3(0.0);
    vec3 worldToEye = eye - vWorldPosition.xyz;
    vec3 eyeDirection = normalize(worldToEye);
    sunLight(surfaceNormal, eyeDirection, 100.0, 5.0, 0.5, diffuseLight, specularLight);
    float distance = length(worldToEye);
    float distortionScale = 3.0;
    vec2 distortion = surfaceNormal.xz * (0.001 + 1.0 / distance) * distortionScale;
    vec3 reflectionSample = vec3(texture2D(mirror, vUv.xy / vUv.w + distortion));
    float theta = max(dot(eyeDirection, surfaceNormal), 0.0);
    float rf0 = 0.3;
    float reflectance = rf0 + (1.0 - rf0) * pow((1.0 - theta), 5.0);

    
    vec3 scatter = max(0.0, dot(surfaceNormal, eyeDirection)) * waterColor.rgb;
    vec3 albedo = mix((lightColor * diffuseLight * 0.3 + scatter), (vec3(0.1) + reflectionSample * 0.9 + reflectionSample * specularLight), reflectance);
    vec3 outgoingLight = albedo;
    outgoingLight = mix(outgoingLight, waterColor.rgb, 0.8);
    gl_FragColor = vec4(outgoingLight, op);

    // sunShade
    float sunShade = dot(vec3(0.0, 1.0, 0.0), - sunPosition);
    sunShade = sunShade * 0.5 + 0.5;
    vec3 shadeColor = gl_FragColor.rgb * vec3(0.0, 0.5, 0.7);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, shadeColor, sunShade);


    // skydome fog
    float skyRatioOfTerrain = -0.015;
    vec3 pos = vWorldPosition;
    pos.x -= playerPosition.x;
    pos.z -= playerPosition.z;
    vec3 normalizedPosition = normalize(pos);

    gl_FragColor.rgb = getSkyFogColor(
      gl_FragColor.rgb, 
      vDepth, 
      skyRatioOfTerrain, 
      uColorDayCycleLow,
      uColorDayCycleHigh,
      uColorNightLow,
      uColorNightHigh,
      uDayCycleProgress,
      sunPosition,
      normalizedPosition,
      uDawnAngleAmplitude,
      uDawnElevationAmplitude,
      uColorDawn,
      uSunAmplitude,
      uSunMultiplier,
      uColorSun
    );
  }
`;
export {
  waterVertexShader, waterFragmentShader,
};