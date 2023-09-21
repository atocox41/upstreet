// textureNumber: Indicate which texture is used. (we have 4 cloud textures)
// cloudNumber: Indicate which cloud is used. In each texture, we have 8 clouds. 
// positionIndex: Divide the cloudRadius into 100 parts.
// posY: Indicate the position y of the cloud.
// width and height define the cloud size.
// distortionSpeed: distortion rate
// distortionRange: 1 indicate the scale of the cloud would go back and forth from 0 to 1
export const cloudData = [
  {textureNumber: 2, cloudNumber: 0, positionIndex: 4, posY: 350, width: 300, height: 200, distortionSpeed: 0.12, distortionRange: 0.1},
  {textureNumber: 2, cloudNumber: 6, positionIndex: 0, posY: 350, width: 300, height: 200, distortionSpeed: 0.11, distortionRange: 0.05},

  {textureNumber: 2, cloudNumber: 1, positionIndex: 14, posY: 350, width: 300, height: 180, distortionSpeed: 0.12, distortionRange: 0.1},
  {textureNumber: 2, cloudNumber: 6, positionIndex: 8, posY: 350, width: 300, height: 180, distortionSpeed: 0.1, distortionRange: 0.0},

  {textureNumber: 2, cloudNumber: 2, positionIndex: 28, posY: 350, width: 400, height: 200, distortionSpeed: 0.12, distortionRange: 0.1},
  {textureNumber: 2, cloudNumber: 6, positionIndex: 30, posY: 350, width: 400, height: 200, distortionSpeed: 0.12, distortionRange: 0.05},


  {textureNumber: 2, cloudNumber: 3, positionIndex: 45, posY: 350, width: 400, height: 200, distortionSpeed: 0.12, distortionRange: 0.1},
  {textureNumber: 2, cloudNumber: 7, positionIndex: 50, posY: 350, width: 400, height: 200, distortionSpeed: 0.1, distortionRange: 0.1},


  {textureNumber: 2, cloudNumber: 4, positionIndex: 69, posY: 350, width: 350, height: 175, distortionSpeed: 0.12, distortionRange: 0.1},
  {textureNumber: 2, cloudNumber: 6, positionIndex: 75, posY: 350, width: 350, height: 175, distortionSpeed: 0.12, distortionRange: 0.0},


  {textureNumber: 2, cloudNumber: 5, positionIndex: 80, posY: 350, width: 350, height: 175, distortionSpeed: 0.12, distortionRange: 0.1},
  {textureNumber: 2, cloudNumber: 7, positionIndex: 85, posY: 350, width: 500, height: 200, distortionSpeed: 0.1, distortionRange: 0.05},

  {textureNumber: 0, cloudNumber: 0, positionIndex: 0, posY: 1800, width: 230, height: 115, distortionSpeed: 0.1, distortionRange: 0.5},
  {textureNumber: 0, cloudNumber: 1, positionIndex: 15, posY: 2820, width: 180, height: 90, distortionSpeed: 0.12, distortionRange: 0.4},
  {textureNumber: 0, cloudNumber: 2, positionIndex: 23, posY: 3810, width: 210, height: 105, distortionSpeed: 0.13, distortionRange: 0.35},
  {textureNumber: 0, cloudNumber: 3, positionIndex: 34, posY: 676, width: 250, height: 125, distortionSpeed: 0.15, distortionRange: 0.4},
  {textureNumber: 0, cloudNumber: 4, positionIndex: 46, posY: 1850, width: 230, height: 115, distortionSpeed: 0.16, distortionRange: 0.35},
  {textureNumber: 0, cloudNumber: 5, positionIndex: 58, posY: 2860, width: 290, height: 145, distortionSpeed: 0.12, distortionRange: 0.4},
  {textureNumber: 0, cloudNumber: 6, positionIndex: 75, posY: 1900, width: 150, height: 75, distortionSpeed: 0.2, distortionRange: 0.45},
  {textureNumber: 0, cloudNumber: 7, positionIndex: 90, posY: 1830, width: 240, height: 120, distortionSpeed: 0.17, distortionRange: 0.5},

  {textureNumber: 3, cloudNumber: 7, positionIndex: 60, posY: 500, width: 300, height: 150, distortionSpeed: 0.1, distortionRange: 0.5},
  {textureNumber: 3, cloudNumber: 6, positionIndex: 20, posY: 500, width: 200, height: 100, distortionSpeed: 0.12, distortionRange: 0.4},
  {textureNumber: 3, cloudNumber: 5, positionIndex: 36, posY: 2880, width: 250, height: 120, distortionSpeed: 0.13, distortionRange: 0.35},
  {textureNumber: 3, cloudNumber: 4, positionIndex: 50, posY: 3646, width: 280, height: 170, distortionSpeed: 0.15, distortionRange: 0.4},
  {textureNumber: 3, cloudNumber: 3, positionIndex: 69, posY: 2869, width: 350, height: 200, distortionSpeed: 0.16, distortionRange: 0.35},
  {textureNumber: 3, cloudNumber: 2, positionIndex: 79, posY: 4232, width: 390, height: 200, distortionSpeed: 0.12, distortionRange: 0.4},
  {textureNumber: 3, cloudNumber: 1, positionIndex: 85, posY: 2744, width: 380, height: 190, distortionSpeed: 0.2, distortionRange: 0.45},
  {textureNumber: 3, cloudNumber: 0, positionIndex: 95, posY: 3956, width: 150, height: 100, distortionSpeed: 0.17, distortionRange: 0.5},

]