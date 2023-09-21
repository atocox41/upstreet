import path from 'path';
import child_process from 'child_process';

import {Server} from '../server.mjs';
import {PORTS, BASE_DIRNAME} from '../server-constants.mjs';

export class RendererServer extends Server {
  name = 'renderer';
  port = PORTS.RENDERER;
  path = path.join(BASE_DIRNAME, 'packages', 'previewer');

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

    await super.start(/ready/i);
  }
}
