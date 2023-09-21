const skyDomeVertexShader = `\   
  #define M_PI 3.1415926535897932384626433832795

  uniform vec3 uSunPosition;

  uniform float uAtmosphereElevation;
  uniform float uAtmospherePower;
  uniform vec3 uColorDayCycleLow;
  uniform vec3 uColorDayCycleHigh;
  uniform vec3 uColorNightLow;
  uniform vec3 uColorNightHigh;

  uniform float uDawnAngleAmplitude;
  uniform float uDawnElevationAmplitude;
  uniform vec3 uColorDawn;

  uniform float uSunAmplitude;
  uniform float uSunMultiplier;
  uniform vec3 uColorSun;



  uniform float uDayCycleProgress;

  varying vec3 vColor;
  varying vec2 vUv;
  varying vec3 vPos;

  vec3 blendAdd(vec3 base, vec3 blend) {
    return min(base + blend, vec3(1.0));
  }

  vec3 blendAdd(vec3 base, vec3 blend, float opacity) {
    return (blendAdd(base, blend) * opacity + base * (1.0 - opacity));
  }

  void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * modelPosition;

    vec3 normalizedPosition = normalize(position);
    vUv = uv;
    vPos = position;

    //################################################## Sky ##################################################
    float horizonIntensity = (uv.y - 0.5) / uAtmosphereElevation;
    horizonIntensity = pow(1.0 - horizonIntensity, uAtmospherePower);

    vec3 colorDayCycle = mix(uColorDayCycleHigh, uColorDayCycleLow, horizonIntensity);
    
    vec3 colorNight = mix(uColorNightHigh, uColorNightLow, horizonIntensity);
    
    float dayIntensity = uDayCycleProgress < 0.5 ? (0.25 - abs(uDayCycleProgress - 0.25)) * 4. : 0.;
    vec3 color = mix(colorNight, colorDayCycle, dayIntensity);


    //################################################## Dawn ##################################################   
    float dawnAngleIntensity = dot(normalize(uSunPosition.xyz), normalize(normalizedPosition.xyz));
    dawnAngleIntensity = smoothstep(0.0, 1.0, (dawnAngleIntensity - (1.0 - uDawnAngleAmplitude)) / uDawnAngleAmplitude);

  
    float dawnElevationIntensity = 1.0 - min(1.0, (uv.y - 0.5) / uDawnElevationAmplitude);

    float dawnDayCycleIntensity = uDayCycleProgress < 0.5 ? (abs(uDayCycleProgress - 0.25)) * 4. : 0.;
    dawnDayCycleIntensity = clamp(dawnDayCycleIntensity * 4.0 * M_PI + M_PI, 0.0, 1.0) * 0.5 + 0.5;
    
    
    float dawnIntensity = clamp(dawnAngleIntensity * dawnElevationIntensity * dawnDayCycleIntensity, 0.0, 1.0);
    color = blendAdd(color, uColorDawn, dawnIntensity);

    
    //################################################## Sun light color ################################################## 
    float distanceToSun = distance(normalizedPosition, uSunPosition);

    float sunIntensity = smoothstep(0.0, 1.0, clamp(1.0 - distanceToSun / uSunAmplitude, 0.0, 1.0)) * uSunMultiplier;
    color = blendAdd(color, uColorSun, sunIntensity);

    float sunGlowStrength = pow(max(0.0, 1.0 + 0.05 - distanceToSun * 2.5), 2.0);
    color = blendAdd(color, uColorSun, sunGlowStrength);

    vColor = vec3(color);
  }
`;
const skyDomeFragmentShader = `\
  varying vec3 vColor;
  varying vec2 vUv;
  varying vec3 vPos;

  uniform float uTime;
  uniform vec3 uSunPosition;

  uniform sampler2D galaxyTexture;
  uniform sampler2D noiseTexture2;
  uniform sampler2D noiseTexture;
  uniform sampler2D starTexture;

  void main() {

    //################################################## Moon light color ################################################## 
    float moonSize = 1.;
    float moonInnerBound = 0.1;
    float moonOuterBound = 2.0;
    vec4 moonColor = vec4(0.1, 0.7, 0.9, 1.0);
    vec3 moonPosition = vec3(-uSunPosition.x, -uSunPosition.y, -uSunPosition.z);
    float moonDist = distance(normalize(vPos), moonPosition);
    float moonArea = 1. - moonDist / moonSize;
    moonArea = smoothstep(moonInnerBound, moonOuterBound, moonArea);
    vec3 fallmoonColor = moonColor.rgb * 0.4;
    vec3 finalmoonColor = mix(fallmoonColor, moonColor.rgb, smoothstep(-0.03, 0.03, moonPosition.y)) * moonArea;

    //################################################## Galaxy color (add noise texture 2 times) ################################################## 
    vec4 galaxyColor1 = vec4(0.11, 0.38, 0.98, 1.0);
    vec4 galaxyColor = vec4(0.62, 0.11, 0.74, 1.0);
    vec4 galaxyNoiseTex = texture2D(
      noiseTexture2,
      vUv * 2.5 + uTime * 0.001
    );
    vec4 galaxy = texture2D(
      galaxyTexture,
      vec2(
        vPos.x * 0.00006 + (galaxyNoiseTex.r - 0.5) * 0.3,
        vPos.y * 0.00007 + (galaxyNoiseTex.g - 0.5) * 0.3
      )
    );
    vec4 finalGalaxyColor =  (galaxyColor * (-galaxy.r + galaxy.g) + galaxyColor1 * galaxy.r) * smoothstep(0., 0.2, 1. - galaxy.g);
    galaxyNoiseTex = texture2D(
      noiseTexture2,
      vec2(
        vUv.x * 2. + uTime * 0.002,
        vUv.y * 2. + uTime * 0.003
      )
    );
    galaxy = texture2D(
      galaxyTexture,
      vec2(
        vPos.x * 0.00006 + (galaxyNoiseTex.r - 0.5) * 0.3,
        vPos.y * 0.00007 + (galaxyNoiseTex.g - 0.5) * 0.3
      )
    );
    finalGalaxyColor += (galaxyColor * (-galaxy.r + galaxy.g) + galaxyColor1 * galaxy.r) * smoothstep(0., 0.3, 1. - galaxy.g);
    finalGalaxyColor *= 0.1;

    //################################################## Star color ################################################## 
    vec4 starTex = texture2D(
      starTexture, 
      vPos.xz * 0.00025
    );
    vec4 starNoiseTex = texture2D(
      noiseTexture,
      vec2(
        vUv.x * 5. + uTime * 0.01,
        vUv.y * 5. + uTime * 0.02
      )
    );
    
    float starPos = smoothstep(0.21, 0.31, starTex.r);
    float starBright = smoothstep(0.513, 0.9, starNoiseTex.a);
    starPos = vUv.y > 0.6 ? starPos : starPos * clamp(pow(vUv.y, 5.), 0., 1.0);
    float finalStarColor = starPos * starBright;
    finalStarColor = finalStarColor * finalGalaxyColor.b * 5. + finalStarColor * (1. - finalGalaxyColor.b) * 0.7;

    float sunNightStep = smoothstep(-0.3, 0.25, uSunPosition.y);
    float starMask = 1. - sunNightStep * (1. - step(0.2, finalmoonColor.b));

    
    gl_FragColor = vec4(vColor + (vec3(finalStarColor) + finalGalaxyColor.rgb) * starMask + finalmoonColor.rgb, 1.0);
  }
`;
export {
  skyDomeVertexShader, skyDomeFragmentShader,
};