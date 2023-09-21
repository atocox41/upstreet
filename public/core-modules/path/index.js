import * as THREE from 'three';
import * as BufferGeometryUtils from '../../../packages/three/examples/jsm/utils/BufferGeometryUtils.js';

import {
  StreetLineGeometry,
} from './StreetGeometry.js';

console.log(BufferGeometryUtils)

const baseUrl = import.meta.url;

let map = null;
const getMap = async () => {
  if (!map) {
    map = new THREE.TextureLoader().load(`${baseUrl}textures/arrowtail.png`);
  }
  return map;
};

export default (ctx) => {
  const {
    useApp,
  }  = ctx;
  const app = useApp();
  app.name = 'path';

  ctx.waitUntil((async () => {
    const _makeGeometry = lines => {
      const geometries = [];
      for (let i = 0; i < lines.length; i++) {
        const points = lines[i];
        const curve = new THREE.CatmullRomCurve3(points);

        const geometry = new StreetLineGeometry(
          curve, // path
          points.length, // tubularSegments
          0.05, // radiusX
          0, // radiusY
        );
        geometries.push(geometry);
      }

      if (geometries.length > 0) {
        return BufferGeometryUtils.mergeBufferGeometries(geometries);
      } else {
        return new THREE.BufferGeometry();
      }
    };

    app.addEventListener('componentsupdate', e => {
      const lines = _getLines();
      const geometry = _makeGeometry(lines);
      mesh.geometry = geometry;
      mesh.visible = lines.length > 0;
    });

    const _getLines = () => {
      return app.getComponent('lines').map(points => {
        return points.map(p => {
          return new THREE.Vector3().fromArray(p);
        });
      }).filter(l => l.length > 1);
    };
    const lines = _getLines();
    const geometry = _makeGeometry(lines);
    const map = await getMap();
    const material = new THREE.MeshBasicMaterial({
      map,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.visible = lines.length > 0;
    app.add(mesh);
    mesh.updateMatrixWorld();
  })());

  return app;
};
