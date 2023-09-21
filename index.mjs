import {MainServer} from './servers/index.mjs';
import commandLineArgs from 'command-line-args';

Error.stackTraceLimit = 300;

const port = parseInt(process.env.PORT, 10) || void 0;

// parse the arguments according to the above. We need multiplayer and discord, as boolesn
const optionDefinitions = [
  { name: 'multiplayer', alias: 'm', type: Boolean },
  { name: 'discord', alias: 'd', type: Boolean },
];
const options = commandLineArgs(optionDefinitions);
console.log('options:', options);

(async () => {
  const mainServer = new MainServer({
    port,
    servers: {
      multiplayer: options.multiplayer,
      discord: options.discord,
    },
  });
  await mainServer.start();
})();
