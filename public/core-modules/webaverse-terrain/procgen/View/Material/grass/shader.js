import { getShadowMask } from "../shadow/getShadowMask.js";
import { getShadow } from "../shadow/getShadow.js";

const grassVertexShader = `\   
  // attribute float scales;
  attribute vec3 positions;
  attribute vec3 slopes;

  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vSlopes;

  varying vec3 vWorldPosition;

  varying vec3 vViewDirection;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;

  varying float vWave;

  uniform float uTime;
  uniform float fadePosition;
  uniform sampler2D noiseTexture;
  uniform sampler2D waveNoiseTexture;
  uniform vec3 eye;
  uniform vec3 playerPosition;

  #include <common>
  #include <shadowmap_pars_vertex>

  void main() {  

    // rot grass Y axis
    float rotNoiseUvScale = 0.1;
    vec2 rotNoiseUv = vec2(
      positions.x * rotNoiseUvScale,
      positions.z * rotNoiseUvScale
    );
    float rotNoise = texture2D(noiseTexture, rotNoiseUv).r;
    float rotDegree = rotNoise * PI;
    mat3 rotY = mat3(
      cos(rotDegree), 0.0, -sin(rotDegree), 
      0.0, 1.0, 0.0, 
      sin(rotDegree), 0.0, cos(rotDegree)
    );

    // rot grass based on ground slope
    vec3 up = vec3(0.0, 1.0, 0.0); // define the up vector
    vec3 axis = cross(slopes, up); // calculate the axis to rotate around
    float angle = acos(dot(slopes, up)); // calculate the angle between the ground normal and the up vector
    float c = cos(angle);
    float s = sin(angle);
    mat3 rotationMatrix = mat3(
      vec3(c + axis.x*axis.x*(1.0-c), axis.x*axis.y*(1.0-c) - axis.z*s, axis.x*axis.z*(1.0-c) + axis.y*s),
      vec3(axis.y*axis.x*(1.0-c) + axis.z*s, c + axis.y*axis.y*(1.0-c), axis.y*axis.z*(1.0-c) - axis.x*s),
      vec3(axis.z*axis.x*(1.0-c) - axis.y*s, axis.z*axis.y*(1.0-c) + axis.x*s, c + axis.z*axis.z*(1.0-c))
    );

    vec3 rotatedPosition = rotationMatrix * rotY * position ;
    
    
    // varying
    vUv = uv;
    vPos = position;
    vSlopes = slopes;
    vViewDirection = normalize(positions.xyz - eye);
    vWorldNormal = normalize(mat3(modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz) * slopes);
    vViewNormal = normalize(normalMatrix * slopes);


    vec3 pos = rotatedPosition.xyz;

    vec2 textureUv = vec2(mod(positions.x, 100.), mod(positions.z, 100.));
    // scale
    float scaleNoiseUvScale = 0.1;
    vec2 scaleNoiseUv = vec2(
      textureUv.x * scaleNoiseUvScale,
      textureUv.y * scaleNoiseUvScale
    );
    float scaleNoise = texture2D(noiseTexture, scaleNoiseUv).r;
    scaleNoise = (0.5 + scaleNoise * 2.0) * 0.24;
    pos *= scaleNoise;
    pos.y *= 1.2;
    
    pos += positions;

    // fade in fade out grass
    pos.y -= fadePosition;
    pos.y -= 0.15;

    
    // push the grasses around the player 
    vec3 pushWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    float dis = distance(playerPosition, pushWorldPosition);
    float pushRadius = 0.5;
    float pushStrength = 0.6;
    float pushingLerp = 1.0;
    float pushDown = clamp((1. - dis + pushRadius) * pushingLerp * pushStrength, 0.0, 1.0);
    vec3 direction = normalize(positions - playerPosition);
    direction.y *= 1.0;
    pos.xyz += direction * (1.0 - uv.y) * pushDown;

   
    float movingLerp = smoothstep(0.1, 2.0, 1.0 - uv.y);
    // wind
    float windNoiseUvScale = 0.1;
    float windNoiseUvSpeed = 0.03;
    vec2 windNoiseUv = vec2(
      textureUv.x * windNoiseUvScale + uTime * windNoiseUvSpeed,
      textureUv.y * windNoiseUvScale + uTime * windNoiseUvSpeed
    );
    float windNoise = texture2D(noiseTexture, windNoiseUv).r - 0.5;
    float windNoiseScale = 1.4;
    pos += sin(windNoise * vec3(windNoiseScale, 0., windNoiseScale)) * movingLerp;

    // wave
    float waveNoiseUvScale = 10.;
    float waveNoiseUvSpeed = 0.05;
    vec2 waveNoiseUv = vec2(
      textureUv.x * waveNoiseUvScale + (uTime + positions.x * 0.1) * waveNoiseUvSpeed,
      textureUv.y * waveNoiseUvScale
    );
    float waveNoise = texture2D(waveNoiseTexture, waveNoiseUv).r;
    float waveNoiseScale = 2.0;
    pos.xz -= sin(waveNoise * waveNoiseScale) * movingLerp ;
    vWave = waveNoise;


    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);

    vec3 transformedNormal = normalize(slopes);
    vec3 transformed = position + positions;
    vec4 worldPosition = modelPosition;
    #include <shadowmap_vertex>

    vWorldPosition = modelPosition.xyz;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;
    gl_Position = projectionPosition;
    
  }
`;
const grassFragmentShader = `\
  uniform bool isDay;
  uniform vec3 sunPosition;

  uniform vec3 eye;

  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vSlopes;

  varying float vWave;

  varying vec3 vViewDirection;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;

  varying vec3 vWorldPosition;

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
    float colorLerp = smoothstep(0.2, 1.8, 1. - vUv.y);
    vec3 grassColor = mix(vec3(0.373, 0.630, 0.00630), vec3(0.603, 0.720, 0.0144), colorLerp);

    
    float sunShade = dot(vSlopes, - sunPosition);
    sunShade = sunShade * 0.5 + 0.5;

    vec3 shadeColor = grassColor.rgb * vec3(0.0, 0.5, 0.7);
    grassColor.rgb = mix(grassColor.rgb, shadeColor, sunShade);

    float sunReflection = getSunReflection(vViewDirection, vWorldNormal, vViewNormal);
    grassColor.rgb = getSunReflectionColor(grassColor.rgb, sunReflection);

    float waveColorScale = 0.3;
    grassColor.rgb += vec3(clamp(vWave - 0.3, 0.0, 1.0) * waveColorScale) * colorLerp;
    
    // gl_FragColor = vec4(grassColor, 1.0);

    // shadow
    float shadowMask = (1.0 - getShadowMask(vWorldPosition, eye));
    grassColor = getShadow(grassColor, isDay, sunPosition, shadowMask);
    gl_FragColor = vec4(grassColor, 1.0);
    
  }
`;
export {
  grassVertexShader, grassFragmentShader,
};