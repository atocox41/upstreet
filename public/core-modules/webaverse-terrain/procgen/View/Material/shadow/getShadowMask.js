export const getShadowMask = `
  float getShadowMask(vec3 worldPosition, vec3 camera) {
    float shadow1 = 1.0;
    float shadow2 = 1.0;
    #ifdef USE_SHADOWMAP
    #if NUM_DIR_LIGHT_SHADOWS > 0
    DirectionalLightShadow directionalLod1;
    DirectionalLightShadow directionalLod2;
    
    directionalLod1 = directionalLightShadows[1];
    shadow1 *= receiveShadow ? getShadow( directionalShadowMap[1], directionalLod1.shadowMapSize, directionalLod1.shadowBias, directionalLod1.shadowRadius, vDirectionalShadowCoord[1] ) : 1.0;
  
    directionalLod2 = directionalLightShadows[0];
    shadow2 *= receiveShadow ? getShadow( directionalShadowMap[0], directionalLod2.shadowMapSize, directionalLod2.shadowBias, directionalLod2.shadowRadius, vDirectionalShadowCoord[0] ) : 1.0;
    
    float shadowLerp = clamp(distance(worldPosition, camera) / 30., 0.0, 1.0);
    float shadow = mix(shadow2, shadow1, shadowLerp);
    
    #endif
    #endif
    return shadow;
  }
`
