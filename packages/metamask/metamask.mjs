import uuidByString from 'uuid-by-string';
import {
  ethers,
} from 'ethers';
import jwt from '@tsndr/cloudflare-worker-jwt';

//

const headers = [
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
    "key": "Access-Control-Expose-Headers",
    "value": "*"
  },
  {
    "key": "Access-Control-Allow-Private-Network",
    "value": "true"
  }
];
const headersObject = {};
for (const header of headers) {
  headersObject[header.key] = header.value;
}

//

function verifyMessage(message, signature) {
  return ethers.recoverAddress(ethers.hashMessage(message), signature);
}

//

// Cloudflare Worker
export default {
  async fetch(request, env, ctx) {
    // if OPTIONS, send headers
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: headersObject,
      });
    }
    
    // ensure POST
    if (request.method === 'POST') {
      try {
        // parse incoming json
        const body = await request.json();
        const {
          message,
          signature,
        } = body;

        if (typeof message !== 'string' || typeof signature !== 'string') {
          const s = JSON.stringify({
            error: 'Invalid message or signature',
            message,
            signature,
          });
          return new Response(s, {
            status: 400,
            statusText: 'Bad Request',
            headers: {
              'Content-Type': 'application/json',
              ...headersObject,
            },
          });
        }

        const jsonString = message.match(/(\{[\s\S]*)$/)[1] ?? '';
        const json = JSON.parse(jsonString);
        const {
          sign_in,
          address,
        } = json;

        if (sign_in !== 'upstreet') {
          const s = JSON.stringify({
            error: 'Invalid sign_in',
            json,
            sign_in,
          });
          return new Response(s, {
            status: 401,
            statusText: 'Unauthorized',
            headers: {
              'Content-Type': 'application/json',
              ...headersObject,
            },
          });
        }

        let recoveredAddress = verifyMessage(message, signature);
        recoveredAddress = recoveredAddress.toLowerCase();

        if (address !== recoveredAddress) {
          const s = JSON.stringify({
            error: 'Signature does not match address',
            json,
            address,
            recoveredAddress,
          });
          return new Response(s, {
            status: 401,
            statusText: 'Unauthorized',
            headers: {
              'Content-Type': 'application/json',
              ...headersObject,
            },
          });
        }

        const id = uuidByString(address);
        const jwtSignature = await jwt.sign({
          aud: 'authenticated',
          role: 'authenticated',
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 1 week
          id,
          address,
        }, env.SUPABASE_JWT);

        console.log('signed', jwtSignature);

        const s = JSON.stringify(jwtSignature);
        return new Response(s, {
          headers: {
            'Content-Type': 'application/json',
            ...headersObject,
          },
        });
      } catch (e) {
        console.log(e);
        
        const s = JSON.stringify({
          stack: e.stack,
        });
        return new Response(s, {
          status: 500,
          statusText: 'Internal Server Error',
          headers: {
            'Content-Type': 'application/json',
            ...headersObject,
          },
        });
      }
    }

    // return 404
    return new Response(null, {
      status: 404,
      statusText: 'Not Found',
    });
  },
};