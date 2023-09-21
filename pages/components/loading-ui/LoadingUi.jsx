import React, {
  useState,
  useEffect,
} from 'react';
import classnames from 'classnames';
import styles from '../../../styles/LoadingUi.module.css';

//

export const LoadingUi = ({
  loadingManager,
}) => {
  const [currentLoad, setCurrentLoad] = useState(null);
  const [numerator, setNumerator] = useState(0);
  const [denominator, setDenominator] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (loadingManager) {
      const currentloadupdate = e => {
        const {
          load,
        } = e.data;
        setCurrentLoad(load);
      };
      loadingManager.addEventListener('currentloadupdate', currentloadupdate);
      const update = (e) => {
        const {numerator, denominator, progress} = e.data;
        setNumerator(numerator);
        setDenominator(denominator);
        setProgress(progress);
      };
      loadingManager.addEventListener('update', update);
      const finish = () => {
        setDone(true);
      };
      loadingManager.addEventListener('finish', finish);

      return () => {
        loadingManager.removeEventListener('currentloadupdate', currentloadupdate);
        loadingManager.removeEventListener('update', update);
        loadingManager.removeEventListener('finish', finish);
      };
    }
  }, [
    loadingManager,
  ]);

  return (
    <div className={classnames(
      styles.loadingUi,
      done ? styles.done : null,
    )}>
      <img src={'/images/breezer-512.jpeg'} className={styles.background} />
      <progress className={styles.progress} value={numerator} max={denominator} />
      <div className={styles.percent}>{(progress * 100).toFixed(0)}%</div>
      <div className={styles.name}>{currentLoad ? currentLoad.name : '...'}</div>
    </div>
  )
}