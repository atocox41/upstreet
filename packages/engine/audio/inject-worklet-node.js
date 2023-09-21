import {
  makePromise,
  makeId,
} from '../util.js';

export class AudioInjectWorkletNode extends AudioWorkletNode {
  constructor({
    audioContext,
  }) {
    super(
      audioContext,
      'ws-inject-worklet',
      {
        outputChannelCount: [1], // assume mono
      }
    );

    this.waitForFinish = (() => {
      const cbs = new Map();

      const message = (e) => {
        const { data } = e;
        const { method, args } = data;
        if (method === 'finishResponse') {
          const { id } = args;
          const cb = cbs.get(id);
          if (!cb) {
            console.warn('missing cb', {
              id,
              cbs,
            });
            throw new Error('no cb: ' + id);
          }
          cbs.delete(id);
          cb(data);
        } else {
          console.warn('unexpected audio worker inject message', {
            method,
            args,
          });
        }
      };
      this.port.onmessage = message;

      return () => {
        const p = makePromise();
        const id = makeId(8);
        cbs.set(id, p.resolve);

        this.port.postMessage({
          method: 'finishRequest',
          args: {
            id,
          },
        });
        return p;
      };
    })();
  }
}