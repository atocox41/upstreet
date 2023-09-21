import {Winds} from './simulation/wind.js';

export class EnvironmentManager {
  #winds = new Set();
  #mirrors = new Set();
  wind = new Winds(this.#winds);

  addWind(wind) {
    this.#winds.add(wind);
  }
  removeWind(wind) {
    this.#winds.delete(wind);
  }
  getWinds() {
    return this.#winds;
  }

  getMirrors() {
    return this.#mirrors;
  }
}