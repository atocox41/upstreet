import http from 'http';
import https from 'https';
import fs from 'fs';
import url from 'url';
import path from 'path';

import express from 'express';
import * as vite from 'vite';
import httpProxy from 'http-proxy';
import dotenv from 'dotenv';

import {YoutubeServer} from '../../packages/engine/servers/youtube-server.js';

import {
  BASE_DIRNAME,
  SERVER_NAME,
  PORTS,
} from '../server-constants.mjs';
import {isHttps, makeHttpServer} from '../server-utils.mjs';

//

dotenv.config();

const hostname = `local.upstreet.ai`;
const port = parseInt(process.env.PORT, 10) || PORTS.DEV;

//

const isProduction = process.env.NODE_ENV === 'production';
const vercelJson = JSON.parse(fs.readFileSync(path.join(BASE_DIRNAME, 'vercel.json'), 'utf8'));
const vercelJsonRewrites = vercelJson?.rewrites || [];

const youtubeServer = new YoutubeServer();

//

const {headers: headerSpecs} = vercelJson;
const headerSpec0 = headerSpecs[0];
const {headers} = headerSpec0;
const _setHeaders = res => {
  for (const {key, value} of headers) {
    res.setHeader(key, value);
  }
};

const _proxyUrl = (req, res, url, {
  rewriteHost = false,
} = {}) => {
  const {method} = req;
  const opts = {
    method,
  };

  const proxyReq = /^https:/.test(url)
    ? https.request(url, opts)
    : http.request(url, opts);

  for (const header in req.headers) {
    if (!rewriteHost || !['host'].includes(header.toLowerCase())) {
      proxyReq.setHeader(header, req.headers[header]);
    }
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

const multiplayerProxy = httpProxy.createProxyServer({
  target: `http://127.0.0.1:${PORTS.MULTIPLAYER}`,
  ws: true,
});
multiplayerProxy.on('error', (err, req, res) => {
  console.warn('multiplayer proxy error', err);
  res.statusCode = 500;
  res.end();
});

(async () => {
  const app = express();
  const handleRequest = async (req, res, next) => {
    _setHeaders(res);

    let match = null;
    if (req.method === 'OPTIONS') {
      res.end();

    } else if ((match = vercelJsonRewrites.find(rewrite => new RegExp(rewrite.source).test(req.url))) && match.destination !== '/404.html') {
      const target = `https://${hostname}:${PORTS.DEV}${match.destination}`;
      console.log('proxy 1', req.url, '->', target);
      _proxyUrl(req, res, target);
    
    } else if (/^\/[a-zA-Z0-9\-]{3,}$/.test(req.url)) {
      const target = `https://${hostname}:${PORTS.DEV}/404.html`;
      console.log('proxy 2', req.url, '->', target);
      _proxyUrl(req, res, target);

    } else if (
      /^\/log(?:\?|\/|$)$/.test(req.url)
    ) {
      console.log('LOG', req.url);
      res.end();
    
    // MULTIPLAYER

    } else if (req.url.startsWith('/api/room/')) {
      multiplayerProxy.web(req, res);

    /* } else if (['/w/'].some(prefix => req.url.startsWith(prefix))) {
      const target = `https://${hostname}:${PORTS.DEV}/level.html`;
      _proxyUrl(req, res, target);
    } else if (['/a/'].some(prefix => req.url.startsWith(prefix))) {
      const target = `https://${hostname}:${PORTS.DEV}/adventure.html`;
      _proxyUrl(req, res, target);
    } else if (['/c/'].some(prefix => req.url.startsWith(prefix))) {
      const target = `https://${hostname}:${PORTS.DEV}/creative.html`;
      _proxyUrl(req, res, target);
    } else if (['/m/'].some(prefix => req.url.startsWith(prefix))) {
      const target = `https://${hostname}:${PORTS.DEV}/market.html`;
      _proxyUrl(req, res, target);
    } else if (['/g/'].some(prefix => req.url.startsWith(prefix))) {
      const target = `https://${hostname}:${PORTS.DEV}/generator.html`;
      _proxyUrl(req, res, target);
    } else if (['/d/'].some(prefix => req.url.startsWith(prefix))) {
      const target = `https://${hostname}:${PORTS.DEV}/database.html`;
      _proxyUrl(req, res, target); */

    // DOWNLOAD

    } else if (['/api/youtube'].some(prefix => req.url.startsWith(prefix))) {
      // console.log('handle youtube', req.url);
      await youtubeServer.handleRequest(req, res);

    } else {
      next();
    }
  };
  app.all('*', handleRequest);

  const httpServer = makeHttpServer(app);
  httpServer.on('upgrade', (req, socket, head) => {
    multiplayerProxy.ws(req, socket, head);
  });

  const devApp = express();
  const devHttpServer = makeHttpServer(devApp);
  const viteServer = await vite.createServer({
    mode: isProduction ? 'production' : 'development',
    server: {
      middlewareMode: true,
      hmr: {
        server: devHttpServer,
        // port: PORTS.DEV_WS,
        clientPort: PORTS.DEV_WS,
      },
    },
  });
  app.use(viteServer.middlewares);

  await new Promise((resolve, reject) => {
    httpServer.listen(port, '0.0.0.0', () => {
      resolve();
    });
    httpServer.on('error', reject);
  });
  await new Promise((resolve, reject) => {
    devHttpServer.listen(PORTS.DEV_WS, '0.0.0.0', () => {
      resolve();
    });
    devHttpServer.on('error', reject);
  });

  console.log(
    `  > Local dev server: http${isHttps() ? 's' : ''}://${SERVER_NAME}:${
      port
    }/`,
  );
})();

process.on('disconnect', function () {
  console.log('dev-server parent exited');
  process.exit();
});
process.on('SIGINT', function () {
  console.log('dev-server SIGINT');
  process.exit();
});

//

process.on('uncaughtException', (err) => {
  console.log('dev-server uncaughtException', err.stack);
  // process.exit();
});
process.on('unhandledRejection', (err) => {
  console.log('dev-server unhandledRejection', err.stack);
  // process.exit();
});