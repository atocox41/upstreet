import path from 'path';
import child_process from 'child_process';

import {Server} from '../server.mjs';
import {PORTS, BASE_DIRNAME} from '../server-constants.mjs';

export class CompilerServer extends Server {
  name = 'compiler';
  port = PORTS.COMPILER;
  path = path.join(BASE_DIRNAME, 'packages', 'compiler');

  constructor() {
    super();
  }

  async start() {
    this.process = child_process.spawn(process.argv[0], ['index.mjs'], {
      stdio: 'pipe',
      cwd: this.path,
      env: {
        ...process.env,
        // ...this.getEnv(),
        BASE_CWD: BASE_DIRNAME,
        PORT: this.port.toString(),
      },
    });

    await super.start(/ready/i);
  }
}
