import path from 'path';
import fs from 'fs';
import url from 'url';
import http from 'http';
// import { createServer } from 'https';
// import { readFileSync } from 'fs';

import express from 'express';
import {mkdirp} from 'mkdirp';
import {rimraf} from 'rimraf';

//

const startFsServer = () => {
  const dataPath = process.env.DATA_PATH || path.join(process.cwd(), 'data', 'fs');
  fs.mkdirSync(dataPath, {
    recursive: true,
  });

  const app = express();
  app.all('*', async (req, res, next) => {
    const o = url.parse(req.url);
    const p = o.pathname.replace(/^\.{1,2}(?:\/|$)/g, '');
    const fullPath = path.join(dataPath, p);

    if (req.method === 'GET') {
      const accept = req.headers['accept'];
      if (accept === 'application/json') { // directory
        const files = await new Promise((accept, reject) => {
          fs.readdir(fullPath, (err, files) => {
            if (!err) {
              accept(files);
            } else if (err.code === 'ENOENT') {
              accept(null);
            } else {
              reject(err);
            }
          });
        });
        if (files) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(files));
        } else {
          // res.statusCode = 404;
          // res.end();
          res.setHeader('Content-Type', 'application/json');
          res.json([]);
        }
      } else if (accept === 'application/fileSize') { // file size
        const stats = await new Promise((accept, reject) => {
          fs.stat(fullPath, (err, stats) => {
            if (!err) {
              accept(stats);
            } else if (err.code === 'ENOENT') {
              accept(null);
            } else {
              reject(err);
            }
          });
        });
        if (stats && stats.isFile()) {
          res.setHeader('Content-Type', 'application/fileSize');
          res.json(stats.size);
        } else {
          // res.statusCode = 404;
          // res.end();
          res.setHeader('Content-Type', 'application/fileSize');
          res.json(0);
        }
      } else if (accept === 'application/directorySize') { // directory size
        const stats = await new Promise((accept, reject) => {
          fs.stat(fullPath, (err, stats) => {
            if (!err) {
              accept(stats);
            } else if (err.code === 'ENOENT') {
              accept(null);
            } else {
              reject(err);
            }
          });
        });
        if (stats && stats.isDirectory()) {
          // read the file count
          const files = await new Promise((accept, reject) => {
            fs.readdir(fullPath, (err, files) => {
              if (!err) {
                accept(files);
              } else {
                reject(err);
              }
            });
          });
          res.setHeader('Content-Type', 'application/directorySize');
          res.json(files.length);
        } else {
          res.setHeader('Content-Type', 'application/directorySize');
          res.json(0);
          // res.statusCode = 404;
          // res.end();
        }
      } else { // file
        const rs = fs.createReadStream(fullPath);
        rs.on('error', err => {
          if (err.code === 'ENOENT') {
            res.statusCode = 204;
            res.end();
          } else {
            console.warn(err);
            res.statusCode = 500;
            res.end(err.stack);
          }
        });
        rs.pipe(res);
      }
    } else if (['PUT', 'POST'].includes(req.method)) {
      const dirpath = path.dirname(fullPath);
      await mkdirp(dirpath);

      const ws = fs.createWriteStream(fullPath);
      ws.on('error', err => {
        console.warn(err);
        res.statusCode = 500;
        res.end(err.stack);
      });
      ws.on('finish', () => {
        res.end();
      });
      req.pipe(ws);
    } else if (['DELETE'].includes(req.method)) {
      if (req.headers['x-force']) {
        await rimraf(fullPath);
        res.end();
      } else {
        res.status(403);
        res.end();
      }
    } else {
      res.statusCode = 400;
      res.end('not implemented');
    }
  });

  // const server = createServer({
  //   cert: readFileSync('./certs-local/fullchain.pem'),
  //   key: readFileSync('./certs-local/privkey.pem')
  // });
  const server = http.createServer();
  server.on('request', app);

  const port = parseInt(process.env.PORT, 10) || 3333;
  const host = '0.0.0.0';
  server.listen(port, host);
  server.on('listening', () => {
    console.log(`ready on ${host}:${port}`);
  });
  server.on('error', (err) => {
    console.error('server error', err);
    throw err;
  });
};
startFsServer();