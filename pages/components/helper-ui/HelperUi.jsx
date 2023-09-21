import * as THREE from 'three';
import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';

import styles from '../../../styles/Adventure.module.css';

//

export const HelperUi = ({
  localStorageManager,
  loaded,
}) => {
  const [controlsVisible, setControlsVisible] = useState(() => localStorageManager.getControlsVisible());

  // bind account manager
  useEffect(() => {
    const controlsvisibleupdate = e => {
      const {
        controlsVisible,
      } = e.data;
      setControlsVisible(controlsVisible);
    };
    localStorageManager.addEventListener('controlsvisibleupdate', controlsvisibleupdate);

    return () => {
      localStorageManager.removeEventListener('controlsvisibleupdate', controlsvisibleupdate);
    };
  }, []);

  // bind ? key listener
  useEffect(() => {
    const keydown = e => {
      switch (e.key) {
        case '?': {
          const focusedElement = document.activeElement;
          if (!focusedElement || !['INPUT', 'TEXTAREA'].includes(focusedElement.tagName)) {
            e.preventDefault();
            e.stopPropagation();

            localStorageManager.toggleControlsVisible();
          }
          break;
        }
      }
    };
    globalThis.addEventListener('keydown', keydown);

    return () => {
      globalThis.removeEventListener('keydown', keydown);
    };
  }, [
    controlsVisible,
  ]);

  //

  return (
    <div className={classnames(
      styles.helperUi,
      (!loaded || !controlsVisible) ? styles.hidden : null,
    )}>
      <div className={styles.grid}>
        <div className={styles.row}>
          <div className={styles.boxPlaceholder} />
          <div className={styles.box}>W</div>
          <div className={styles.boxPlaceholder} />
        </div>
        <div className={styles.row}>
          <div className={styles.box}>A</div>
          <div className={styles.box}>S</div>
          <div className={styles.box}>D</div>
        </div>
      </div>
      {/* <div className={styles.key}>
        <div className={styles.box}>
          <img className={styles.image} src='/images/mouse-left-click.png' />
        </div>
        <div className={styles.name}>Interact</div>
      </div> */}
      {/* <div className={styles.key}>
        <div className={styles.box}>
          <img className={styles.image} src='/images/mouse-right-click.png' />
        </div>
        <div className={styles.name}>Aim</div>
      </div> */}
      {/* <div className={styles.key}>
        <div className={styles.box}>
          <img className={styles.image} src='/images/mouse-middle-click.png' />
        </div>
        <div className={styles.name}>Focus</div>
      </div> */}
      <div className={styles.key}>
        <div className={classnames(
          styles.box,
          styles.small,
        )}>Shift</div>
        <div className={styles.name}>Run</div>
      </div>
      <div className={styles.key}>
        <div className={classnames(
          styles.box,
          styles.small,
        )}>Enter</div>
        <div className={styles.name}>Chat</div>
      </div>
      <div className={styles.key}>
        <div className={styles.box}>/</div>
        <div className={styles.name}>Command</div>
      </div>
      <div className={styles.key}>
        <div className={styles.box}>M</div>
        <div className={styles.name}>Map</div>
      </div>
      <div className={styles.key}>
        <div className={styles.box}>L</div>
        <div className={styles.name}>Build</div>
      </div>
      <div className={styles.key}>
        <div className={styles.box}>P</div>
        <div className={styles.name}>Freecam</div>
      </div>
      <div
        className={styles.key}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();

          setControlsVisible(false);
        }}
      >
        <div className={styles.box}>?</div>
        <div className={styles.name}>Hide</div>
      </div>
      {/* <div className={styles.wrap} onClick={e => {
        e.preventDefault();
        e.stopPropagation();

        setControlsVisible(false);
      }}>
        <img className={styles.image} src='/assets/x.svg' draggable={false} />
      </div> */}
      {/* <div
        className={styles.button}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();

          setControlsVisible(false);
        }}
      >
        <div className={styles.background} />
        <span className={styles.text}>Hide</span>
      </div> */}
    </div>
  );
};