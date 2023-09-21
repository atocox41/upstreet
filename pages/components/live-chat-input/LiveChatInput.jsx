import * as THREE from 'three';
import React, {useState, useEffect, useRef, useContext} from 'react';
import classnames from 'classnames';

import {
  IoBus,
} from '../io-bus/IoBus.js';
import {
  mod,
  blob2img,

  capitalize,
} from '../../../packages/engine/util.js';


import styles from './ChatInput.module.css';

//

const stopPropagation = (e) => {
  e.stopPropagation();
};

//

const triggerButtonLayers = [
  {
    prefix: '',
    buttons: [
      {
        label: 'Load/Save',
        prefix: 'state',
      },
      {
        label: 'Connect',
        prefix: 'connect',
      },
      {
        label: 'Add',
        prefix: 'add',
      },
      {
        label: 'Portal',
        prefix: 'portal',
      },
      {
        label: 'Generate',
        prefix: 'generate',
      },
      {
        label: 'Wiki',
        prefix: 'wiki',
      },
      {
        label: 'Livechat',
        prefix: 'livechat',
      },
      {
        label: 'Prefabs',
        prefix: 'prefabs',
      },
      {
        label: 'VR',
        prefix: 'vr',
      },
    ],
  },
  {
    prefix: 'state ',
    buttons: [
      {
        label: 'Load',
        prefix: 'state load',
      },
      {
        label: 'Save',
        prefix: 'state save',
      },
    ],
  },
  {
    prefix: 'state load ',
    buttons: Array(8).fill().map((v, i) => ({
      label: `Slot ${i + 1}`,
      prefix: `state load ${i + 1}`,
    })),
  },
  {
    prefix: 'state save ',
    buttons: Array(8).fill().map((v, i) => ({
      label: `Slot ${i + 1}`,
      prefix: `state save ${i + 1}`,
    })),
  },
  {
    prefix: 'drop ',
    buttons: [
      {
        label: (value) => {
          const url = parseCommandUrl(value);
          return [
            'drop url',
            url,
          ];
        },
        // prefix: `generate prompt`,
      },
    ],
  },
  {
    prefix: 'add ',
    buttons: [
      {
        label: 'Url',
        prefix: 'add url',
      },
      {
        label: 'Prompt',
        prefix: 'add prompt',
      },
      {
        label: 'File...',
        prefix: 'add file',
      },
      {
        label: 'Capture...',
        prefix: 'add capture',
      },
    ],
  },
  {
    prefix: 'add url ',
    buttons: [
      {
        label: (value) => {
          const url = parseCommandUrl2(value);
          return [
            'url to add',
            url,
          ];
        },
        // prefix: `generate prompt`,
      },
    ],
  },
  {
    prefix: 'add prompt ',
    buttons: [
      {
        label: (value) => {
          const prompt = parseCommandUrl2(value);
          return [
            'prompt',
            prompt,
          ];
        },
        // prefix: `generate prompt`,
      },
    ],
  },
  {
    prefix: 'portal ',
    buttons: [
      {
        label: (value) => {
          const url = parseCommandUrl(value);
          return [
            'portal to',
            url,
          ];
        },
        // prefix: `generate prompt`,
      },
    ],
  },
  {
    prefix: 'generate ',
    buttons: [
      {
        label: `Panel`,
        prefix: `generate panel`,
      },
      {
        label: `Skybox`,
        prefix: `generate skybox`,
      },
      {
        label: `Zine`,
        prefix: `generate zine`,
      },
    ],
  },
  {
    prefix: 'generate panel ',
    buttons: [
      {
        label: `Prompt`,
        prefix: `generate panel prompt`,
      },
      {
        label: `File...`,
        prefix: `generate panel file`,
      },
      {
        label: `Capture...`,
        prefix: `generate panel capture`,
      },
    ],
  },
  {
    prefix: 'generate panel prompt ',
    buttons: [
      {
        label: (value) => {
          const url = parseCommandUrl3(value);
          return [
            'prompt',
            url,
          ];
        },
        // prefix: `generate prompt`,
      },
    ],
  },
  {
    prefix: 'generate skybox ',
    buttons: [
      {
        label: `Prompt`,
        prefix: `generate skybox prompt`,
      },
      {
        label: `File...`,
        prefix: `generate skybox file`,
      },
      {
        label: `Capture...`,
        prefix: `generate skybox capture`,
      },
    ],
  },
  {
    prefix: 'generate skybox prompt ',
    buttons: [
      {
        label: (value) => {
          const url = parseCommandUrl3(value);
          return [
            'prompt',
            url,
          ];
        },
        // prefix: `generate prompt`,
      },
    ],
  },
  {
    prefix: 'generate zine ',
    buttons: [
      {
        label: `Prompt`,
        prefix: `generate zine prompt`,
      },
      {
        label: `File...`,
        prefix: `generate zine file`,
      },
      {
        label: `Capture...`,
        prefix: `generate zine capture`,
      },
    ],
  },
  {
    prefix: 'generate zine prompt ',
    buttons: [
      {
        label: (value) => {
          const url = parseCommandUrl3(value);
          return [
            'prompt',
            url,
          ];
        },
        // prefix: `generate prompt`,
      },
    ],
  },
  {
    prefix: 'connect ',
    buttons: [
      {
        label: 'Room 1',
        prefix: 'connect room 1',
      },
      {
        label: 'Room 2',
        prefix: 'connect room 2',
      },
      {
        label: 'Room 3',
        prefix: 'connect room 3',
      },
      {
        label: 'Room 4',
        prefix: 'connect room 4',
      },
      {
        label: 'Url',
        prefix: 'connect url',
      },
    ],
  },
  {
    prefix: 'connect url ',
    buttons: [
      {
        label: (value) => {
          const url = parseCommandUrl2(value);
          return [
            'connect to url',
            url,
          ];
        },
      },
    ],
  },
  {
    prefix: 'livechat ',
    buttons: [
      {
        label: 'On',
        prefix: 'livechat on',
      },
      {
        label: 'Off',
        prefix: 'livechat off',
      },
    ],
  },
];
const parseCommandUrl = command => {
  return command.match(/\S+\s+(.*)/)?.[1] ?? '';
};
const parseCommandUrl2 = command => {
  return command.match(/\S+\s+\S+\s+(.*)/)?.[1] ?? '';
};
const parseCommandUrl3 = command => {
  return command.match(/\S+\s+\S+\s+\S+\s+(.*)/)?.[1] ?? '';
};
export const ChatInput = ({
  open,
  onClose,
  ioBus,
}) => {
  const [value, setValue] = useState('');
  const [lastValue, setLastValue] = useState('');
  const [selectedTriggerIndex, setSelectedTriggerIndex] = useState(0);
  // const [triggerButtonLayerIndex, setTriggerButtonLayerIndex] = useState(-1);
  const [keyPath, setKeyPath] = useState(null);
  const inputRef = useRef();

  // set initial value
  const getInitialValue = (open) => {
    if (open) {
      if (open === 'enter') {
        return '';
      } else if (open === 'slash') {
        return '/';
      } else {
        throw new Error('invalid open value');
      }
    } else {
      return '';
    }
  };
  const focus = () => {
    const input = inputRef.current;
    requestAnimationFrame(() => {
      if (input) {
        input.selectionStart = input.selectionEnd = input.value.length;
      }
    });
  };
  useEffect(() => {
    setValue(getInitialValue(open));
    focus();
  }, [open]);

  // set trigger buttons state depending on if value starts with '/'
  useEffect(() => {
    // if (triggerButtonLayerIndex === -1) {
      // const startsWithSlash = value.startsWith('/');
      // setTriggerButtonLayerIndex(startsWithSlash ? 0 : -1);
      
      if (!lastValue && !!value) {
        setSelectedTriggerIndex(0);
      }
      setLastValue(value);

      if (value.startsWith('/')) {
        setKeyPath(value.startsWith('/') ? [] : null);
      }
    // }
  }, [value, lastValue/*, triggerButtonLayerIndex */]);

  // focus on load
  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      if (open) {
        input.focus();
      } else {
        input.blur();
      }
    }
  }, [inputRef.current, open]);

  // commands
  const getCurrentTriggerButtonLayer = () => {
    if (value.startsWith('/')) {
      const command = value.slice(1);
      for (let i = triggerButtonLayers.length - 1; i >= 0; i--) { // note: reverse order
        const layer = triggerButtonLayers[i];
        // console.log('check starts with', command.startsWith(layer.prefix), {command, prefix: layer.prefix});
        if (command.startsWith(layer.prefix)) {
          return layer;
        }
      }
    }
    return null;
  };
  const getCurrentTriggerButton = () => {
    const layer = getCurrentTriggerButtonLayer();
    if (layer) {
      const triggerButton = layer.buttons[selectedTriggerIndex];
      return triggerButton;
    } else {
      return null;
    }
  };

  const enterXr = () => {
    IoBus.request({
      contentWindow: globalThis.parent,
      method: 'requestXrSession',
      args: {
      },
    });
  };
  const toggleWiki = (value) => {
    // console.log('toggleWiki', {
    //   value,
    // });
    
    globalThis.dispatchEvent(new MessageEvent('message', {
      data: {
        // toggleWiki
        method: 'toggleWiki',
        args: {
          // value,
        },
      },
    }));
  };
  const handleChat = value => {
    IoBus.request({
      contentWindow: globalThis.parent,
      method: 'chat',
      args: {
        text: value,
      },
    });
  };
  const handleCommand = command => {
    const words = command.split(/\s+/);
    const word0 = words[0];
    switch (word0) {
      case 'state': {
        const word1 = words[1];
        if (word1 === 'load' || word1 === 'save') {
          const word2 = words[2];
          const slot = parseInt(word2, 10);
          if (slot >= 1 && slot <= 8) {
            const method = word1 === 'load' ? 'loadState' : 'saveState';
            IoBus.request({
              contentWindow: globalThis.parent,
              method,
              args: {
                slot,
              },
            });
            return true;
          }
        }
        break;
      }
      case 'generate': {
        // const target = 'Panel';

        const word1 = words[1];
        const word2 = words[2];

        console.log('got word1', {words, word1, word2});
        const target = capitalize(word1 ?? '');
        if (word2 === 'prompt') {
          const url = parseCommandUrl3(command);
          if (url) {
            IoBus.request({
              contentWindow: globalThis.parent,
              method: `generate${target}FromPrompt`,
              args: {
              },
            });
            return true;
          } else {
            break;
          }
        } else if (word2 === 'file') {
          (async () => {
            let blob;
            try {
              blob = await ioBus.request(`generate${target}FromFile`, {});
            } catch(err) {
              console.warn('got error', err);
            }
            if (blob) {
              const img = await blob2img(blob);
              console.log('got file response', img);
              // document.body.appendChild(img);
            }
          })();
          return true;
        } else if (word2 === 'capture') {
          (async () => {
            const blob = await ioBus.request(`generate${target}FromCapture`, {});
            if (blob) {
              const img = await blob2img(blob);
              console.log('got capture response', img);
              // document.body.appendChild(img);
            }
          })();
          return true;
        } else {
          break;
        }
      }
      case 'add': {
        const word1 = words[1];
        if (word1 === 'url') {
          const url = parseCommandUrl2(command);
          if (url) {
            IoBus.request({
              contentWindow: globalThis.parent,
              method: 'dropUrl',
              args: {
                url,
              },
            });
            return true;
          } else {
            break;
          }
        } else if (word1 === 'prompt') {
          const prompt = parseCommandUrl2(command);
          if (prompt) {
            IoBus.request({
              contentWindow: globalThis.parent,
              method: 'dropPrompt',
              args: {
                prompt,
              },
            });
            return true;
          } else {
            break;
          }
        } else if (word1 === 'file') {
          IoBus.request({
            contentWindow: globalThis.parent,
            method: 'dropFile',
            args: {
            },
          });
          return true;
        } else if (word1 === 'capture') {
          IoBus.request({
            contentWindow: globalThis.parent,
            method: 'dropCapture',
            args: {
            },
          });
          return true;
        } else {
          break;
        }
      }
      case 'portal': {
        const url = parseCommandUrl(command);
        if (url) {
          IoBus.request({
            contentWindow: globalThis.parent,
            method: 'dropPortal',
            args: {
              url,
            },
          });
          return true;
        } else {
          break;
        }
      }
      case 'wiki': {
        const state = parseCommandUrl(command);
        if (state === 'on') {
          toggleWiki(true);
          return true;
        } else if (state === 'off') {
          toggleWiki(false);
          return true;
        } else {
          break;
        }
      }
      case 'livechat': {
        const prompt = parseCommandUrl(command);
        if (prompt === 'on') {
          IoBus.request({
            contentWindow: globalThis.parent,
            method: 'toggleLiveChat',
            args: {
              value: true,
            },
          });
          return true;
        } else if (prompt === 'off') {
          IoBus.request({
            contentWindow: globalThis.parent,
            method: 'toggleLiveChat',
            args: {
              value: true,
            },
          });
          return true;
        } else {
          break;
        }
      }
      case 'vr': {
        enterXr();
        return true;
      }
    }
    return false;
  };
  const commitValue = value => {
    if (value.startsWith('/')) {
      const command = value.slice(1);
      if (handleCommand(command)) {
        return true;
      } else {
        const triggerButton = getCurrentTriggerButton();
        const newValue = '/' + triggerButton.prefix;
        const newCommand = newValue.slice(1);
        if (handleCommand(newCommand)) {
          return true;
        } else {
          setValue(newValue + ' ');
          setSelectedTriggerIndex(0);
          return false;
        }
      }
    } else {
      handleChat(value);
      return true;
    }
  };

  // event handlers
  const keydown = e => {
    stopPropagation(e);

    if (e.repeat) return;

    switch (e.key) {
      case 'Enter': {
        if (open) {
          if (value) {
            if (commitValue(value)) {
              close();
            }
          } else {
            close();
          }
        }
        break;
      }
      case 'Escape': {
        if (open) {
          close();
        }
        break;
      }
      case 'ArrowDown': {
        const triggerLayer = getCurrentTriggerButtonLayer();

        if (triggerLayer) {
          let newIndex = selectedTriggerIndex + 1
          newIndex = mod(newIndex, triggerLayer.buttons.length);
          setSelectedTriggerIndex(newIndex);

          const button = triggerLayer.buttons[newIndex];
          setValue('/' + button.prefix);
          focus();
        }

        break;
      }
      case 'ArrowUp': {
        const triggerLayer = getCurrentTriggerButtonLayer();

        if (triggerLayer) {
          let newIndex = selectedTriggerIndex - 1;
          newIndex = mod(newIndex, triggerLayer.buttons.length);
          setSelectedTriggerIndex(newIndex);

          const button = triggerLayer.buttons[newIndex];
          setValue('/' + button.prefix);
          focus();
        }

        break;
      }
    }
  };
  const keyup = e => {
    stopPropagation(e);

    if (e.repeat) return;

    switch (e.key) {
      case 'Enter':
      case 'ArroyDown':
      case 'ArrowUp':
      {
        break;
      }
      default: {
        const triggerLayer = getCurrentTriggerButtonLayer();
        // console.log('find trigger layer', triggerLayer);

        if (triggerLayer) {
          const command = value.slice(1);
          
          const {buttons} = triggerLayer;
          for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            // console.log('check button', {command, prefix: button.prefix});
            if (command.startsWith(button.prefix)) {
              // console.log('set index', i);
              setSelectedTriggerIndex(i);
              break;
            }
          }
        }

        break;
      }
    }
  }
  const change = e => {
    const value = e.target.value;
    setValue(value);
  };
  const blur = e => {
    // stopPropagation(e);

    if (open) {
      close();
    }
  };
  const close = () => {
    setValue('');
    // setSelectedTriggerIndex(0);
    setKeyPath(null);
    onClose();
  };

  // const triggerButton = getCurrentTriggerButton();
  const triggerButtonLayer = getCurrentTriggerButtonLayer();
  
  return (
    <div className={classnames(
      styles.chat,
      open ? styles.open : null,
    )}>
      <TriggerButtons
        value={value}
        triggerButtonLayers={triggerButtonLayers}
        selectedTriggerButtonLayer={triggerButtonLayer}
        selectedTriggerIndex={selectedTriggerIndex}
      />
      <div className={styles.inputs}>
        <img src="images/webpencil.svg" className={styles.background} />
        <input
          type='text'
          className={styles.input}
          value={value}
          onChange={change}
          onKeyDown={keydown}
          onKeyUp={keyup}
          onKeyPress={stopPropagation}
          onMouseDown={stopPropagation}
          onMouseUp={stopPropagation}
          onClick={stopPropagation}
          onDoubleClick={stopPropagation}
          onBlur={blur}
          ref={inputRef}
        />
      </div>
    </div>
  );
};

