const underWaterMaskVertexShader = `\   
  varying vec3 vWorldPosition;
          
  void main() {
    vec3 pos = position;
    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;
    gl_Position = projectionPosition;
    vWorldPosition = modelPosition.xyz;
  }
`;
const underWaterMaskFragmentShader = `\
  uniform float waterHeight;
  varying vec3 vWorldPosition;

  void main() {
    gl_FragColor = vec4(0.0141, 0.235, 0.25, 0.7);
    if(vWorldPosition.y > waterHeight)
      discard;
  }
`;
export {
  underWaterMaskVertexShader, underWaterMaskFragmentShader,
};