// import * as THREE from 'three';
// import * as BufferGeometryUtils from '../../../packages/three/examples/jsm/utils/BufferGeometryUtils.js';
import React, {useState, useEffect, useRef} from 'react';
import classnames from 'classnames';

import styles from '../../../styles/AdventureControlsUi.module.css';

//

export const SelectedAppUi = ({
  // engine,
  selectedApp,
}) => {
  const name = selectedApp.getName();
  const description = selectedApp.getDescription();

  //

  return (
    <div className={styles.selectedAppUi}>
      <div className={styles.name}>{name}</div>
      <div className={styles.description}>{description}</div>
    </div>
  );
};

//

export const AdventureControlsUi = ({
  engine,
}) => {
  const [highlightedApp, setHighlightedApp] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [mousePosition, setMousePosition] = useState(null);

  const canvasRef = useRef();

  //

  // controls manager binding
  useEffect(() => {
    if (engine) {
      const validApp = app => app ? app.appType !== 'blockadelabsskybox' : false;

      const highlightedappchange = e => {
        const {
          app,
        } = e.data;
        setHighlightedApp(validApp(app) ? app : null);
      };
      engine.controlsManager.addEventListener('highlightedappchange', highlightedappchange);

      const selectedappchange = e => {
        const {
          app,
        } = e.data;
        setSelectedApp(validApp(app) ? app : null);
      };
      engine.controlsManager.addEventListener('selectedappchange', selectedappchange);

      const mousemove = e => {
        if (e.data) {
          const {
            clientX,
            clientY,
          } = e.data;
          setMousePosition([clientX, clientY]);
        } else {
          setMousePosition(null);
        }
      };
      engine.controlsManager.addEventListener('mousemove', mousemove);

      return () => {
        engine.controlsManager.removeEventListener('highlightedappchange', highlightedappchange);
        engine.controlsManager.removeEventListener('selectedappchange', selectedappchange);
        engine.controlsManager.removeEventListener('mousemove', mousemove);
      };
    }
  }, [
    engine,
  ]);

  //

  const size = 50;
  const width = 10;
  const height = 3;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');

      // draw a reticle
      let w, h;
      // if (mouseSelection) {
      //   const [minX, minY, maxX, maxY] = mouseSelection;

      //   w = maxX - minX;
      //   h = maxY - minY;
      // } else {
        w = size;
        h = size;
      // }

      canvas.width = w;
      canvas.height = h;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FFF';
      // top left
      ctx.fillRect(0, 0, width, height);
      ctx.fillRect(0, 0, height, width);
      // top right
      ctx.fillRect(w - width, 0, width, height);
      ctx.fillRect(w - height, 0, height, width);
      // bottom left
      ctx.fillRect(0, h - height, width, height);
      ctx.fillRect(0, h - width, height, width);
      // bottom right
      ctx.fillRect(w - width, h - height, width, height);
      ctx.fillRect(w - height, h - width, height, width);
    }
  }, [
    canvasRef,
    // mouseSelection,
  ]);

  //

  return (
    <div className={classnames(
      styles.adventureControlsUi,
    )}>
      {selectedApp ? (<SelectedAppUi
        engine={engine}
        selectedApp={selectedApp}
      />) : null}  

      <canvas className={classnames(
        styles.cursor,
        highlightedApp ? styles.hovered : '',
      )} ref={canvasRef} style={{
        display: mousePosition ? null : 'none',
        // width: `${size}px`,
        // height: `${size}px`,
        left: (
          mousePosition ?
            `${mousePosition[0] - size / 2}px`
          :
            null
          ),
        top: (
          mousePosition ?
            `${mousePosition[1] - size / 2}px`
          :
            null
          ),
      }} />
    </div>
  );
};