const TriggerButtons = ({
  value,
  triggerButtonLayers,
  selectedTriggerButtonLayer,
  selectedTriggerIndex,
}) => {
  return (
    <div className={classnames(
      styles.triggerButtons,
    )}>
      {triggerButtonLayers.map((triggerButtonLayer, index) => {
        // console.log('render layer', selectedTriggerButtonLayer === triggerButtonLayer, selectedTriggerButtonLayer, triggerButtonLayer);
        return (
          <div
            className={classnames(
              styles.layer,
              selectedTriggerButtonLayer === triggerButtonLayer ? styles.open : null,
            )}
            key={index}
          >
          {
            (triggerButtonLayer.buttons ?? []).map((button, index2) => {
              // console.log('render button', button);
              return (
                <div
                  className={classnames(
                    styles.button,
                    selectedTriggerIndex === index2 ? styles.selected : null,
                    button.label === 'function' ? styles.labeled : null,
                  )}
                  key={index2}
                >{
                  typeof button.label === 'function' ? (() => {
                    const [
                      label,
                      name,
                    ] = button.label(value);
                    return (
                      <div className={styles.button2}>
                        <div className={styles.label}>{label || ' '}</div>
                        <div className={styles.name}>{name || ' '}</div>
                      </div>
                    );
                  })() : button.label
                }</div>
              );
            })
          }
          </div>
        );
      })}
    </div>
  );
};