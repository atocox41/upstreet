import React, {
  useEffect,
} from 'react';

//

export const PlayerSpecsBinding = ({
  engine,
  playerSpecs,
  setPlayerSpecs,
}) => {

  useEffect(() => {
    if (engine) {
      const playersManager = engine.playersManager;
      const npcManager = engine.npcManager;

      const cleanupFns = [];

      // player specs
      const updatePlayerSpecs = () => {
        const players = playersManager.getAllPlayers();
        const mainPlayerSpecs = players.map(player => ({
          ...player.playerSpec,
          id: player.playerId,
        }));
        const npcPlayerSpecs = Array.from(npcManager.npcPlayers).map(npc => ({
          ...npc.playerSpec,
          id: npc.playerId,
        }));
        const allPlayerSpecs = [
          ...mainPlayerSpecs,
          ...npcPlayerSpecs,
        ];
        setPlayerSpecs(allPlayerSpecs);
      };

      // initial
      updatePlayerSpecs();

      // listen
      playersManager.addEventListener('localplayerchange', updatePlayerSpecs);
      playersManager.addEventListener('remoteplayeradd', updatePlayerSpecs);
      playersManager.addEventListener('remoteplayerremove', updatePlayerSpecs);

      cleanupFns.push(() => {
        playersManager.removeEventListener('localplayerchange', updatePlayerSpecs);
        playersManager.removeEventListener('remoteplayeradd', updatePlayerSpecs);
        playersManager.removeEventListener('remoteplayerremove', updatePlayerSpecs);
      });
    }
  }, [
    engine,
    // playerSpecs,
  ]);

  return (<></>);
};