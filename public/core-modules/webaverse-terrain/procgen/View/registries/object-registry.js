import * as THREE from 'three';
import alea from '../../utils/alea.js';

const objects = [
  {
    start_url: '/core-modules/silsword/index.js',
  },
  {
    start_url: '/core-modules/pistol/index.js',
  },
  {
    start_url: '/core-modules/silk/index.js',
  },
];

/* const objectGeometry = new THREE.BoxBufferGeometry(1, 10, 1).translate(0, 10 / 2, 0);
const objectMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  transparent: true,
  opacity: 0.5,
});
class ObjectMesh extends THREE.Mesh {
  constructor({
    infos,
  }) {
    super(
      objectGeometry,
      objectMaterial
    );

    this.infos = infos;
  }
} */
const ObjectMesh = THREE.Object3D;

class ObjectApp {
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
    const objectSpec = objects[Math.floor(randomNum * objects.length)];
    const {start_url} = objectSpec;



    const mesh = new ObjectMesh({
      infos: this.infos,
    });
    mesh.position.copy(this.position);
    this.scene.add(mesh);
    mesh.updateMatrixWorld();



    const position = this.position.clone();
    position.y += 0.5;
    this.app = await this.importManager.createAppAsync({
      start_url,
      position,
    });
    this.scene.add(this.app);
    this.app.updateMatrixWorld();
  }
}

class ObjectRegistry {
  createApp({
    position,
    infos,
    importManager,
    scene,
    signal,
  }) {
    return new ObjectApp({
      position,
      infos,
      importManager,
      scene,
      signal,
    });
  }
}
const objectRegistry = new ObjectRegistry();
export default objectRegistry;