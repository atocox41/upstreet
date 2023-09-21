import path from 'path';
import child_process from 'child_process';

import {Server} from '../server.mjs';
import {PORTS, BASE_DIRNAME} from '../server-constants.mjs';

export class FsServer extends Server {
  name = 'fs';
  port = PORTS.TMP;
  path = path.join(BASE_DIRNAME, 'packages', 'pod');
  dataPath = path.join(BASE_DIRNAME, 'data', 'tmpFs');

  constructor() {
    super();
  }

  async start() {
    this.process = child_process.spawn(process.argv[0], ['fs-server.js'], {
      stdio: 'pipe',
      cwd: this.path,
      env: {
        ...process.env,
        PORT: this.port.toString(),
        DATA_PATH: this.dataPath,
      },
    });

    await super.start(/ready/i);
  }
}
