import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';

import {
  PlayerSpecsBinding,
} from '../../bindings/PlayerSpecsBinding.jsx';
import {
  ChatMessagesBinding,
} from '../../bindings/ChatMessagesBinding.jsx';

import {
  messageTypeNames,
} from '../../../packages/engine/managers/lore/messages.jsx';

import styles from '../../../styles/ChatUi.module.css';
import topBarStyles from '../../../styles/TopBar.module.css';

//

const Messages = ({
  styles,
  messages,
}) => {
  return (
    <div className={styles.chatMessages}>
      {messages.map((message, i) => {
        return message.toReact({
          styles,
          key: i,
        });
      })}
    </div>
  );
};

//

export const ChatUi = ({
  engine,
  // onClose,
}) => {
  const [messages, setMessages] = useState([]);
  const [playerSpecs, setPlayerSpecs] = useState([]);
  //
  const [playerSpecIndex, setPlayerSpecIndex] = useState('');
  const [functionName, setFunctionName] = useState('');
  const [text, setText] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [nexting, setNexting] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(false);
  //
  const inputRef = useRef(null);

  //

  // listen for chat open keys
  useEffect(() => {
    if (engine) {
      const storyManager = engine.storyManager;
      const keydown = e => {
        switch (e.key) {
          case 'Enter':
          case '/':
          {
            if (!storyManager.getConversation()) {
              setChatOpen(true);
            }
            break;
          }
        }
      };
      globalThis.addEventListener('keydown', keydown);

      return () => {
        globalThis.removeEventListener('keydown', keydown);
      };
    }
  }, [
    engine,
  ]);

  // focus chat on open
  useEffect(() => {
    if (chatOpen) {
      inputRef.current.focus();
    }
  }, [
    chatOpen,
  ]);

  // close chat when conversation starts
  useEffect(() => {
    if (engine) {
      const storyManager = engine.storyManager;
      const conversationchange = e => {
        const {
          conversation,
        } = e.data;
        if (conversation && chatOpen) {
          setChatOpen(false);
        }
      };
      storyManager.addEventListener('conversationchange', conversationchange);

      return () => {
        storyManager.removeEventListener('conversationchange', conversationchange);
      };
    }
  }, [
    chatOpen,
  ]);

  // close chat on pointerlockchange
  useEffect(() => {
    if (engine) {
      const {pointerLockManager} = engine;
      const pointerlockchange = e => {
        const {
          pointerLockElement,
        } = e.data;
        if (pointerLockElement) {
          setChatOpen(false);
        }
      };
      pointerLockManager.addEventListener('pointerlockchange', pointerlockchange);

      return () => {
        pointerLockManager.removeEventListener('pointerlockchange', pointerlockchange);
      };
    }
  }, [
    engine,
  ]);

  //

  const _commitChat = (text) => {
    if (text) {
      const playersManager = engine.playersManager;
      const loreManager = engine.loreManager;
      const chatManager = engine.chatManager;
      const localPlayer = playersManager.getLocalPlayer();
      const appManagerContext = engine.appManagerContext;

      const _parseCommandMessage = (text) => {
        const match = text.match(/^\/([^\s]+)(.*)$/);
        if (match) {
          const commandString = match[1];
          const argsString = match[2];
          const args = argsString.split(/\s+/).filter(s => s);
          switch (commandString.toLowerCase()) {
            case 'status': {
              const spec = localPlayer.playerSpec;
              const actions = localPlayer.actionManager.getActionsArray();
              const playerStatus = {
                spec,
                actions,
              };
              console.log('got playerStatus', playerStatus);
              return loreManager.createAnonymousPlayerStatusMessage({
                playerStatus,
              });
            }
            case 'world': {
              const appManager = appManagerContext.getAppManager();
              const objects = appManager.save({
                filter: {
                  physics: true,
                },
              });
              const worldStatus = {
                objects,
              };
              console.log('got worldStatus', worldStatus);
              return loreManager.createAnonymousObjectsStatusMessage({
                worldStatus,
              });
            }
            case 'emotion': {
              const emotion = args[0];
              if (!emotion) {
                return false;
              }

              return loreManager.createAnonymousEmotionMessage({
                playerName: localPlayer.playerSpec.name,
                emotion,
              });
            }
            case 'emote': {
              const emote = args[0];
              if (!emote) {
                return false;
              }

              return loreManager.createAnonymousEmoteMessage({
                playerName: localPlayer.playerSpec.name,
                emote,
              });
            }
            case 'talkto': {
              const target = args[0];
              if (!target) {
                return false;
              }

              return loreManager.createAnonymousTalkToMessage({
                playerName: localPlayer.playerSpec.name,
                target,
              });
            }
            case 'facetoward': {
              const target = args[0];
              if (!target) {
                return false;
              }

              return loreManager.createAnonymousFaceTowardMessage({
                playerName: localPlayer.playerSpec.name,
                target,
              });
            }
            case 'moveto': {
              const target = args[0];
              if (!target) {
                return false;
              }

              return loreManager.createAnonymousMoveToMessage({
                playerName: localPlayer.playerSpec.name,
                target,
              });
            }
            case 'lookat': {
              const target = args[0];
              if (!target) {
                return false;
              }

              return loreManager.createAnonymousLookAtMessage({
                playerName: localPlayer.playerSpec.name,
                target,
              });
            }
          }
          return false;
        } else {
          return null;
        }
      };
      
      let message = _parseCommandMessage(text);
      if (message !== false) {
        if (!message) {
          message = loreManager.createAnonymousChatMessage({
            playerName: localPlayer.playerSpec.name,
            message: text,
          });
        }
        chatManager.addMessage(message, {
          source: 'local',
        });
      } else {
        console.warn('invalid command', {
          text,
        });
      }

      setText('');
    } else {
      inputRef.current.blur();

      const pointerLockManager = engine.pointerLockManager;
      pointerLockManager.requestPointerLock();

      setChatOpen(false);
    }
  };

  //

  return (
    <div className={classnames(
      styles.chatUi,
      chatOpen ? styles.open : null,
    )}>
      <PlayerSpecsBinding
        engine={engine}
        playerSpecs={playerSpecs}
        setPlayerSpecs={setPlayerSpecs}
      />
      <ChatMessagesBinding
        engine={engine}
        messages={messages}
        setMessages={setMessages}
      />
      
      <Messages
        styles={styles}
        messages={messages}
      />
      
      <div className={styles.bottomBar}>
        <input
          type='text'
          className={styles.input}
          value={text}
          onChange={e => {
            setText(e.target.value);
          }} onKeyDown={e => {
            switch (e.key) {
              case 'Enter': {
                e.preventDefault();
                e.stopPropagation();

                _commitChat(text);
                break;
              }
            }
          }}
          ref={inputRef}
        />

        <select className={styles.select} value={playerSpecIndex} onChange={e => {
          setPlayerSpecIndex(e.target.value);
        }}>
          <option value=''>Character</option>
          {
            playerSpecs.map((playerSpec, i) => {
              return (
                <option value={i} key={i}>{playerSpec.name}</option>
              );
            })
          }
        </select>
        <select className={styles.select} value={functionName} onChange={e => {
          setFunctionName(e.target.value);
        }}>
          <option value=''>Function</option>
          {
            Object.values(messageTypeNames).map((functionName, i) => {
              return (
                <option value={functionName} key={i}>{functionName}</option>
              );
            })
          }
        </select>
        <div className={topBarStyles.buttons}>
          <div className={classnames(
            topBarStyles.button,
            nexting ? topBarStyles.disabled : null,
          )} onClick={async e => {
            e.preventDefault();
            e.stopPropagation();

            if (!nexting) {
              setNexting(true);

              const storyManager = engine.storyManager;
              const opts = {};
              if (functionName) {
                opts.functionName = functionName;
              }
              if (playerSpecIndex) {
                const playerSpecIndexInt = parseInt(playerSpecIndex, 10);
                const playerSpec = playerSpecs[playerSpecIndexInt];
                if (!playerSpec) {
                  throw new Error(`invalid player spec index: ${playerSpecIndex}`);
                }
                opts.playerSpec = playerSpec;
              }
              const message = await storyManager.nextMessageAnonymous(opts);

              setNexting(false);
            }
          }}>
            <div className={topBarStyles.background} />
            <img className={classnames(
              topBarStyles.img,
              topBarStyles.small,
            )} src='/images/chevrons.svg' />
            <div className={topBarStyles.text}>Next</div>
          </div>
          <div className={classnames(
            topBarStyles.button,
            autoEnabled ? topBarStyles.selected : null,
          )} onClick={async e => {
            setAutoEnabled(!autoEnabled);
          }}>
            <div className={topBarStyles.background} />
            <img className={classnames(
              topBarStyles.img,
              topBarStyles.small,
            )} src='/images/infinity.svg' />
            <div className={topBarStyles.text}>Auto</div>
          </div>
        </div>
      </div>
    </div>
  );
};