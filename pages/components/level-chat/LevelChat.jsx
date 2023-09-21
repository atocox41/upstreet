import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';
import {
  ChatInputText,
} from '../chat-input-text/ChatInputText.jsx';

//

import styles from '../../../styles/LevelChat.module.css';

//

export const LevelChat = ({
  engine,
}) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);

  const localPlayer = engine.playersManager.getLocalPlayer();

  return (
    <div className={styles.levelChat}>
      <div className={styles.messages}>
        {messages.map((message, i) => {
          return (
            <div className={styles.message} key={i}>
              <div className={styles.name}>
                {message.name}
              </div>
              <div className={styles.content}>: {message.content}</div>
            </div>
          );
        })}
      </div>
      <ChatInputText
        text={text}
        setText={setText}
        open={open}
        setOpen={setOpen}
        onSubmit={async text => {
          // console.log('chat enter', {text});

          const localPlayerSpec = localPlayer.playerSpec;
          const content = text;
          // const newMessages = [
          //   ...messages,
          //   {
          //     type: 'single',
          //     name: localPlayerSpec.name,
          //     content,
          //   }
          // ];
          // setMessages(newMessages);

          // const stream = localPlayer.voicer.getStream(content);
          // await localPaleyer.playAudioStream(stream);
        }}
      />
    </div>
  );
};