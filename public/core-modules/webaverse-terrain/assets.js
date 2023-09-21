const baseUrl = import.meta.url.replace(/(\/)[^\/\/]*$/, '$1');

export const particleGLBPath = {
  grass: `${baseUrl}assets/grassBlade1.glb`,
  flower: `${baseUrl}assets/flower4.glb`,
  treeOneLod0: `${baseUrl}assets/treeOneLod0.glb`,
  treeOneLod1: `${baseUrl}assets/treeOneLod1.glb`,
  treeOneTrunk: `${baseUrl}assets/treeOneTrunk.glb`,
  treeTwoLod0: `${baseUrl}assets/treeTwoLod0.glb`,
  treeTwoLod1: `${baseUrl}assets/treeTwoLod1.glb`,
  treeTwoTrunk: `${baseUrl}assets/treeTwoTrunk.glb`,
  treeThreeLod0: `${baseUrl}assets/treeThreeLod0.glb`,
  treeThreeLod1: `${baseUrl}assets/treeThreeLod1.glb`,
  treeThreeTrunk: `${baseUrl}assets/treeThreeTrunk.glb`,

  rockLod0: `${baseUrl}assets/rockLod0.glb`,
  rockLod1: `${baseUrl}assets/rockLod1.glb`,

  bushLod0: `${baseUrl}assets/bushLod0.glb`,
  bushLod1: `${baseUrl}assets/bushLod1.glb`,

  reed: `${baseUrl}assets/reed3.glb`,
};

export const texturePacks = [
  {name: 'cloud1', texture: null, ext: 'png', repeat: false},
  {name: 'cloud2', texture: null, ext: 'png', repeat: false},
  {name: 'cloud3', texture: null, ext: 'png', repeat: false},
  {name: 'cloud4', texture: null, ext: 'png', repeat: false},

  {name: 'moon2', texture: null, ext: 'png', repeat: false},

  {name: 'star3', texture: null, ext: 'png', repeat: true},
  {name: 'noise', texture: null, ext: 'png', repeat: true},
  {name: 'noise2', texture: null, ext: 'png', repeat: true},
  {name: 'noise3', texture: null, ext: 'jpg', repeat: true},
  {name: 'noise4', texture: null, ext: 'jpg', repeat: true},

  {name: 'galaxy', texture: null, ext: 'png', repeat: false},
  {name: 'Flare32', texture: null, ext: 'png', repeat: false},
  {name: 'lensflare3', texture: null, ext: 'png', repeat: false},

  {name: 'waterNormal', texture: null, ext: 'png', repeat: true},

  {name: 'terrain-rock', texture: null, ext: 'png', repeat: true},
  {name: 'terrain-dirt', texture: null, ext: 'png', repeat: true},
  {name: 'terrain-sand', texture: null, ext: 'png', repeat: true},
  {name: 'terrain-grass', texture: null, ext: 'png', repeat: true},
  {name: 'terrain-brick', texture: null, ext: 'png', repeat: true},
  {name: 'terrain-brick-normal', texture: null, ext: 'png', repeat: true},

  {name: 'leaf1', texture: null, ext: 'png', repeat: false},
  {name: 'leaf2', texture: null, ext: 'png', repeat: false},
  {name: 'leaf3', texture: null, ext: 'png', repeat: false},
  {name: 'leaf4', texture: null, ext: 'png', repeat: false},
  {name: 'leaf5', texture: null, ext: 'png', repeat: false},
  {name: 'leaf6', texture: null, ext: 'png', repeat: false},
  {name: 'leaf7', texture: null, ext: 'png', repeat: false},

  {name: 'bark1', texture: null, ext: 'png', repeat: true},

  {name: 'stone', texture: null, ext: 'png', repeat: true},

  {name: 'noise3', texture: null, ext: 'png', repeat: true},

  {name: 'splash1', texture: null, ext: 'png', repeat: false},
  {name: 'splash2', texture: null, ext: 'png', repeat: false},
  {name: 'droplet', texture: null, ext: 'png', repeat: false},

  {name: 'splash3', texture: null, ext: 'png', repeat: false},
  {name: 'splash4', texture: null, ext: 'png', repeat: false},
  {name: 'splash5', texture: null, ext: 'png', repeat: false},

  {name: 'ripple', texture: null, ext: 'png', repeat: false},
];