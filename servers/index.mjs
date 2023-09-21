import dotenv from 'dotenv';
import open from 'open';

import {Server} from './server.mjs';
import {SERVER_NAME, PORTS} from './server-constants.mjs';
import {DevServer} from './dev/index.mjs';
// import {CompilerServer} from './compiler/index.mjs';
// import {AuthServer} from './auth/index.mjs';
// import {AiProxyServer} from './ai-proxy/index.mjs';
import {MultiplayerServer} from './multiplayer/index.mjs';
// import {GenServer} from './gen/index.mjs';
// import {WikiServer} from './wiki/index.mjs';
import {DiscordBotServer} from './discord/index.mjs';
// import {DatabaseServer} from './database/index.mjs';
// import {FsServer} from './fs/index.mjs';

dotenv.config();

export class MainServer extends Server {
  name = 'main-server';
  port;

  constructor({
    port = PORTS.DEV,
    servers: {
      compiler = false,
      multiplayer = false,
      discord = false,
    } = {},
  } = {}) {
    super();

    this.port = port;
    this.devServer = new DevServer({
      port: this.port,
    });

    // if (compiler) {
    //   this.compilerServer = new CompilerServer();
    // }

    // this.authServer = new AuthServer();
    // this.aiProxy = new AiProxyServer();
    if (multiplayer) {
      this.multiplayerServer = new MultiplayerServer();
    }
    // this.genServer = new GenServer();
    // this.wikiServer = new WikiServer();
    if (discord) {
      this.discordBotServer = new DiscordBotServer();
    }
    // this.databaseServer = new DatabaseServer();
    // this.fsServer = new FsServer();
  }

  #listenForExit() {
    // if (process.stdin.setRawMode) {
    //   process.stdin.setRawMode(true);
    // }

    // process.stdin.resume();
    // process.stdin.setEncoding('utf8');

    /* process.stdin.on('data', async data => {
      const key = data.toString();

      switch (key) {
        case 'a':
          await open(`https://local.webaverse.com/`);
          break;
        case 'm':
          await open(`http://127.0.0.1:${PORTS.MULTIPLAYER}/`);
          break;
        case 'w':
          await open(`https://local.webaverse.com:${PORTS.WIKI}/`);
          break;
        case 'p':
          await open(`http://127.0.0.1:${PORTS.RENDERER}/`);
          break;
        case 'd':
          this.logging = !this.logging;
          console.log('[Webaverse Server]: Logging -', this.logging);
          break;
        // ctrl-c
        case '\x03':
          this.killall();
          process.exit();
          break;
        case 'q':
          (async () => {
            await this.killall();
            process.exit();
          })();
          break;
      }
    }); */

    ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal =>
      process.on(signal, async () => {
        /** do your logic */
        await this.killall();
        process.exit();
      }),
    );
  }

  async start() {
    const servers = [
      this.devServer,
      // this.authServer,
      // this.aiProxy,
      // this.genServer,
      // this.wikiServer,
      // this.databaseServer,
      // this.fsServer,
    ]//.concat(this.compilerServer ?? [])
    .concat(this.multiplayerServer ?? [])
    .concat(this.discordBotServer ?? []);

    this.#listenForExit();

    // Start Servers
    await Promise.all(servers.map(async server => {
      let timeout;
      const timeoutPromise = new Promise((resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`Server ${server.name} failed to start`));
        }, 5000);
      });

      await Promise.race([
        server.start(),
        timeoutPromise,
      ]);

      clearTimeout(timeout);
    }));

    // Setup Logging
    servers.forEach(server => this.logProcess(server));

    console.log(`Listening on https://${SERVER_NAME}:${this.port}/`);
    // console.log('You have some options...');
    // console.log(
    //   `[A] App  [W] Wiki  [M] Multiplayer  [R] Renderer  [T] Automated Tests  [D] Debug logging  [Q] Quit`,
    // );
  }
}
