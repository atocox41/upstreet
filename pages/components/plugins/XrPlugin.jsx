import React, {
  useState,
  useEffect,
} from 'react';
import classnames from 'classnames';

import {
  IoBus,
} from '../io-bus/IoBus.js';

import styles from '../../../styles/XrPlugin.module.css';

//

// let loaded = false;
export const XrPlugin = () => {
  // const [enabled, setEnabled] = useState(false);
  const [enabled, setEnabled] = useState(true);

  // XXX note: Meta's Immersive WebXR extension does return
  // XXX navigator.xr.isSessionSupported('immersive-vr') true for the iframe case
  // XXX that means we need to use the IoBus to request the real value from the parent window
  // useEffect(() => {
  //   if (!loaded) {
  //     loaded = true;

  //     const update = async () => {
  //       const enabled = !!navigator.xr && await navigator.xr.isSessionSupported('immersive-vr');
  //       // console.log('xr enabled', enabled);
  //       enabled && setEnabled(true);
  //     };
  //     update();

  //     if (navigator.xr) {
  //       // console.log('listen for device change');
  //       navigator.xr.addEventListener('devicechange', update);
  //       return () => {
  //         navigator.xr.removeEventListener('devicechange', update);
  //       };
  //     }
  //   }
  // }, []);
  
  return (
    <div className={
      classnames(
        styles.xr,
        enabled ? styles.enabled : null,
      )
    }>
      <div
        className={styles.btn}
        onClick={e => {
          // console.log('dispatch io bus request');
          e.preventDefault();
          e.stopPropagation();
          
          IoBus.request({
            contentWindow: globalThis.parent,
            method: 'requestXrSession',
            args: {
            },
          });
        }}
      >
        <img src="./public/assets/icons/headset.svg" className={styles.img} />
      </div>
    </div>
  );
};