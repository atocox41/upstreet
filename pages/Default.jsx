import * as THREE from 'three';
import React, {
  useState,
  useEffect,
  useRef,
  useContext,
} from 'react';
import classnames from 'classnames';

import {
  LoginProvider,
  LoginProfileProvider,
  LoginProfileContext,
} from './components/login-provider/LoginProvider.jsx';
import {
  loadJson,
} from '../packages/engine/util.js'

import {
  PgSqlDatabaseClient,
} from '../packages/engine/clients/pgsql-database-client.js';
import {
  MultiplayerUi,
} from './components/multiplayer-ui/MultiplayerUi.jsx';
import {
  IoBusEventSource,
} from './components/io-bus/IoBusEventSource.jsx';

// import {
//   // memoryDatabaseDataDirectoryName,
//   characterDatabaseDataDirectoryName,
//   skyboxDatabaseDataDirectoryName,
//   worldsDatabaseDataDirectoryName,
//   itemsDatabaseDataDirectoryName,
//   scenesDatabaseDataDirectoryName,
//   musicDatabaseDataDirectoryName,
// } from '../packages/engine/constants/client-constants.js';
import {
  EngineProvider,
} from '../packages/engine/clients/engine-client.js';

import {
  // ScenesClientOld,
  ScenesClient,
} from '../packages/engine/clients/scenes-client.js';

import {
  SupabaseClient,
} from '../packages/engine/clients/supabase-client.js';
import {
  SupabaseFsWorker,
} from '../packages/engine/supabase-fs-worker.js';

import styles from '../styles/Default.module.css';
import topBarStyles from '../styles/TopBar.module.css';

// clients

const supabaseClient = new SupabaseClient();
const supabaseFsWorker = new SupabaseFsWorker({
  supabase: supabaseClient.supabase,
});
const scenesClient = new ScenesClient({
  pgSqlDatabaseClient: new PgSqlDatabaseClient({
    supabase: supabaseClient.supabase,
    tableName: 'generations',
  }),
  supabaseFsWorker,
});
scenesClient.waitForLoad();

//

const DefaultAppContent = () => {
  const [sceneItem, setSceneItem] = useState(null);
  const [error, setError] = useState(null);
  const [engine, setEngine] = useState(null);
  const [multiplayer, setMultiplayer] = useState(null);
  const [engineLoading, setEngineLoading] = useState(false);

  const [playerSpec, setPlayerSpec] = useState(null);

  //

  const loginProfileValue = useContext(LoginProfileContext);

  //

  const canvasRef = useRef();
  const [canvas, setCanvas] = useState(null);

  const ioBus = engine?.ioBus;

  //

  // bind canvas
  useEffect(() => {
    if (canvasRef.current) {
      setCanvas(canvasRef.current);
    }
  }, [canvasRef]);

  // player spec
  useEffect(() => {
    const abortController = new AbortController();
    const {signal} = abortController;

    const character = loginProfileValue?.character;
    if (character) {
      (async () => {
        const j = await loadJson(character, {
          signal,
        });
        console.log('got player spec', j);
        setPlayerSpec(j);
      })();
    } else {
      setPlayerSpec(null);
    }

    return () => {
      abortController.abort();
    };
  }, [
    loginProfileValue,
  ]);

  // scene item
  useEffect(() => {
    const match = window.location.pathname.match(/^\/([a-zA-Z0-9]+)$/);
    if (match) {
      const sceneName = match[1];

      (async () => {
        await scenesClient.waitForLoad();
        const {
          items,
        } = await scenesClient;
        // console.log('add app async', items);
        const item = items.find(item => item.content.name === sceneName);
        if (item) {
          setSceneItem(item);
        } else {
          setError('404 scene not found: ' + sceneName);
        }
      })();
    } else {
      setError('404 invalid url: ' + window.location.pathname);
    }
  }, []);

  //

  return (
    <div className={styles.defaultApp}>
      {(sceneItem && playerSpec) ? <>
        {/* <GameScene
          className={styles.gameScene}
          engine={engine}
        /> */}

        <canvas className={classnames(
          styles.canvas,
        )} ref={canvasRef} />
        <IoBusEventSource engine={engine} />

        <div className={topBarStyles.topbar}>
          <div className={topBarStyles.buttons}>
            {(engine && multiplayer) ? 
              <MultiplayerUi
                engine={engine}
                multiplayer={multiplayer}
              />
            : null}
          </div>
        </div>
        {canvas ? <EngineProvider
          canvas={canvas}

          // context={context}
          objects={sceneItem.content.objects}
          playerSpec={playerSpec}
          multiplayerRoom={sceneItem.content.multiplayer?.enabled ?
            sceneItem.content.name
          : ''}

          engine={engine}
          setEngine={setEngine}
          multiplayer={multiplayer}
          setMultiplayer={setMultiplayer}
          engineLoading={engineLoading}
          setEngineLoading={setEngineLoading}
        /> : null}
      </> : null}
      {error ? <div className={styles.error}>
        {error}
      </div> : null}
    </div>
  );
};

// main component

export const DefaultApp = () => {
  return (
    <LoginProvider>
      <LoginProfileProvider>
        <DefaultAppContent />
      </LoginProfileProvider>
    </LoginProvider>
  );
};