import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import classnames from 'classnames';
import {
  BackButton,
} from '../companion-quick-settings/CompanionQuickSettings.jsx';

import styles from './CompanionChat.module.css';
import { extractFieldValue, extractURL } from '../../../packages/engine/utils/companion-utils.js';

//

const {
  electronIpc,
} = globalThis;
/* const flushStream = async (s) => {
  const reader = s.readable.getReader();
  for (;;) {
    const {
      done,
      // value,
    } = await reader.read();
    if (done) {
      break;
    }
  }
}; */

//

const ChatLog = ({
  messages,

  aiAgentController,
  skills,

  onClose,
  name,
  children,
}) => {
  const iMessageRef = useRef();

  useEffect(() => {
    const div = iMessageRef.current;
    if (div) {
      requestAnimationFrame(() => {
        div.scrollTop = div.scrollHeight;
      });
    }
  }, [iMessageRef.current, messages]);

  return (
    <div className={styles.chatLog}>
      <BackButton 
        icon="caretLeft"
        onClick={e => {
          // setSettingsMode(null);
          onClose(true);
        }}
      />
      <div className={styles.avatarName}>
        {name}
      </div>
      <div className={styles.imessage}>
        {children}
        <div className={styles.scrollContainer} ref={iMessageRef}>
          {
            messages.map((message, i) => {
              const {
                user,
                type,
                // value,
              } = message;
              const isRequest = extractFieldValue(message.value, 'GENERATE_IMAGE') === 'TRUE';
              const skill = skills.get(type);
              if (skill && !isRequest) {
                const isText = message.type === 'TEXT';
                const isFile = message.type === 'FILE';
                const isImage = extractFieldValue(message.value, 'GENERATE_IMAGE') === 'FALSE';
                const classNames = [];
                if (isText) {
                  if (user === '@user') {
                    classNames.push(styles['from-me']);
                  } else {
                    classNames.push(styles['from-them']);
                  }
                } else if(isImage) {
                  if (user === '@user') {
                    classNames.push(styles['from-me']);
                  } else {
                    classNames.push(styles['from-them']);
                  }
                } else if(isFile){
                  if (user === '@user') {
                    classNames.push(styles['from-me']);
                  } else {
                    classNames.push(styles['from-them']);
                  }
                  classNames.push(styles.info);
                } else {
                  classNames.push(styles['from-them']);
                  classNames.push(styles.info);
                }
                const user2 = (() => {
                  if (isText) {
                    return '';
                  }
                  return message.user;
                })();
                const text = skill.format({
                  ...message,
                  user: user2,
                });
                
                return (

                  <p
                    className={classnames(...classNames)}
                    key={i}
                  >
                    {isText ? null : (
                      isImage ? 
                        null : ( 
                        <img src="images/info.svg" className={styles.img} />)
                    )}
                    {isImage ? 
                      <img src={extractURL(extractFieldValue(text, 'URL'))} alt={extractFieldValue(text, 'IMAGE_DESCRIPTION')} className={styles.image} />
                      : (
                      isFile ? (text.replace(/[\[\]]/g, '')) : (text)
                      )}
                  </p>
                );
              } else {
                return null;
              }
            })
          }
        </div>
      </div>
    </div>
  );
};

//

const ToggleHackModeButton = ({
  className,
  onClick,
}) => {
  return (
    <a
      href='#'
      onClick={onClick}
      className={classnames(
        styles.toggleModeButton,
        styles.hack,
        className,
      )}
    >
      <img src="images/hack.svg" className={classnames(
        styles.img,
      )} />
    </a>
  );
};

//

/* const TogglePhoneModeButton = ({
  className,
  onClick,
}) => {
  return (
    <a
      href='#'
      onClick={onClick}
      className={classnames(
        styles.toggleModeButton,
        styles.phone,
        className,
      )}
    >
      <img src="images/rewind.svg" className={classnames(
        styles.img,
      )} />
    </a>
  );
}; */

//

