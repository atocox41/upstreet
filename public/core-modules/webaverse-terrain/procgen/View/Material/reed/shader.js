const reedVertexShader = `\   
  attribute vec3 positions;
  attribute vec3 slopes;
  attribute vec2 uv2;
  
  varying vec2 vUv;
  varying vec2 vUv2;
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

  #include <common>
  
  void main() {  
    // rot grass Y axis
    float rotNoiseUvScale = 0.5;
    vec2 rotNoiseUv = vec2(
      positions.x * rotNoiseUvScale,
      positions.z * rotNoiseUvScale
    );
    float rotNoise = texture2D(noiseTexture, rotNoiseUv).r;
    float rotDegree = rotNoise * PI * 2.;
    mat3 rotY = mat3(
      cos(rotDegree), 0.0, -sin(rotDegree), 
      0.0, 1.0, 0.0, 
      sin(rotDegree), 0.0, cos(rotDegree)
    );

    vec3 rotatedPosition = position ;

    // varying
    vUv = uv;
    vUv2 = uv2;
    vPos = position;
    vSlopes = slopes;
    vViewDirection = normalize(positions.xyz - eye);
    vWorldNormal = normalize(mat3(modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz) * slopes);
    vViewNormal = normalize(normalMatrix * slopes);
    
    vec3 pos = rotatedPosition;

    vec2 textureUv = vec2(mod(positions.x, 100.), mod(positions.z, 100.));
    // scale
    float scaleNoiseUvScale = 1.0;
    vec2 scaleNoiseUv = vec2(
      textureUv.x * scaleNoiseUvScale,
      textureUv.y * scaleNoiseUvScale
    );
    float scaleNoise = texture2D(noiseTexture, scaleNoiseUv).r;
    scaleNoise = (0.5 + scaleNoise * 2.0) * 0.46;
    pos *= 0.01;
    pos *= scaleNoise;
    // pos.y *= 1.5;
    pos *= rotY;
    
    pos += positions;

    // fade in fade out grass
    pos.y -= fadePosition;

    float waveLerp = position.y * 0.03;

    vec3 pushWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    float dis = distance(playerPosition, pushWorldPosition);
    float pushRadius = 0.25;
    float pushStrength = 0.2;
    float pushingLerp = 1.0;
    float pushDown = clamp((1. - dis + pushRadius) * pushingLerp * pushStrength, 0.0, 1.0);
    vec3 direction = normalize(positions - playerPosition);
    direction.y *= 1.0;
    pos.xyz += direction * pushDown * waveLerp;

    // wind
    vec3 windWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    float windNoiseUvScale = 0.01;
    float windNoiseUvSpeed = 0.03;
    vec2 windNoiseUv = vec2(
      windWorldPosition.x * windNoiseUvScale + uTime * windNoiseUvSpeed,
      windWorldPosition.y * windNoiseUvScale + uTime * windNoiseUvSpeed
    );
    float windNoise = texture2D(noiseTexture, windNoiseUv).r - 0.5;
    float windNoiseScale = 0.2;
    pos += waveLerp * sin(windNoise * vec3(windNoiseScale, 0., windNoiseScale));

    // wave
    float waveNoiseUvScale = 10.;
    float waveNoiseUvSpeed = 0.05;
    vec2 waveNoiseUv = vec2(
      textureUv.x * waveNoiseUvScale + (uTime + positions.x * 0.1) * waveNoiseUvSpeed,
      textureUv.y * waveNoiseUvScale
    );
    float waveNoise = texture2D(waveNoiseTexture, waveNoiseUv).r;
    float waveNoiseScale = 0.1;
    pos.xz -= sin(waveNoise) * waveLerp * waveNoiseScale;
    

    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;
    gl_Position = projectionPosition;
    
  }
`;
const reedFragmentShader = `\
  uniform sampler2D reedTexture;

  uniform bool isDay;
  uniform vec3 sunPosition;

  varying vec2 vUv;
  varying vec2 vUv2;
  varying vec3 vPos;
  varying vec3 vSlopes;
  
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
    vec4 reed = texture2D(reedTexture, vec2(
      vUv.x, 
      vUv.y
    ));
    // reed.rgb = clamp(pow(reed.rgb, vec3(0.5)), 0.0, 1.0);
    if (reed.a < 0.5) {
      discard;
    }
    bool isStem = reed.r < 0.35;
    if (isStem) {
      reed.rgb = vec3(0.275, 0.570, 0.0342);
    }
    else {
      reed.rgb = vec3(0.940, 0.645, 0.0564);
    }

    
    vec3 reedColor = reed.rgb;
    // ao 
    vec3 aoDarkColor = reedColor.rgb * 0.7;
    vec3 aoBrightColor = reedColor.rgb * 1.0;
    float aoPower = 1.0;
    reedColor.rgb = mix(aoBrightColor, aoDarkColor, pow(1.0 - vUv2.y, 1.0) * aoPower);

    reedColor.rgb = mix(vec3(0.373, 0.630, 0.00630), reedColor.rgb, clamp(vPos.y * 0.01, 0.0, 1.0));
    
    
    // sunShade
    float sunShade = dot(vSlopes, - sunPosition);
    sunShade = sunShade * 0.5 + 0.5;
    vec3 shadeColor = reedColor.rgb * vec3(0.0, 0.5, 0.7);
    reedColor.rgb = mix(reedColor.rgb, shadeColor, sunShade);

    float sunReflection = getSunReflection(vViewDirection, vWorldNormal, vViewNormal);
    reedColor.rgb = getSunReflectionColor(reedColor.rgb, sunReflection);


    
    gl_FragColor = vec4(reedColor, 1.0);

  }
`;
export {
  reedVertexShader, reedFragmentShader,
};