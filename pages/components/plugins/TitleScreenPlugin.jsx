// import {NetworkRealms} from 'multiplayer-do/public/network-realms.mjs'
// import * as THREE from 'three';
import React, {
  useState,
  useEffect,
} from 'react';
import classnames from 'classnames';

import styles from '../../../styles/TitleScreenPlugin.module.css';

//

class MessageObject extends EventTarget {
  constructor({
    id,
    name,
    description,
  }) {
    super();

    this.id = id;
    this.name = name;
    this.description = description;

    this.open = false;
  }
  setOpen(open) {
    this.open = open;
    
    this.dispatchEvent(new MessageEvent('openchange', {
      data: {
        open,
      },
    }));
  }
}

//

const closeTimeout = 1000;
export const Message = ({
  message,
  onClose,
}) => {
  const [open, setOpen] = useState(message.open);

  const {
    name,
    description,
  } = message;

  useEffect(() => {
    let timeout;
    const openchange = e => {
      setOpen(message.open);

      if (!message.open) {
        timeout = setTimeout(() => {
          onClose(message);
        }, closeTimeout);
      }
    };
    message.addEventListener('openchange', openchange);

    return () => {
      message.removeEventListener('openchange', openchange);
      clearTimeout(timeout);
    };
  }, [open]);

  return (
    <div className={classnames(
      styles.message,
      open ? styles.open : null,
    )}>
      <div className={styles.wrap}>
        <div className={classnames(
          styles.name,
          name ? styles.visible : null,
        )}>
          <div className={styles.background} />
          <div className={styles.text}>{name}</div>
        </div>
        <div className={classnames(
          styles.description,
          description ? styles.visible : null,
        )}>
          <div className={styles.background} />
          <div className={styles.text}>{description}</div>
        </div>
      </div>
    </div>
  );
};

//

export const TitleScreenPlugin = ({
  ioBus,
}) => {
  const [messages, setMessages] = useState([]);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const sendMessage = async e => {
      const {
        type,
        args,
      } = e.data;

      if (type === 'narratorMessageVoiceStart') {
        const {
          messageId,
          // message,
          name,
          description,
        } = args;

        if (typeof messageId !== 'string' || typeof name !== 'string' || typeof description !== 'string') {
          console.warn('messageId not string', {messageId, name, description});
          debugger;
        }

        const newMessages = messages.slice();
        const messageObject = new MessageObject({
          id: messageId,
          name,
          description,
        });
        newMessages.push(messageObject);
        setMessages(newMessages);
        setEpoch(epoch + 1);

        requestAnimationFrame(() => {
          messageObject.setOpen(true);
        });
      } else if (type === 'narratorMessageVoiceEnd') {
        const {
          messageId,
          message,
        } = args;

        if (typeof messageId !== 'string') {
          console.warn('messageId not string', messageId);
          debugger;
        }

        const messageObject = messages.find(m => m.id === messageId);
        if (messageObject) {
          messageObject.setOpen(false);
        } else {
          console.warn('could not find message', messageId);
          debugger;
        }
      }
    };
    ioBus.addEventListener('sendMessage', sendMessage);

    return () => {
      ioBus.removeEventListener('sendMessage', sendMessage);
    };
  }, [epoch]);

  const onClose = (message) => {
    const messageIndex = messages.findIndex(m => m.id === message.id);
    // console.log('onclose index', messageIndex);
    if (messageIndex === -1) {
      console.warn('could not find message', message.id);
    }
    const newMessages = messages.slice();
    messages.splice(messageIndex, 1);
    setMessages(newMessages);
    setEpoch(epoch + 1);
  };

  return (
    <div className={classnames(
      styles.titleScreenPlugin,
    )}>
      {messages.map(message => {
        return (
          <Message
            message={message}
            onClose={onClose}
            key={message.id}
          />
        );
      })}
    </div>
  );
}