import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';
import styles from '../../../styles/InputBar.module.css';

export const InputBar = ({
  // setChatLocked,

  chatEnabled,
  onChat,

  // voiceEnabled,
  // onVoice,

  videoEnabled,
  onVideo,
}) => {
  return (
    <div className={styles.inputBar} onClick={e => {
      
    }}>
      <div className={styles.buttons}>
        <div className={classnames(
          styles.button,
          chatEnabled ? styles.selected : null,
        )} onClick={e => {
          onChat();
        }}>
          <img src={'/ui/assets/icons/keyboard.svg'} className={classnames(
            styles.icon,
          )} />
        </div>
        {/* <div className={classnames(
          styles.button,
          voiceEnabled ? styles.selected : null,
        )} onClick={e => {
          onVoice();
        }}>
          <img src={'/ui/assets/icons/mic.svg'} className={classnames(
            styles.icon,
          )} />
        </div> */}
        <div className={classnames(
          styles.button,
          videoEnabled ? styles.selected : null,
        )} onClick={e => {
          onVideo();
        }}>
          <img src={'/ui/assets/icons/facecam.svg'} className={classnames(
            styles.icon,
          )} />
        </div>
      </div>
    </div>
  );
};