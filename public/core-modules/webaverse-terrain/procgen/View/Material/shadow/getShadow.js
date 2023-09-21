export const getShadow = `
  vec3 getShadow(vec3 baseColor, bool isDay, vec3 sunPosition, float mask) {
    float sunSetStrength = isDay ? sunPosition.y : -sunPosition.y;
    vec3 shadowColor = baseColor * 0.6;
    sunSetStrength = smoothstep(0.1, 1.0, sunSetStrength);
    float shadowPower = 0.5;
    return mix(baseColor, shadowColor, mask * shadowPower * sunSetStrength);
  }
`
