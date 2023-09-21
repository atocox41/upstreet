import EventEmitter from '../utils/events.js';
import * as THREE from 'three';

export default class Terrain
{
  constructor(terrains, id, size, x, z, precision, bounding, customType) {
    this.terrains = terrains;
    this.id = id;
    this.size = size;
    this.x = x;
    this.z = z;
    this.precision = precision;
    this.bounding = bounding;
    this.customType = customType;

    this.halfSize = this.size * 0.5;
    this.ready = false;
    this.renderInstance = null;

    this.boundingBox = new THREE.Box3(
      new THREE.Vector3(bounding.xMin, 0, bounding.zMin),
      new THREE.Vector3(bounding.xMax, 2048, bounding.zMax)
    );

    this.events = new EventEmitter();
    this.events.setMaxListeners(100);
  }

  create(data) {
    // this is called back from the worker

    this.elevations = data.elevations;

    this.positions = data.positions;
    this.normals = data.normals;
    this.indices = data.indices;
    this.texture = data.texture;
    this.uv = data.uv;
    
    this.biomeWeight = data.biomeWeight;

    this.grassPositions = data.grassPositions;
    this.grassTerrainSlopes = data.grassTerrainSlopes;

    this.flowerPositions = data.flowerPositions;
    this.flowerTerrainSlopes = data.flowerTerrainSlopes;

    this.bushPositions = data.bushPositions;
    this.bushTerrainSlopes = data.bushTerrainSlopes;

    this.reedPositions = data.reedPositions;
    this.reedTerrainSlopes = data.reedTerrainSlopes;

    this.rockPositions = data.rockPositions;
    this.rockTerrainSlopes = data.rockTerrainSlopes;
    this.rockInfos = data.rockInfos;

    this.treeOnePositions = data.treeOnePositions;
    this.treeOneTerrainSlopes = data.treeOneTerrainSlopes;
    this.treeOneInfos = data.treeOneInfos;

    this.treeTwoPositions = data.treeTwoPositions;
    this.treeTwoTerrainSlopes = data.treeTwoTerrainSlopes;
    this.treeTwoInfos = data.treeTwoInfos;

    this.treeThreePositions = data.treeThreePositions;
    this.treeThreeTerrainSlopes = data.treeThreeTerrainSlopes;
    this.treeThreeInfos = data.treeThreeInfos;

    this.objectPositions = data.objectPositions;
    this.objectInfos = data.objectInfos;

    this.avatarPositions = data.avatarPositions;
    this.avatarInfos = data.avatarInfos;

    this.mobPositions = data.mobPositions;
    this.mobInfos = data.mobInfos;
    

    this.weight = data.weight;
    
    this.ready = true;

    this.events.emit('ready');
  }

  getElevationForPosition(x, z) {
    if (!this.ready) {
      // console.warn('terrain not ready')
      return;
    }

    const subdivisions = this.terrains.subdivisions;
    const segments = subdivisions + 1;
    const subSize = this.size / subdivisions;

    // Relative position
    const relativeX = x - this.x + this.halfSize;
    const relativeZ = z - this.z + this.halfSize;

    // Ratio
    const xRatio = (relativeX / subSize) % 1;
    const zRatio = (relativeZ / subSize) % 1;
    
    // Indexes
    const aIndexX = Math.floor(relativeX / subSize);
    const aIndexZ = Math.floor(relativeZ / subSize);
        
    const cIndexX = aIndexX + 1;
    const cIndexZ = aIndexZ + 1;

    const bIndexX = xRatio < zRatio ? aIndexX : aIndexX + 1;
    const bIndexZ = xRatio < zRatio ? aIndexZ + 1 : aIndexZ;

    const aStrideIndex = (aIndexZ * segments + aIndexX) * 3;
    const bStrideIndex = (bIndexZ * segments + bIndexX) * 3;
    const cStrideIndex = (cIndexZ * segments + cIndexX) * 3;

    // Weights
    const weight1 = xRatio < zRatio ? 1 - zRatio : 1 - xRatio;
    const weight2 = xRatio < zRatio ? - (xRatio - zRatio) : xRatio - zRatio;
    const weight3 = 1 - weight1 - weight2;
    
    // Elevation
    const aElevation = this.positions[aStrideIndex + 1];
    const bElevation = this.positions[bStrideIndex + 1];
    const cElevation = this.positions[cStrideIndex + 1];
    const elevation = aElevation * weight1 + bElevation * weight2 + cElevation * weight3;

    return elevation;
  }

  destroy() {
    this.events.emit('destroy');
  }
}