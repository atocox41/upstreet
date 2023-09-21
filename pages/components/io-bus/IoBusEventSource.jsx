import React, {
  useState,
  useEffect,
  createRef,
} from 'react';

import {
  eventNames,
  copyEvent,
} from './IoBus.js';

//

// function registerIoEventHandler(type, fn) {
//   ioEventHandlers[ type ].push(fn);
// }
// function unregisterIoEventHandler(type, fn) {
//   const hs = ioEventHandlers[ type ];
//   const index = hs.indexOf(fn);

//   if (index !== -1) {
//     hs.splice(index, 1);
//   }
// }

// const types = [ 'keydown', 'keypress', 'keyup', 'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseenter', 'mouseleave', 'wheel', 'paste' ];

//

export const IoBusEventSource = ({
  engine,
}) => {
  useEffect(() => {
    if (engine) {
      const {ioManager} = engine;

      const ioEventHandlers = {};
      for (const eventName of eventNames.concat([''])) {
        ioEventHandlers[eventName] = [];
      }

      const cleanups = eventNames.map(type => {
        const fn = event => {
          if (
            ['CANVAS', 'BODY'].includes(event.target.nodeName) ||
            ['moueenter', 'mouseleave'].includes(event.type)
          ) {
            let broke = false;
            // type
            for (let i = 0; i < ioEventHandlers[ type ].length; i ++) {
              const result = ioEventHandlers[ type ][ i ](event);
              if (result === false) {
                broke = true;
                break;
              }
            }
            // all
            if (!broke) {
              const type = '';
              for (let i = 0; i < ioEventHandlers[ type ].length; i ++) {
                const result = ioEventHandlers[ type ][ i ](event);
                if (result === false) {
                  broke = true;
                  break;
                }
              }
            }
            // default
            if (!broke) {
              // const o = copyEvent(event);
              ioManager.dispatchEvent(new MessageEvent('ioBus', {
                data: event,
              }));
            } else if (event.cancelable) {
              event.stopPropagation();
              event.preventDefault();
            }
          }
        };

        document.addEventListener(type, fn, {
          passive: type === 'wheel',
        });
        
        return () => {
          document.removeEventListener(type, fn);
        };
      });

      return () => {
        for (const fn of cleanups) {
          fn();
        }
      };
    }
  }, [
    engine,
  ]);

  //

  return (
    <></>
  );
};
// export {
//     IoHandler,
//     registerIoEventHandler,
//     unregisterIoEventHandler,
// };