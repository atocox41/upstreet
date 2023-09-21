import {OutlineBgFxMesh} from '../../../packages/engine/background-fx/OutlineBgFx.js';
import {NoiseBgFxMesh} from '../../../packages/engine/background-fx/NoiseBgFx.js';
import {PoisonBgFxMesh} from '../../../packages/engine/background-fx/PoisonBgFx.js';
import {SmokeBgFxMesh} from '../../../packages/engine/background-fx/SmokeBgFx.js';
import {GlyphBgFxMesh} from '../../../packages/engine/background-fx/GlyphBgFx.js';
import {DotsBgFxMesh} from '../../../packages/engine/background-fx/DotsBgFx.js';
import {LightningBgFxMesh} from '../../../packages/engine/background-fx/LightningBgFx.js';
import {RadialBgFxMesh} from '../../../packages/engine/background-fx/RadialBgFx.js';
import {GrassBgFxMesh} from '../../../packages/engine/background-fx/GrassBgFx.js';
import {RainBgFxMesh} from '../../../packages/engine/background-fx/RainBgFx.js';

export default class BackgroundManager {
  constructor() {
    this.player = null;
    this.avatar = null;

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.currentMesh = null;
  }

  initBgMeshes() {
    const engineRenderer = {renderer: this.renderer}
    const meshOpts = {
      engineRenderer,
    };
    this.outlineMesh = new OutlineBgFxMesh();
    this.scene.add(this.outlineMesh);
    this.outlineMesh.visible = false;

    this.noiseMesh = new NoiseBgFxMesh(meshOpts);
    this.scene.add(this.noiseMesh);
    this.noiseMesh.visible = false;

    this.poisonMesh = new PoisonBgFxMesh(meshOpts);
    this.scene.add(this.poisonMesh);
    this.poisonMesh.visible = false;

    this.smokeMesh = new SmokeBgFxMesh(meshOpts);
    this.scene.add(this.smokeMesh);
    this.smokeMesh.visible = false;

    this.glyphMesh = new GlyphBgFxMesh();
    this.scene.add(this.glyphMesh);
    this.glyphMesh.visible = false;

    this.dotsMesh = new DotsBgFxMesh();
    this.scene.add(this.dotsMesh);
    this.dotsMesh.visible = false;

    this.lightningMesh = new LightningBgFxMesh();
    this.scene.add(this.lightningMesh);
    this.lightningMesh.visible = false;

    this.radialMesh = new RadialBgFxMesh();
    this.scene.add(this.radialMesh);
    this.radialMesh.visible = false;

    this.grassMesh = new GrassBgFxMesh();
    this.scene.add(this.grassMesh);
    this.grassMesh.visible = false;

    this.rainMesh = new RainBgFxMesh();
    this.scene.add(this.rainMesh);
    this.rainMesh.visible = false;
  }

  setPlayer(player) {
    this.player = player;
    this.avatar = this.player.avatar;
  }

  setCamera(camera) {
    this.camera = camera;
  }

  setRenderer(renderer) {
    this.renderer = renderer;
  }

  setScene(scene) {
    this.scene = scene;
  }

  setBackground(type) {
    switch (type) {
      case 'outline': {
        this.currentMesh = this.outlineMesh;
        break;
      }
      case 'noise': {
        this.currentMesh = this.noiseMesh;
        break;
      }
      case 'poison': {
        this.currentMesh = this.poisonMesh;
        break;
      }
      case 'smoke': {
        this.currentMesh = this.smokeMesh;
        break;
      }
      case 'glyph': {
        this.currentMesh = this.glyphMesh;
        break;
      }
      case 'dots': {
        this.currentMesh = this.dotsMesh;
        break;
      }
      case 'lightning': {
        this.currentMesh = this.lightningMesh;
        break;
      }
      case 'radial': {
        this.currentMesh = this.radialMesh;
        break;
      }
      case 'grass': {
        this.currentMesh = this.grassMesh;
        break;
      }
      case 'rain': {
        this.currentMesh = this.rainMesh;
        break;
      }
      default: {
        break;
      }
    }
    this.currentMesh.visible = true;

  }

  cleanBackground() {
    if (this.currentMesh && this.currentMesh.visible) {
      this.currentMesh.visible = false;
      this.currentMesh = null;
    }
  }

  update(timestamp, timeDiff) {
    this.outlineMesh.visible && this.outlineMesh.update(timestamp, timeDiff, this.width, this.height);
    this.noiseMesh.visible && this.noiseMesh.update(timestamp, timeDiff, this.width, this.height);
    this.poisonMesh.visible && this.poisonMesh.update(timestamp, timeDiff, this.width, this.height);
    this.smokeMesh.visible && this.smokeMesh.update(timestamp, timeDiff, this.width, this.height);
    this.glyphMesh.visible && this.glyphMesh.update(timestamp, timeDiff, this.width, this.height);
    this.dotsMesh.visible && this.dotsMesh.update(timestamp, timeDiff, this.width, this.height);
    this.lightningMesh.visible && this.lightningMesh.update(timestamp, timeDiff, this.width, this.height);
    this.radialMesh.visible && this.radialMesh.update(timestamp, timeDiff, this.width, this.height);
    this.grassMesh.visible && this.grassMesh.update(timestamp, timeDiff, this.width, this.height);
    this.rainMesh.visible && this.rainMesh.update(timestamp, timeDiff, this.width, this.height);
  }
}