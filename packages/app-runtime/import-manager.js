import * as THREE from 'three';
import {
  App,
} from './app.js';
import {
  componentTemplates,
} from '../../public/core-components/core-components.js';

//

import scnTypeHandler from '../engine/type_handlers/scn.js';
import glbTypeHandler from '../engine/type_handlers/glb.js';
import vrmTypeHandler from '../engine/type_handlers/vrm.js';
import mp3TypeHandler from '../engine/type_handlers/mp3.js';
// import live2dTypeHandler from '../engine/type_handlers/live2d.js';
import itemTypeHandler from '../engine/type_handlers/item.js';
import loreTypeHandler from '../engine/type_handlers/lore.js';
import pngTypeHandler from '../engine/type_handlers/png.js';
import portalTypeHandler from '../engine/type_handlers/portal.js';
import blockadelabsskyboxTypeHandler from '../engine/type_handlers/blockadelabsskybox.js';
import character360TypeHandler from '../engine/type_handlers/character360.js';
import item360TypeHandler from '../engine/type_handlers/item360.js';
import npcTypeHandler from '../engine/type_handlers/npc.js';
import danceTypeHandler from '../engine/type_handlers/dance.js';
import lightTypeHandler from '../engine/type_handlers/light.js';
import windTypeHandler from '../engine/type_handlers/wind.js';
import spawnpointTypeHandler from '../engine/type_handlers/spawnpoint.js';
import reactTypeHandler from '../engine/type_handlers/react.js';
import {makeId} from '../engine/util.js';

//

// let currentAppRender = null;
const importFn = new Function('u', 'return import(u)');

//

const _bindDefaultComponents = ctx => {
  const app = ctx.useApp();
  // currentAppRender = app;

  // component handlers
  const componentHandlers = {};
  for (const {key, value} of app.components) {
    const componentHandlerTemplate = componentTemplates[key];
    if (componentHandlerTemplate) {
      componentHandlers[key] = componentHandlerTemplate(ctx, value);
    }
  }
  app.addEventListener('componentupdate', e => {
    const {key, value} = e;

    // currentAppRender = app;

    const componentHandler = componentHandlers[key];
    if (!componentHandler && value !== undefined) {
      const componentHandlerTemplate = componentTemplates[key];
      if (componentHandlerTemplate) {
        componentHandlers[key] = componentHandlerTemplate(ctx, value);
      }
    } else if (componentHandler && value === undefined) {
      componentHandler.remove();
      delete componentHandlers[key];
    }

    // currentAppRender = null;
  });

  // currentAppRender = null;
};

//

