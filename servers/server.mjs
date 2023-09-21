import {BASE_DIRNAME} from './server-constants.mjs';

/**
 * @typedef {object} EnvVars
 * @property {string} NODE_ENV
 * @property {string} OPENAI_API_KEY
 * @property {string} AWS_ACCESS_KEY
 * @property {string} AWS_SECRET_ACCESS_KEY
 * @property {string} AWS_SECRET_ACCESS_KEY
 */

export class Server {
  #logging = false;
  #quitted = false;
  #exited = false;

  /** @type {Server[]} */
  #loggedProcesses = [];

  name = '';
  path = BASE_DIRNAME;
  port = 433;

  /** @type {import('child_process').ChildProcessWithoutNullStreams} */
  process;

  constructor({
    debug = true,
  } = {}) {
    this.debug = debug;
  }

  get loggedProcesses() {
    return this.#loggedProcesses;
  }

  get logging() {
    return this.#logging;
  }

  set logging(value) {
    this.#logging = value;
  }

  get quitted() {
    return this.#quitted;
  }

  set quitted(value) {
    this.#quitted = value;
  }

  get pid() {
    return this.process.pid ?? 0;
  }

  /**
   *
   * @param {RegExp} regex
   * @returns
   */
  #waitForRegex = regex => {
    return /** @type {Promise<void>} */ (
      new Promise((resolve, reject) => {
        const onerror = (/** @type {Error} */ err) => {
          reject(err);
          cleanup();
        };

        const onout = (/** @type {string} */ data) => {
          // if (this.debug) {
          //   console.log('got stdout', JSON.stringify(data));
          // }
          if (regex.test(data)) {
            resolve();
            cleanup();
          }
        };
        const onerr = (/** @type {string} */ data) => {
          // if (this.debug) {
          //   console.log('got stderr', JSON.stringify(data));
          // }
          if (regex.test(data)) {
            resolve();
            cleanup();
          }
        };

        this.process.stdout.setEncoding('utf8');
        this.process.stdout.on('data', onout);

        this.process.stderr.setEncoding('utf8');
        this.process.stderr.on('data', onerr);

        this.process.on('error', err => {
          reject(err);
          cleanup();
        });

        const cleanup = () => {
          this.process.removeListener('error', onerror);
          this.process.stdout.removeListener('data', onout);
          this.process.stderr.removeListener('data', onerr);
        };
      })
    );
  };

  /**
   * Setup the base process
   * @param {RegExp} regex
   */
  async #setupBaseProcess(regex) {
    this.process.on('close', () => {
      this.#exited = true;
    });

    await this.#waitForRegex(regex);
  }

  /**
   * Start the server
   * @param {RegExp} regex
   */
  async start(regex) {
    if (!this.process) {
      throw new Error('Server process is not defined');
    }

    if (this.debug) {
      this.process.stdout.pipe(process.stdout);
      this.process.stderr.pipe(process.stderr);
    } else {
      this.process.stdout.resume();
      this.process.stderr.resume();
    }

    this.process.on('error', err => {
      console.log('got process error', this.name, err.stack);
    });

    await this.#setupBaseProcess(regex);

    console.log(`> [${this.name}] server started on port ${this.port}`);
  }

  /**
   *
   * @param {number} timeout
   */
  async waitForExit(timeout) {
    if (!this.#exited) {
      return new Promise((accept, reject) => {
        const processTimeout = setTimeout(() => {
          reject(new Error('timeout in process: ' + this.name));
        }, timeout);

        const cleanup = () => {
          this.process.removeListener('close', close);
          this.process.removeListener('error', reject);
          clearTimeout(processTimeout);
        };

        const close = (/** @type {number} */ code) => {
          accept(code);
          cleanup();
        };

        this.process.on('close', close);
        this.process.on('error', err => {
          reject(err);
          cleanup();
        });
      });
    } else {
      return Promise.resolve();
    }
  }

  async killall() {
    this.#quitted = true;

    for (const cp of this.#loggedProcesses) {
      console.log('index.mjs kill child process pid', cp.name, cp.pid);

      try {
        process.kill(cp.pid, 'SIGINT');
      } catch (err) {
        if (err.code !== 'ESRCH') {
          console.warn(err.stack);
        }
      }
    }

    await Promise.all(
      this.#loggedProcesses.map(cp => cp.waitForExit(10 * 1000)),
    );
  }

  /**
   *
   * @returns {EnvVars} the environment variables
   */
  /* getEnv() {
    const {NODE_ENV, OPENAI_API_KEY, AWS_ACCESS_KEY, AWS_SECRET_ACCESS_KEY, ELEVEN_LABS_API_KEY} = process.env;
    if (
      !AWS_ACCESS_KEY ||
      !AWS_SECRET_ACCESS_KEY ||
      !OPENAI_API_KEY ||
      !ELEVEN_LABS_API_KEY
    ) {
      console.log('Server Enviroment Keys: ', {
        OPENAI_API_KEY: OPENAI_API_KEY ? 'set' : 'not set',
        AWS_ACCESS_KEY: AWS_ACCESS_KEY ? 'set' : 'not set',
        AWS_SECRET_ACCESS_KEY: AWS_SECRET_ACCESS_KEY ? 'set' : 'not set',
        ELEVEN_LABS_API_KEY: ELEVEN_LABS_API_KEY ? 'set' : 'not set',
      });

      throw new Error('missing environment variables');
    }

    return {
      NODE_ENV,
      OPENAI_API_KEY,
      AWS_ACCESS_KEY,
      AWS_SECRET_ACCESS_KEY,
      ELEVEN_LABS_API_KEY,
    };
  } */

  /**
   *
   * @param {Server} child_server
   */
  logProcess(child_server) {
    /**
     * @type {Object<string, string[]>}
     */
    const tombstoneLogs = {
      stdout: [],
      stderr: [],
    };

    child_server.process.stdout.on('data', data => {
      if (this.#logging && !this.#quitted) {
        process.stdout.write(data);
      }
      tombstoneLogs.stderr.push(data);
      while (tombstoneLogs.stderr.length > 1000) {
        tombstoneLogs.stderr.shift();
      }
    });

    child_server.process.stderr.on('data', data => {
      if (this.#logging && !this.#quitted) {
        process.stderr.write(data);
      }
      tombstoneLogs.stderr.push(data);
      while (tombstoneLogs.stderr.length > 1000) {
        tombstoneLogs.stderr.shift();
      }
    });

    child_server.process.on(
      'close',
      (/** @type {number} */ exitCode, /** @type {any} */ signal) => {
        if (!this.#quitted) {
          console.log(
            `${this.name} process exited with code ${exitCode} and signal ${signal}`,
          );

          if (exitCode !== 0) {
            console.log('stdout:\n', tombstoneLogs.stdout.join(''));
            console.log('stderr:\n', tombstoneLogs.stderr.join(''));
          }
        }
      },
    );

    this.#loggedProcesses.push(child_server);
  }
}
