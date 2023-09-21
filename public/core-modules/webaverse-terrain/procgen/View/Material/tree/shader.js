import { getSkyFogColor } from "../fog/fog.js";

const treeVertexShader = `\   
  attribute vec3 infos;
  attribute vec3 positions;
  attribute vec3 slopes;
  attribute vec3 color;
  attribute vec2 uv2;
  attribute vec2 uv3;

  varying vec3 vInfos;
  varying vec2 vUv;
  varying vec2 vUv2;
  varying vec2 vUv3;
  varying vec3 vPos;
  varying vec3 vPositions;
  varying vec3 vWorldPosition;
  varying vec3 vSlopes;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying float vDepth;

  uniform float uTime;
  uniform float fadePosition;
  uniform sampler2D noiseTexture;
  uniform sampler2D waveNoiseTexture;
  uniform vec3 eye;
  uniform vec3 playerPosition;
  
  vec4 vec3ToQuat(vec3 rotation) {
    vec3 halfAngles = rotation * 0.5;
    vec3 sinAngles = sin(halfAngles);
    vec3 cosAngles = cos(halfAngles);

    vec4 quat;
    quat.x = sinAngles.x * cosAngles.y * cosAngles.z - cosAngles.x * sinAngles.y * sinAngles.z;
    quat.y = cosAngles.x * sinAngles.y * cosAngles.z + sinAngles.x * cosAngles.y * sinAngles.z;
    quat.z = cosAngles.x * cosAngles.y * sinAngles.z - sinAngles.x * sinAngles.y * cosAngles.z;
    quat.w = cosAngles.x * cosAngles.y * cosAngles.z + sinAngles.x * sinAngles.y * sinAngles.z;

    return quat;
  }
  
  vec3 rotateVertexPosition(vec3 position, vec4 q) { 
    return position + 2.0 * cross(q.xyz, cross(q.xyz, position) + q.w * position);
  }

  #include <common>
  // #include <shadowmap_pars_vertex>

  void main() {  
    vec3 pos = position;

    float treeScale = infos.x;
    pos *= treeScale;

    vec4 q = vec3ToQuat(vec3(0.0, infos.y, 0.0));
    pos = rotateVertexPosition(pos, q);
    
    pos += positions;

    // varying
    vUv = uv;
    vUv2 = uv2;
    vUv3 = uv3;
    vPos = position;
    vPositions = positions;
    vNormal = normal;
    vNormal = rotateVertexPosition(vNormal, q);
    vColor = color;
    vSlopes = slopes;
    vInfos = infos;

    bool isLeaf = color.r > 0.5;
    if (isLeaf) {
      vec3 pushWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
      float dis = distance(playerPosition, pushWorldPosition);
      float pushRadius = 0.5;
      float pushStrength = 0.6;
      float pushingLerp = 1.0;
      float pushDown = clamp((1. - dis + pushRadius) * pushingLerp * pushStrength, 0.0, 1.0);
      vec3 direction = normalize(pushWorldPosition - playerPosition);
      direction.y *= 1.0;
      pos.xyz += direction * pushDown;

      vec3 windPos = (modelMatrix * vec4(pos, 1.0)).xyz;
      // wind
      float windNoiseUvScale = 0.1;
      float windNoiseUvSpeed = 0.03;
      vec2 windNoiseUv = vec2(
        windPos.x * windNoiseUvScale + uTime * windNoiseUvSpeed,
        windPos.z * windNoiseUvScale + uTime * windNoiseUvSpeed
      );
      float windNoise = texture2D(noiseTexture, windNoiseUv).r - 0.5;
      float windNoiseScale = 0.8;
      pos += sin(windNoise * vec3(windNoiseScale, 0., windNoiseScale));
    }

    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);

    // vec3 transformedNormal = normalize(slopes);
    // vec3 transformed = position + positions;
    // vec4 worldPosition = modelPosition;
    // #include <shadowmap_vertex>


    vWorldPosition = modelPosition.xyz;
    vec4 viewPosition = viewMatrix * modelPosition;
    vDepth = - viewPosition.z;
    vec4 projectionPosition = projectionMatrix * viewPosition;
    gl_Position = projectionPosition;
    
  }
`;
const treeFragmentShader = `\
  uniform sampler2D leaveTexture1;
  uniform sampler2D leaveTexture2;
  uniform sampler2D leaveTexture3;
  uniform sampler2D leaveTexture4;
  uniform sampler2D barkTexture;
  uniform sampler2D noiseTexture;

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

  varying vec3 vInfos;
  varying vec2 vUv;
  varying vec2 vUv2;
  varying vec3 vPos;
  varying vec3 vPositions;
  varying vec3 vWorldPosition;
  varying vec3 vSlopes;
  varying vec3 vNormal;
  varying vec3 vColor;


  varying float vDepth;

  ${getSkyFogColor}

  // #include <common>
  // #include <packing>
  // uniform bool receiveShadow;
  // #include <shadowmap_pars_fragment>
  
  
  void main() {
    vec4 leaves;
    float minClip = 0.6;
    float maxClip = 0.75;
    float clipDistance = 100.;
    vec3 leafColor;
    vec3 barkColor;

    vec3 lightPos = isDay ? sunPosition : -sunPosition;
    vec3 lightDir = normalize(lightPos);
    

    vec3 surfaceNormal = normalize(vNormal);
    float lambertTerm = dot(surfaceNormal, lightDir);
    float specularPow = 5.0;
    vec3 E = normalize(eye - vWorldPosition);
    vec3 R = reflect(lightDir, surfaceNormal);
    float specularTerm = pow(max(dot(R, E), 0.0), specularPow);
    float EDotN = clamp(dot(E, surfaceNormal), 0.0, 1.0);
    

    if (vInfos.z < 0.5) {
      leaves = texture2D(leaveTexture3, vUv);
      vec3 leafColor1 = vec3(0.067, 0.280, 0.160);
      vec3 leafColor2 = vec3(0.435, 0.4295, 0.0915);
      leafColor = mix(leafColor1, leafColor2, vColor.g);
      leafColor = mix(leafColor * 1.3, leafColor, EDotN);
      barkColor = vec3(0.370, 0.292, 0.1351);
    }
    else if (vInfos.z < 1.5) {
      leaves = texture2D(leaveTexture1, vUv);
      vec3 leafColor1 = vec3(0.067, 0.280, 0.160);
      vec3 leafColor2 = vec3(0.140, 0.300, 0.0180);
      leafColor = mix(leafColor1, leafColor2, vColor.g);
      leafColor = mix(leafColor * 1.3, leafColor, EDotN);
      barkColor = vec3(0.170, 0.092, 0.0051);
    }
    else {
      leaves = texture2D(leaveTexture4, vUv);
      vec3 leafColor1 = vec3(0.0085, 0.170, 0.065);
      vec3 leafColor2 = vec3(0.0515, 0.170, 0.0085);
      leafColor = mix(leafColor1, leafColor2, vColor.g);
      leafColor = mix(leafColor * 1.2, leafColor, EDotN);
      barkColor = vec3(0.270, 0.192, 0.0351);
    }

    bool isLeaf = vColor.r > 0.5;
    vec4 treeColor;

    float clipThreshold = distance(eye, vWorldPosition) / clipDistance;
    clipThreshold = clamp(clipThreshold, minClip, maxClip);

    if (isLeaf) {
      treeColor.rgb = leafColor;
      treeColor.a = leaves.a;
    }
    else {
      vec3 bark = texture2D(barkTexture, vPos.xy * 0.5).rgb;
      treeColor.rgb = mix(bark, bark * barkColor, 0.5);
      treeColor.a = 1.;
    }

    vec3 ambientColor = vec3(0.3, 0.3, 0.3);
    vec3 lightColor = vec3(1.0);
    float diffuseStrength = 2.0;
    vec3 diffuse = lightColor * vec3(lambertTerm * diffuseStrength);
    float specularStrength = 0.5;
    vec3 specular = lightColor * vec3(specularTerm * specularStrength);

    // ao 
    vec3 aoDarkColor = treeColor.rgb * 0.1;
    vec3 aoBrightColor = treeColor.rgb * 1.0;
    float aoPower = 2.0;
    treeColor.rgb = mix(aoBrightColor, aoDarkColor, pow(1.0 - vUv2.y, 1.0) * aoPower);

    vec3 finalLight = smoothstep(0.9, 1.1, ambientColor + diffuse + specular);
    finalLight = clamp(finalLight, 0.7, 1.0);
    treeColor.rgb *= finalLight;

    treeColor.rgb += ambientColor * 0.5;

    if (isLeaf) {
      // backSSS
      vec3 eyeDirection = normalize(eye - vWorldPosition);
      vec3 backLightDir = normalize(lightPos);
      float backSSS = clamp(dot(eyeDirection, -backLightDir), 0.0, 1.0);
      float backSSSReducer = smoothstep(0.8, 1.0, backSSS) * 0.5;
      backSSS = clamp(dot(backSSS, backSSSReducer), 0.0, 1.0);
      backSSS = isDay ? backSSS : backSSS * 0.8;
      treeColor.rgb += vec3(backSSS);

      if (treeColor.a < 1. - clipThreshold) {
        discard;
      }
    }
    

    // sunShade
    float sunShade = dot(vSlopes, - sunPosition);
    sunShade = sunShade * 0.5 + 0.5;
    vec3 shadeColor = treeColor.rgb * vec3(0.0, 0.5, 0.7);
    treeColor.rgb = mix(treeColor.rgb, shadeColor, sunShade);

    
    


    // skydome fog
    float skyRatioOfTree = -0.015;
    vec3 pos = vWorldPosition;
    pos.x -= playerPosition.x;
    pos.z -= playerPosition.z;
    vec3 normalizedPosition = normalize(pos);

    vec3 col = getSkyFogColor(
      treeColor.rgb, 
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

    gl_FragColor = vec4(col, 1.0);

    

    // gl_FragColor = vec4(vUv2, 0., 1.0);

    // // shadow
    // vec3 shadowColor = gl_FragColor.rgb * 0.3;
    // float shadowPower = 0.5;
    // gl_FragColor = vec4(mix(gl_FragColor.rgb, shadowColor, (1.0 - getShadowMask(vWorldPosition, eye) ) * shadowPower), 1.0);
  }
`;
export {
  treeVertexShader, treeFragmentShader,
};