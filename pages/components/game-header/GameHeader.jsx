import * as THREE from 'three';
import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';

import {
  UserAccountButton,
} from '../user-account-button/UserAccountButton.jsx';

import {
  InventoryUi,
} from '../inventory-ui/InventoryUi.jsx';
import {
  SceneEditor,
} from '../scene-editor/SceneEditor.jsx';
import {
  MapUi,
} from '../map-ui/MapUi.jsx';
import {
  DebugUi,
} from '../debug-ui/DebugUi.jsx';

import styles from '../../../styles/Adventure.module.css';

//

const ModeBinding = ({
  engine,
  mode,
  setMode,
  setHidden,
}) => {
  // bind io manager key controls
  useEffect(() => {
    if (engine) {
      const {
        ioManager,
        pointerLockManager,
      } = engine;
      
      const keydown = e => {
        switch (e.key) {
          case 'k':
          case 'K':
          {
            e.preventDefault();
            e.stopPropagation();

            pointerLockManager.requestPointerLock();

            setMode('play');
            break;
          }
          case 'l':
          case 'L':
          {
            e.preventDefault();
            e.stopPropagation();

            setMode(mode !== 'land' ? 'land' : 'play');
            setHidden(false);
            break;
          }
          case 'm':
          case 'M':
          {
            e.preventDefault();
            e.stopPropagation();

            pointerLockManager.exitPointerLock();

            setMode(mode !== 'map' ? 'map' : 'play');
            setHidden(false);
            break;
          }
          default: {
            break;
          }
        }

        return false;
      };
      ioManager.registerEventHandler('keydown', keydown);

      return () => {
        ioManager.unregisterEventHandler('keydown', keydown);
      };
    };
  }, [
    engine,
    mode,
  ]);

  //

  return (
    <></>
  );
};

//

const InteractionUi = ({
  engine,
}) => {
  const [capsuleApp, setCapsuleApp] = useState(null);
  const [capsulePhysicsObject, setCapsulePhysicsObject] = useState(null);

  const [conversation, setConversation] = useState(null);

  // bind coordinate update
  useEffect(() => {
    if (engine) {
      const {
        interactionManager,
        storyManager,
      } = engine;
      const capsulecollisionupdate = e => {
        const {
          app,
          physicsObject,
        } = e;

        setCapsuleApp(app);
        setCapsulePhysicsObject(physicsObject);
      };
      interactionManager.addEventListener('capsulecollisionupdate', capsulecollisionupdate);

      const conversationchange = e => {
        const {
          conversation: newConversation,
        } = e.data;
        setConversation(newConversation);
      };
      storyManager.addEventListener('conversationchange', conversationchange);

      return () => {
        interactionManager.removeEventListener('capsulecollisionupdate', capsulecollisionupdate);
        storyManager.removeEventListener('conversationchange', conversationchange);
      };
    }
  }, [
    engine,
  ]);

  //

  const name = capsulePhysicsObject?.name;
  const description = capsulePhysicsObject?.description;

  //

  return (
    <>
      {(!!capsuleApp && !conversation) && <div className={styles.interactionUi}>
        <div className={styles.row}>
          <label className={styles.label}>
            <span className={styles.key}>E</span>
            <span className={styles.text}>Interact</span>
          </label>

          <div className={styles.details}>
            <div className={styles.name}>{name}</div>
            <div className={styles.description}>{description}</div>
          </div>
        </div>
      </div>}
    </>
  );
};

//

export const GameHeader = ({
  localStorageManager,
  supabaseClient,
  sessionUserId,
  address,
  loaded,

  engine,

  mode,
  setMode,

  changed,
  setChanged,
  onSave,

  editable,
  hidable,
  debug,
}) => {
  const [userAccountOpen, setUserAccountOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [topRightHover, setTopRightHover] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);

  // bind top right hover
  useEffect(() => {
    const mousemove = e => {
      const range = 50; // pixels

      // if within top right range
      const {
        clientX,
        clientY,
      } = e;
      const {
        innerWidth,
        innerHeight,
      } = globalThis;
      const x = clientX / innerWidth;
      const y = clientY / innerHeight;
      const topRightHover = x >= 1 - range / innerWidth && y <= range / innerHeight;
      setTopRightHover(topRightHover);
    };
    globalThis.addEventListener('mousemove', mousemove);

    return () => {
      globalThis.removeEventListener('mousemove', mousemove);
    };
  }, []);

  //

  return (
    <div className={classnames(
      styles.header,
    )}>
      {hidable && hidden && <div className={classnames(
        styles.wrap,
        styles.slide,
        topRightHover ? styles.visible : null,
      )}>
        <div className={styles.row}>
          <div className={styles.spacer} />

          <div className={classnames(
            styles.button,
            styles.reverse,
          )} onMouseDown={e => {
            // e.preventDefault();
            e.stopPropagation();
          }} onClick={e => {
            e.preventDefault();
            e.stopPropagation();

            setHidden(!hidden);
          }}>
            <div className={styles.background} />
            <img className={styles.img} src='/images/chevron.png' draggable={false} />
          </div>
        </div>
      </div>}

      <div className={classnames(
        styles.wrap,
        (!loaded || hidden) ? styles.hidden : null,
      )}>
        <div className={styles.row}>
          <div className={styles.spacer} />

          {debug && <button
            className={classnames(
              styles.button,
              styles.marginRight,
            )}
            onClick={e => {
              setDebugOpen(!debugOpen);
            }}>
              <div className={styles.background} />
              <span className={styles.text}>Debug</span>
            </button>}

          <UserAccountButton
            className={styles.userAccount}

            localStorageManager={localStorageManager}
            supabaseClient={supabaseClient}

            onClick={e => {
              setUserAccountOpen(!userAccountOpen);
            }}
          />

          {hidable && <div className={styles.button} onMouseDown={e => {
            // e.preventDefault();
            e.stopPropagation();
          }} onClick={e => {
            e.preventDefault();
            e.stopPropagation();

            setHidden(!hidden);
          }}>
            <div className={styles.background} />
            <img className={styles.img} src='/images/chevron.png' draggable={false} />
          </div>}
        </div>

        <ModeBinding
          engine={engine}
          mode={mode}
          setMode={setMode}
          setHidden={setHidden}
        />

        {['play', 'land'].includes(mode) && <InteractionUi
          engine={engine}
        />}

        {mode === 'map' && <MapUi
          engine={engine}

          mode={mode}
          setMode={setMode}

          address={address}
        />}

        {editable && mode === 'land' && <SceneEditor
          engine={engine}

          editorOpen={editorOpen}
          setEditorOpen={setEditorOpen}

          changed={changed}
          setChanged={setChanged}
          onSave={onSave}
        />}

        {userAccountOpen && <InventoryUi
          engine={engine}

          supabaseClient={supabaseClient}

          sessionUserId={sessionUserId}
          address={address}

          localStorageManager={localStorageManager}

          onClose={e => {
            setUserAccountOpen(false);
          }}

          debug={debug}
        />}

        {debugOpen && <DebugUi
          engine={engine}
          onClose={() => {
            setDebugOpen(false);
          }}
        />}
      </div>
    </div>
  );
};