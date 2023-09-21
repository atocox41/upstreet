import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';

//

import styles from '../../../styles/UserIcon.module.css';

//

const width = 64;
const height = 64;

export const UserIcon = ({
  player,
}) => {
  const canvasRef = useRef(null);

  const dpr = globalThis.devicePixelRatio;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (player) {
      console.log('render player', player, canvas);
    }
  }, [player, canvasRef]);

  return (
    <div className={styles.userIcon}>
      <canvas
        className={styles.icon}
        width={width * dpr}
        height={height * dpr}
      />
    </div>
  );
};