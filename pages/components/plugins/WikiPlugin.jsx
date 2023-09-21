import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';

// import {
//   IoBus,
// } from '../io-bus/IoBus.js';

import styles from '../../../styles/WikiPlugin.module.css';

//

const wikiIframeUrl = `https://local-wiki.webaverse.com/`;

//

export const WikiPlugin = ({
  ioBus,
}) => {
  const [open, setOpen] = useState(false);
  const iframeRef = useRef();

  ioBus.registerHandler('toggleWiki', e => {
    // console.log('WikiPlugin got toggleWiki', e);
    // debugger;

    const {
      value = !open,
    } = e;
    setOpen(value);
  });

  // console.log('set wiki style', styles.wiki);

  return (
    <div
      className={
        classnames(
          styles.wiki,
          open ? styles.open : null,
        )
      }
    >
      <iframe
        src={wikiIframeUrl}
        className={styles.iframe}
        ref={iframeRef}
      />
    </div>
  );
};