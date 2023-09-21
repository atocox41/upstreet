// import {
//   useState,
//   // useEffect,
//   // createRef,
// } from 'react';
import React from 'react';

import {
  CharacterHups,
} from '../character-hups/CharacterHups.jsx';

import styles from '../../../styles/HupsPlugin.module.css';

//

export const HupsPlugin = ({
  ioBus,
}) => {
  return (
    <div className={styles.hupsPlugin}>
      <CharacterHups
        ioBus={ioBus}
      />
    </div>
  );
};