// import * as THREE from 'three';
import React, {useEffect, useRef, useState} from 'react';
import classnames from 'classnames';

import styles from './MouseDot.module.css';

//

const frameSize = 64;
const numFrames = 64;
const numFramesPerRow = Math.sqrt(numFrames);
const arrowTime = 5000;
const timeDiff = arrowTime / numFrames;

/* const _downloadArrowImage = async () => {
   const img = new Image();
   img.crossOrigin = 'Anonymous';
   await new Promise((accept, reject) => {
    img.onload = () => {
      accept();
    };
    img.onerror = reject;
    img.src = './images/ui/arrows.png';
  });
  return img;
}; */

export const MouseDot = function({
  className,
  enabled = true,
  up = false,
  down = false,
  animate = false,
  x,
  y,
  ax,
  ay,
  onClick,
}) {
  /* const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');

      let live = true;
      let interval = null;
      (async () => {
        const renderedCanvas = await _downloadArrowImage();

        let index = 0;
        const _recurse = () => {
          const x = (index % numFramesPerRow) * frameSize;
          const y = Math.floor(index / numFramesPerRow) * frameSize;
          ctx.drawImage(renderedCanvas, x, y, frameSize, frameSize, 0, 0, frameSize, frameSize);
          index = (index + 1) % numFrames;
        };
        interval = setInterval(_recurse, timeDiff);
      })().catch(err => {
        console.warn('err', err);
      });
      return () => {
        live = false;
        clearInterval(interval);
      };
    }
  }, [canvasRef]); */

  return enabled ? (
    <div
      className={classnames(
        styles.mouseDotContainer,
        up ? styles.up : null,
        down ? styles.down : null,
        className,
      )}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        left: ax,
        top: ay,
      }}
      onClick={onClick}
    >
      <div
        className={classnames(
          styles.mouseDot,
          // animate ? styles.animate : null,
        )}
      >
        <div className={styles.perspective}>
          {/* <canvas
            className={styles.canvas}
            width={frameSize}
            height={frameSize}
            ref={canvasRef}
          /> */}
        </div>
      </div>
    </div>
  ) : null;
};