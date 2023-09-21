import path from 'path';
import child_process from 'child_process';

import {Server} from '../server.mjs';
import {PORTS, BASE_DIRNAME} from '../server-constants.mjs';

//

export class AiProxyServer extends Server {
  name = 'ai-proxy';
  port = PORTS.AI_PROXY;
  path = path.join(BASE_DIRNAME, 'packages', 'ai-proxy');

  constructor() {
    super();
  }

  async start() {
    this.process = child_process.spawn(process.argv[0], ['index.mjs'], {
      stdio: 'pipe',
      cwd: this.path,
      env: {
        ...process.env,
        PORT: this.port.toString(),
        DATA_PATH: path.join(BASE_DIRNAME, 'data', 'auth'),
      },
    });

    await super.start(/ready/i);
  }
}