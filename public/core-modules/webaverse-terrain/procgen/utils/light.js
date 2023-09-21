export const initSkyLight = (light, paras) => {
  light.shadow.mapSize.width = paras[1];
  light.shadow.mapSize.height = paras[1];

  light.shadow.camera.near = paras[2];

  light.shadow.camera.far = paras[3];

  light.shadow.camera.left = paras[0];
  light.shadow.camera.right = -paras[0];
  light.shadow.camera.top = paras[0];
  light.shadow.camera.bottom = -paras[0];

  light.shadow.bias = paras[4];

  light.shadow.normalBias = paras[5];
  
  light.castShadow = true;
}