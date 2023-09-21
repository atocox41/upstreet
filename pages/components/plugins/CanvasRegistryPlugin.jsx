import React, {
  useState,
  useEffect,
} from 'react';
import styles from '../../../styles/CanvasRegistryPlugin.module.css';
import canvasRegistry from '../../../packages/engine/canvas-registry/canvas-registry.js';

//

export const CanvasRegistryPlugin = ({
  ioBus,
}) => {
  useEffect(() => {
    const registerCanvas = async e => {
      const {
        canvasId,
        width,
        height,
      } = e;

      if (!canvasId) {
        debugger;
      }

      // const offscreenCanvas = new OffscreenCanvas(width, height);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvasRegistry.addCanvas(canvasId, canvas);
      const offscreenCanvas = canvas.transferControlToOffscreen();
      return offscreenCanvas;
    };
    ioBus.registerHandler('registerCanvas', registerCanvas);

    const unregisterCanvas = async e => {
      const {
        canvasId,
      } = e;
      canvasRegistry.removeCanvas(canvasId);
    };
    ioBus.registerHandler('unregisterCanvas', unregisterCanvas);

    return () => {
      ioBus.unregisterHandler('registerCanvas', registerCanvas);
      ioBus.unregisterHandler('unregisterCanvas', unregisterCanvas);
    };
  }, []);

  return (
    <div className={styles.canvasRegistryPlugin}></div>
  );
};