import path from 'path';
import child_process from 'child_process';

import {Server} from '../server.mjs';
import {BASE_DIRNAME, PORTS} from '../server-constants.mjs';

export class WikiServer extends Server {
  name = 'wiki';
  port = PORTS.WIKI;
  path = path.join(BASE_DIRNAME, 'packages', 'wiki');

  constructor() {
    super();
  }

  async start() {
    this.process = child_process.spawn(process.argv[0], ['server.js'], {
      stdio: 'pipe',
      cwd: this.path,
      env: {
        ...process.env,
        ...this.getEnv(),
        PORT: this.port.toString(),
      },
    });

    await super.start(/Local/i);
  }
}
