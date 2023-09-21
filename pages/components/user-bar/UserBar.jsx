import React, {
  useState,
  useEffect,
  useRef,
  createContext,
} from 'react';
import classnames from 'classnames';
import {
  // LoginProfileProvider,
  LoginProfileConsumer,
} from '../login-provider/LoginProvider.jsx';

import styles from '../../../styles/UserBar.module.css';
import topBarStyles from '../../../styles/TopBar.module.css';

//

export const UserBar = ({
  selected,
  onClick,
}) => {
  return (
    <LoginProfileConsumer>
      {userValue => {
        const {
          name,
          character,
        } = userValue;

        return (
          <div className={classnames(
            topBarStyles.button,
            selected ? topBarStyles.selected : null,
          )} onClick={e => {
            onClick && onClick(e);
          }}>
            <div className={topBarStyles.background} />
            {character ? (
              <img className={classnames(
                topBarStyles.img,
                topBarStyles.small,
              )} src='/ui/assets/icons/plus.svg' />
            ) : (
              <div className={topBarStyles.imgPlaceholder} />
            )}
            <div className={topBarStyles.text}>{name}</div>
          </div>
        );
      }}
    </LoginProfileConsumer>
  );
};