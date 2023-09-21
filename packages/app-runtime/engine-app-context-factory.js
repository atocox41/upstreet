import {
  EngineAppContext,
} from './engine-app-context.js';

//

export class EngineAppContextFactory {
  constructor({
    engine,
  }) {
    this.engine = engine;
  }
  makeAppContext({
    app,
  }) {
    return new EngineAppContext({
      app,
      engine: this.engine,
    });
  }
}