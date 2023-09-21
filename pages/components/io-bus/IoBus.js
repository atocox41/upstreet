// import React from 'react';
import {
  makePromise,
} from '../../../packages/engine/util.js';

//

export const eventNames = [
  'mousedown',
  'mouseup',
  'mouseenter',
  'mouseleave',
  'pointerdown',
  'pointerup',
  'pointermove',
  // 'pointerhover',
  'click',
  'dblclick',
  'keydown',
  'keyup',
  'keypress',
  'mousemove',
  'wheel',
  'dragenter',
  'dragover',
  'dragleave',
  'drop',
  'dragstart',
  'drag',
  'dragend',
];
export const onEventNames = [
  'onMouseDown',
  'onMouseUp',
  'onMouseEnter',
  'onMouseLeave',
  'onPointerDown',
  'onPointerUp',
  'onPointerMove',
  // 'onPointerHover',
  'onClick',
  'onDblClick',
  'onKeyDown',
  'onKeyUp',
  'onKeyPress',
  'onMouseMove',
  'onWheel',
  'onDragEnter',
  'onDragOver',
  'onDragLeave',
  'onDrop',
  'onDragStart',
  'onDrag',
  'onDragEnd',
];
export const keyNames = [
  'type',
  'key',
  'keyCode',
  'which',
  'ctrlKey',
  'shiftKey',
  'altKey',
  'metaKey',
  'clientX',
  'clientY',
  'movementX',
  'movementY',
  'deltaX',
  'deltaY',
  'deltaZ',
  'button',
  'buttons',
  'repeat',
  'files',
];
export const copyEvent = e => {
  const o = {};
  for (const keyName of keyNames) {
    o[keyName] = e[keyName];
  }
  return o;
};

//

