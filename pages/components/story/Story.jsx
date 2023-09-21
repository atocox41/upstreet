import React, {
  useState,
  useEffect,
  useRef,
} from 'react';

import classnames from 'classnames';
import Markdown from 'marked-react';

// import {
//   AiClient,
// } from '../../../packages/engine/clients/ai-client.js';
// import {
//   DatabaseClient,
// } from '../../../packages/engine/clients/database-client.js';
// import {
//   getDatasetSpecs,
// } from '../../../packages/engine/dataset-engine/dataset-specs.js';
// import {
//   DatasetGenerator,
// } from '../../../packages/engine/dataset-engine/dataset-generator.js';

// import {
//   DropTarget,
// } from '../drop-target/DropTarget.jsx';

import {
  ImageAiClient,
} from '../../../packages/engine/clients/image-client.js';
import {
  VQAClient,
} from '../../../packages/engine/clients/vqa-client.js'

// import {
//   StoryManager,
// } from '../../../packages/engine/story-engine/story-engine.js';

import styles from '../../../styles/Story.module.css';

//

/* const loadDatasetGenerator = async () => {
  const datasetSpecs = await getDatasetSpecs();
  const datasetGenerator = new DatasetGenerator({
    datasetSpecs,
    aiClient,
    // fillRatio: 0.5,
  });
  return datasetGenerator;
}; */

//

// const aiClient = new AiClient();
// const databaseClient = new DatabaseClient({
//   aiClient,
// });
const imageAiClient = new ImageAiClient();
const vqaClient = new VQAClient();

//

const MessageText = ({
  className,
  children,
  ioBus,
}) => {
  const mdRef = useRef();

  useEffect(() => {
    const sendMessage = e => {
      const {
        type,
        args,
      } = e.data;

      switch (type) {
        case 'hupAdd': {
          // if (enabled) {
            const {
              hupId,
              characterName,
              fullText,
            } = args;
          // }
          break;
        }
        case 'hupVoiceStart': {
          // if (enabled) {
            const {
              hupId,
              message,
              fullText,
            } = args;
          // }

          break;
        }
      }
    };
    ioBus.addEventListener('sendMessage', sendMessage);

    return () => {
      ioBus.removeEventListener('sendMessage', sendMessage);
    };
  }, []);

  return (
    <div className={className} ref={mdRef}>
      <Markdown gfm openLinksInNewTab={false}>
        {children}
      </Markdown>
    </div>
  );
};
const Message = ({
  message,
  className = null,
  ioBus,
}) => {
  // const urls = message.getImageSources();
  // const imgSrc = urls[0];

  const item = message;

  // const conversation = message.getConversation();

  return (
    <div className={classnames(
      styles.message,
      className,
    )}>
      <div className={styles.wrap}>
        {item.name ? <MessageText className={styles.name} ioBus={ioBus}>{item.name}</MessageText> : null}
        {item.description ? <MessageText className={styles.description} ioBus={ioBus}>{item.description}</MessageText> : null}
        {item.text ? <MessageText className={styles.text} ioBus={ioBus}>{item.text}</MessageText> : null}
      </div>
    </div>
  );
};

//

const Attachments = ({
  attachments,
  onRemove,
}) => {
  return (
    <div className={styles.atachments}>
      {attachments.map((attachment, index) => {
        const {
          url,
          name,
        } = attachment;

        return (
          <div className={styles.attachments} key={index}>
            <div className={styles.attachment}>
              {url ?
                <img src={url} className={styles.img} />
              :
                <img src='/images/arc-white.png' className={classnames(
                  styles.img,
                  styles.placeholder,
                  styles.rotate,
                )} />
              }
              <div className={styles.remove} onClick={e => {
                onRemove(attachment);
              }}>
                <img src='/images/close.svg' className={styles.img} />
              </div>
              {name ?
                <div className={styles.name}>{name}</div>
              :
                <img src='/images/arc-white.png' className={classnames(
                  styles.img,
                  styles.placeholder,
                  styles.small,
                  styles.rotate,
                )} />
              }
            </div>
          </div>
        );
      })}
    </div>
  );
};

//

class Attachment extends EventTarget {
  constructor({
    name,
    url,
  }) {
    super();

    this.name = name;
    this.url = url;

    this.editing = false;
  }
  edit() {
    this.editing = true;
  }
  blur() {
    this.editing = false;
  }
  async ensure() {
    if (this.name && !this.url) {
      // generate
      const imageBlob = await imageAiClient.createImageBlob(this.name);
      this.url = URL.createObjectURL(imageBlob);
    }
    if (!this.name && this.url) {
      // analyze
      const res = await fetch(this.url);
      const file = await res.blob();
      const caption = await vqaClient.getImageCaption(file);
      this.name = caption;
    }
  }
}

//

