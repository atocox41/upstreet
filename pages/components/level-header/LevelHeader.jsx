import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';
import {
  UserIcon,
} from '../user-icon/UserIcon.jsx';

//

import styles from '../../../styles/LevelHeader.module.css';

//

export const LevelHeader = ({
  engine,
}) => {
  const [tab, setTab] = useState('');
  const [plusOpen, setPlusOpen] = useState(false);

  const toggleTab = newTab => {
    if (tab === newTab) {
      setTab('');
    } else {
      setTab(newTab);
    }
  };

  const {
    loginManager,
    playersManager,
  } = engine;
  const localPlayer = playersManager.getLocalPlayer();

  return (
    <div className={styles.levelHeader}>
      <header className={styles.header}>
        <div className={classnames(
          styles.dropdown,
          plusOpen ? styles.open : null,
        )}>
          <div className={styles.list}>
            {loginManager ? <>
              <div className={styles.item}>
                <img src='/ui/assets/icons/character-add.svg' className={styles.icon} />
                <span className={styles.text}>Add character</span>
              </div>
            </> : <>
              <div className={styles.item}>
                <img src='/ui/assets/icons/fork.svg' className={styles.icon} />
                <span className={styles.text}>Fork world</span>
              </div>
            </>}
          </div>
        </div>
        <button className={styles.button} onClick={e => {
          setPlusOpen(!plusOpen);
        }}>
          <img src='/ui/assets/icons/plus.svg' className={styles.icon} />
        </button>
        
        <div className={styles.spacer} />

        <button className={styles.button} onClick={e => {
          toggleTab('user');
        }}>
          <UserIcon player={localPlayer} />
          <span className={styles.text}>{localPlayer.name}</span>
        </button>

        <div className={styles.buttons}>
          <button className={styles.button} onClick={e => {
            toggleTab('world');
          }}>
            <img src='/ui/assets/icons/world-edit.svg' className={styles.icon} />
          </button>

          <button className={styles.button} onClick={e => {
            toggleTab('users');
          }}>
            <img src='/ui/assets/icons/personas.svg' className={styles.icon} />
          </button>
        </div>
      </header>
    </div>
  );
};