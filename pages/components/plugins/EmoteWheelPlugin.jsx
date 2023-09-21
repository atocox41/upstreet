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
// import {
//   StoryUI,
// } from '../story/Story.jsx';

import {
  EmoteWheel,
} from '../emote-wheel/EmoteWheel.jsx';
// import {
//   Io,
// } from '../io-bus/Io.jsx';

import styles from '../../../styles/EmoteWheelPlugin.module.css';

//

export const EmoteWheelPlugin = () => {
  return (
    <div className={styles.emoteWheelPlugin}>
      <EmoteWheel />
    </div>
  );
};