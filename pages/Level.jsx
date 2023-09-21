import React, {
  useState,
  useEffect,
} from 'react';
import {
  addDefaultLights,
} from '../packages/engine/util.js';
import {
  remoteFileServerUrl,
} from '../packages/engine/endpoints.js';
import {
  FileDatabaseClient,
} from '../packages/engine/clients/file-database-client.js';
import {
  LevelHeader,
} from './components/level-header/LevelHeader.jsx';
import {
  LevelChat,
} from './components/level-chat/LevelChat.jsx';
import {
  StoryUi,
} from './components/story-ui/StoryUi.jsx';
import {
  RemoteFsWorker,
} from '../packages/engine/remote-fs-worker.js';
import {
  WorldsClient,
} from '../packages/engine/clients/worlds-client.js';

import {
  worldsDatabaseDataDirectoryName,
} from '../packages/engine/constants/client-constants.js';
import {
  GameCanvas,
} from './components/game-canvas/GameCanvas.jsx';
import {
  Engine,
} from '../packages/engine/engine.js';
import {
  EngineContext,
} from '../packages/engine/engine-context.js';
import {isProd} from '../packages/engine/env.js';

//

import styles from '../styles/Level.module.css';

//

const worldIdentityToObject = (worldIdentity) => {
  const {
    name,
    images,
    source,
  } = worldIdentity.spec;
  const {
    id,
    prompt,
  } = source;
  const {
    fileUrl,
    depthMapUrl,
  } = images;
  const description = prompt;
  return {
    type: 'application/blockadelabsskybox',
    content: {
      id,
      name,
      description,
      fileUrl,
      depthMapUrl,
    },
  };
};
const worldIdentityToItems = (worldIdentity) => {
  const {
    source,
    items,
  } = worldIdentity.spec;
  const {
    id,
  } = source;
  return {
    id,
    items,
  };
};
const worldIdentityToNpcs = (worldIdentity) => {
  const {
    source,
    avatars,
  } = worldIdentity.spec;
  const {
    id,
  } = source;
  return {
    id,
    npcs: avatars,
  };
};

//

const fsWorker = new RemoteFsWorker({
  endpointUrl: remoteFileServerUrl,
});
const worldsDatabaseClient = new FileDatabaseClient({
  dataDirectoryName: worldsDatabaseDataDirectoryName,
  fsWorker,
});
const worldsClient = new WorldsClient({
  fileDatabaseClient: worldsDatabaseClient,
});
worldsClient.waitForLoad();

//

export const LevelApp = () => {
  const [worlds, setWorlds] = useState([]);

  const [errorMessage, setErrorMessage] = useState(null);
  
  const [engine, setEngine] = useState(null);

  //

  // engine
  useEffect(() => {
    if (worlds.length > 0) {
      const appSpec = {
        type: 'application/scn',
        content: {
          objects: [
            {
              start_url: `${isProd ? 'https://isekai.chat' : ''}/core-modules/gai-level/gai-level.js`,
              components: [
                {
                  key: 'worlds',
                  value: worlds.map(worldIdentity => {
                    return worldIdentityToObject(worldIdentity);
                  }),
                },
                {
                  key: 'items',
                  value: worlds.map(world => {
                    return worldIdentityToItems(world);
                  }),
                },
                {
                  key: 'npcs',
                  value: worlds.map(world => {
                    return worldIdentityToNpcs(world);
                  }),
                },
                {
                  key: 'cameraLocked',
                  value: true,
                },
              ],
            },
          ]  
        },
      };

      const context = new EngineContext({
        fsWorker,
      });
      const engine = new Engine({
        context,
      });
      // addDefaultLights(engine.engineRenderer.scene);

      let live = true;
      (async () => {
        await engine.waitForLoad();
        if (!live) return;

        await engine.setState({
          start_url: appSpec.start_url,
          type: appSpec.type,
          content: appSpec.content,
          room: appSpec.room,
        });
        if (!live) return;

        engine.start();
      })();

      setEngine(engine);

      return () => {
        live = false;
      };
    }
  }, [worlds.length]);

  // worlds
  useEffect(() => {
    const worldidentitiesupdate = e => {
      const {
        worldIdentities,
      } = e.data;
      setWorlds(worldIdentities);
    };
    worldsClient.addEventListener('worldidentitiesupdate', worldidentitiesupdate);

    setWorlds(worldsClient.worldIdentities);

    return () => {
      worldsClient.removeEventListener('worldidentitiesupdate', worldidentitiesupdate);
    };
  }, []);

  //

  if (errorMessage) {
    return (
      <div className={styles.error}>
        {errorMessage}
      </div>
    );
  } else if (engine) {
    return (
      <>
        <GameCanvas
          engine={engine}
        />
        <LevelHeader
          engine={engine}
        />
        <LevelChat
          engine={engine}
        />
        <StoryUi
          engine={engine}
        />
      </>
    );
  } else {
    return null;
  }
};