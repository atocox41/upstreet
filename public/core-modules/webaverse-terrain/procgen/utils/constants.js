import * as THREE from 'three'

export const skySettings = {
  uColorDayCycleLow: {value: new THREE.Color('#f0fff9')}, // light turquoise
  uColorDayCycleHigh: {value: new THREE.Color('#2e89ff')}, // bright blue
  uColorNightLow: {value: new THREE.Color('#004794')}, // dark blue
  uColorNightHigh: {value: new THREE.Color('#001624')}, // very dark blue
  uColorDawn: {value: new THREE.Color('#F2491F')}, // bright red-orange
  uColorSun: {value: new THREE.Color('#ff531a')}, // orange-red

  uAtmosphereElevation: { value: 0.5 },
  uAtmospherePower: { value: 10 },
  uDawnAngleAmplitude: { value: 1 },
  uDawnElevationAmplitude: { value: 0.2 },
  uSunAmplitude: { value: 0.75 },
  uSunMultiplier: { value: 1 },
}

export const chunkMinSize = 64;
export const chunkMaxDepth = 4;

export const WATER_HEIGHT = 0;
export const WATER_CHARACTERCONTROLLER_HEIGHT = WATER_HEIGHT - 0.46; // note: Some numbers such as -0.45 has precision problem, will cause jitter.;

export const seed = 'webaverse';