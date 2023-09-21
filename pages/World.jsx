import * as THREE from 'three';
import React, {
  useState,
  useEffect,
  useRef,
  useContext,
} from 'react';
import classnames from 'classnames';

import {
  HelperUi,
} from './components/helper-ui/HelperUi.jsx';
import {
  IoBusEventSource,
} from './components/io-bus/IoBusEventSource.jsx';
import {
  DragAndDrop,
} from './components/drag-and-drop/DragAndDrop.jsx';
import {
  SpeechBubblePlugin,
} from './components/plugins/SpeechBubblePlugin.jsx';

import {
  LocalStorageManager,
} from '../packages/engine/managers/localstorage/localstorage-manager.js';

import {
  ChatUi,
} from './components/chat-ui/ChatUi.jsx';
import {
  GameHeader,
} from './components/game-header/GameHeader.jsx';
import {
  StoryUi,
} from './components/story-ui/StoryUi.jsx';
import {
  CrosshairUi,
} from './components/crosshair-ui/CrosshairUi.jsx';
import {
  LoadingUi,
} from './components/loading-ui/LoadingUi.jsx';

import {
  EngineProvider,
} from '../packages/engine/clients/engine-client.js';

import {
  handleDropFn,
} from './components/drag-and-drop/drop.js';

// import {
//   EmoteWheel,
// } from './components/emote-wheel/EmoteWheel.jsx';

import {
  MultiArray,
  MultiArraySubarray,
} from '../packages/engine/utils/array-utils.js';

import {
  LoginContext,
  LoginProvider,
  LoginConsumer,
} from './components/login-provider/LoginProvider.jsx';

import styles from '../styles/Adventure.module.css';

//

export const ProfileBinding = ({
  localStorageManager,

  playerSpec,
  setPlayerSpec,
}) => {
  // bind account manager updates to player spec
  useEffect(() => {
    const playerspecupdate = e => {
      const {
        playerSpec,
      } = e.data;
      setPlayerSpec(playerSpec);
    };
    localStorageManager.addEventListener('playerspecupdate', playerspecupdate);

    // bind
    setPlayerSpec(localStorageManager.getPlayerSpec());

    return () => {
      localStorageManager.removeEventListener('playerspecupdate', playerspecupdate);
    };
  }, [
    localStorageManager,
  ]);
};

//

const WorldBinding = ({
  // engine,
  supabaseClient,

  objects,
  setObjects,

  world,
}) => {
  // bind world database state
  useEffect(() => {
    if (world && supabaseClient) {
      let localObjects = objects;

      (async () => {
        const {supabase} = supabaseClient;
        const {
          data,
        } = await supabase
          .from('worlds')
          .select('*')
          .eq('name', world)
          .maybeSingle();

        console.log('load world data', data); // XXX

        const {
          objects: newObjects = [],
        } = (data || {});

        //

        localObjects = localObjects.clone();
        const subArray2 = localObjects.addSubArray();
        for (const object of newObjects) {
          subArray2.push(object);
        }
        if (subArray2.length === 0) {
          subArray2.push({
            start_url: '/core-modules/floor/index.js',
          });
        }
        setObjects(localObjects);
      })();
    } else {
      setObjects([]);
    }
  }, [
    world,
    supabaseClient,
  ]);

  //

  return (
    <></>
  );
};

//

const WorldAppContent = ({
  world,

  localStorageManager,

  supabaseClient,
  sessionUserId,
  address,

  debug,
}) => {
  const [engine, setEngine] = useState(null);
  const [context, setContext] = useState(null);
  const [objects, setObjects] = useState(() => new MultiArray([]));
  const [playerSpec, setPlayerSpec] = useState(null);
  const [engineLoading, setEngineLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [mode, setMode] = useState('play');
  const [changed, setChanged] = useState(false);

  const [canvas, setCanvas] = useState(null);
  const canvasRef = useRef();

  const {supabase} = supabaseClient;

  // methods
  const onSave = async ({
    apps,
  }) => {
    const objects = apps.map(app => {
      return {
        ...app.spec,
        position: app.position.toArray(),
        quaternion: app.quaternion.toArray(),
        scale: app.scale.toArray(),
      };
    });

    const result = await supabase
      .from('worlds')
      .select('*')
      .eq('name', world)
      .maybeSingle();
    const {
      error,
      data,
    } = result;

    if (!error) {
      const newWorld = {
        ...data,
        objects,
      };

      const result2 = await supabase
        .from('worlds')
        .upsert(newWorld);
      // console.log('got save result', result2);
    } else {
      console.warn('error', error);
    }
  };

  // bind canvas
  useEffect(() => {
    if (canvasRef.current) {
      setCanvas(canvasRef.current);
    }
  }, [canvasRef]);

  // bind loading manager
  useEffect(() => {
    if (engine) {
      (async () => {
        await engine.engineRenderer.waitForRender();
        setLoaded(true);
      })();
    }
  }, [
    engine,
  ]);

  //

  return (
    <div
      className={styles.worldApp}
    >
      <LoadingUi
        loadingManager={context?.loadingManager}
      />

      <canvas className={classnames(
        styles.canvas,
      )} ref={canvasRef} />
      <IoBusEventSource engine={engine} />

      {engine ? <CrosshairUi
        engine={engine}
      /> : null}

      <ChatUi
        engine={engine}
        onClose={() => {}}
      />

      <HelperUi
        localStorageManager={localStorageManager}
        loaded={loaded}
      />

      {engine ? <StoryUi
        engine={engine}
      /> : null}

      <GameHeader
        localStorageManager={localStorageManager}
        supabaseClient={supabaseClient}

        sessionUserId={sessionUserId}
        address={address}

        engine={engine}

        mode={mode}
        setMode={setMode}

        changed={changed}
        setChanged={setChanged}
        onSave={onSave}

        editable
        hidable
        debug={debug}

        loaded={loaded}
      />

      <SpeechBubblePlugin
        engine={engine}
      />

      <ProfileBinding
        localStorageManager={localStorageManager}

        playerSpec={playerSpec}
        setPlayerSpec={setPlayerSpec}
      />

      <WorldBinding
        supabaseClient={supabaseClient}

        objects={objects}
        setObjects={setObjects}

        world={world}
      />

      <DragAndDrop
        localStorageManager={localStorageManager}
        supabaseClient={supabaseClient}

        onDrop={async (e) => {
          await handleDropFn({
            engine,
            supabaseClient,
            sessionUserId,
          })(e);

          setChanged(true);
        }}
      />

      {(canvas && objects) ? <EngineProvider
        canvas={canvas}
        objects={objects}
        playerSpec={playerSpec}

        engine={engine}
        setEngine={setEngine}

        engineLoading={engineLoading}
        setEngineLoading={setEngineLoading}

        onContext={context => {
          setContext(context);
        }}
      /> : null}
    </div>
  );
};

//

export const WorldApp = ({
  world = '',
  debug,
}) => {
  const [localStorageManager, setLocalStorageManager] = useState(() => new LocalStorageManager());
  
  return (
    <LoginProvider
      localStorageManager={localStorageManager}
    >
      <LoginConsumer>
        {loginValue => {
          const {
            supabaseClient,
            sessionUserId,
            address,
          } = loginValue;

          return (
            <WorldAppContent
              world={world}
              debug={debug}

              supabaseClient={supabaseClient}
              sessionUserId={sessionUserId}
              address={address}

              localStorageManager={localStorageManager}
            />
          );
        }}
      </LoginConsumer>
    </LoginProvider>
  );
};