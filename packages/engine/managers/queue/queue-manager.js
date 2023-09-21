import {
  makeId,
  makePromise,
} from '../../util.js';

//

export class QueueManager {
  constructor({
    parallelism = 1,
  } = {}) {
    this.parallelism = parallelism;

    this.numRunning = 0;
    this.queue = [];
  }

  async waitForTurn(fn) {
    if (this.numRunning < this.parallelism) {
      this.numRunning++;
      const p = fn();
      const result = await p;

      this.numRunning--;
      if (this.queue.length > 0) {
        const fn2 = this.queue.shift();
        this.waitForTurn(fn2);
      }

      return result;
    } else {
      const p = makePromise();
      this.queue.push(async () => {
        const p2 = fn();
        const result = await p2;
        p.resolve(result);
        return result;
      });
      const result = await p;
      return result;
    }
  }
}