export class IoBus extends EventTarget {
  constructor({
    iframe,
  }) {
    super();

    this.iframe = iframe;

    this.handlers = new Map();

    this.nextCbId = 0;
    this.cbs = new Map();

    this.#listen();
  }
  #listen() {
    return;
    (async () => {
      if (!this.iframe.contentWindow) {
        await new Promise((resolve, reject) => {
          const load = e => {
            cleanup();
            resolve();
          };
          this.iframe.addEventListener('load', load, {
            once: true,
          });

          const cleanup = () => {
            this.iframe.removeEventListener('load', load);
          };
        });
      }

      globalThis.addEventListener('message', async e => {
        const {
          id,
          method,
          type,
          args,
        } = e.data;

        if (method !== void 0) {
          if (method === 'response') {
            const cb = this.cbs.get(id);
            if (cb) {
              this.cbs.delete(id);
              cb(args.error, args.result);
            } else {
              console.warn('no callback for id', id);
              debugger;
            }
          } else if (method === 'ioBus') {
            // prevent recursion of events iframe -> parent -> iframe
            this.tx(() => {
              this.dispatchEvent(new MessageEvent('ioBus', {
                data: args,
              }));
            });
          } else if (method === 'sendMessage') {
            // console.log('got data', {
            //   args,
            //   e,
            // });

            this.dispatchEvent(new MessageEvent('sendMessage', {
              data: {
                type,
                args,
              },
            }));
          } else {
            const handler = this.handlers.get(method);
            if (handler) {
              let error, result;
              try {
                result = await handler(args);
              } catch(err) {
                error = err;
              }
              if (error) {
                console.warn('error in handler', method, error);
              }
              if (id !== void 0) {
                const _getTransfers = o => {
                  if (o instanceof Blob || o instanceof OffscreenCanvas) { 
                    return [o];
                  } else {
                    return [];
                  }
                };
                const transfers = _getTransfers(result);
                // console.log('post response', result, transfers);

                IoBus.request({
                  contentWindow: e.source,
                  id,
                  method: 'response',
                  args: {
                    error,
                    result,
                  },
                  transfers,
                });
              }
            } else {
              console.warn('no handler for method', method);
            }
          }
        }
      });
    })();
  }

  registerHandler(method, fn) {
    this.handlers.set(method, fn);
  }
  unregisterHandler(method, fn) {
    const localFn = this.handlers.get(method);
    if (localFn === fn) {
      this.handlers.delete(method);
    } else {
      throw new Error('unregisterHandler fn mismatch');
    }
  }

  static request({
    contentWindow,
    id,
    method,
    type,
    args,
    transfers,
  }) {
    contentWindow.postMessage({
      id,
      method,
      type,
      args,
    }, '*', transfers);
  }
  async request(method, args, transfers) {
    debugger;

    const id = ++this.nextCbId;
    
    const p = makePromise();
    const cb = (error, result) => {
      this.cbs.delete(id);

      if (!error) {
        p.resolve(result);
      } else {
        p.reject(error);
      }
    };
    this.cbs.set(id, cb);

    IoBus.request({
      contentWindow: this.iframe.contentWindow,
      id,
      method,
      args,
      transfers,
    });

    const result = await p;
    return result;
  }
  sendMessage(type, args, transfers) {
    // IoBus.request({
    //   contentWindow: this.iframe.contentWindow,
    //   method: 'sendMessage',
    //   type,
    //   args,
    //   transfers,
    // });

    this.dispatchEvent(new MessageEvent('message', {
      data: {
        type,
        args,
      },
    }));
  }
  postMessage(method, args, transfers) {
    IoBus.request({
      contentWindow: this.iframe.contentWindow,
      method,
      args,
      transfers,
    });
  }

  /* #updating = false;
  tx(fn) {
    this.#updating = true;
    try {
      fn();
    } finally {
      this.#updating = false;
    }
  } */

  #dispatchIoBusEvent(o) {
    this.dispatchEvent(new MessageEvent('ioBus', {
      data: o,
    }));
  }
  keydown(e) {
    const o = copyEvent(e);
    this.#dispatchIoBusEvent(o);
    // if (!this.#updating) {
    //   this.request('ioBus', o);
    // }
  }
  keyup(e) {
    const o = copyEvent(e);
    this.#dispatchIoBusEvent(o);
    // if (!this.#updating) {
    //   this.request('ioBus', o);
    // }
  }
  keypress(e) {
    const o = copyEvent(e);
    this.#dispatchIoBusEvent(o);
    // if (!this.#updating) {
    //   this.request('ioBus', o);
    // }
  }
  mousedown(e) {
    const o = copyEvent(e);
    this.#dispatchIoBusEvent(o);
    // if (!this.#updating) {
    //   this.request('ioBus', o);
    // }
  }
  mouseup(e) {
    const o = copyEvent(e);
    this.#dispatchIoBusEvent(o);
    // if (!this.#updating) {
    //   this.request('ioBus', o);
    // }
  }
  mouseenter(e) {
    const o = copyEvent(e);
    this.#dispatchIoBusEvent(o);
    // if (!this.#updating) {
    //   this.request('ioBus', o);
    // }
  }
  mouseleave(e) {
    const o = copyEvent(e);
    this.#dispatchIoBusEvent(o);
    // if (!this.#updating) {
    //   this.request('ioBus', o);
    // }
  }
  click(e) {
    const o = copyEvent(e);
    this.#dispatchIoBusEvent(o);
    // if (!this.#updating) {
    //   this.request('ioBus', o);
    // }
  }
  mousemove(e) {
    const o = copyEvent(e);
    this.#dispatchIoBusEvent(o);
    // if (!this.#updating) {
    //   this.request('ioBus', o);
    // }
  }
  wheel(e) {
    const o = copyEvent(e);
    this.#dispatchIoBusEvent(o);
    // if (!this.#updating) {
    //   this.request('ioBus', o);
    // }
  }

  dragenter(e) {
    // const o = copyEvent(e);
    // this.#dispatchIoBusEvent(o);
    // if (!this.#updating) {
    //   this.request('ioBus', o);
    // }
  }
  dragover(e) {
    // const o = copyEvent(e);
    // this.#dispatchIoBusEvent(o);
    // if (!this.#updating) {
    //   this.request('ioBus', o);
    // }
  }
  dragleave(e) {
    // const o = copyEvent(e);
    // this.#dispatchIoBusEvent(o);
    // if (!this.#updating) {
    //   this.request('ioBus', o);
    // }
  }
  drop(e) {
    // const o = copyEvent(e);
    // this.#dispatchIoBusEvent(o);
    // if (!this.#updating) {
    //   this.request('ioBus', o);
    // }
  }
  dragstart(e) {
    // const o = copyEvent(e);
    // this.#dispatchIoBusEvent(o);
    // if (!this.#updating) {
    //   this.request('ioBus', o);
    // }
  }
  drag(e) {
    // const o = copyEvent(e);
    // this.#dispatchIoBusEvent(o);
    // if (!this.#updating) {
    //   this.request('ioBus', o);
    // }
  }
  dragend(e) {
    // const o = copyEvent(e);
    // this.#dispatchIoBusEvent(o);
    // if (!this.#updating) {
    //   this.request('ioBus', o);
    // }
  }
}