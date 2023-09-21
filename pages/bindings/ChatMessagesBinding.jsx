import React, {
  useEffect,
} from 'react';

//

export const ChatMessagesBinding = ({
  engine,
  messages,
  setMessages,
}) => {
  // load props from engine
  useEffect(() => {
    if (engine) {
      const chatManager = engine.chatManager;
      const cleanupFns = [];

      // messages
      {
        const updateMessages = () => {
          let messages = chatManager.getMessages();
          messages = messages.slice();
          // console.log('update messages', messages);
          setMessages(messages);
        };

        // initial
        updateMessages();

        // listen
        chatManager.addEventListener('message', updateMessages);

        cleanupFns.push(() => {
          chatManager.removeEventListener('message', updateMessages);
        });
      }

      return () => {
        for (const cleanupFn of cleanupFns) {
          cleanupFn();
        }
      };
    }
  }, [
    engine,
    // messages,
  ]);
};