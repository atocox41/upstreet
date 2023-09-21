import React, {
  useState,
  useEffect,
} from 'react';
import classnames from 'classnames';

// import {
//   sha256,
// } from 'js-sha256';

// import {
//   SupabaseFsWorker,
// } from '../../../packages/engine/supabase-fs-worker.js';

import styles from '../../../styles/DragAndDrop.module.css';

//

export const DragAndDrop = ({
  onDrop,
}) => {
  const [chatOpen, setChatOpen] = useState(false);

  //

  useEffect(() => {
    const dragover = e => {
      e.preventDefault();
    };
    globalThis.addEventListener('dragover', dragover);

    const drop = async e => {
      e.preventDefault();

      onDrop(e);
    };
    globalThis.addEventListener('drop', drop);

    return () => {
      globalThis.removeEventListener('dragover', dragover);
      globalThis.removeEventListener('drop', drop);
    };
  });

  //

  return (
    <div className={classnames(
      styles.dragAndDropUi,
      chatOpen ? styles.open : null,
    )}>
    </div>
  );
};