const ChatInput = ({
  // sideOpen,
  // togglePhoneMode,

  open,
  locked,
  onOpen,
  onClose,
  onChat,
  currentPlayerSpec
}) => {
  const [value, setValue] = useState('');
  const inputRef = useRef();
  const [isPickerVisible, setPickerVisible] = useState(false);

  const [name, setName] = useState('');

  useEffect(() => {
    setName(currentPlayerSpec?.name ?? '');
  }, [currentPlayerSpec]);

  useEffect(() => {
    const handlePaste = (event) => {
      const items = (event.clipboardData || event.originalEvent.clipboardData).items;
      for (let index in items) {
        const item = items[index];
        if (item.kind === 'file') {
          const blob = item.getAsFile();
          onChat({ type: 'file', value: blob });  // Assume onChat can handle Blob data
        }
      }
    };
    
    window.addEventListener('paste', handlePaste);
  
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [onChat]);
  
  const doFocus = () => {
    const input = inputRef.current;
    requestAnimationFrame(() => {
      if (input) {
        input.focus();
        input.selectionStart = input.selectionEnd = input.value.length;
      }
    });
  };
  if (electronIpc) {
    useEffect(() => {
      if (open || locked) {
        electronIpc.browserAddSolid();
        doFocus();

        return () => {
          electronIpc.browserRemoveSolid();
        };
      }
    }, [open, locked]);
  }

  const commitValue = value => {
    onChat({ type: 'text', value: value});
    return true;
  };

  // event handlers
  const stopPropagation = e => {
    e.stopPropagation();
  };
  const keydown = e => {
    stopPropagation(e);

    if (e.repeat) return;

    switch (e.key) {
      case 'Enter': {
        e.preventDefault()
        // if (open) {
          if (value) {
            if (commitValue(value)) {
              doClose();
            }
          } else {
            doClose();
          }
        // }
        break;
      }
      case 'Escape': {
        // if (open) {
          doClose();
        // }
        break;
      }
    }
  };
  const change = e => {
    const value = e.target.value;
    setValue(value);
  };
  const focus = e => {
    // stopPropagation(e);

    // console.log('got focus');

    // if (!open) {
    //   doOpen();
    // }
  };
  const blur = e => {
    // stopPropagation(e);

    if (open) {
      doClose(false);
    }
  };
  const doOpen = () => {
    onOpen();
  };
  const doClose = (force) => {
    setValue('');
    // setSelectedTriggerIndex(0);
    // setKeyPath(null);
    onClose(force);
  };
  const addEmoji = e => {
    toggleEmojiPicker(!isPickerVisible);
    let emoji = e.native;
    setValue(value + emoji);
  };
  const toggleEmojiPicker = () => {
    setPickerVisible(!isPickerVisible);
  };
  const drop = e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      onChat({ type: 'file', value: file });  // Assume onChat can handle any file type
    }
  };
  const dragover = e => {
    e.preventDefault();
  };
  const dragleave = e => {
    e.preventDefault();
  };  
  return (
    <div className={classnames(
      styles.inputs,
      locked ? styles.locked : null
    )}>
      <img src="images/webpencil.svg" className={styles.background} />
      {isPickerVisible ? 
        <Picker
          data={data}
          onEmojiSelect={addEmoji}
          emojiSize={18}
          perLine={8}
        /> 
        : null
      }
      <div className={styles.inputContainer}>
        <button onClick={toggleEmojiPicker} className={styles.chatButton}>
          {String.fromCodePoint(0x1F60A)}
        </button>
        <input
          type="file"
          id="fileUpload"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files[0];
            if (file) {
              onChat({ type: 'file', value: file });
            }
          }}
        />
        <button 
          onClick={() => document.getElementById('fileUpload').click()} 
          className={styles.chatButton}
        >
          File
        </button>
        <textarea
          className={styles.input}
          value={value}
          onChange={change}
          onKeyDown={keydown}
          // onKeyUp={keyup}
          // onKeyPress={stopPropagation}
          onMouseDown={stopPropagation}
          onMouseUp={stopPropagation}
          // onClick={stopPropagation}
          // onDoubleClick={stopPropagation}
          onFocus={focus}
          onBlur={blur}
          onDrop={drop}
          onDragOver={dragover}
          onDragLeave={dragleave}
          ref={inputRef}
        />
      </div>
    </div>
  );
}

//

