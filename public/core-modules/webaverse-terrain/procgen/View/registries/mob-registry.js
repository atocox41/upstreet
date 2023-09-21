import * as THREE from 'three';

const mobs = [
  {
    start_url: '/core-modules/silkworm/silkworm.mob',
  },
  {
    start_url: '/core-modules/silkworm/silkworm-runner.mob',
  },
  {
    start_url: '/core-modules/silkworm/silkworm-slasher.mob',
  },
  {
    start_url: '/core-modules/silkworm/silkworm-biter.mob',
  },
  {
    start_url: '/core-modules/silkworm/silkworm-bloater.mob',
  },
  {
    start_url: '/core-modules/silkworm/silkworm-queen.mob',
  },
];

/* const mobGeometry = new THREE.BoxBufferGeometry(1, 1, 1);
const mobMaterial = new THREE.MeshBasicMaterial({
  color: 0x0000ff,
});
class MobMesh extends THREE.Mesh {
  constructor({
    infos,
  }) {
    super(
      mobGeometry,
      mobMaterial
    );

    this.infos = infos;
    // console.log('got mob infos', infos);
  }
} */
const MobMesh = THREE.Object3D;

class MobRegistry {
  createApp({
    infos,
  }) {
    const mesh = new MobMesh({
      infos,
    });
    return mesh;
  }
}
const mobRegistry = new MobRegistry();
export default mobRegistry;