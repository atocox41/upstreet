import React, {
  useState,
  useEffect,
  // createRef,
} from 'react';

//

export const Io = ({
  fns,
}) => {
  useEffect(() => {
    // console.log('listen 1');
    const message = e => {
      // console.log('got message', e.data);
      if (e.data?.method === 'ioBus') {
        const {
          args,
        } = e.data;
        const {
          type: type2,
        } = args;
        const fn = fns[type2];
        // console.log('check fn', fn, type2, fns);
        fn && fn(args);
      }
    };
    globalThis.addEventListener('message', message);
    
    return () => {
      // console.log('listen 2');
      globalThis.removeEventListener('message', message);
    };
  }, [fns]);

  return (
    <></>
  );
};