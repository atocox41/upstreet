import View from '../view.js';

export default class MobObject
{
  constructor(instancemanager, terrainState, mobRegistry) {
    this.view = View.getInstance();
    this.scene = this.view.instancedScene;

    this.instancemanager = instancemanager;
    this.terrainState = terrainState;
    this.mobRegistry = mobRegistry;

    this.mobApps = [];
    this.abortController = new AbortController();

    this.terrainState.events.on('ready', () => {
      this.create();
    });
  }

  create() {
    if (this.terrainState.size <= 64) {
      const mobCount = this.terrainState.mobPositions.length / 3;

      if (mobCount > 0) {
        const {signal} = this.abortController;

        for (let i = 0; i < mobCount; i++) {
          const infos = this.terrainState.mobInfos.slice(i * 3, (i + 1) * 3);
          const mobApp = this.mobRegistry.createApp({
            infos,
          });
          mobApp.position.fromArray(this.terrainState.mobPositions, i * 3);
          this.scene.add(mobApp);
          mobApp.updateMatrixWorld();

          signal.addEventListener('abort', () => {
            this.scene.remove(mobApp);
          });

          this.mobApps.push(mobApp);
        }
      }
    }
  }

  destroy() {
    this.abortController.abort();
  }
}