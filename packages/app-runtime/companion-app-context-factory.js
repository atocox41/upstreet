import {
  CompanionAppContext,
} from './companion-app-context.js';

//

export class CompanionAppContextFactory {
  constructor() {}
  makeAppContext({
    app,
  }) {
    const appContext = new CompanionAppContext({
      app,
    });
    return appContext;
  }
}