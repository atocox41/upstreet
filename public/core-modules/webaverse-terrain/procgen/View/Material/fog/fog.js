export const getSkyFogColor = `
  #define M_PI 3.1415926535897932384626433832795
  
  vec3 blendAdd(vec3 base, vec3 blend) {
    return min(base + blend, vec3(1.0));
  }

  vec3 blendAdd(vec3 base, vec3 blend, float opacity) {
    return (blendAdd(base, blend) * opacity + base * (1.0 - opacity));
  }

  vec3 getSkyFogColor(
    vec3 baseColor, 
    float depth, 
    float targetHeigt, 
    vec3 colorDayCycleLow,
    vec3 colorDayCycleHigh,
    vec3 colorNightLow,
    vec3 colorNightHigh,
    float dayCycleProgress,
    vec3 sunPosition,
    vec3 normalizedPosition,
    float dawnAngleAmplitude,
    float dawnElevationAmplitude,
    vec3 colorDawn,
    float sunAmplitude,
    float sunMultiplier,
    vec3 colorSun
  ) {
    float fogIntensity = 0.0015 + dayCycleProgress * 0.001;
    vec3 colorDayCycle = mix(colorDayCycleLow, colorDayCycleHigh, targetHeigt);
    vec3 colorNight = mix(colorNightLow, colorNightHigh, targetHeigt);

    
    float dayIntensity = dayCycleProgress < 0.5 ? (0.25 - abs(dayCycleProgress - 0.25)) * 4. : 0.;
    vec3 fogColor = mix(colorNight, colorDayCycle, dayIntensity);


    // Dawn 
    float dawnAngleIntensity = dot(normalize(sunPosition.xyz), normalize(normalizedPosition.xyz));
    dawnAngleIntensity = smoothstep(0.0, 1.0, (dawnAngleIntensity - (1.0 - dawnAngleAmplitude)) / dawnAngleAmplitude);

    float dawnElevationIntensity = 1.0 - min(1.0, targetHeigt / dawnElevationAmplitude);

    float dawnDayCycleIntensity = dayCycleProgress < 0.5 ? (abs(dayCycleProgress - 0.25)) * 4. : 0.;
    dawnDayCycleIntensity = clamp(dawnDayCycleIntensity * 4.0 * M_PI + M_PI, 0.0, 1.0) * 0.5 + 0.5;
    
    
    float dawnIntensity = clamp(dawnAngleIntensity * dawnElevationIntensity * dawnDayCycleIntensity, 0.0, 1.0);
    fogColor = blendAdd(fogColor, colorDawn, dawnIntensity);

    // Sun light color 
    float distanceToSun = distance(normalizedPosition, sunPosition);

    float sunIntensity = smoothstep(0.0, 1.0, clamp(1.0 - distanceToSun / sunAmplitude, 0.0, 1.0)) * sunMultiplier;
    fogColor = blendAdd(fogColor, colorSun, sunIntensity);

    float sunGlowStrength = pow(max(0.0, 1.0 + 0.05 - distanceToSun * 2.5), 2.0);
    fogColor = blendAdd(fogColor, colorSun, sunGlowStrength);


    //################################################## Moon light color ################################################## 
    float moonSize = 1.;
    float moonInnerBound = 0.1;
    float moonOuterBound = 2.0;
    vec4 moonColor = vec4(0.1, 0.7, 0.9, 1.0);
    vec3 moonPosition = vec3(-sunPosition.x, -sunPosition.y, -sunPosition.z);
    float moonDist = distance(normalizedPosition, moonPosition);
    float moonArea = 1. - moonDist / moonSize;
    moonArea = smoothstep(moonInnerBound, moonOuterBound, moonArea);
    vec3 fallmoonColor = moonColor.rgb * 0.4;
    vec3 finalmoonColor = mix(fallmoonColor, moonColor.rgb, smoothstep(-0.03, 0.03, moonPosition.y)) * moonArea;
    fogColor += finalmoonColor;

    float intensity = 1.0 - exp(- fogIntensity * fogIntensity * depth * depth );
    return mix(baseColor, fogColor, intensity);
  }
`
