/* import path from 'path';
import fs from 'fs';
import url from 'url';
import http from 'http';

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
startFsServer(); */

//

const bucketName = 'POD';
const corsHeaders = [
  {
    "key": "Access-Control-Allow-Origin",
    "value": "*"
  },
  {
    "key": "Access-Control-Allow-Methods",
    "value": "*"
  },
  {
    "key": "Access-Control-Allow-Headers",
    "value": "*"
  },
  {
    "key": "Cross-Origin-Opener-Policy",
    "value": "same-origin"
  },
  {
    "key": "Cross-Origin-Embedder-Policy",
    "value": "require-corp"
  },
  {
    "key": "Cross-Origin-Resource-Policy",
    "value": "cross-origin"
  }
];

export default {
  async fetch(request, env) {
    const addCorsHeaders = headers => {
      for (const {key, value} of corsHeaders) {
        headers.set(key, value);
      }
    };
    const addCacheHeaders = headers => {
      headers.set('Cache-Control', 'no-cache, must-revalidate');
    };
    const getObjects = async key => {
      const options = {
        // limit: 500,
        // include: ['customMetadata'],
        prefix: key,
      };
      const listed = await env[bucketName].list(options);
      
      let truncated = listed.truncated;
      let cursor = truncated ? listed.cursor : undefined;
      
      // use the truncated property to check if there are more objects to be returned
      while (truncated) {
        const next = await env[bucketName].list({
          ...options,
          cursor,
        });
        listed.objects.push(...next.objects);
      
        truncated = next.truncated;
        cursor = next.cursor;
      }
    
      return listed.objects;
    };

    //

    const url = new URL(request.url);
    let key = url.pathname.slice(1);

    console.log('got request', [request.method, key]);

    switch (request.method) {
      case 'OPTIONS': {
        const headers = new Headers();
        addCorsHeaders(headers);

        return new Response('', {
          headers,
        });
      }
      case 'PUT':
      case 'POST': {
        await env[bucketName].put(key, request.body);

        const headers = new Headers();
        addCorsHeaders(headers);

        return new Response('', {
          headers,
        });
      }
      case 'GET': {
        // directory listing
        if (request.headers.get('accept') === 'application/json') {
          if (key && !key.endsWith('/')) {
            key += '/';
          }
          const objects = await getObjects(key);

          const headers = new Headers();
          headers.set('Content-Type', 'application/json');
          addCorsHeaders(headers);
          addCacheHeaders(headers);

          const objectKeys = objects.map(obj => obj.key.slice(key.length));
          return new Response(JSON.stringify(objectKeys), {
            headers,
          });
        }

        // file size
        if (request.headers.get('accept') === 'application/fileSize') {
          const object = await env[bucketName].get(key);
          const size = object ? object.size : 0;

          const headers = new Headers();
          headers.set('Content-Type', 'application/json');
          addCorsHeaders(headers);
          addCacheHeaders(headers);

          return new Response(JSON.stringify(size), { headers, });
        }

        // diredtory size
        if (request.headers.get('accept') === 'application/directorySize') {
          if (key && !key.endsWith('/')) {
            key += '/';
          }
          const objects = await getObjects(key);
          const size = objects.length;

          const headers = new Headers();
          addCorsHeaders(headers);
          addCacheHeaders(headers);

          return new Response(JSON.stringify(size), { headers, });
        }

        // default GET response
        {
          const object = await env[bucketName].get(key);

          if (object !== null) {
            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set('etag', object.httpEtag);
            addCorsHeaders(headers);
            addCacheHeaders(headers);

            // handle If-None-Match
            const ifNoneMatch = request.headers.get('if-none-match');
            console.log('check etag', [ifNoneMatch, object.etag, object.httpEtag]);
            if (ifNoneMatch === object.httpEtag) {
              return new Response('', {
                status: 304,
                headers,
              });
            } else {
              return new Response(object.body, {
                headers,
              });
            }
          } else {
            const headers = new Headers();
            addCorsHeaders(headers);
            addCacheHeaders(headers);

            return new Response('', {
              status: 404,
              headers,
            });
          }
        }
      }
      case 'DELETE': {
        if (request.headers.get('x-force')) {
          await env[bucketName].delete(key);
          
          const headers = new Headers();
          addCorsHeaders(headers);

          return new Response('', {headers});
        } else {
          const headers = new Headers();
          addCorsHeaders(headers);
          
          return new Response('Forbidden', { status: 403, headers });
        }
      }
      default: {
        const headers = new Headers();
        addCorsHeaders(headers);
        
        return new Response('Method Not Allowed', {
          status: 400,
          headers,
        });
      }
    }
  },
};
