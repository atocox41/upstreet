import path from 'path';
import child_process from 'child_process';

import {Server} from '../server.mjs';
import {PORTS, BASE_DIRNAME} from '../server-constants.mjs';

export class GenServer extends Server {
  name = 'gen';
  port = PORTS.GEN;
  path = path.join(BASE_DIRNAME, 'packages', 'gen');

  constructor() {
    super();
  }

  async start() {
    this.process = child_process.spawn(process.argv[0], ['dev-server.mjs'], {
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
