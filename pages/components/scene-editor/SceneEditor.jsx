// import * as THREE from 'three';
import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';

import {
  TransformControlsUi,
} from '../transform-controls-ui/TransformControlsUi.jsx';

import styles from '../../../styles/Adventure.module.css';

//

export const SceneEditor = ({
  engine,

  changed,
  setChanged,
  onSave,
}) => {
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);

  // bind app manager to apps list
  useEffect(() => {
    if (engine) {
      const appManager = engine.getAppManager();
      setApps(appManager.children);

      const appadd = e => {
        setApps(appManager.children.slice());
      }
      appManager.addEventListener('appadd', appadd);
      const appremove = e => {
        setApps(appManager.children.slice());
      };
      appManager.addEventListener('appremove', appremove);

      return () => {
        appManager.removeEventListener('appadd', appadd);
      };
    } else {
      setApps([]);
    }
  }, [engine]);

  // bind transform controls physics hover
  useEffect(() => {
    if (engine) {
      const { transformControlsManager } = engine;
      transformControlsManager.setControlsEnabled(true);

      const select = e => {
        const app = e.data.app;
        setSelectedApp(app);
        // setEditorOpen(!!app);
      };
      transformControlsManager.addEventListener('select', select);

      return () => {
        transformControlsManager.setControlsEnabled(false);

        transformControlsManager.removeEventListener('select', select);
      };
    }
  }, [
    engine,
  ]);

  //

  return (
    <div className={styles.sceneEditor}>
      {(() => {
        // if (!editorOpen) {
        //   return (
        //     <>
        //       <div className={styles.subheader}>Build mode</div>
        //       <div className={styles.row}>
        //         <button className={styles.button} onClick={async e => {
        //           setEditorOpen(!editorOpen);
        //         }}>
        //           <div className={styles.background} />
        //           <span className={styles.text}>Open Editor</span>
        //         </button>
        //       </div>
        //     </>
        //   );
        // } else {
          if (selectedApp) {
            return (
              <>
                <div className={styles.selectedApp}>
                  <div className={styles.wrap}>
                    <div className={styles.row}>
                      <div className={styles.backButton} onClick={e => {
                        setSelectedApp(null);
                      }}>
                        <img className={styles.img} src='/images/chevron.svg' draggable={false} />
                      </div>
                      <div className={styles.name}>{selectedApp.name}</div>
                    </div>
                    <div className={styles.description}>{selectedApp.description}</div>
                  </div>
                  <TransformControlsUi
                    engine={engine}
                    app={selectedApp}
                    setApp={setSelectedApp}
                  />
                </div>
              </>
            );
          } else {
            return (
              <>
                <div className={styles.subheader}>
                  {/* <div className={styles.backButton} onClick={e => {
                    setEditorOpen(false);
                  }}>
                    <img className={styles.img} src='/images/chevron.svg' draggable={false} />
                  </div> */}
                  <span className={styles.text}>Edit Scene</span>
                  <button className={classnames(
                    styles.button,
                    !changed ? styles.disabled : null,
                  )} onClick={async e => {
                    await onSave({
                      apps,
                    });
                  }} disabled={!changed}>
                    <div className={styles.background} />
                    <span className={styles.text}>Save</span>
                  </button>
                </div>
                <div className={styles.objects}>
                  {apps.map((app, i) => {
                    return (
                      <div className={styles.objectsObject} onClick={e => {
                        setSelectedApp(app);
                      }} key={i}>
                        <div className={styles.type}>{app.appType}</div>
                        <div className={styles.name}>{app.name}</div>
                        <div className={styles.description}>{app.description}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          }
        // }
      })()}
    </div>
  );
};
