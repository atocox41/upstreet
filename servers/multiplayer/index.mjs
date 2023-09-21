import path from 'path';
import child_process from 'child_process';

import {Server} from '../server.mjs';
import {PORTS, BASE_DIRNAME} from '../server-constants.mjs';

export class MultiplayerServer extends Server {
  name = 'multiplayer';
  port = PORTS.MULTIPLAYER;
  path = path.join(BASE_DIRNAME, 'packages', 'multiplayer');

  constructor() {
    super();
  }

  async start() {
    const wranglerPath = path.join(BASE_DIRNAME, 'node_modules', '.bin', 'wrangler');
    this.process = child_process.spawn(process.argv[0], [wranglerPath, 'dev', '--port', PORTS.MULTIPLAYER + ''], {
      stdio: 'pipe',
      cwd: this.path,
      env: {
        ...process.env,
        PORT: this.port.toString(),
      },
    });
    this.process.stdout.pipe(process.stdout);
    this.process.stderr.pipe(process.stderr);
    this.process.on('exit', code => {
      console.log('multiplayer exited', code);
    });

    await super.start(/starting/i);
  }
}
