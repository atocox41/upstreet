import * as THREE from 'three';
import alea from '../../utils/alea.js';

const avatars = [
  {
    name: 'Uni the Unicorn',
    voiceEndpoint: 'tiktalknet:Rainbow Dash',
    avatarUrl: "/avatars360/uni/uni.character360",
  },
  {
    name: 'Buster the Rabbit',
    voiceEndpoint: 'tiktalknet:Shining Armor',
    avatarUrl: "/avatars/Buster_Rabbit_V1.1_Guilty.vrm",
  },
  {
    name: 'Drake Silkbourne',
    voiceEndpoint: 'tiktalknet:Shining Armor',
    avatarUrl: "/avatars/Drake_hacker_v8_Guilty.vrm",
  },
  {
    name: 'Anemone Wall',
    voiceEndpoint: 'tiktalknet:Trixie',
    avatarUrl: "/avatars/ann_liskwitch_v3.3_gulty.vrm",
  },
  {
    name: 'Vipe 569',
    voiceEndpoint: 'tiktalknet:Sweetie Belle',
    avatarUrl: "/avatars/default_569.vrm",
  }
];

/* const avatarGeometry = new THREE.BoxBufferGeometry(1, 10, 1).translate(0, 10 / 2, 0);
const avatarMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  transparent: true,
  opacity: 0.5,
});
class AvatarMesh extends THREE.Mesh {
  constructor({
    infos,
  }) {
    super(
      avatarGeometry,
      avatarMaterial
    );

    this.infos = infos;
  }
} */

class AvatarApp {
  constructor({
    position,
    infos,
    importManager,
    scene,
    signal,
  }) {
    this.position = position;
    this.infos = infos;
    this.importManager = importManager;
    this.scene = scene;
    this.signal = signal;

    this.app = null;

    this.load();
  }
  async load() {
    const randomNum = alea(this.infos[1])();
    const avatarSpec = avatars[Math.floor(randomNum * avatars.length)];
    const start_url = `data:application/npc,${encodeURIComponent(JSON.stringify(avatarSpec))}`;



    /* const mesh = new AvatarMesh({
      infos: this.infos,
    });
    mesh.position.copy(this.position);
    this.scene.add(mesh);
    mesh.updateMatrixWorld(); */



    this.app = await this.importManager.createAppAsync({
      start_url,
      position: this.position,
    });
    this.scene.add(this.app);
    this.app.updateMatrixWorld();
  }
}

class AvatarRegistry {
  createApp({
    position,
    infos,
    importManager,
    scene,
    signal,
  }) {
    return new AvatarApp({
      position,
      infos,
      importManager,
      scene,
      signal,
    });
  }
}
const avatarRegistry = new AvatarRegistry();
export default avatarRegistry;
