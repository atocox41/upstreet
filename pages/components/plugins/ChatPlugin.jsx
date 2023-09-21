import React, {
  useState,
  // useEffect,
  // createRef,
} from 'react';
// import {
//   getDatasetSpecs,
// } from '../../../packages/engine/dataset-engine/dataset-specs.js';
// import {
//   AiClient,
// } from '../../../packages/engine/clients/ai-client.js';
// import {
//   DatasetGenerator,
// } from '../../../packages/engine/dataset-engine/dataset-generator.js';

import {
  StoryUI,
} from '../story/Story.jsx';

import {
  Io,
} from '../io-bus/Io.jsx';

import styles from '../../../styles/ChatPlugin.module.css';

//

export const ChatPlugin = ({
  ioBus,
}) => {
  // const [lore, setLore] = useState(null);
  const [open, setOpen] = useState(false);

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

  return (
    <div className={styles.chat}>
      <Io
        fns={{
          // keydown,
          // keypress,
          // keyup,
        }}
      />
      {open ?
        <StoryUI
          ioBus={ioBus}
        />
      : null}
    </div>
  );
};