import http from 'http';
import https from 'https';
import fs from 'fs';
import {CERTIFICATES} from './server-constants.mjs';

/**
 *
 * @param {string} filePath
 * @returns {Buffer | null}
 */
export function tryReadFile(filePath) {
  try {
    return fs.readFileSync(filePath);
  } catch (err) {
    return null;
  }
}

/**
 * Returns true if the server should be run with https
 *
 * @returns {boolean}
 */
export const isHttps = () =>
  !process.env.HTTP_ONLY && !!CERTIFICATES.key && !!CERTIFICATES.cert;

/**
 *
 * @param {import("express").Application} app
 * @returns
 */
export const makeHttpServer = app =>
  isHttps() ? https.createServer(CERTIFICATES, app) : http.createServer(app);
