export class AppContext {
  constructor() {
    this.waitUntil = () => {
      throw new Error('waitUntil must be overridden');
    };
  }
  setWaitUntil(waitUntil) {
    this.waitUntil = waitUntil;
  }
}