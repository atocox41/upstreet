import React, {useState, useEffect} from 'react';
import classnames from 'classnames';

import styles from '../../../styles/CameraUi.module.css';

//

export const CameraUi = ({
  engine,
}) => {
  const [controlsMode, setControlsMode] = useState(() => engine.controlsManager.getMode());
  const [hovers, setHovers] = useState(() => ({
    left: false,
    right: false,
    up: false,
    down: false,
  }));

  //

  useEffect(() => {
    if (engine) {
      const controlsModechange = e => {
        const {
          mode,
        } = e.data;
        setControlsMode(mode);
      };
      engine.controlsManager.addEventListener('modechange', controlsModechange);

      return () => {
        engine.controlsManager.removeEventListener('modechange', controlsModechange);
      };
    }
  }, [
    engine,
  ]);

  //

  if (controlsMode !== 'adventure') {
    return null;
  }

  //

  return (
    <div className={styles.cameraUi}>
      <div className={classnames(
        styles.chevron,
        styles.left,
        hovers.left ? styles.hovered : '',
      )}>
        <img className={styles.icon} src='/images/chevron.svg' />
      </div>
      <div className={classnames(
        styles.chevron,
        styles.right,
        hovers.right ? styles.hovered : '',
      )}>
        <img className={styles.icon} src='/images/chevron.svg' />
      </div>
      <div className={classnames(
        styles.chevron,
        styles.up,
        hovers.uo ? styles.hovered : '',
      )}>
        <img className={styles.icon} src='/images/chevron.svg' />
      </div>
      <div className={classnames(
        styles.chevron,
        styles.down,
        hovers.down ? styles.hovered : '',
      )}>
        <img className={styles.icon} src='/images/chevron.svg' />
      </div>

      <div className={classnames(
        styles.chevron,
        styles.topLeft,
        hovers.topLeft ? styles.hovered : '',
      )}>
        <img className={styles.icon} src='/images/chevron.svg' />
      </div>
      <div className={classnames(
        styles.chevron,
        styles.topRight,
        hovers.topRight ? styles.hovered : '',
      )}>
        <img className={styles.icon} src='/images/chevron.svg' />
      </div>
      <div className={classnames(
        styles.chevron,
        styles.bottomLeft,
        hovers.bottomLeft ? styles.hovered : '',
      )}>
        <img className={styles.icon} src='/images/chevron.svg' />
      </div>
      <div className={classnames(
        styles.chevron,
        styles.bottomRight,
        hovers.bottomRight ? styles.hovered : '',
      )}>
        <img className={styles.icon} src='/images/chevron.svg' />
      </div>
    </div>
  );
};