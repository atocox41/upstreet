/*
this file is responsible for managing skybox-based logical world scenes.
*/

//

export class LoadingManager extends EventTarget {
  #loads = new Set();

  constructor() {
    super();

    this.started = false;
    this.currentLoad = null;
  }
  addLoad(name) {
    const load = {
      name,
      loaded: false,
      finish: () => {
        load.loaded = true;
        this.update();
      },
    };
    this.#loads.add(load);

    if (this.#loads.size === 1) {
      this.started = true;

      this.dispatchEvent(new MessageEvent('start'));
      this.currentLoad = load;
      this.dispatchEvent(new MessageEvent('currentloadupdate', {
        data: {
          load,
        },
      }));
    }

    this.update();

    return load;
  }
  update() {
    let numerator = 0;
    let denominator = 0;
    let progress;
    if (this.#loads.size > 0) {
      for (const load of this.#loads.values()) {
        if (load.loaded) {
          numerator++;
        }
        denominator++;
      }
      progress = numerator / denominator;
    } else {
      numerator = 1;
      denominator = 1;
      progress = 1;
    }

    this.dispatchEvent(new MessageEvent('update', {
      data: {
        numerator,
        denominator,
        progress,
      },
    }));

    if (progress >= 1) {
      this.dispatchEvent(new MessageEvent('finish'));
      this.#loads.clear();
    } else {
      const currentLoad = Array.from(this.#loads.values()).find(load => !load.loaded);
      if (currentLoad !== this.currentLoad) {
        this.currentLoad = currentLoad;
        this.dispatchEvent(new MessageEvent('currentloadupdate', {
          data: {
            load: currentLoad,
          },
        }));
      }
    }
  }
  async waitForFinish() {
    if (!this.started) {
      await new Promise((accept, reject) => {
        this.addEventListener('start', accept, {once: true});
      });
    }
    if (this.#loads.size > 0) {
      await new Promise((accept, reject) => {
        this.addEventListener('finish', accept, {once: true});
      });
    }
  }
}