export const Conversation = ({
  conversation,
  ioBus,
}) => {
  const [attachments, setAttachments] = useState([]);
  const [epoch, setEpoch] = useState(0);
  const conversationRef = useRef();

  useEffect(() => {
    const conversationEl = conversationRef.current;
    if (conversationEl) {
      conversationEl.scrollTo({
        top: conversationEl.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [epoch, conversationRef.current]);

  // console.log('conversation listen');
  useEffect(() => {
    const sendMessage = async e => {
      const {
        type,
        args,
      } = e.data;

      if (type === 'hupVoiceStart') {
        // console.log('conversation got hupAdd', e.data, conversation);
        // debugger;

        if (conversation) {
          const {
            characterName,
            fullText,
          } = args;

          if (typeof characterName !== 'string' || typeof fullText !== 'string') {
            debugger;
          }
          
          // const {
          //   characterName,
          //   fullText,
          // } = args;
          // conversation.createTextMessage({
          //   name: characterName,
          //   text: fullText,
          // });
          console.log('push message', {
            type: 'text',
            name: characterName,
            text: fullText,
          });
          conversation.messages.push({
            type: 'text',
            name: characterName,
            text: fullText,
          });
          setEpoch(epoch + 1);
        }
      } else if (type === 'narratorMessageVoiceStart') {
        const {
          message,
        } = args;

        if (typeof message !== 'string') {
          debugger;
        }

        conversation.messages.push({
          type: 'text',
          name: 'Narrator',
          text: message,
        });
        setEpoch(epoch + 1);
      }
    };
    ioBus.addEventListener('sendMessage', sendMessage);

    return () => {
      ioBus.removeEventListener('sendMessage', sendMessage);
    };
  }, [conversation, epoch]);
  
  return (<div className={classnames(
    styles.conversation,
    styles.scrollbar,
    styles['style-1'],
  )} ref={conversationRef}>
    <div className={classnames(
      styles.messages,
    )}>
      {conversation ? conversation.messages.map((message, index) => {
        return (
          <Message
            className={classnames(
              message.type !== 'text' ? styles.hero : null,
              styles[message.type],
            )}
            message={message}
            ioBus={ioBus}
            key={index}
          />
        );
      }) : null}
      <div className={classnames(
        styles.inputBarPlaceholder,
        attachments.length > 0 ? styles.hasFiles : null,
      )} />
    </div>
  </div>);
};

//

export const StoryUI = ({
  liveChatSpec,
  ioBus,
}) => {
  const [conversation, setConversation] = useState(null);
  const [mouseState, setMouseState] = useState(null);
  const conversationRef = useRef(null);
  const inputRef = useRef(null);
  
  // load story from lore
  useEffect(() => {
    if (liveChatSpec) {
      const {
        setting,
        characters,
        prompt,
      } = liveChatSpec;

      const conversation = {
        messages: [
          !prompt ? {
            type: 'setting',
            name: setting.name,
            description: setting.description,
            image: setting.image,
          } : {
            type: 'prompt',
            description: prompt,
          },
        ].concat(characters.map(character => {
          return {
            type: 'character',
            name: character.name,
            description: character.bio,
            image: character.image,
          };
        })),
      };  
      setConversation(conversation);
    } else {
      setConversation(null);
    }
  }, [liveChatSpec]);

  // focus input on mount
  useEffect(() => {
    if (conversation) {
      const inputEl = inputRef.current;
      if (inputEl) {
        document.exitPointerLock();
        inputEl.focus();
      }
    }
  }, [conversation, inputRef.current]);

  // cancel wheel event
  useEffect(() => {
    const conversationEl = conversationRef.current;
    if (conversationEl) {
      const _onWheel = e => {
        // e.preventDefault();
        e.stopPropagation();
      };
      conversationEl.addEventListener('wheel', _onWheel, {
        passive: false,
      });
      return () => {
        conversationEl.removeEventListener('wheel', _onWheel);
      };
    }
  }, [conversationRef.current]);

  return (
    <div
      className={classnames(
        styles.storyUI,
        conversation ? styles.open : null,
      )}
      onMouseMove={e => {
        // e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={e => {
        // e.preventDefault();
        e.stopPropagation();

        const {
          clientX,
          clientY,
        } = e;
        setMouseState([clientX, clientY]);
      }}
      onMouseUp={e => {
        // e.preventDefault();
        e.stopPropagation();

        const {
          clientX,
          clientY,
        } = e;
        const [startX, startY] = mouseState;
        if (clientX === startX && clientY === startY) {
          const inputEl = inputRef.current;
          if (inputEl) {
            inputEl.focus();
          }
        }
      }}
      onClick={e => {
        // e.preventDefault();
        e.stopPropagation();
      }}
      ref={conversationRef}
    >
      <Conversation
        conversation={conversation}
        // onClose={onClose}
        ioBus={ioBus}
        inputRef={inputRef}
      />
    </div>
  );
};