/* const ChatHack = ({
  hackMode,
  // playerSpec,
  aiAgentController,
  characterIdentities,
}) => {
  const [characterId, setCharacterId] = useState('');
  
  const [skillNames, setSkillNames] = useState([]);
  const [skillSpecs, setSkillSpecs] = useState([]); // XXX need to derive this with useEffect
  const [skill, setSkill] = useState('');

  const [value, setValue] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
      }, 1000);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [copied]);

  useEffect(() => {
    if (aiAgentController && characterId) {
      const aiAgent = aiAgentController.getAiAgentByCharacterId(characterId);
      // if (aiAgent) {
        const _updateSkills = () => {
          const newSkillNames = Array.from(aiAgent.getSkills());
          setSkillNames(newSkillNames);
        };
        _updateSkills();

        const skillsupdate = e => {
          _updateSkills();
        };
        aiAgent.addEventListener('skillsupdate', skillsupdate);

        return () => {
          aiAgent.removeEventListener('skillsupdate', skillsupdate);
        };
      // } else {
      //   throw new Error('no ai agent for character id: ' + characterId);
      // }
    }
  }, [aiAgentController, characterId]);

  return (
    <div className={classnames(
      styles.chatHack,
      hackMode ? styles.open : null,
    )}>
      <div className={styles.text}>Hack character skill</div>

      <select
        value={skill}
        onChange={e => {
          setCharacterId(e.target.value);
        }}
      >
        <option value=''>[random character]</option>
        {characterIdentities.map(characterIdentity => {
          const characterId = characterIdentity.spec.id;
          return (
            <option key={characterId} value={characterId}>{characterId}</option>
          );
        })}
      </select>

      <select
        value={skill}
        onChange={e => {
          const newSkill = e.target.value;
          setSkill(newSkill);
        }}
      >
        <option value=''>[random skill]</option>
        {skillSpecs.map(skill => {
          const skillName = skill.name;
          return (
            <option key={skillName} value={skillName}>{skillName}</option>
          );
        })}
      </select>

      <button className={styles.btn} onClick={async () => {
        const messages = await aiAgentController.getPromptMessages();

        if (skill) {
          const skillSpec = skillSpecs.find(skillSpec => skillSpec.name === skill);
          if (skillSpec) {
            messages.push(makeSkillRequestMessage({
              user: aiAgentController.name,
              skillSpec,
            }));
          }
        }

        const messagesString = formatMessagesDebug(messages);
        navigator.clipboard.writeText(messagesString.join('\n'));

        setCopied(true);
      }}>{copied ? 'Copied!' : 'Copy prompt'}</button>
      <button className={styles.btn} onClick={async () => {
        const messages = await aiAgentController.getPromptMessages();

        if (characterId) {
          const aiAgent = aiAgentController.getAiAgentByCharacterId(characterId);
          if (aiAgent) {
            messages.push(makeSkillRequestMessage({
              user: aiAgentController.name,
              skillSpec,
            }));
          }
        }

        if (skill) {
          const skillSpec = skillSpecs.find(skillSpec => skillSpec.name === skill);
          if (skillSpec) {
            // XXX needs to be bound to a specific character
            // XXX does that mean that the ChatHack UI needs a per-character selector?! probably. 
            messages.push(makeSkillRequestMessage({
              user: aiAgentController.name,
              skillSpec,
            }));
          }
        }

        const abortController = new AbortController();
        const {signal} = abortController;
        // XXX surprisingly, this is ok...
        const completionStream = aiAgentController.getCompletionStream(messages, {
          signal,
        });

        let s = '';
        const avatarMlParser = new AvatarMLStreamParser({
          skills: aiAgentController.skills, // XXX needs skills union
          onMessage: (m) => {
            console.log('got message', m);
          },
          onData: (d) => {
            s += d;
            setValue(s);
          },
          signal,
        });

        const reader = completionStream
          .pipeThrough(avatarMlParser)
          .getReader();
        for (;;) {
          const result = await reader.read();
          if (result.done) {
            break;
          }
        }
      }}>Generate</button>
      <button className={styles.btn} onClick={() => {
        const skillSpec = skillSpecs.find(skillSpec => skillSpec.name === skill) ?? skillSpecs[0];
        if (skillSpec) {
          setValue(skillSpec.value);
        };
      }}>Default</button>

      <textarea className={styles.textarea} value={value} onChange={e => {
        const value = e.target.value;
        setValue(value);
      }}></textarea>
      
      {value ?
        <>
          <button className={styles.btn} onClick={async (e) => {
            const messages = [];
            const abortController = new AbortController();
            const avatarMlParser = new AvatarMLStreamParser({
              skills: aiAgentController.skills, // XXX needs skills union
              onMessage: (m) => {
                messages.push(m);
              },
              signal: abortController.signal,
            });
            const p = flushStream(avatarMlParser);

            const writer = avatarMlParser.writable.getWriter();
            writer.write(value);
            writer.close();

            await p;

            for (const message of messages) {
              const {
                character,
                command,
                value,
              } = message;

              // XXX should match up the agent message to an actual ai agent in the ai agent controller
              // XXX that should be a method on the ai agent controller
              const agentMessage = new AgentMessage({
                type: command,
                user: aiAgentController.name,
                value,
              }, {
                signal: abortController.signal,
              });
              aiAgentController.playAgentMessage(agentMessage);
            }
          }}>Submit</button>
          <button className={styles.btn} onClick={() => {
            setValue('');
          }}>Clear</button>
        </>
      : null}
    </div>
  );
}; */

//

