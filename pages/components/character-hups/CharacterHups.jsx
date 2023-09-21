import React, {useState, useEffect, useRef} from 'react';
import classnames from 'classnames';
// import dioramaManager from '../../../packages/engine/diorama/diorama-manager.js';
import {
  RpgText,
} from '../rpg-text/RpgText.jsx';
import styles from './CharacterHups.module.css';
import {
  chatTextSpeed,
} from '../../../packages/engine/constants.js';
import canvasRegistry from '../../../packages/engine/canvas-registry/canvas-registry.js';

const defaultHupSize = 256;
const pixelRatio = window.devicePixelRatio;

//

const CanvasRegistryCanvas = ({
  canvasId,
}) => {
  const containerRef = useRef();

  useEffect(() => {
    const containerEl = containerRef.current;
    if (containerEl) {
      const canvasEl = canvasRegistry.getCanvas(canvasId);
      containerEl.appendChild(canvasEl);

      return () => {
        while (containerEl.firstChild) {
          containerEl.removeChild(containerEl.firstChild);
        }
      };
    }
  }, [containerRef.current]);

  return (
    <div
      className={styles.canvasRegistryCanvas}
      ref={containerRef}
    ></div>
  );
}

//

class Hup extends EventTarget {
  constructor({
    hupId,
    characterName,
    // fullText,
  }) {
    super();

    this.hupId = hupId;
    this.characterName = characterName;
    this.fullText = '';
  }
  pushMessage(message) {
    if (this.fullText.length > 0) {
      this.fullText += '\n';
    }
    this.fullText += message;

    // console.log('hup dispatch', {
    //   message,
    //   fullText: this.fullText,
    // });
    this.dispatchEvent(new MessageEvent('messageupdate', {
      data: {
        message,
        fullText: this.fullText,
      },
    }));
  }
  // setFrame(imageBitmap) {
  //   this.dispatchEvent(new MessageEvent('frame', {
  //     data: {
  //       imageBitmap,
  //     },
  //   }));
  // }
}

//

const CharacterHup = function(props) {
  const {
    hup,
    index,
  } = props;

  // const hupRef = useRef();
  const [localOpen, setLocalOpen] = useState(false);
  // const [text, setText] = useState('');
  const [fullText, setFullText] = useState('');
  const canvasRef = useRef();

  useEffect(() => {
    setFullText(hup.fullText);
  }, []);

  useEffect(() => {
    // const canvas = canvasRef.current;
    // if (canvas) {
      // const ctx = canvas.getContext('bitmaprenderer');
      // const frame = e => {
      //   const {
      //     imageBitmap,
      //   } = e.data;
      //   ctx.transferFromImageBitmap(imageBitmap);
      // };
      // hup.addEventListener('frame', frame);

      // console.log('hup listen', hup);
      const messageupdate = e => {
        // console.log('got message update', e, hup.fullText);
        setFullText(hup.fullText);
      };
      hup.addEventListener('messageupdate', messageupdate);

      return () => {
        // hup.removeEventListener('frame', frame);
        hup.removeEventListener('messageupdate', messageupdate);
      };
    // }
  }, []);
  
  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      setLocalOpen(true);
    });
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [hup]);

  useEffect(() => {
    // console.log('got canvas registry', canvasRegistry);
    // debugger;

    const canvas = canvasRef.current;
    if (canvas) {
      // NOTE: This was commented out because hupAddPromises is undefined
      /* const hupAddPromise = hupAddPromises.get(hup.hupId);
      if (hupAddPromise) {
        hupAddPromises.delete(hup.hupId);
        const offscreenCanvas = canvas.transferControlToOffscreen();
        hupAddPromise.resolve(offscreenCanvas);
      }  */
    }
  }, [canvasRef]);

  return (
    <div
      className={classnames(styles['character-hup'], localOpen ? styles.open : null)}
      style={{
        top: `${index * defaultHupSize}px`,
      }}
      // ref={hupRef}
    >
      <CanvasRegistryCanvas canvasId={hup.hupId} />
      <div className={styles.name}>
        <div className={styles.bar} />
        <h1>{hup.characterName}</h1>
        <h2>Lv. 9</h2>
      </div>
      <RpgText className={styles.message} textSpeed={chatTextSpeed} text={fullText} />
    </div>
  );
};

//

export const CharacterHups = ({
  ioBus,
}) => {
  const [enabled, setEnabled] = useState(true);
  const [hups, setHups] = useState([]);
  let [epoch, setEpoch] = useState(0);

  const clearHups = () => {
    hups.length = 0;
    setEpoch(++epoch);
  };

  useEffect(() => {
    // console.log('character hups listen');

    const sendMessage = e => {
      const {
        type,
        args,
      } = e.data;

      // console.log('CharacterHups handle send message', type);

      switch (type) {
        case 'cameraMode': {
          const {
            mode,
          } = args;
          const newEnabled = mode === 'normal';
          console.log('set character hups enabled', newEnabled);
          setEnabled(newEnabled);
  
          if (!newEnabled) {
            clearHups();
          }

          break;
        }
        case 'hupAdd': {
          if (enabled) {
            const {
              hupId,
              characterName,
              fullText,
            } = args;
            
            const newHup = new Hup({
              hupId,
              characterName,
              fullText,
            });
            hups.push(newHup);
            setEpoch(++epoch);
          }

          break;
        }
        case 'hupRemove': {
          if (enabled) {
            const {
              hupId,
            } = args;

            // if (typeof hupId !== 'number') {
            //   debugger;
            // }

            const oldHupIndex = hups.findIndex(hup => hup.hupId === hupId);
            hups.splice(oldHupIndex, 1);
            setEpoch(++epoch);
          }

          break;
        }
        case 'hupVoiceStart': {
          if (enabled) {
            const {
              hupId,
              message,
              fullText,
            } = args;

            if (typeof hupId !== 'number') {
              debugger;
            }

            const hup = hups.find(hup => hup.hupId === hupId);
            if (hup) {
              hup.pushMessage(message);
            } else {
              console.warn('no hup for voice start', {
                hupId,
                message,
                fullText,
                hups: hups.slice(),
              });
            }
          }

          break;
        }
      }
    };
    ioBus.addEventListener('sendMessage', sendMessage);

    return () => {
      // console.log('character hups unlisten');
      ioBus.removeEventListener('sendMessage', sendMessage);
    };
  }, [enabled, epoch]);

  return (
    <div className={styles['character-hups']}>
      {hups.map((hup, index) => {
        // if (!hup.hupId) {
        //   debugger;
        // }

        return (
          <CharacterHup
            hup={hup}
            key={hup.hupId}
          />
        );
      })}
    </div>
  );
};