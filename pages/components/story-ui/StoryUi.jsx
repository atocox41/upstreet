import React, {useState, useEffect} from 'react';
import {MegaChatBox} from '../mega-chat-box/MegaChatBox.jsx';

import styles from '../../../styles/StoryUi.module.css';

//

export const StoryUi = ({
  engine,
}) => {
  const [message, setMessage] = useState(null);

  const [inputOpen, setInputOpen] = useState(false);

  const [options, setOptions] = useState(null);
  const [option, setOption] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const [speakOpen, setSpeakOpen] = useState(false);
  
  const [progressing, setProgressing] = useState(false);
  const [finished, setFinished] = useState(false);

  // bind story manager
  useEffect(() => {
    function conversationstart(e) {
      const {conversation} = e.data;
      conversation.addEventListener('message', e => {
        const {message} = e.data;
        setFinished(false);
        setMessage(message);
      });
      conversation.addEventListener('emote', e => {
        const {emote} = e.data;
        console.log('emote', emote);
        setFinished(false);
        // setMessage(message);

        // localPlayer.actionManager.addAction(newFallLoopAction);
      });
      conversation.addEventListener('options', e => {
        const {options} = e.data;
        if (options) {
          setOptions(options);
          setOption(null);
        }
      });
      conversation.addEventListener('hoverindex', e => {
        const {hoverIndex} = e.data;
        setHoverIndex(hoverIndex);

        engine.sounds.playSoundName('menuMove');
      });
      conversation.addEventListener('option', e => {
        const {option} = e.data;
        setOption(option);
      });

      conversation.addEventListener('progressstart', e => {
        setProgressing(true);
      });
      conversation.addEventListener('progressend', e => {
        setProgressing(false);
      });

      conversation.addEventListener('finish', e => {
        setFinished(true);

        engine.sounds.playSoundName('menuDone');
      });

      conversation.addEventListener('close', e => {
        setMessage(null);
      });
    }
    engine.storyManager.addEventListener('conversationstart', conversationstart);
    
    return () => {
      engine.storyManager.removeEventListener('conversationstart', conversationstart);
    };
  }, []);

  // bind options
  useEffect(() => {
    if (options && option) {
      const timeout = setTimeout(() => {
        setOptions(null);
        setOption(null);
        setHoverIndex(null);
      }, 1000);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [options, option]);

  const clearMode = () => {
    setInputOpen(false);
    setSpeakOpen(false);
    setOptions(null);
  };
  const commitMessage = text => {
    clearMode();

    const conversation = engine.storyManager.getConversation();
    const messages = conversation.getMessages();
    const lastMessage = messages[messages.length - 1];
    const playerName = lastMessage.getPlayerName();
    const playerSpec = {
      name: playerName,
    };
    conversation.injectPlayerMessage(playerSpec, text);
  };
  const commitAnonymousMessage = text => {
    clearMode();

    const conversation = engine.storyManager.getConversation();
    conversation.injectAnonymousMessage(text);
  };

  // bind speak
  useEffect(() => {
    if (speakOpen) {
      let final_transcript = '';
      const localSpeechRecognition = new webkitSpeechRecognition();

      localSpeechRecognition.interimResults = false;
      localSpeechRecognition.maxAlternatives = 1;
      localSpeechRecognition.onerror = e => {
        console.log('speech recognition error', e);
      };
      localSpeechRecognition.onend = () => {
        if (final_transcript) {
          commitMessage(final_transcript);
        }
      };
      localSpeechRecognition.onresult = event => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          final_transcript += event.results[i][0].transcript;
        }
      };
      localSpeechRecognition.start();

      return () => {
        // close the speech recognition, but do not let the result propagate
        localSpeechRecognition.stop();
      };
    }
  }, [
    speakOpen,
  ]);

  //

  return (
    <div className={styles.storyTime}>
      <MegaChatBox
        message={message}

        inputOpen={inputOpen}

        options={options}
        option={option}
        hoverIndex={hoverIndex}

        speakOpen={speakOpen}

        progressing={progressing}
        finished={finished}

        onOptionSelect={option => {
          // const conversation = engine.storyManager.getConversation();
          // conversation.progressOptionSelect(option);

          commitAnonymousMessage(option);

          engine.sounds.playSoundName('menuSelect');
        }}

        onXClick={e => {
          clearMode();

          const conversation = engine.storyManager.getConversation();
          conversation && conversation.close();

          engine.sounds.playSoundName('menuSelect');
        }}
        
        onInputClick={e => {
          clearMode();

          setInputOpen(true);
        }}

        onOptionsClick={async e => {
          clearMode();

          engine.sounds.playSoundName('menuSelect');

          if (!options) {
            setProgressing(true);

            try {
              const conversation = engine.storyManager.getConversation();
              const options = await conversation.getNextMessageOptions();
              const newOptions = options.map(option => {
                return {
                  message: option,
                };
              });
              setOptions(newOptions);
            } finally {
              setProgressing(false);
            }
          } else {
            setOptions(null);
          }
        }}

        onSpeakClick={e => {
          clearMode();
          setSpeakOpen(!speakOpen);
        }}

        onInputCommit={text => {
          commitMessage(text);
        }}
        
        onClick={e => {
          !progressing && engine.storyManager.progressConversation();
        }}

        engine={engine}
      />
    </div>
  );
};