const ChatPhoneFront = ({
  // sideOpen,
  // hackMode,
  // toggleHackMode,
  // togglePhoneMode,

  open,
  locked,
  messages,
  onOpen,
  onClose,
  onChat,
  name,

  // playerSpec,
  aiAgentController,
  skills,

  characterIdentities,
}) => {
  return (
    <div className={classnames(
      styles.chatPhone,
      styles.front,
      // sideOpen ? styles.sideOpen : null,
    )}>
      <header className={styles.header}>
        {/* <div className={styles.label}>You</div> */}
        {/* <ToggleHackModeButton
          // className='forward'
          className={hackMode ? styles.open : null}
          onClick={toggleHackMode}
        /> */}
        {/* <TogglePhoneModeButton
          // className='forward'
          className={styles.reverse}
          onClick={togglePhoneMode}
        /> */}
      </header>
      
      <ChatLog
        messages={messages}

        aiAgentController={aiAgentController}
        skills={skills}
        
        onClose={force => {
          // doClose(force);
          onClose(force);
        }}
        name={name}
      >
        {/* <ChatHack
          hackMode={hackMode}
          // playerSpec={playerSpec}
          aiAgentController={aiAgentController}
          characterIdentities={characterIdentities}
        /> */}
      </ChatLog>

      <ChatInput
        open={open}
        locked={locked}
        onOpen={onOpen}
        onClose={onClose}
        onChat={onChat}
      />
    </div>
  );
};

//

// XXX this can be deleted
/* const ChatPhoneBack = ({
  sideOpen,
  hackMode,
  toggleHackMode,
  togglePhoneMode,

  open,
  locked,
  messages,
  onOpen,
  onClose,
  onChat,

  playerSpec,
  aiAgentController,
}) => {
  // console.log('back open', sideOpen);

  return (
    <div className={classnames(
      styles.chatPhone,
      styles.back,
      sideOpen ? styles.sideOpen : null,
    )}>
      <header className={styles.header}>
        <div className={styles.label}>Moe</div>
        <ToggleHackModeButton
          // className='backward'
          className={hackMode ? styles.open : null}
          onClick={toggleHackMode}
        />
        <TogglePhoneModeButton
          // className='backward'
          className={styles.reverse}
          onClick={togglePhoneMode}
        />
      </header>
      <ChatLog
        messages={messages}
        aiAgentController={aiAgentController}
        onClose={force => {
          // doClose(force);
          onClose(force);
        }}
      >
        <ChatHack
          hackMode={hackMode}
          playerSpec={playerSpec}
          aiAgentController={aiAgentController}
        />
      </ChatLog>
      <ChatInput
        open={open}
        locked={locked}
        onOpen={onOpen}
        onClose={onClose}
        onChat={onChat}
      />
    </div>
  );
}; */

//

/* const phoneModes = [
  'humanPhone',
  'moePhone',
]; */
export const CompanionChat = ({
  open,
  locked,
  messages,
  onOpen,
  onClose,
  onChat,

  // playerSpecs,
  // currentPlayerId,

  aiAgentController,
  skills,

  characterIdentities,
}) => {
  // const [hackMode, setHackMode] = useState(false);
  // const [phoneMode, setPhoneMode] = useState(phoneModes[0]);

  // useEffect(() => {
  //   if (!open && !locked && phoneMode !== phoneModes[0]) {
  //     setPhoneMode(phoneModes[0]);
  //   }
  // }, [open, locked, phoneMode]);

  // const toggleHackMode = () => {
  //   setHackMode(!hackMode);
  // };
  // const togglePhoneMode = () => {
  //   const nextPhoneMode = phoneMode === phoneModes[0] ? phoneModes[1] : phoneModes[0];
  //   setPhoneMode(nextPhoneMode);
  // };

  // const playerSpec = playerSpecs.find(playerSpec => playerSpec.id === currentPlayerId);

  return (
    <div className={classnames(
      styles.chat,
      (open || locked) ? styles.open : null,
    )} onClick={e => {
      e.stopPropagation();
    }}>
      <ChatPhoneFront
        // sideOpen={phoneMode === phoneModes[0]}
        // hackMode={hackMode}
        // toggleHackMode={toggleHackMode}
        // togglePhoneMode={togglePhoneMode}

        open={open}
        locked={locked}
        messages={messages}
        onOpen={onOpen}
        onClose={onClose}
        onChat={onChat}

        // playerSpec={playerSpec}
        aiAgentController={aiAgentController}
        skills={skills}

        characterIdentities={characterIdentities}
      />
      {/* <ChatPhoneBack
        sideOpen={phoneMode === phoneModes[1]}
        hackMode={hackMode}
        toggleHackMode={toggleHackMode}
        togglePhoneMode={togglePhoneMode}

        open={open}
        locked={locked}
        messages={messages}
        onOpen={onOpen}
        onClose={onClose}
        onChat={onChat}

        playerSpec={playerSpec}
        aiAgentController={aiAgentController}
      /> */}
    </div>
  );
};