const importTypeExt = async (u, ext) => {
  switch (ext) {
    case 'js': {
      const m = await importFn(u);
      const fn = m.default;
      return fn;
    }
    case 'scn': {
      return scnTypeHandler(u);
    }
    case 'glb':
    case 'gltf':
    {
      return glbTypeHandler(u);
    }
    case 'vrm': {
      return vrmTypeHandler(u);
    }
    case 'mp3': {
      return mp3TypeHandler(u);
    }
    // case 'model.json':
    // case 'model3.json':
    // {
    //   return live2dTypeHandler(u);
    // }
    case 'item': {
      return itemTypeHandler(u);
    }
    case 'lore': {
      return loreTypeHandler(u);
    }
    case 'png': {
      return pngTypeHandler(u);
    }
    case 'portal': {
      return portalTypeHandler(u);
    }
    case 'blockadelabsskybox': {
      return blockadelabsskyboxTypeHandler(u);
    }
    case 'character360': {
      return character360TypeHandler(u);
    }
    case 'item360': {
      return item360TypeHandler(u);
    }
    case 'npc': {
      return npcTypeHandler(u);
    }
    case 'dance': {
      return danceTypeHandler(u);
    }
    case 'light': {
      return lightTypeHandler(u);
    }
    case 'wind': {
      return windTypeHandler(u);
    }
    case 'spawnpoint': {
      return spawnpointTypeHandler(u);
    }
    case 'react': {
      return reactTypeHandler(u);
    }
    /* case 'metaversefile': {
      const res = await fetch(u);
      const j = await res.json();
      if (j) {
        const {
          start_url,
          name, // XXX need to respect these
          description,
          components,
        } = j;
        let baseUrl = u.replace(/\/[^\/]*$/, '/');
        if (!/^(.+)?:/.test(baseUrl)) {
          baseUrl = `${location.protocol}//${location.host}${baseUrl}`;
        }
        const u2 = new URL(start_url, baseUrl).href;
        return await importType(u2);
      } else {
        return null;
      }
    } */
    default: {
      return null;
    }
  }
};
const importType = async u => {
  let match = u.match(/^data:([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/);
  if (match && match[1] === 'application') {
    const ext = match[2];
    return await importTypeExt(u, ext);
  }
  match = u.match(/\.((?:model[0-9]*\.)?[a-zA-Z0-9]+)$/);
  if (match) {
    const ext = match[1];
    return await importTypeExt(u, ext);
  }
  return null;
};
export class ImportManager {
  constructor({
    engineAppContextFactory,
    loadingManager,
  }) {
    this.engineAppContextFactory = engineAppContextFactory;
    this.loadingManager = loadingManager;
  }
  async importUrl(s) {
    try {
      let m = await importType(s);
      return m;
    } catch(err) {
      // Todo: need to output as an error for automated tests
      console.error(err)
      return null;
    }
  }
  createApp() {
    return new App();
  }
  createAppInternalFromContext(appSpec = {}, {
    onWaitPromise = null,
  } = {}) {
    const {
      type = '',
      content = '',
      start_url = null,
      components = [],
      position = null,
      quaternion = null,
      scale = null,
      parent = null,
      instanceId = makeId(5),
      in_front = false,
      app = new App(),
      appContext = this.engineAppContextFactory.makeAppContext({
        app,
      }),
    } = appSpec;

    if (!start_url && !(type && content)) {
      console.warn('start_url or (type && content) is required');
      debugger;
    }
  
    // transform
    const _updateTransform = () => {
      let matrixNeedsUpdate = false;
      if (Array.isArray(position)) {
        app.position.fromArray(position);
        matrixNeedsUpdate = true;
      } else if (position?.isVector3) {
        app.position.copy(position);
        matrixNeedsUpdate = true;
      }
      if (Array.isArray(quaternion)) {
        app.quaternion.fromArray(quaternion);
        matrixNeedsUpdate = true;
      } else if (quaternion?.isQuaternion) {
        app.quaternion.copy(quaternion);
        matrixNeedsUpdate = true;
      }
      if (Array.isArray(scale)) {
        app.scale.fromArray(scale);
        matrixNeedsUpdate = true;
      } else if (scale?.isVector3) {
        app.scale.copy(scale);
        matrixNeedsUpdate = true;
      }
      if (in_front) {
        const localPlayer = playersManager.getLocalPlayer();
        app.position.copy(localPlayer.position).add(new THREE.Vector3(0, 0, -1).applyQuaternion(localPlayer.quaternion));
        app.quaternion.copy(localPlayer.quaternion);
        app.scale.setScalar(1);
        matrixNeedsUpdate = true;
      }
      if (parent) {
        parent.add(app);
        matrixNeedsUpdate = true;
      }
  
      if (matrixNeedsUpdate) {
        app.updateMatrixWorld();
        app.lastMatrix.copy(app.matrixWorld);
      }
    }
    _updateTransform();

    // components
    const _updateComponents = () => {
      if (Array.isArray(components)) {
        for (const {key, value} of components) {
          app.setComponent(key, value);
        }
      } else if (typeof components === 'object' && components !== null) {
        for (const key in components) {
          const value = components[key];
          app.setComponent(key, value);
        }
      }
    };
    _updateComponents();

    const _updateKeys = () => {
      // if (start_url) {
      //   app.start_url = start_url;
      // }
      if (instanceId) {
        app.instanceId = instanceId;
      }
    };
    _updateKeys();

    const _updateSpec = () => {
      app.spec = {
        start_url: structuredClone(start_url),
        type: structuredClone(type),
        content: structuredClone(content),
        components: structuredClone(components),
        position: position ? position.toArray() : [0, 0, 0],
        quaternion: quaternion ? quaternion.toArray() : [0, 0, 0, 1],
        scale: scale ? scale.toArray() : [1, 1, 1],
      };
    };
    _updateSpec();
  
    // load
    const u = this.getObjectUrl(appSpec);

    if (u /*|| module*/) {
      const p = (async () => {
        let m;
        if (u) {
          m = await this.importUrl(u);
        // } else {
        //   m = module;
        }
        // console.log('load module', {u, m});
        await this.addModuleFromContext(app, appContext, m, u);
      })();

      // loading tracking
      const load = this.loadingManager.addLoad(u);
      (async () => {
        try {
          await p;
        } finally {
          load.finish();
        }
      })();

      if (onWaitPromise) {
        onWaitPromise(p);
      }
    }
  
    return app;
  }
  async createAppAsync(spec) {
    let p = null;
    const app = this.createAppInternalFromContext(spec, {
      onWaitPromise(newP) {
        p = newP;
      },
    });
    if (p !== null) {
      await p;
    }
    return app;
  }
  async addModuleFromContext(app, appContext, m, u) {
    if (!app || !appContext || !m) {
      console.warn('addModuleFromContext missing args', {app, appContext, m, u});
      debugger;
    }
  
    let renderSpec = null;
    let waitUntilPromise = null;
    const _initModule = () => {
      // currentAppRender = app;
  
      try {
        const fn = m;
        if (typeof fn === 'function') {
          appContext.setWaitUntil(p => {
            waitUntilPromise = p;
          });
          renderSpec = fn(appContext);
        } else {
          console.warn('module default export is not a function', m);
          return null;
        }
      } catch(err) {
        console.warn(err);
        return null;
      } finally {
        // currentAppRender = null;
      }
    };
    _initModule();
  
    if (waitUntilPromise) {
      await waitUntilPromise;
    }
  
    if (renderSpec instanceof THREE.Object3D) {
      const o = renderSpec;
      if (o !== app) {
        app.add(o);
        o.updateMatrixWorld();
      }
  
      _bindDefaultComponents(appContext);
      
      return app;
    } else if (renderSpec === false || renderSpec === null || renderSpec === undefined) {
      app.destroy();
      return null;
    } else if (renderSpec === true) {
      // console.log('background app', app);
      return null;
    } else {
      app.destroy();
      console.warn('unknown renderSpec:', renderSpec);
      throw new Error('unknown renderSpec');
    }
  }
  getObjectUrl(object, baseUrl = '') {
    let {
      // contentId,
      start_url,
    } = object;
    const {
      type,
      content,
    } = object;
  
    function typeContentToUrl(type, content) {
      if (typeof content === 'object') {
        content = JSON.stringify(content);
      }
      const dataUrlPrefix = 'data:' + type + ',';
      return dataUrlPrefix + encodeURIComponent(content) // + '.data'; // .replace(/\\//g, '%2F');
    }
  
    if (start_url) {
      if (start_url.endsWith('/')) {
        start_url += '.metaversefile';
      }
      
      if (baseUrl) {
        let u = new URL(start_url, baseUrl).href;
        // console.log('get object url 1', u);
        return u;
      } else {
        // console.log('get object url 2', start_url);
        return start_url;
      }
    } else if (type && content) {
      const u = typeContentToUrl(type, content);
      // console.log('get object url 3', u);
      return u;
    } else {
      return null;
    }
  }
}