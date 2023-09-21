import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import {
  RpgText,
} from '../rpg-text/RpgText.jsx';
import classnames from 'classnames';
import {
  chatTextSpeed,
} from '../../../packages/engine/constants.js';
import { Vector3 } from 'three';
import styles from '../../../styles/SpeechBubblePlugin.module.css';

//

const localVector = new Vector3();

class SpeechBubbleObject extends EventTarget {
  constructor({
    message,
    camera,
    renderer,

    onClose,
  }) {
    super();

    this.message = message;
    this.camera = camera;
    this.renderer = renderer;
    this.onClose = onClose;

    this.textIndex = 0;
    this.lastTextIndex = 0;

    //

    let animationFrame = null;
    const _startPositionUpdate = ({
      player,
    }) => {
      const _recurse = () => {
        animationFrame = requestAnimationFrame(_recurse);

        const screenPosition = localVector.copy(player.position);
        screenPosition.y += 0.2;
        screenPosition
          .project(camera);
  
        const position3D = screenPosition;
        
        const position = [
          (position3D.x + 1) / 2,
          1 - (position3D.y + 1) / 2,
          -position3D.z,
        ];
        this.dispatchEvent(new MessageEvent('positionupdate', {
          data: {
            position,
          },
        }));
      };
      animationFrame = requestAnimationFrame(_recurse);
    };
    const _stopPositionUpdate = () => {
      cancelAnimationFrame(animationFrame);
    };

    //

    const conversation = message.getConversation();
    if (!conversation) {
      message.addEventListener('playStart', e => {
        const {
          player,
        } = e.data;

        const spec = message.getSpec();
        const {
          command,
          message: text,
        } = spec;
        if (command === 'SPEAK') {
          this.dispatchEvent(new MessageEvent('textupdate', {
            data: {
              text,
            },
          }));

          _startPositionUpdate({
            player,
          });
        }
      });
      message.addEventListener('playEnd', e => {
        const spec = message.getSpec();
        // console.log('playEnd', spec);

        setTimeout(() => {
          _stopPositionUpdate();
          onClose();
        }, 3000);
      });
    }
  }
  get position() {
    debugger;
  }
  set position(position) {
    debugger;
  }
  get fullText() {
    debugger;
  }
  set fullText(fullText) {
    debugger;
  }
}

//

const SpeechBubble = ({
  speechBubble,
}) => {
  const [fullText, setFullText] = useState('');
  const speechBubbleRef = useRef();

  useEffect(() => {
    const speechBubbleEl = speechBubbleRef.current;
    if (speechBubbleEl) {
      const textupdate = e => {
        const {
          text,
        } = e.data;
        // console.log('text update', fullText);

        setFullText(text);
      };
      const positionupdate = e => {
        const {
          position,
        } = e.data;

        const z = position[2];

        if (z > -1) {
          const pixelRatio = speechBubble.renderer.getPixelRatio();
          const width = speechBubble.renderer.domElement.width / pixelRatio;
          const height = speechBubble.renderer.domElement.height / pixelRatio;
          const x = (position[0] * width).toFixed(8);
          const y = (position[1] * height).toFixed(8);

          const transform = `translate3d(calc(-50% + ${x}px), calc(-100% + ${y}px), 0)`;
          speechBubbleEl.style.transform = transform;
          speechBubbleEl.style.display = null;
        } else {
          speechBubbleEl.style.display = 'none';
        }
      };
      speechBubble.addEventListener('textupdate', textupdate);
      speechBubble.addEventListener('positionupdate', positionupdate);

      return () => {
        speechBubble.removeEventListener('textupdate', textupdate);
        speechBubble.removeEventListener('positionupdate', positionupdate);
      };
    }
  }, []);

  return (
    <div className={classnames(
      styles.wrap,
      fullText ? styles.visible : null,
    )}>
      <div
        className={styles.speechBubble}
        style={{
          display: 'none',
          // transform,
        }}
        ref={speechBubbleRef}
      >
        <div className={styles.placeholder} />
        {/* <div className={styles.text}>{fullText}</div> */}
        <RpgText className={styles.text} textSpeed={chatTextSpeed} text={fullText} />
        <div className={styles.notch} />
      </div>
    </div>
  );
}
const SpeechBubbles = ({
  speechBubbles,
  // epoch,
}) => {
  return (
    <div className={styles.speechBubbles}>
      {speechBubbles.map(speechBubble => {
        return (
          <SpeechBubble
            speechBubble={speechBubble}
            key={speechBubble.message}
          />
        );
      })}
    </div>
  );
};

