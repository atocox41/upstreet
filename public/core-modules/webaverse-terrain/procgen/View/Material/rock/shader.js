import { getShadowMask } from "../shadow/getShadowMask.js";
import { getSkyFogColor } from "../fog/fog.js";
import { getShadow } from "../shadow/getShadow.js";

const rockVertexShader = `\   
  // attribute float scales;
  attribute vec3 positions;
  attribute vec3 slopes;
  attribute vec4 infos;

  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vSlopes;

  varying vec3 vWorldPosition;

  varying vec3 vViewDirection;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;

  varying vec3 vNormal;

  varying float vDepth;

  uniform float uTime;
  uniform vec3 eye;

  #include <common>
  #include <shadowmap_pars_vertex>

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

  void main() {  
    // varying
    vUv = uv;
    vNormal = normal;
    vPos = position;
    vSlopes = slopes;
    vViewDirection = normalize(positions.xyz - eye);
    vWorldNormal = normalize(mat3(modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz) * slopes);
    vViewNormal = normalize(normalMatrix * slopes);

    vec3 pos = position;

    // scale
    pos *= infos.xyz;

    vec4 q = vec3ToQuat(vec3(0.0, infos.w, 0.0));
    pos = rotateVertexPosition(pos, q);
    vNormal = rotateVertexPosition(vNormal, q);
  
    pos += positions;

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
const rockFragmentShader = `\
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

  uniform sampler2D rockTexture;


  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vSlopes;

  varying vec3 vViewDirection;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;

  varying vec3 vWorldPosition;

  varying float vDepth;

  varying vec3 vNormal;

  ${getSkyFogColor}


  #include <common>
  #include <packing>
  uniform bool receiveShadow;
  #include <shadowmap_pars_fragment>
  ${getShadowMask}
  ${getShadow}

  void main() {
    float rockScale = 0.3;
    vec3 rockColor = texture2D(rockTexture, vWorldPosition.xz * rockScale).rgb;
    float colorLerp = smoothstep(0.03, 1.5, vPos.y);
    rockColor = mix(vec3(0.373, 0.630, 0.00630), rockColor, colorLerp);

    vec3 lightPos = isDay ? sunPosition : -sunPosition;
    vec3 lightDir = normalize(lightPos);
    

    vec3 surfaceNormal = normalize(vNormal);
    float lambertTerm = dot(surfaceNormal, lightDir);
    float specularPow = 5.0;
    vec3 E = normalize(eye - vWorldPosition);
    vec3 R = reflect(lightDir, surfaceNormal);
    float specularTerm = pow(max(dot(R, E), 0.0), specularPow);
    float EDotN = clamp(dot(E, surfaceNormal), 0.0, 1.0);


    vec3 ambientColor = vec3(0.3, 0.3, 0.3);
    vec3 lightColor = vec3(1.0);
    float diffuseStrength = 2.0;
    vec3 diffuse = lightColor * vec3(lambertTerm * diffuseStrength);
    float specularStrength = 0.5;
    vec3 specular = lightColor * vec3(specularTerm * specularStrength);

    vec3 finalLight = ambientColor + diffuse + specular;
    finalLight = clamp(finalLight, 0.7, 1.0);
    rockColor.rgb *= finalLight;

    // rim
    float rimStrength = 0.3;
    rimStrength *= (isDay ? dot(surfaceNormal, sunPosition) : dot(surfaceNormal, -sunPosition));
    rockColor.rgb += pow(1. - EDotN, 5.0) * rimStrength;

    
    float sunShade = dot(vSlopes, - sunPosition);
    sunShade = sunShade * 0.5 + 0.5;

    vec3 shadeColor = rockColor.rgb * vec3(0.0, 0.5, 0.7);
    rockColor.rgb = mix(rockColor.rgb, shadeColor, sunShade);

    // float sunReflection = getSunReflection(vViewDirection, vWorldNormal, vViewNormal);
    // rockColor.rgb = getSunReflectionColor(rockColor.rgb, sunReflection);

    // skydome fog
    float skyRatioOfTree = -0.015;
    vec3 pos = vWorldPosition;
    pos.x -= playerPosition.x;
    pos.z -= playerPosition.z;
    vec3 normalizedPosition = normalize(pos);

    vec3 finalColor = getSkyFogColor(
      rockColor.rgb, 
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
  rockVertexShader, rockFragmentShader,
};