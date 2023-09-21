import { getSkyFogColor } from "../fog/fog.js";
import { getShadowMask } from "../shadow/getShadowMask.js";
import { getShadow } from "../shadow/getShadow.js";

const terrainVertexShader = `\   
  attribute vec4 weight;

  uniform sampler2D uTexture;
  uniform vec3 eye;
  
  varying vec3 vWorldPosition;
  varying vec3 vPos;

  varying float vDepth;
  varying vec3 vNormal;

  varying vec3 vViewDirection;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;

  varying vec4 vWeight;

  #include <common>
  #include <shadowmap_pars_vertex>
  
  void main() {

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    vec4 terrainData = texture2D(uTexture, uv);
    vec3 transformedNormal = normalize(terrainData.rgb);
    vNormal = transformedNormal;
    vPos = position;
    vWeight = weight;

    vec3 transformed = position;
    vec4 worldPosition = modelPosition;
    #include <shadowmap_vertex>

    
    vViewDirection = normalize(modelPosition.xyz - eye);
    vWorldNormal = normalize(mat3(modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz) * vNormal);
    vViewNormal = normalize(normalMatrix * vNormal);

    vWorldPosition = modelPosition.xyz;
    vec4 viewPosition = viewMatrix * modelPosition;
    vDepth = - viewPosition.z;
    vec4 projectionPosition = projectionMatrix * viewPosition;
    gl_Position = projectionPosition;
    
  }
`;
const terrainFragmentShader = `\
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vPos;
  
  varying vec4 vWeight;
  varying float vDepth;

  varying vec3 vViewDirection;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;
  
  uniform vec3 uColorDayCycleLow;
  uniform vec3 uColorDayCycleHigh;
  uniform vec3 uColorNightLow;
  uniform vec3 uColorNightHigh;
  uniform float uDawnAngleAmplitude;
  uniform float uDawnElevationAmplitude;
  uniform vec3 uColorDawn;
  uniform vec3 uColorSun;
  uniform vec3 sunPosition;
  uniform bool isDay;
  uniform float uDayCycleProgress;
  uniform float uSunAmplitude;
  uniform float uSunMultiplier;

  uniform vec3 playerPosition;
  uniform vec3 eye;

  uniform sampler2D terrainRockTexture;
  uniform sampler2D terrainDirtTexture;
  uniform sampler2D terrainSandTexture;
  uniform sampler2D terrainGrassTexture;
  uniform sampler2D terrainBrickTexture;
  uniform sampler2D terrainBrickNormalTexture;
  
  uniform sampler2D noiseTexture;

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

  ${getSkyFogColor}

  vec4 blendTwoTextures(vec4 texture1, float a1, vec4 texture2, float a2) {
    float depth = 0.9;
    float ma = max(texture1.a + a1, texture2.a + a2) - depth;

    float b1 = max(texture1.a + a1 - ma, 0.);
    float b2 = max(texture2.a + a2 - ma, 0.);

    return (texture1 * b1 + texture2 * b2) / (b1 + b2);
  }

  vec4 blendThreeTextures(vec4 texture1, float a1, vec4 texture2, float a2, vec4 texture3, float a3) {
    vec4 textures[3];
    textures[0] = texture1;
    textures[1] = texture2;
    textures[2] = texture3;

    float alphas[3];
    alphas[0] = a1;
    alphas[1] = a2;
    alphas[2] = a3;
    

    float depth = 0.7;
    float max_alpha = 0.0;
    for (int i = 0; i < 3; i++) {
      max_alpha = max(max_alpha, textures[i].a + alphas[i]);
    }
    max_alpha -= depth;

    vec4 result = vec4(0.0);
    float total_weight = 0.0;
    for (int i = 0; i < 3; i++) {
      float weight = max(textures[i].a + alphas[i] - max_alpha, 0.0);
      result += textures[i] * weight;
      total_weight += weight;
    }
    if (total_weight > 0.0) {
      result /= total_weight;
    }
    return result;
  }

  vec4 blendFourTextures(vec4 texture1, float a1, vec4 texture2, float a2, vec4 texture3, float a3, vec4 texture4, float a4) {
    vec4 textures[4];
    textures[0] = texture1;
    textures[1] = texture2;
    textures[2] = texture3;
    textures[3] = texture4;

    float alphas[4];
    alphas[0] = a1;
    alphas[1] = a2;
    alphas[2] = a3;
    alphas[3] = a4;

    float depth = 0.35;
    float max_alpha = 0.0;
    for (int i = 0; i < 4; i++) {
        max_alpha = max(max_alpha, textures[i].a + alphas[i]);
    }
    max_alpha -= depth;

    vec4 result = vec4(0.0);
    float total_weight = 0.0;
    for (int i = 0; i < 4; i++) {
        float weight = max(textures[i].a + alphas[i] - max_alpha, 0.0);
        result += textures[i] * weight;
        total_weight += weight;
    }
    if (total_weight > 0.0) {
        result /= total_weight;
    }
    return result;
  }

  #include <common>
  #include <packing>
  uniform bool receiveShadow;
  #include <shadowmap_pars_fragment>
  ${getShadowMask}
  ${getShadow}
  
  void main() {

    //################################################## terrain color ################################################## 
    float noiseScale = 0.01;
    vec3 noisetexture = texture2D(noiseTexture, vWorldPosition.xz * noiseScale).rgb;

    float grassScale = 0.1;
    vec4 grassTexture = texture2D(terrainGrassTexture, vWorldPosition.xz * grassScale);
    grassTexture.rgb = vec3(smoothstep(0.1, 0.5, grassTexture.g)) * vec3(0.373, 0.630, 0.00630);
    
    float dirtScale = 0.3;
    vec4 dirtTexture = texture2D(terrainDirtTexture, vWorldPosition.xz * dirtScale);

    if (vWeight.z > vWeight.x || vWeight.z > vWeight.y || vWeight.z > vWeight.w) {
      vec4 brickTexture = texture2D(terrainBrickTexture, vWorldPosition.xz * 0.2);
      vec3 normalColor = texture2D(terrainBrickNormalTexture, vWorldPosition.xz * 0.2).xyz * 2.0 - 1.0;
      vec3 normal = normalize(normalColor);
      float diffuse = max(dot(normal, sunPosition), 0.0);
      vec3 diffuseColor = vec3(1.0, 1.0, 1.0) * diffuse;
      float specular = pow(max(dot(reflect(-sunPosition, normal), vViewDirection), 0.0), 2.0);
      vec3 specularColor = vec3(1.0, 1.0, 1.0) * specular;
      brickTexture.rgb = mix(brickTexture.rgb, brickTexture.rgb * 1.2, diffuseColor + specularColor);
      // brickTexture.rgb += (diffuseColor + specularColor) * 0.3;

      dirtTexture = blendTwoTextures(dirtTexture, 0.95, brickTexture, 0.05);
    }
    
    float rockScale = 0.1;
    vec4 rocktexture = texture2D(terrainRockTexture, vWorldPosition.xz * rockScale);

    float sandScale = 0.2;
    vec4 sandtexture = texture2D(terrainSandTexture, vWorldPosition.xz * sandScale);
    
    vec4 terrainColor = blendFourTextures(grassTexture, vWeight.x, rocktexture, vWeight.y, dirtTexture, vWeight.z, sandtexture, vWeight.w);

    float sunShade = dot(vNormal, - sunPosition);
    sunShade = sunShade * 0.5 + 0.5;

    vec3 shadeColor = terrainColor.rgb * vec3(0.0, 0.5, 0.7);
    terrainColor.rgb = mix(terrainColor.rgb, shadeColor, sunShade);

    float sunReflection = getSunReflection(vViewDirection, vWorldNormal, vViewNormal);
    terrainColor.rgb = getSunReflectionColor(terrainColor.rgb, sunReflection);

    // skydome fog
    float skyRatioOfTerrain = -0.015;
    vec3 pos = vWorldPosition;
    pos.x -= playerPosition.x;
    pos.z -= playerPosition.z;
    vec3 normalizedPosition = normalize(pos);

    vec3 finalColor = getSkyFogColor(
      terrainColor.rgb, 
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

    // shadow
    float shadowMask = (1.0 - getShadowMask(vWorldPosition, eye));
    finalColor = getShadow(finalColor, isDay, sunPosition, shadowMask);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
export {
  terrainVertexShader, terrainFragmentShader,
};