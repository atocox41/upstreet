const flowerVertexShader = `\   
  // attribute float scales;
  attribute vec3 positions;
  attribute vec3 slopes;

  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vSlopes;

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
  
  #define PI 3.1415926

  void main() {  

    // // rot grass Y axis
    // float rotNoiseUvScale = 1.0;
    // vec2 rotNoiseUv = vec2(
    //   positions.x * rotNoiseUvScale,
    //   positions.z * rotNoiseUvScale
    // );
    // float rotNoise = texture2D(noiseTexture, rotNoiseUv).r;
    // float rotDegree = rotNoise * PI * 2.;
    // mat3 rotY = mat3(
    //   cos(rotDegree), 0.0, -sin(rotDegree), 
    //   0.0, 1.0, 0.0, 
    //   sin(rotDegree), 0.0, cos(rotDegree)
    // );

    // // rot grass based on ground slope
    // vec3 up = vec3(0.0, 1.0, 0.0); // define the up vector
    // vec3 axis = cross(slopes, up); // calculate the axis to rotate around
    // float angle = acos(dot(slopes, up)); // calculate the angle between the ground normal and the up vector
    // float c = cos(angle);
    // float s = sin(angle);
    // mat3 rotationMatrix = mat3(
    //   vec3(c + axis.x*axis.x*(1.0-c), axis.x*axis.y*(1.0-c) - axis.z*s, axis.x*axis.z*(1.0-c) + axis.y*s),
    //   vec3(axis.y*axis.x*(1.0-c) + axis.z*s, c + axis.y*axis.y*(1.0-c), axis.y*axis.z*(1.0-c) - axis.x*s),
    //   vec3(axis.z*axis.x*(1.0-c) - axis.y*s, axis.z*axis.y*(1.0-c) + axis.x*s, c + axis.z*axis.z*(1.0-c))
    // );

    // vec3 rotatedPosition = rotationMatrix * rotY * position ;
    
    
    // varying
    vUv = uv;
    vPos = position;
    vSlopes = slopes;
    vViewDirection = normalize(positions.xyz - eye);
    vWorldNormal = normalize(mat3(modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz) * slopes);
    vViewNormal = normalize(normalMatrix * slopes);


    vec3 pos = position;

    vec2 textureUv = vec2(mod(positions.x, 100.), mod(positions.z, 100.));
    // scale
    float scaleNoiseUvScale = 1.0;
    vec2 scaleNoiseUv = vec2(
      textureUv.x * scaleNoiseUvScale,
      textureUv.y * scaleNoiseUvScale
    );
    float scaleNoise = texture2D(noiseTexture, scaleNoiseUv).r;
    scaleNoise = (1. + scaleNoise) * 0.12;
    pos *= scaleNoise;
    pos.y *= 1.5;
    
    pos += positions;

    // fade in fade out grass
    pos.y -= fadePosition;

    //wind
    float windNoiseUvScale = 0.1;
    float windNoiseUvSpeed = 0.03;
    vec2 windNoiseUv = vec2(
      textureUv.x * windNoiseUvScale + uTime * windNoiseUvSpeed,
      textureUv.y * windNoiseUvScale + uTime * windNoiseUvSpeed
    );
    float windNoise = texture2D(noiseTexture, windNoiseUv).r - 0.5;
    float windNoiseScale = 0.2;
    pos += sin(windNoise * vec3(windNoiseScale, 0., windNoiseScale)) * position.y;

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
    vWave = waveNoise;

    // push the flowers around the player 
    vec3 worldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    float dis = distance(playerPosition, worldPosition);
    float pushRadius = 0.5;
    float pushStrength = 0.25;
    float pushDown = clamp((1. - dis + pushRadius) * position.y * pushStrength, 0.0, 1.0);
    vec3 direction = normalize(worldPosition - playerPosition);
    direction.y *= 0.5;
    pos.xyz += direction * pushDown;

    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;
    gl_Position = projectionPosition;
    
  }
`;
const flowerFragmentShader = `\
  uniform sampler2D uMap;
  uniform bool isDay;
  uniform vec3 sunPosition;

  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vSlopes;

  varying float vWave;

  varying vec3 vViewDirection;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;

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

  void main() {
    vec4 flowerColor = texture2D(uMap, vUv);
    flowerColor.rgb = smoothstep(0.2, 0.5, flowerColor.rgb);
    flowerColor.rgb = clamp(flowerColor.rgb, 0.0, 0.8);

    flowerColor.rgb = mix(vec3(0.373, 0.630, 0.00630), flowerColor.rgb, flowerColor.r);
    
    float sunShade = dot(vSlopes, - sunPosition);
    sunShade = sunShade * 0.5 + 0.5;

    vec3 shadeColor = flowerColor.rgb * vec3(0.0, 0.5, 0.7);
    flowerColor.rgb = mix(flowerColor.rgb, shadeColor, sunShade);

    float sunReflection = getSunReflection(vViewDirection, vWorldNormal, vViewNormal);
    flowerColor.rgb = getSunReflectionColor(flowerColor.rgb, sunReflection);

    gl_FragColor = flowerColor;
    if (gl_FragColor.a < 0.9) {
      discard;
    }
  }
`;
export {
  flowerVertexShader, flowerFragmentShader,
};