const {GlobalKeyboardListener} = require('@futpib/node-global-key-listener');
const globalKeyboardListener = new GlobalKeyboardListener();
const robotjs = require('robotjs');

//

const bindGlobalKeyListener = () => {
  const listener = (event, metadata) => {
    let {
      name,
      state,
    } = event;
    name = name?.toLowerCase();
    state = state?.toLowerCase();

    const type = 'global-key';
    const message = {
      type,
      name,
      state,
    };
    process.send(message);
  };
  globalKeyboardListener.addListener(listener);
};
const bindGlobalMouseListener = () => {
  const mouseInterval = 100;
  const interval = setInterval(() => {
    const mousePosition = robotjs.getMousePos();

    const type = 'global-mouse';
    const message = {
      type,
      mousePosition,
    };
    // send mesasge to parent node process via ipc
    process.send(message);
  }, mouseInterval);
};

// main
bindGlobalKeyListener();
bindGlobalMouseListener();
console.log('robotjs server ready');