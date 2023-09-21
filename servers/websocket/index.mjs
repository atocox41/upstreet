import path from 'path';
import child_process from 'child_process';

import {Server} from '../server.mjs';
import {PORTS, BASE_DIRNAME} from '../server-constants.mjs';

export class WebSockerServer extends Server {
  name = 'websocket';
  port = PORTS.COMPILER;
  path = path.join(BASE_DIRNAME, 'packages', 'websocket-proxy');

  constructor() {
    super();
  }

  async start() {
    this.process = child_process.spawn(process.argv[0], ['index.js'], {
      stdio: 'pipe',
      cwd: this.path,
      env: {
        ...process.env,
        ...this.getEnv(),
        BASE_CWD: BASE_DIRNAME,
        PORT: this.port.toString(),
      },
    });

    this.process.on('exit', (code, status) => {
      console.log('got websocket exit', {
        code,
        status,
      });
    })

    await super.start(/listen/i);
  }
}
