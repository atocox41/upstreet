/*
io manager reads inputs from the browser.
some inputs are implicit, like resize.
the functionality is implemented in other managers.
*/

//

export class AppTracker extends EventTarget {
  constructor({
    appManagerContext,
  }) {
    super();
    
    if (!appManagerContext) {
      console.warn('missing managers', {
        appManagerContext,
      });
      throw new Error('missing managers');
    }
    this.appManagerContext = appManagerContext;

    this.#listen();
  }

  #makeQueryFn(query) {
    if (query instanceof RegExp) {
      return u => query.test(u);
    } else if (typeof query === 'string') {
      return u => u === query;
    } else if (typeof query === 'function') {
      return u => query(u);
    } else {
      return () => false;
    }
  }
  findApps(query) {
    const q = this.#makeQueryFn(query);

    const appManager = this.appManagerContext.getAppManager();
    const apps = [];
    for (const app of appManager.apps.values()) {
      const u = app?.spec?.start_url || '';
      // console.log('query', app, u, q(u));
      if (q(u)) {
        apps.push(app);
      }
    }
    return apps;
  }
  findApp(query) {
    const apps = this.findApps(query);
    return apps[0] ?? null;
  }

  registerAppTracker(query, addCb, removeCb) {
    const q = this.#makeQueryFn(query);

    const _addCb = e => {
      const {
        app,
      } = e.data;
      if (Array.isArray(app)) {
        debugger;
      }
      const u = app?.spec?.start_url || '';
      if (q(u)) {
        addCb(app);
      }
    };
    const _removeCb = e => {
      const {
        app,
      } = e.data;
      const u = app?.spec?.start_url || '';
      if (q(u)) {
        removeCb(app);
      }
    };
    this.addEventListener('appadd', _addCb);
    this.addEventListener('appremove', _removeCb);

    // initialize
    const appManager = this.appManagerContext.getAppManager();
    for (const app of appManager.apps.values()) {
      const e = {
        data: {
          app,
        },
      };
      _addCb(e);
    }

    return {
      cleanup: () => {
        this.removeEventListener('appadd', _addCb);
        this.removeEventListener('appremove', _removeCb);
      },
    };
  }

  #listen() {
    const _bindAppManager = appManager => {
      if (appManager) {
        // console.log('got app manager', appManager, structuredClone(appManager.apps));
        // globalThis.appManager = appManager;

        appManager.addEventListener('appadd', e => {
          this.dispatchEvent(new MessageEvent('appadd', {
            data: {
              app: e.data.app,
            },
          }));
          // console.log('app add', e);
        });
        appManager.addEventListener('appremove', e => {
          this.dispatchEvent(new MessageEvent('appremove', {
            data: {
              app: e.data.app,
            },
          }));
          // console.log('app remove', e);
        });
      }
    };
    const appManager = this.appManagerContext.getAppManager();
    _bindAppManager(appManager);

    this.appManagerContext.addEventListener('appmanagerchange', e => {
      const {
        appManager,
      } = e.data;
      // console.log('got new app manager', appManager);
      _bindAppManager(appManager);
    });
  }
}