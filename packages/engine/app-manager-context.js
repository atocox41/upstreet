export class AppManagerContext extends EventTarget {
  #appManager = null;

  constructor() {
    super();
  }
  getAppManager() {
    return this.#appManager;
  }
  setAppManager(appManager) {
    this.#appManager = appManager;

    this.dispatchEvent(new MessageEvent('appmanagerchange', {
      data: {
        appManager,
      },
    }));
  }
}