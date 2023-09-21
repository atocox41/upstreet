
import {
  AvatarManager,
} from '../engine/avatars/avatar-manager.js';
import loaders from '../engine/loaders.js';

const useAvatarManager = (() => {
  let avatarManager = null;
  return () => {
    if (!avatarManager) {
      avatarManager = new AvatarManager();
    }
    return avatarManager;
  };
})();
// XXX this is expensive... should we load all loaders?
const useLoaders = () => loaders;

export class CompanionAppContext {
  #app;
  constructor({
    app,
  }) {
    this.#app = app;

    this.useApp = () => this.#app;
    this.useAvatarManager = () => useAvatarManager();
    this.useLoaders = () => useLoaders();
    this.useEngine = () => null;
    this.useActivate = () => {};
    this.useExport = (fn) => {};

    this.waitUntil = () => {
      throw new Error('waitUntil must be overridden');
    };
  }
  setWaitUntil(waitUntil) {
    this.waitUntil = waitUntil;
  }
}