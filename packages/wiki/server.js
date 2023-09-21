import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';

import express from 'express';
import dotenv from 'dotenv';
import * as vite from 'vite';

// import {
//   OPENAI_ACCESS_TOKEN,
//   OPENAI_API_KEY,
// } from './src/constants/auth.js';
import {
  AiServer,
} from './servers/ai-server.js'
import handleApiImage from './api/images/[contents]/[image].js';

//

// console.log('got process', process);
dotenv.config();
const {
  OPENAI_API_KEY,
  OPENAI_ACCESS_TOKEN,
} = process.env;
if (!OPENAI_API_KEY || !OPENAI_ACCESS_TOKEN) {
  throw new Error('backend missing OPENAI_API_KEY or OPENAI_ACCESS_TOKEN');
}
process.env.VITE_OPENAI_API_KEY = OPENAI_API_KEY;
// process.env.VITE_OPENAI_ACCESS_TOKEN = OPENAI_ACCESS_TOKEN;
process.env.VITE_AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
process.env.VITE_AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
if (!process.env.VITE_AWS_ACCESS_KEY || !process.env.VITE_AWS_SECRET_ACCESS_KEY) {
  throw new Error('backend missing AWS_ACCESS_KEY or AWS_SECRET_ACCESS_KEY');
}

//

const vercelJson = JSON.parse(fs.readFileSync('./vercel.json', 'utf8'));

//

const SERVER_ADDR = '0.0.0.0';
const SERVER_NAME = 'local.upstreet.ai';
const SERVER_PORT = parseInt(process.env.PORT, 10) || 4444;
const DATABASE_PORT = parseInt(process.env.DATABASE_PORT, 10) || 6333;
// const dev = process.env.NODE_ENV !== 'production';
// const app = next({
//   dev,
// });
// const handle = app.getRequestHandler();
const isProduction = false; // process.env.NODE_ENV === 'production';

const _tryReadFile = p => {
  try {
    return fs.readFileSync(p);
  } catch(err) {
    // console.warn(err);
    return null;
  }
};
// use import.met ato get the base directory
let baseDir = path.join(import.meta.url.replace('file://', ''), '..');
baseDir = path.normalize(baseDir);
const certs = {
  key: _tryReadFile(path.join(baseDir, '../../certs/privkey.pem')) ||
    _tryReadFile(path.join(baseDir, '../../certs-local/privkey.pem')),
  cert: _tryReadFile(path.join(baseDir, '../../certs/fullchain.pem')) ||
    _tryReadFile(path.join(baseDir, '../../certs-local/fullchain.pem')),
};
const isHttps = !process.env.HTTP_ONLY && (!!certs.key && !!certs.cert);
const makeHttpServer = (app) => isHttps ? https.createServer(certs, app) : http.createServer(app);

//

const _proxyUrl = (req, res, u) => {
  const {method} = req;
  const opts = {
    method,
  };
  // console.log('proxy request', {u});
  const proxyReq = /^https:/.test(u) ? https.request(u, opts) : http.request(u, opts);
  for (const header in req.headers) {
    proxyReq.setHeader(header, req.headers[header]);
  }
  proxyReq.on('response', proxyRes => {
    for (const header in proxyRes.headers) {
      res.setHeader(header, proxyRes.headers[header]);
    }
    res.statusCode = proxyRes.statusCode;
    proxyRes.pipe(res);
  });
  proxyReq.on('error', err => {
    console.error(err);
    res.statusCode = 500;
    res.end();
  });
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
};

//

const {headers: headerSpecs} = vercelJson;
const headerSpec0 = headerSpecs[0];
const {headers} = headerSpec0;
const _setHeaders = res => {
  for (const {key, value} of headers) {
    res.setHeader(key, value);
  }
};

//

const aiServer = new AiServer({
  apiKey: OPENAI_API_KEY,
});

//

(async () => {
  const app = express();

  app.all('*', (req, res, next) => {
    _setHeaders(res);

    if (req.method === 'OPTIONS') {
      res.end();
    } else {
      next();
    }
  });
  app.all('*', async (req, res, next) => {
    // console.log('url start', req.url);
    if ([
      '/api/ai/',
      '/api/image-ai/',
    ].some(prefix => req.url.startsWith(prefix))) {
      await aiServer.handleRequest(req, res);
    } else if (req.url.startsWith('/api/qdrant/')) {
      const url = req.url.slice('/api/qdrant'.length);
      // console.log('proxy qdrant request', url, req.url);
      const u = `http://127.0.0.1:${DATABASE_PORT}${url}`;
      _proxyUrl(req, res, u);
    } else if ([
      '/api/images/',
    ].some(prefix => req.url.startsWith(prefix))) {
      console.log('got images api hit', req.url);
      // req.url = req.url.slice('/api'.length);
      handleApiImage(req, res);
    } else {
      next();
    }
  });

  const httpServer = makeHttpServer(app);
  const viteServer = await vite.createServer({
    mode: isProduction ? 'production' : 'development',
    // root: process.cwd(),
    server: {
      middlewareMode: true,
      // force: true,
      hmr: {
        server: httpServer,
        port: SERVER_PORT,
        // overlay: false,
      },
    },
    // appType: 'custom',
  });
  app.use(viteServer.middlewares);

  await new Promise((accept, reject) => {
    httpServer.listen(SERVER_PORT, '0.0.0.0', () => {
      accept();
    });
    httpServer.on('error', reject);
  });
  // console.log('pid', process.pid);
  console.log(`  > Local: http${isHttps ? 's' : ''}://${SERVER_NAME}:${SERVER_PORT}/`);
})();

process.on('disconnect', function() {
  console.log('dev-server parent exited')
  process.exit();
});
process.on('SIGINT', function() {
  console.log('dev-server SIGINT')
  process.exit();
});