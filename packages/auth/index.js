import path from 'path';
import http from 'http';
// import { createServer } from 'https';
import fs from 'fs';
// import { readFileSync } from 'fs';
import {
  Readable,
} from 'stream';
import crypto from 'crypto';

import {
  PORTS,
} from '../../servers/server-constants.mjs';
import express from 'express';
import {mkdirp} from 'mkdirp';
import * as CBOR from 'cbor-x';

//

function makeId(length) {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

//

class LocalJson {
  constructor(filename) {
    this.filename = filename;
    this.data = {};

    this.saving = false;
    this.queue = [];
  }
  async waitForLoad() {
    await new Promise((accept, reject) => {
      fs.readFile(this.filename, 'utf8', (err, s) => {
        if (!err) {
          this.data = JSON.parse(s);
          accept();
        } else if (err.code === 'ENOENT') {
          this.data = {};
          accept();
        } else {
          reject(err);
        }
      });
    });
  }

  get(key) {
    return this.data[key];
  }
  async set(key, value) {
    if (!this.saving) {
      this.saving = true;

      this.data[key] = value;

      try {
        const s = JSON.stringify(this.data);
        await new Promise((accept, reject) => {
          fs.writeFile(this.filename, s, err => {
            if (!err) {
              accept();
            } else {
              reject(err);
            }
          });
        });
      } finally {
        this.saving = false;
      }

      if (this.queue.length > 0) {
        (async () => {
          const item = this.queue.shift();
          await this.set(item.key, item.value);
          item.accept();
        })();
      }
    } else {
      await new Promise((accept, reject) => {
        this.queue.push({
          key,
          value,
          accept,
        });
      });
    }
  }
}

//

const verifySignature = (() => {
  // The code below was largely taken from:
  // https://github.com/strangerlabs/webauthn/blob/9959cb2b5f87692b8b1fecd799dd4029a3bf61b1/src/Webauthn.js#L501

  // const crypto = require("crypto");
  // const base64url = require("base64url");
  // const cbor = require("cbor");

  function parseAttestationObject(attestationObjectBuffer) {
    // const attestationObjectBuffer = base64url.toBuffer(attestationObject);
    // return CBOR.decode(attestationObjectBuffer)[0];
    return CBOR.decode(attestationObjectBuffer);
  }

  function hash(data) {
    return crypto
      .createHash("sha256")
      .update(data)
      .digest();
  }

  function verifySignature(signature, data, publicKey) {
    return crypto
      .createVerify("SHA256")
      .update(data)
      .verify(publicKey, signature);
  }

  function parseGetAssertAuthData(buffer) {
    const rpIdHash = buffer.slice(0, 32);
    buffer = buffer.slice(32);

    const flagsBuf = buffer.slice(0, 1);
    buffer = buffer.slice(1);

    const flags = flagsBuf[0];

    const counterBuf = buffer.slice(0, 4);
    buffer = buffer.slice(4);

    const counter = counterBuf.readUInt32BE(0);

    return { rpIdHash, flagsBuf, flags, counter, counterBuf };
  }

  function parseMakeCredAuthData(buffer) {
    const rpIdHash = buffer.slice(0, 32);
    buffer = buffer.slice(32);

    const flagsBuf = buffer.slice(0, 1);
    buffer = buffer.slice(1);

    const flags = flagsBuf[0];

    const counterBuf = buffer.slice(0, 4);
    buffer = buffer.slice(4);

    const counter = counterBuf.readUInt32BE(0);

    const aaguid = buffer.slice(0, 16);
    buffer = buffer.slice(16);

    const credIDLenBuf = buffer.slice(0, 2);
    buffer = buffer.slice(2);

    const credIDLen = credIDLenBuf.readUInt16BE(0);

    const credID = buffer.slice(0, credIDLen);
    buffer = buffer.slice(credIDLen);

    const COSEPublicKey = buffer;

    return {
      rpIdHash,
      flagsBuf,
      flags,
      counter,
      counterBuf,
      aaguid,
      credID,
      COSEPublicKey
    };
  }

  function COSEECDHAtoPKCS(COSEPublicKey) {
    const coseStruct = CBOR.decode(COSEPublicKey);
    const tag = Buffer.from([0x04]);
    const x = coseStruct['-2'];
    const y = coseStruct['-3'];

    return Buffer.concat([tag, x, y]);
  }

  function ASN1toPEM(pkBuffer) {
    let type;
    if (pkBuffer.length === 65 && pkBuffer[0] === 0x04) {
      pkBuffer = Buffer.concat([
        new Buffer.from(
          "3059301306072a8648ce3d020106082a8648ce3d030107034200",
          "hex"
        ),
        pkBuffer
      ]);

      type = "PUBLIC KEY";
    } else {
      type = "CERTIFICATE";
    }

    const b64cert = pkBuffer.toString("base64");

    let PEMKey = "";
    for (let i = 0; i < Math.ceil(b64cert.length / 64); i++) {
      const start = 64 * i;
      PEMKey += b64cert.substr(start, 64) + "\n";
    }

    PEMKey = `-----BEGIN ${type}-----\n` + PEMKey + `-----END ${type}-----\n`;
    return PEMKey;
  }

  /**
   * This function throws! Otherwise, returns new counter number.
   * @param counter {Number} The previous counter number.
   * @param attestationObject {String} The value sent to the server when user was setting up the fingerprint scanner.
   * @param clientDataJSON {String} The data from the assertion object generated by the browser during re-login.
   * @param authenticatorData {String} The data from the assertion object generated by the browser during re-login.
   * @param signature {String} The signature we must verify.
   * @throws
   * @return {Number} The assertion counter as seen in the authenticatorData
   */
  function verifyAssertion({
    // counter,
    attestationObject,
    clientDataJSON,
    authenticatorData,
    signature,
  }) {
    // console.log('verify assertion', {
    //   attestationObject,
    //   clientDataJSON,
    //   authenticatorData,
    //   signature,
    // });

    const authenticatorDataBuff = authenticatorData;
    const authrDataStruct = parseGetAssertAuthData(authenticatorDataBuff);

    if (!(authrDataStruct.flags & 0x01)) {
      throw new Error("User was not presented during authentication!");
    }
    // if (authrDataStruct.counter <= counter) {
    //   throw new Error("Counter didn't increase");
    // }

    const clientDataHash = hash(clientDataJSON);
    const signatureBase = Buffer.concat([authenticatorDataBuff, clientDataHash]);
    const makeCredResp = parseAttestationObject(attestationObject);
    const {
      COSEPublicKey,
    } = parseMakeCredAuthData(makeCredResp.authData) || {};
    const publicKey = ASN1toPEM(
      COSEECDHAtoPKCS(COSEPublicKey),
    );
    const signatureBuff = signature;

    // This line throws.
    return verifySignature(signatureBuff, signatureBase, publicKey);

    // Save this new counter to the database now.
    // return authrDataStruct.counter;
  }
  return verifyAssertion;
})();

//

const isProd = process.env.NODE_ENV === 'production';
const redirectUrl = isProd ? 'https://auth.webaverse.com/auth/discordOAuth2' : `https://local.webaverse.com:${PORTS.DEV}/auth/discordOAuth2`;
const authUrl = isProd ? 'https://app.webaverse.com/auth.html' : `https://local.webaverse.com:${PORTS.DEV}/auth.html`;
const defaultEnergy = 100;

//

const startAuthServer = async () => {
  const getUserByAuthSource = async (sourceKey, sourceValue) => {
    const authorizedKeys = (localJson.get('authorized_keys') ?? []);
    return authorizedKeys.find(n => n.source[sourceKey] === sourceValue);
  };
  const registerUser = async (sourceKey, sourceValue, id, attestationObject) => {
    const newAuthorizedKeys = (localJson.get('authorized_keys') ?? []).slice();
    if (!newAuthorizedKeys.find(n => n.id === id) && !newAuthorizedKeys.find(n => n.source[sourceKey] === sourceValue)) {
      newAuthorizedKeys.push({
        id,
        source: {
          [sourceKey]: sourceValue,
        },
        attestationObject,
        tokens: [],
        energy: defaultEnergy,
      });
      await localJson.set('authorized_keys', newAuthorizedKeys);
  
      return true;
    } else {
      return false;
    }
  };

  // load
  const steamKeys = 
    fs.existsSync('./.steam-keys') &&
    fs.readFileSync('./.steam-keys', 'utf8').split('\n').filter(n => n); // XXX rewrite this to use LocalLines
  const serverKey = fs.readFileSync('./.server-key', 'utf8').trim();
  const discordClientId = fs.existsSync('./.discord-client-id') && 
    fs.readFileSync('./.discord-client-id', 'utf8').trim();
  const discordClientSecret = fs.existsSync('./.discord-client-secret') &&
    fs.readFileSync('./.discord-client-secret', 'utf8').trim();

  if (!steamKeys || !serverKey || !discordClientId || !discordClientSecret) {
    console.warn('*** WARNING: You are missing one or more of the following files: .steam-keys, .server-key, .discord-client-id, .discord-client-secret');
  }

  const dataPath = process.env.DATA_PATH || './data';
  await mkdirp(dataPath);
  const localJson = new LocalJson(path.join(dataPath, 'auth.json'));
  await localJson.waitForLoad();

  //

  const port = parseInt(process.env.PORT, 10) || 1212;
  
  // start server
  const app = express();
  app.use(express.json());

  app.get('/auth/discordOAuth', (req, res, next) => {
    const state = req.query.state ?? '';
    const u2 = `https://discord.com/oauth2/authorize?response_type=code&client_id=${discordClientId}&scope=identify%20email&state=${state}&redirect_uri=${encodeURIComponent(redirectUrl)}&prompt=consent`;
    res.redirect(u2);

    // const authorizedKeys = localJson.get('authorized_keys') ?? [];
    
    // const valid = steamKeys.includes(steamKey);
    // const used = authorizedKeys.find(n => n.steamKey === steamKey);
    // const ok = valid && !used;
    
    // res.json({
    //   valid,
    //   used,
    //   ok,
    // });
  });
  app.get('/auth/discordOAuth2', async (req, res, next) => {
    const {code = '', state = ''} = req.query;
    res.redirect(`${authUrl}?code=${code}&state=${state}`);
  });
  app.post('/auth/registerDiscord', async (req, res, next) => {
    const {id: credentialId, access_token, attestationObject} = req.body;

    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })
    const j2 = await response.json();
    const {
      email,
      id: discordId,
      username,
      discriminator,
      global_name,
    } = j2;
    // console.log('got discord user', j2);

    const ok = await registerUser('discordId', discordId, credentialId, attestationObject);
    if (ok) {
      res.json({
        ok: true
      });
    } else {
      res.status(400);
      res.json({
        error: 'already registered',
      });
    }
  });
  app.post('/auth/checkDiscord', async (req, res, next) => {
    const {code, state = ''} = req.body;

    const u = new URL(`https://discord.com/api/oauth2/token`);

    const fd = new FormData();
    fd.append('client_id', discordClientId);
    fd.append('client_secret', discordClientSecret);
    fd.append('grant_type', 'authorization_code');
    fd.append('code', code);
    // state && fd.append('state', state);
    fd.append('redirect_uri', redirectUrl);

    const authRes = await fetch(u, {
      method: 'POST',
      body: fd,
    });
    if (authRes.ok) {
      const j = await authRes.json();
      const {
        access_token,
      } = j;

      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
      const j2 = await response.json();
      const {
        email,
        id: discordId,
        username,
        discriminator,
        global_name,
      } = j2;

      const user = await getUserByAuthSource('discordId', discordId);
      if (user) {
        res.status(400);
        res.json({
          error: 'already registered',
        });
      } else {
        res.json(j);
      }
    } else {
      const j = await authRes.json();
      console.log('got json', j, {code, state});

      // const readable = Readable.fromWeb(authRes.body);
      // readable.pipe(res);
      res.status(401);
      res.json({
        error: 'invalid code',
      });
    }
  });
  app.post('/auth/checkSteamKey', (req, res, next) => {
    const {steamKey} = req.body;

    const authorizedKeys = localJson.get('authorized_keys') ?? [];
    
    const valid = steamKeys.includes(steamKey);
    const used = authorizedKeys.find(n => n.source.steamKey === steamKey);
    const ok = valid && !used;
    
    res.json({
      valid,
      used,
      ok,
    });
  });
  app.post('/auth/registerSteam', async (req, res, next) => {
    const {steamKey, id, attestationObject} = req.body;
    if (steamKeys.includes(steamKey)) {
      const ok = await registerUser('steamKey', steamKey, id, attestationObject);
      if (ok) {
        res.json({
          ok: true,
        });
      } else {
        res.status(400);
        res.json({
          error: 'id or steam key already exists',
        });
      }
    } else {
      res.status(400);
      res.json({
        error: 'invalid steam key',
      });
    }
  });

  const challenges = new Map();
  app.post('/auth/challenge', async (req, res, next) => {
    const {challengeId} = req.body;
    if (!challenges.has(challengeId)) {
      const challenge = crypto.randomBytes(32);
      challenges.set(challengeId, challenge);

      res.json({
        challenge: challenge.toString('hex'),
      });
    } else {
      res.status(400);
      res.json({
        error: 'challenge id already exists',
      });
    }
  });
  app.post('/auth/authenticate', async (req, res, next) => {
    let {id, challengeId, /*attestationObject,*/ authenticatorData, clientDataJSON, signature} = req.body;
    const challenge = challenges.get(challengeId);
    if (challenge) {
      // attestationObject = Buffer.from(attestationObject, 'hex');
      authenticatorData = Buffer.from(authenticatorData, 'hex');
      clientDataJSON = Buffer.from(clientDataJSON, 'hex');
      signature = Buffer.from(signature, 'hex');

      const authorizedKeys = localJson.get('authorized_keys') ?? [];
      const keySpec = authorizedKeys.find(n => n.id === id);
      if (keySpec) {
        let {
          attestationObject,
        } = keySpec;
        attestationObject = Buffer.from(attestationObject, 'hex');
        
        const verified = verifySignature({
          attestationObject,
          clientDataJSON,
          authenticatorData,
          signature,
        });

        if (verified) {
          const token = makeId(32);
          const newAuthorizedKeys = authorizedKeys.slice();
          keySpec.tokens.push(token);
          localJson.set('authorized_keys', newAuthorizedKeys);

          res.json({
            token,
          });
        } else {
          res.status(403);
          res.json({
            error: 'invalid signature',
          });
        }
      } else {
        res.status(403);
        res.json({
          error: 'invalid id',
        });
      }
    } else {
      res.status(403);
      res.json({
        error: 'invalid challenge id',
      });
    }
  });
  app.post('/auth/checkToken', async (req, res, next) => {
    // const {jsonString, signature} = req.body;
    // const j = JSON.parse(jsonString);
    // const {token} = j;
    const {token} = req.body;
    const authorizedKey = (localJson.get('authorized_keys') ?? []).find(n => n.tokens.includes(token));
    if (authorizedKey) {
      res.json({
        ok: true,
        error: null,
      });
    } else {
      res.status(403);
      res.json({
        ok: false,
        error: 'invalid token',
      });
    }
  });
  app.post('/auth/useToken', async (req, res, next) => {
    // const {jsonString, signature} = req.body;
    // const j = JSON.parse(jsonString);
    // const {token} = j;
    const {token} = req.body;
    const authorizedKeys = localJson.get('authorized_keys') ?? [];
    const authorizedKey = authorizedKeys.find(n => n.tokens.includes(token));
    if (authorizedKey) {
       if (authorizedKey.energy > 0) {
        authorizedKey.energy--;
        localJson.set('authorized_keys', authorizedKeys);
        res.json({
          ok: true,
          energy: authorizedKey.energy,
          error: null,
        });
       } else {
        res.status(403);
        res.json({
          ok: false,
          energy: 0,
          error: 'out of energy',
        });
      }
    } else {
      res.status(403);
      res.json({
        ok: false,
        energy: 0,
        error: 'invalid token',
      });
    }
  });

  // const server = createServer({
  //   cert: readFileSync('./certs-local/fullchain.pem'),
  //   key: readFileSync('./certs-local/privkey.pem')
  // });
  const server = http.createServer();
  server.on('request', app);

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
startAuthServer();