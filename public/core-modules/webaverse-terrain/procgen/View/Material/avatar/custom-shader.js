export const customAvatarShader = (material, uniforms) => {
  const customAvatarMaterial = material.clone();

  customAvatarMaterial.uniforms = uniforms;
  customAvatarMaterial.onBeforeCompile = shader => {
    shader.uniforms.sunPosition = uniforms.sunPosition;
    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <uv_pars_fragment>`,
      `
      #include <uv_pars_fragment>
      uniform vec3 sunPosition;
      `,
    );
    
   
    shader.fragmentShader = shader.fragmentShader.replace(
      `vec4 diffuseColor = vec4( diffuse, opacity );`,
      `
        float sunShade = dot(vec3(0.0, 1.0, 0.0), - sunPosition);
        sunShade = sunShade * 0.5 + 0.5;
        vec3 col = diffuse;
        vec3 shadeColor = col * vec3(0.0, 0.5, 0.7);
        col = mix(col, shadeColor, sunShade);

        vec4 diffuseColor = vec4( col, opacity );
      `,
    );
    
    // console.log(shader.fragmentShader);
  };
  return customAvatarMaterial;
}