export const customSahdowShader = (shader) => {
  shader.vertexShader =
    `#define DEPTH_PACKING 3201
      attribute vec3 infos;
      attribute vec3 positions;
      attribute vec3 slopes;
      attribute vec3 color;
      uniform sampler2D noiseTexture;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vColor;
      varying vec3 vInfos;
  ` + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    "#include <project_vertex>",
    `   
    vUv = uv;  
    vColor = color;  
    vInfos = infos;   
    
    // rot tree Y axis
    float rotDegree = infos.y;
    mat3 rotY = mat3(
      cos(rotDegree), 0.0, -sin(rotDegree), 
      0.0, 1.0, 0.0, 
      sin(rotDegree), 0.0, cos(rotDegree)
    );

    vec3 rotatedPosition = rotY * position ;
    
    transformed = rotatedPosition;

    vec2 textureUv = vec2(mod(positions.x, 100.), mod(positions.z, 100.));
    // scale
    float treeScale = infos.x;
    transformed *=  treeScale;
    transformed += positions;

    bool isLeaf = color.r > 0.5;
    if (isLeaf) {
      vec3 windPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      // wind
      float windNoiseUvScale = 0.1;
      float windNoiseUvSpeed = 0.03;
      vec2 windNoiseUv = vec2(
        windPos.x * windNoiseUvScale + uTime * windNoiseUvSpeed,
        windPos.z * windNoiseUvScale + uTime * windNoiseUvSpeed
      );
      float windNoise = texture2D(noiseTexture, windNoiseUv).r - 0.5;
      float windNoiseScale = 0.8;
      transformed += sin(windNoise * vec3(windNoiseScale, 0., windNoiseScale));
    }
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0 );`
  );

  shader.fragmentShader =
  ` 
    #define DEPTH_PACKING 3201
    uniform sampler2D leaveTexture1;
    uniform sampler2D leaveTexture2;
    uniform sampler2D leaveTexture3;
    uniform sampler2D leaveTexture4;
    varying vec2 vUv;
    varying vec3 vColor;
    varying vec3 vInfos;
  ` + shader.fragmentShader;

  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <alphatest_fragment>",
    `          
    #include <alphatest_fragment>
    bool isLeaf = vColor.r > 0.5;
    if (isLeaf) {
      vec4 leaves;
      if (vInfos.z < 0.5) {
        leaves = texture2D(leaveTexture3, vUv);
      }
      else if (vInfos.z < 1.5) {
        leaves = texture2D(leaveTexture1, vUv);
      }
      else {
        leaves = texture2D(leaveTexture4, vUv);
      }
      if (leaves.a < 0.9) {
        discard;
      }
    }
    `
  );

}