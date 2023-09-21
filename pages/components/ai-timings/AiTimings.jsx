import styles from '../../../styles/Companion.module.css';
import React from 'react';
export const AiTimings = ({
    timings,
  }) => {
    return (
      <div className={styles.timings}>
        {Object.keys(timings).map((name, index) => {
          const time = timings[name];
          let timeString = '';
          if (isFinite(time)) {
            timeString = (time / 1000).toFixed(1);
          }
          return (
            <div className={styles.timing} key={index}>
              <div className={styles.name}>{timeString ? name : ''}</div>
              <div className={styles.time}>{timeString}</div>
            </div>
          );
        })}
      </div>
    );
  };