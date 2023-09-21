export const customHomespace = (material, uniforms) => {
  material.onBeforeCompile = shader => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.lightPos = uniforms.lightPos;
    shader.vertexShader = 
    `varying vec3 vNor;
    `+ shader.vertexShader;

    shader.vertexShader = shader.vertexShader
    .replace(
      `void main() {`,
      `void main() {
        vNor = normal;
      `
    );    
    shader.fragmentShader = fragmentSetup + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader
    .replace(
      `#include <map_fragment>`,
      customMapShader
    );  
  };
}
const customMapShader = `
  #ifdef USE_MAP
    vec4 sampledDiffuseColor = texture2D( map, vUv );
    #ifdef DECODE_VIDEO_TEXTURE
      // inline sRGB decode (TODO: Remove this code when https://crbug.com/1256340 is solved)
      sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
    #endif
    sampledDiffuseColor.rgb = smoothstep(vec3(0.01), vec3(1.0), sampledDiffuseColor.rgb);
    vec3 lightDir = normalize(lightPos);
    vec3 surfaceNormal = normalize(vNor);

    float lambertReflection = max(0.0, dot(lightPos, surfaceNormal));
    lambertReflection = WrapRampNL(lambertReflection, 0.1, 0.8);
    
    // sampledDiffuseColor.rgb = mix (vec3(0.), sampledDiffuseColor.rgb, lambertReflection);
    sampledDiffuseColor.rgb *= lambertReflection * 1.5;
    
    diffuseColor *= sampledDiffuseColor;
  #endif
`;

const fragmentSetup = `
  uniform float uTime;
  uniform vec3 lightPos;
  varying vec3 vNor;

  float WrapRampNL(float nl, float threshold, float smoothness) {
    nl = smoothstep(threshold - smoothness * 0.5, threshold + smoothness * 0.5, nl);
    return nl;
  }
`