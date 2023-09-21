import { getShadowMask } from "../shadow/getShadowMask.js";
import { getSkyFogColor } from "../fog/fog.js";
import { getShadow } from "../shadow/getShadow.js";


const bushVertexShader = `\   
  // attribute float scales;
  attribute vec3 positions;
  attribute vec3 slopes;
  attribute vec2 uv2;
  

  varying vec2 vUv;
  varying vec2 vUv2;
  varying vec3 vPos;
  varying vec3 vSlopes;
  varying vec3 vNormal;

  varying vec3 vWorldPosition;

  varying vec3 vViewDirection;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;
  varying float vDepth;

  uniform float uTime;
  uniform vec3 eye;
  uniform vec3 playerPosition;

  uniform sampler2D noiseTexture;
  uniform sampler2D waveNoiseTexture;

  #include <common>
  #include <shadowmap_pars_vertex>

  void main() {  
    
    // varying
    vUv = uv;
    vUv2 = uv2;
    vPos = position;
    vSlopes = slopes;
    vNormal = normal;
    // vViewDirection = normalize(positions.xyz - eye);
    // vWorldNormal = normalize(mat3(modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz) * slopes);
    // vViewNormal = normalize(normalMatrix * slopes);

    vec3 pos = position.xyz;

    vec2 textureUv = vec2(mod(positions.x, 100.), mod(positions.z, 100.));
    // scale
    float scaleNoiseUvScale = 1.0;
    vec2 scaleNoiseUv = vec2(
      textureUv.x * scaleNoiseUvScale,
      textureUv.y * scaleNoiseUvScale
    );
    float scaleNoise = texture2D(noiseTexture, scaleNoiseUv).r;
    scaleNoise = (1. + scaleNoise);
    pos *= scaleNoise;
    
    pos += positions;

    vec3 pushWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    float dis = distance(playerPosition, pushWorldPosition);
    float pushRadius = 0.25;
    float pushStrength = 0.3;
    float pushingLerp = 1.0;
    float pushDown = clamp((1. - dis + pushRadius) * pushingLerp * pushStrength, 0.0, 1.0);
    vec3 direction = normalize(pushWorldPosition - playerPosition);
    direction.y *= 1.0;
    pos.xyz += direction * pushDown;

    // wind
    vec3 windWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    float windNoiseUvScale = 0.1;
    float windNoiseUvSpeed = 0.03;
    vec2 windNoiseUv = vec2(
      windWorldPosition.x * windNoiseUvScale + uTime * windNoiseUvSpeed,
      windWorldPosition.y * windNoiseUvScale + uTime * windNoiseUvSpeed
    );
    float windNoise = texture2D(noiseTexture, windNoiseUv).r - 0.5;
    float windNoiseScale = 0.4;
    pos += sin(windNoise * vec3(windNoiseScale, 0., windNoiseScale));

    // wave
    float waveNoiseUvScale = 10.;
    float waveNoiseUvSpeed = 0.05;
    vec2 waveNoiseUv = vec2(
      textureUv.x * waveNoiseUvScale + (uTime + positions.x * 0.1) * waveNoiseUvSpeed,
      textureUv.y * waveNoiseUvScale
    );
    float waveNoise = texture2D(waveNoiseTexture, waveNoiseUv).r;
    float waveNoiseScale = 0.25;
    pos.x -= sin(waveNoise) * position.y * waveNoiseScale;
    

    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);

    vec3 transformedNormal = normalize(slopes);
    vec3 transformed = position + positions;
    vec4 worldPosition = modelPosition;
    #include <shadowmap_vertex>

    vWorldPosition = modelPosition.xyz;

    vec4 viewPosition = viewMatrix * modelPosition;
    vDepth = - viewPosition.z;
    vec4 projectionPosition = projectionMatrix * viewPosition;
    gl_Position = projectionPosition;
    
  }
`;
const bushFragmentShader = `\
  uniform sampler2D bushTexture;

  uniform bool isDay;
  uniform vec3 sunPosition;
  uniform vec3 playerPosition;
  uniform vec3 eye;

  uniform vec3 uColorDayCycleLow;
  uniform vec3 uColorDayCycleHigh;
  uniform vec3 uColorNightLow;
  uniform vec3 uColorNightHigh;
  uniform float uDawnAngleAmplitude;
  uniform float uDawnElevationAmplitude;
  uniform vec3 uColorDawn;
  uniform vec3 uColorSun;
  uniform float uDayCycleProgress;
  uniform float uSunAmplitude;
  uniform float uSunMultiplier;

  varying vec2 vUv;
  varying vec2 vUv2;
  varying vec3 vPos;
  varying vec3 vSlopes;
  varying vec3 vNormal;

  varying vec3 vViewDirection;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;

  varying vec3 vWorldPosition;
  varying float vDepth;

  ${getSkyFogColor}

  float getSunReflection(vec3 viewDirection, vec3 worldNormal, vec3 viewNormal) {
    float uFresnelOffset = 0.3;
    float uFresnelScale = 0.5;
    float uFresnelPower = 2.0;

    float sunMoon = isDay ? 1. : -1.;
    vec3 sunViewReflection = reflect(sunPosition * sunMoon, viewNormal);
    float sunViewStrength = max(0.2, dot(sunViewReflection, viewDirection));

    float fresnel = uFresnelOffset + uFresnelScale * (1.0 + dot(viewDirection, worldNormal));
    float sunReflection = fresnel * sunViewStrength;
    sunReflection = pow(sunReflection, uFresnelPower);

    return sunReflection;
  }

  vec3 getSunReflectionColor(vec3 baseColor, float sunReflection) {
    vec3 lightColor = isDay ? vec3(1.0, 1.0, 1.0) : vec3(0.7, 0.7, 0.7);
    return mix(baseColor, lightColor, clamp(sunReflection, 0.0, 1.0));
  }

  #include <common>
  #include <packing>
  uniform bool receiveShadow;
  #include <shadowmap_pars_fragment>
  ${getShadowMask}
  ${getShadow}

  void main() {
    vec4 bush = texture2D(bushTexture, vUv);

    float minClip = 0.5;
    float maxClip = 0.9;
    float clipDistance = 100.;
    float clipThreshold = distance(eye, vWorldPosition) / clipDistance;
    clipThreshold = clamp(clipThreshold, minClip, maxClip);

    if (bush.a < 1. - clipThreshold) {
      discard;
    }
    vec3 bushColor = vec3(0.067, 0.280, 0.060);


    vec3 lightPos = isDay ? sunPosition : -sunPosition;
    vec3 lightDir = normalize(lightPos);
    

    vec3 surfaceNormal = normalize(vNormal);
    float lambertTerm = dot(surfaceNormal, lightDir);
    float specularPow = 5.0;
    vec3 E = normalize(eye - vWorldPosition);
    vec3 R = reflect(lightDir, surfaceNormal);
    float specularTerm = pow(max(dot(R, E), 0.0), specularPow);
    float EDotN = clamp(dot(E, surfaceNormal), 0.0, 1.0);

    // bushColor = mix(bushColor * 1.3, bushColor, EDotN);


    vec3 ambientColor = vec3(0.3, 0.3, 0.3);
    vec3 lightColor = vec3(1.0);
    float diffuseStrength = 2.0;
    vec3 diffuse = lightColor * vec3(lambertTerm * diffuseStrength);
    float specularStrength = 0.5;
    vec3 specular = lightColor * vec3(specularTerm * specularStrength);

    // ao 
    vec3 aoDarkColor = bushColor.rgb * 0.1;
    vec3 aoBrightColor = bushColor.rgb * 1.0;
    float aoPower = 2.0;
    bushColor.rgb = mix(aoBrightColor, aoDarkColor, pow(1.0 - vUv2.y, 1.0) * aoPower);

    vec3 finalLight = smoothstep(0.9, 1.1, ambientColor + diffuse + specular);
    finalLight = clamp(finalLight, 0.7, 1.0);
    bushColor.rgb *= finalLight;

    bushColor.rgb += ambientColor * 0.5;
    
    // backSSS
    vec3 eyeDirection = normalize(eye - vWorldPosition);
    vec3 backLightDir = normalize(lightPos);
    float backSSS = clamp(dot(eyeDirection, -backLightDir), 0.0, 1.0);
    float backSSSReducer = smoothstep(0.8, 1.0, backSSS) * 0.5;
    backSSS = clamp(dot(backSSS, backSSSReducer), 0.0, 1.0);
    backSSS = isDay ? backSSS : backSSS * 0.8;
    bushColor.rgb += vec3(backSSS);


    // sunShade
    float sunShade = dot(vSlopes, - sunPosition);
    sunShade = sunShade * 0.5 + 0.5;
    vec3 shadeColor = bushColor.rgb * vec3(0.0, 0.5, 0.7);
    bushColor.rgb = mix(bushColor.rgb, shadeColor, sunShade);

    // float sunReflection = getSunReflection(vViewDirection, vWorldNormal, vViewNormal);
    // bushColor.rgb = getSunReflectionColor(bushColor.rgb, sunReflection);



    // skydome fog
    float skyRatioOfTree = -0.015;
    vec3 pos = vWorldPosition;
    pos.x -= playerPosition.x;
    pos.z -= playerPosition.z;
    vec3 normalizedPosition = normalize(pos);

    vec3 finalColor = getSkyFogColor(
      bushColor.rgb, 
      vDepth, 
      skyRatioOfTree, 
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
    // gl_FragColor = vec4(finalColor, 1.0);

    // shadow
    float shadowMask = (1.0 - getShadowMask(vWorldPosition, eye));
    finalColor = getShadow(finalColor, isDay, sunPosition, shadowMask);
    gl_FragColor = vec4(finalColor, 1.0);
    
  }
`;
export {
  bushVertexShader, bushFragmentShader,
};