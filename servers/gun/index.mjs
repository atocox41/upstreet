import path from 'path';
import child_process from 'child_process';

import {Server} from '../server.mjs';
import {BASE_DIRNAME, HOST, HTTPS_CERT, HTTPS_KEY,PORTS} from '../server-constants.mjs';

export class GunServer extends Server {
  name = 'gun';
  port = PORTS.GUN;
  path = path.join(BASE_DIRNAME, 'packages', 'gun');

  constructor() {
    super();
  }

  #setupProcess() {
    this.process.on('exit', (code, status) => {
      console.log('got gun exit', {
        code,
        status,
      });
    });
  }

  async start() {
    this.process = child_process.spawn(
      process.argv[0],
      ['--prof', 'examples/http.js'],
      {
        stdio: 'pipe',
        cwd: this.path,
        env: {
          ...process.env,
          ...this.getEnv(),
          HOST,
          HTTPS_KEY,
          HTTPS_CERT,
          BASE_CWD: BASE_DIRNAME,
          PORT: this.port.toString(),
        },
      },
    );
    await super.start(/listen/i);
  }
}
