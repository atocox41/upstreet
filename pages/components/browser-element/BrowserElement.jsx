import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';
import {
  BrowserTaskManager,
} from './BrowserTaskManager.jsx';

import styles from '../../../styles/Companion.module.css';

//

export const BrowserElement = ({
  width = 800,
  height = 600,
}) => {
  const [url, setUrl] = useState('https://youtube.com');
  const [previousCommands, setPreviousCommands] = useState([]);
  const [browserWindow, setBrowserWindow] = useState(null);
  const videoRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;

    const abortController = new AbortController();

    if (video) {
      (async () => {
        const browserWindow = await globalThis.electronIpc.createBrowserWindow({
          url,
          width,
          height,
        });
        const _closeBrowser = () => {
          globalThis.electronIpc.closeBrowserWindow({
            browserId: browserWindow.browserId,
          });
        };
        if (abortController.signal.aborted) {
          _closeBrowser();
          return;
        }
        setBrowserWindow(browserWindow);

        abortController.signal.addEventListener('abort', () => {
          _closeBrowser();
        });

        const {
          sourceId,
        } = browserWindow;

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId,
              },
            },
          });
          const _closeStream = () => {
            stream.getTracks().forEach(track => {
              track.stop();
            });
          };
          if (abortController.signal.aborted) {
            _closeStream();
            return;
          }

          abortController.signal.addEventListener('abort', () => {
            _closeStream();
          });

          video.srcObject = stream;
          video.muted = true;
          video.play();
        } catch (err) {
          console.warn(err);
        }
      })();
    }
  }, [videoRef.current]);

  useEffect(() => {
    const formEl = formRef.current;
    if (formEl) {
      const submit = e => {
        e.preventDefault();

        (async () => {
          const result = await globalThis.electronIpc.browserGo({
            browserId,
            url,
          });
          console.log('got browser go result', result);
        })();
      };
      formEl.addEventListener('submit', submit);

      return () => {
        formEl.removeEventListener('submit', submit);
      };
    }
  }, [formRef.current, url]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && browserWindow) {
      const wheel = e => {
        e.preventDefault();
        
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const {
          deltaX,
          deltaY,
        } = e;
        // console.log('got wheel', {x, y, deltaX, deltaY});

        globalThis.electronIpc.browserWheel({
          browserId,
          x,
          y,
          deltaX,
          deltaY,
        });
      };

      videoEl.addEventListener('wheel', wheel, {
        passive: false,
      });

      return () => {
        videoEl.removeEventListener('wheel', wheel);
      };
    }
  }, [videoRef.current, browserWindow]);

  const browserId = browserWindow && browserWindow.browserId;

  return (
    <div className={styles.browser}>
      <form
        className={styles.browserHeader}
        ref={formRef}
      >
        <button
          className={classnames(
            styles.button,
          )}
          onClick={(e) => {
            e.preventDefault();

            (async () => {
              await globalThis.electronIpc.browserBack({
                browserId,
              });
            })();
          }}
        >
          <img src='/assets/icons/arrowLeft.svg' />
        </button>
        <button
          className={classnames(
            styles.button,
          )}
          onClick={(e) => {
            e.preventDefault();

            (async () => {
              await globalThis.electronIpc.browserForward({
                browserId,
              });
            })();
          }}
        >
          <img src='/assets/icons/arrowRight.svg' />
        </button>
        <input type="text" className={styles.input} value={url} onChange={e => {
          setUrl(e.target.value);
        }} onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();

            const formEl = formRef.current;
            if (formEl) {
              formEl.dispatchEvent(new MessageEvent('submit'));
            }
          }
        }} />
        <button
          className={classnames(
            styles.button,
            styles.highlight,
          )}
          onClick={(e) => {
            e.preventDefault();

            const formEl = formRef.current;
            if (formEl) {
              formEl.dispatchEvent(new MessageEvent('submit'));
            }
          }}
        >
          <img src='/images/ui/check.svg' />
        </button>
      </form>
      <video
        className={styles.browserVideo}
        onMouseMove={e => {
          const rect = e.target.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          // console.log('got mousemove', x, y);

          globalThis.electronIpc.browserMouseMove({
            browserId,
            x,
            y,
          });
        }}
        onClick={e => {
          e.preventDefault();

          const rect = e.target.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const {
            button,
          } = e;
          // console.log('got click', {x, y, button});

          globalThis.electronIpc.browserClick({
            browserId,
            x,
            y,
            button,
          });
        }}
        onKeyDown={e => {
          e.preventDefault();

          const {
            // keyCode,
            key,
          } = e;
          // console.log('got keydown', {key});

          globalThis.electronIpc.browserKeyPress({
            browserId,
            keyCode: key,
          });
        }}
        onKeyUp={e => {
          // e.preventDefault();

          const {
            key,
          } = e;
          console.log('got keyup', {key});
        }}
        tabIndex={-1}
        ref={videoRef}
      />
      <BrowserTaskManager
        url={url}
        previousCommands={previousCommands}
        browserId={browserId}
      />
    </div>
  );
};