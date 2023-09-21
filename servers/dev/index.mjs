import path from 'path';
import child_process from 'child_process';

import {Server} from '../server.mjs';
import {BASE_DIRNAME, PORTS} from '../server-constants.mjs';

export class DevServer extends Server {
  name = 'dev-server';
  port;
  path = BASE_DIRNAME;

  constructor({
    port = PORTS.DEV,
  } = {}) {
    super();

    this.port = port;
  }

  async start() {
    console.log(this.path)
    this.process = child_process.spawn(process.argv[0], [path.join(BASE_DIRNAME, 'servers', 'dev', 'dev-server.mjs')], {
      stdio: 'pipe',
      cwd: this.path,
      env: {
        ...process.env,
        BASE_CWD: BASE_DIRNAME,
        PORT: this.port.toString(),
        IMAGE_PORT: PORTS.IMAGE.toString(),
        COMPILER_PORT: PORTS.COMPILER.toString(),
        RENDERER_PORT: PORTS.RENDERER.toString(),
      },
    });

    await super.start(/local/i);
  }
}
