import React, {
  useState,
  useEffect,
  // createRef,
} from 'react';
import {
  StoryUI,
} from '../story/Story.jsx';

import styles from '../../../styles/LiveChatPlugin.module.css';

//

export const LiveChatPlugin = ({
  ioBus,
}) => {
  const [liveChatSpec, setLiveChatSpec] = useState(null);
  const [enabled, setEnabled] = useState(false);

  // console.log('live chat plugin listen');
  useEffect(() => {
    const sendMessage = e => {
      const {
        type,
        args,
      } = e.data;

      // console.log('live chat got hup add', e.data);

      switch (type) {
        case 'hupAdd': {
          if (enabled) {
            const {
              hupId,
              characterName,
              fullText,
            } = args;

            // console.log('live chat plugin got hupAdd', {
            //   hupId,
            //   characterName,
            //   fullText,
            // });

            /* const speechBubble = speechBubbles.find(sb => sb.hupId === hupId);
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
            } */
          }
          break;
        }
        case 'hupVoiceStart': {
          if (enabled) {
            const {
              hupId,
              message,
              fullText,
            } = args;

            // console.log('live chat plugin got hupVoiceStart', {
            //   hupId,
            //   message,
            //   fullText,
            // });

            /* const speechBubble = speechBubbles.find(sb => sb.hupId === hupId);
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
            } */
          }

          break;
        }
      }
    };
    ioBus.addEventListener('sendMessage', sendMessage);

    return () => {
      ioBus.removeEventListener('sendMessage', sendMessage);
    };
  }, [enabled]);

  // const keydown = e => {
  //   const {key} = e;

  //   // console.log('chat plugin key down', e);
  //   switch (key) {
  //     case 'k': {
  //       setOpen(!open);
        
  //       /* (async () => {
  //         // console.log('loading chat...');

  //         // lore
  //         const datasetSpecs = await getDatasetSpecs();
  //         const aiClient = new AiClient();
  //         const datasetGenerator = new DatasetGenerator({
  //           datasetSpecs,
  //           aiClient,
  //         });
  //         const lore = await datasetGenerator.generateItem('setting', {
  //           // Description: prompt,
  //         }, {
  //           keys: ['Name', 'Description'],
  //         });
  //         // console.log('got lore', lore);
  //         setLore(lore);
  //       })(); */

  //       break;
  //     }
  //   }
  // };
  /* const keypress = e => {
    const {key} = e;
    // console.log('key press', e);
  };
  const keyup = e => {
    const {key} = e;
    // console.log('key up', e);
  }; */

  useEffect(() => {
    const setLiveChat = e => {
      // console.log('handle setLiveChat', e);
      // debugger;

      const {
        liveChatSpec,
      } = e;
      setLiveChatSpec(liveChatSpec);
    };
    ioBus.registerHandler('setLiveChat', setLiveChat);

    return () => {
      ioBus.unregisterHandler('setLiveChat', setLiveChat);
    };
  }, []);

  return (
    <div className={styles.chat}>
      <StoryUI
        ioBus={ioBus}
        liveChatSpec={liveChatSpec}
      />
    </div>
  );
};