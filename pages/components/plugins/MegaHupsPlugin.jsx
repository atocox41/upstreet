import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';

import styles from '../../../styles/MegaHupsPlugin.module.css';

//

export const MegaHupsPlugin = ({
  ioBus,
}) => {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  // const iframeRef = useRef();

  useEffect(() => {
    const sendMessage = e => {
      const {
        type,
        mode,
      } = e.data;
      if (type === 'cameraMode') {
        setEnabled(mode === 'follow');
      }
    };
    ioBus.addEventListener('sendMessage', sendMessage);

    return () => {
      ioBus.removeEventListener('sendMessage', sendMessage);
    };
  }, [enabled]);

  return (
    <div>
    </div>
  );
};