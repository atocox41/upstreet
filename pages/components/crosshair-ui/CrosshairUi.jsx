import React, {
  useState,
  useEffect,
} from 'react';
import classnames from 'classnames';
import styles from '../../../styles/CrosshairUi.module.css';

//

export const CrosshairUi = ({
  engine,
}) => {
  const [mode, setMode] = useState(() => engine.cameraManager.getMode());

  useEffect(() => {
    const update = (e) => {
      let {
        mode,
      } = e.data;
      if (engine.cameraManager.hasControllerFn()) {
        mode = 'isometric';
      }
      setMode(mode);
    };
    engine.cameraManager.addEventListener('modeupdate', update);
    engine.cameraManager.addEventListener('controllerfnupdate', update);

    return () => {
      engine.cameraManager.removeEventListener('modeupdate', update);
      engine.cameraManager.removeEventListener('controllerfnupdate', update);
    };
  }, [
    engine,
  ]);

  return (
    <div className={classnames(
      styles.crosshairUi,
      mode === 'firstperson' ? styles.firstperson : null,
      mode === 'isometric' ? styles.isometric : null,
    )}>
      <div className={styles.wrap}>
        <img className={styles.circle} src={'/images/circle.svg'} />
        <img className={styles.crosshair} src={'/images/crosshair.svg'} />
      </div>
    </div>
  )
}