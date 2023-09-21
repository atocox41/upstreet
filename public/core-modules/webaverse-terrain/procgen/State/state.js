
import Terrains from './terrains.js'
import Chunks from './chunks.js'

export default class State
{
  static instance

  static getInstance() {
    return State.instance
  }

  constructor(app, camera, player, terrainWorker) {
    if(State.instance)
      return State.instance

    State.instance = this
    this.app = app;
    this.camera = camera;
    this.player = player;
    this.terrainWorker = terrainWorker;
    this.terrains = new Terrains();
    this.chunks = new Chunks();

    this.terrains.events.on('create', terrain => {
      terrain.events.on('ready', o => {
        app.dispatchEvent({
          type: 'chunkadd',
          chunk: terrain,
        });
      });
    });
    this.terrains.events.on('destroy', terrain => {
      app.dispatchEvent({
        type: 'chunkremove',
        chunk: terrain,
      });
    });
  }
  
  update() {
    this.chunks.update()
  }
}