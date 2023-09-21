import {
  ethers,
} from 'ethers';
import {LRUCache} from 'lru-cache';
import {RateLimiter} from 'limiter';

import TitleDeedABI from './ethereum/abis/title-deed-abi.json';
import LandClaimABI from './ethereum/abis/land-claim-abi.json';
import contractAddresses from './ethereum/contract-addresses.json';
const titleDeedAddress = contractAddresses.titleDeed;
const landClaimAddress = contractAddresses.landClaim;

//

const getContractsAsync = async ({
  alchemyApiKey,
}) => {
  const provider = ethers.providers.AlchemyProvider.getWebSocketProvider('homestead', alchemyApiKey);

  const titleDeed = new ethers.Contract(titleDeedAddress, TitleDeedABI, provider);
  const landClaim = new ethers.Contract(landClaimAddress, LandClaimABI, provider);
  return {
    titleDeed,
    landClaim,
  };
};

//

const cache = new LRUCache({
  ttl: 1000 * 60 * 1,
});
const limiter = new RateLimiter({
  tokensPerInterval: 9,
  interval: 'second',
});

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

/* const getContracts = (() => {
  let contractsPromise = null;
  return () => {
    if (!contractsPromise) {
      contractsPromise = getContractsAsync();
      contractsPromise.catch(err => {
        if (err) {
          console.warn(err);
          contractsPromise = null;
        }
      });
    }
    return contractsPromise;
  };
})(); */

// Cloudflare Worker
export default {
  async fetch(request, env, ctx) {
    // if OPTIONS, send headers
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: headersObject,
      });
    }

    const {
      titleDeed,
      landClaim,
    } = await getContractsAsync({
      alchemyApiKey: env.ALCHEMY_API_KEY,
    });
    
    // ensure GET
    if (request.method === 'GET') {
      try {
        // parse the numeric ethereum token id (e.g. https://worker.dev/1)
        const url = new URL(request.url);
        const pathname = url.pathname;
        const match = pathname.match(/^\/([0-9]+)$/);
        if (!match) {
          return new Response(null, {
            status: 404,
            statusText: 'Not Found',
          });
        } else {
          // parse token id
          const tokenId = parseInt(match[1], 10);

          // get location
          let location = cache.get(tokenId);
          if (location === undefined) {
            await limiter.removeTokens(1);
            location = await landClaim.getTokenIdLocation(tokenId);
            cache.set(tokenId, location);
          }

          // respond
          const j = {
            "description": "The bearer is entitled to claim land in the Upstreet AI metaverse.",
            "external_url": "https://upstreet.ai/land/" + tokenId,
            "image": `https://upstreet.ai/images/map.jpg`,
            "animation_url": `https://upstreet.ai/models/map.glb`,
            "name": `Deed #${tokenId}`,
            "attributes": [
              {
                "trait_type": "Rarity",
                "value": "Mythic",
              },
              {
                "trait_type": "Location",
                "value": location,
              },
            ],
          };
          const s = JSON.stringify(j);
          return new Response(s, {
            headers: {
              'Content-Type': 'application/json',
              ...headersObject,
            },
            body: s,
          });
        }
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