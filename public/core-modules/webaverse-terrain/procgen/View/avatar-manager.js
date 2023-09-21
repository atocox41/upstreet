import * as THREE from 'three'

import View from './view.js';

// import { custsomAvatarShader } from './Material/avatar/custom-shader.js';

export default class AvatarManager {
  constructor() {
    this.view = View.getInstance();
    this.skyManager = this.view.skyManager
    this.player = this.view.player;
    
    this.avatarUniforms = {
      sunPosition: {
        value: new THREE.Vector3()
      }
    };
    // const model = this.player.avatar.avatarQuality.mesh;
    // model && model.traverse(o => {
    //   if (o.isMesh) {
    //     const customMaterial = customAvatarShader(o.material, this.avatarUniforms);
    //     o.material = customMaterial;
    //   }
    // });
  }

  update() {
    // this.avatarUniforms.sunPosition.value.copy(this.skyManager.sunPosition);
  }
}