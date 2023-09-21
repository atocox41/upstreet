import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';

import topBarStyles from '../../../styles/TopBar.module.css';

//

export const MultiplayerUi = ({
  engine,
  multiplayer,
}) => {
  const [players, setPlayers] = useState(() => {
    const playersManager = engine.playersManager;
    const localPlayer = playersManager.getLocalPlayer();
    return [
      localPlayer,
    ];
  });

  //

  useEffect(() => {
    const playersManager = engine.playersManager;

    const _updatePlayrers = () => {
      const localPlayer = playersManager.getLocalPlayer();
      const remotePlayers = playersManager.getRemotePlayers();

      const newPlayers = [
        localPlayer,
        ...remotePlayers,
      ];
      setPlayers(newPlayers);
    };
    _updatePlayrers();

    const remoteplayeradd = e => {
      _updatePlayrers();
    };
    playersManager.addEventListener('remoteplayeradd', remoteplayeradd);
    const remoteplayerremove = e => {
      _updatePlayrers();
    };
    playersManager.addEventListener('remoteplayerremove', remoteplayerremove);

    return () => {
      playersManager.removeEventListener('remoteplayeradd', remoteplayeradd);
      playersManager.removeEventListener('remoteplayerremove', remoteplayerremove);
    };
  }, [engine, multiplayer]);

  //

  return (
    <div className={topBarStyles.button} onClick={e => {
      e.stopPropagation();

      multiplayer.disconnectMultiplayer();
    }}>
      <div className={topBarStyles.background} />
      <img className={classnames(topBarStyles.img, topBarStyles.small)} src='/images/metaverse-character.svg' />
      <div className={topBarStyles.text}>({players.length}) Multiplayer</div>
    </div>
  );
};