//

export const SpeechBubblePlugin = ({
  engine,
  // ioBus,
}) => {
  // const [enabled, setEnabled] = useState(false);
  const [speechBubbles, setSpeechBubbles] = useState([]);
  let [epoch, setEpoch] = useState(0);

  /* useEffect(() => {
    const sendMessage = e => {
      const {
        type,
        args,
      } = e.data;

      // console.log('send message', type);

      switch (type) {
        case 'hupAdd': {
          // console.log('speech bubble got hup add', e.data);

          if (enabled) {
            const {
              hupId,
              characterName,
              fullText,
            } = args;

            // console.log('speech add', args);
            
            const speechBubble = new SpeechBubbleObject({
              hupId,
              characterName,
              fullText,
            });
            speechBubbles.push(speechBubble);
            setEpoch(++epoch);
          }

          break;
        }
        case 'hupRemove': {
          if (enabled) {
            const {
              hupId,
            } = args;

            // console.log('speech remove');

            const oldSpeechBubbleIndex = speechBubbles.findIndex(sb => sb.hupId === hupId);
            if (oldSpeechBubbleIndex === -1 || hupId === undefined) {
              console.warn('no speech bubble to remove', {
                hupId,
                speechBubbles: speechBubbles.slice(),
              });
              debugger;
            }
            speechBubbles.splice(oldSpeechBubbleIndex, 1);
            setEpoch(++epoch);
          }

          break;
        }
        case 'hupVoiceStart': {
          // console.log('hup voice start enabled', enabled);

          if (enabled) {
            const {
              hupId,
              message,
              fullText,
            } = args;

            const speechBubble = speechBubbles.find(sb => sb.hupId === hupId);
            if (speechBubble) {
              speechBubble.pushMessage(message);
              setEpoch(++epoch);
            } else {
              console.warn('no speech bubble for voice start', {
                hupId,
                message,
                fullText,
                speechBubbles: speechBubbles.slice(),
              });
            }
          }

          break;
        }
        case 'hupPositionUpdate': {
          if (enabled) {
            const {
              hupId,
              position,
            } = args;

            // console.log('speech bubble got position update', {
            //   hupId,
            //   position,
            // });

            const speechBubble = speechBubbles.find(sb => sb.hupId === hupId);
            if (speechBubble) {
              speechBubble.setPosition(position);
              // console.log('speech bubble set position');
              // setEpoch(++epoch);
            } else {
              console.warn('no speech bubble for position update', {
                hupId,
                position,
                speechBubbles: speechBubbles.slice(),
              });
            }
          }

          break;
        }
        case 'cameraMode': {
          const {
            mode,
          } = args;
          const newEnabled = [
            'follow',
            'cinematic',
          ].includes(mode);
          setEnabled(newEnabled);
          setEpoch(++epoch);

          break;
        }
      }
    };
    ioBus.addEventListener('sendMessage', sendMessage);

    return () => {
      ioBus.removeEventListener('sendMessage', sendMessage);
    };
  }, [enabled, epoch]); */

  useEffect(() => {
    if (engine) {
      const chatManager = engine.chatManager;
      const {camera, renderer} = engine.engineRenderer;

      const message = e => {
        const {
          message,
        } = e.data;

        const speechBubble = new SpeechBubbleObject({
          message,
          camera,
          renderer,
          onClose: () => {
            const newSpeechBubbles = speechBubbles.filter(sb => sb !== speechBubble);
            setSpeechBubbles(newSpeechBubbles);
          },
        });
        const newSpeechBubbles = [
          ...speechBubbles,
          speechBubble,
        ];
        setSpeechBubbles(newSpeechBubbles);
      };
      chatManager.addEventListener('message', message);

      return () => {
        chatManager.removeEventListener('message', message);
      };
    }
  }, [
    engine,
    // enabled,
  ]);

  return (
    <div className={styles.speechBubblePlugin}>
      <SpeechBubbles
        speechBubbles={speechBubbles}
        epoch={epoch}
      />
    </div>
  );
};