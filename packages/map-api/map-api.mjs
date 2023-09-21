import {
  ethers,
} from 'ethers';
import {LRUCache} from 'lru-cache';
import {RateLimiter} from 'limiter';
import {
  createClient,
} from '@supabase/supabase-js';

import TitleDeedABI from './ethereum/abis/title-deed-abi.json';
import LandClaimABI from './ethereum/abis/land-claim-abi.json';
import contractAddresses from './ethereum/contract-addresses.json';
const titleDeedAddress = contractAddresses.titleDeed;
const landClaimAddress = contractAddresses.landClaim;

const cache = new LRUCache({
  ttl: 1000 * 60 * 1,
});
const limiter = new RateLimiter({
  tokensPerInterval: 5,
  interval: 'second',
});

//

const mapCacheName = 'mapCache';

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

// Cloudflare Worker
export default {
  async fetch(request, env, ctx) {
    // if OPTIONS, send headers
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: headersObject,
      });
    }

    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_API_KEY,
      {
        auth: {
          persistSession: false,
        },
      },
    );

    const {
      titleDeed,
      landClaim,
    } = await getContractsAsync({
      alchemyApiKey: env.ALCHEMY_API_KEY,
    });

    //

    const getLocation = async tokenId => {
      const key = tokenId + '';

      // throttle
      await limiter.removeTokens(1);
    
      // get location
      const location = await landClaim.getTokenIdLocation(tokenId);
    
      // add to database
      await supabase.from(mapCacheName)
        .upsert({
          id: key,
          value: location,
        });
    
      return location;
    };
    const getOwner = async (location) => {
      const [x, z] = location;
      const key = `${x}:${z}`;

      // get token id
      const locationString = JSON.stringify(location);
      await limiter.removeTokens(1); // throttle
      const result = await landClaim.getLocationTokenId(locationString);
      const [
        claimed,
        tokenIdBigNumber,
      ] = result;

      // get owner
      let owner;
      if (claimed) {
        await limiter.removeTokens(1); // throttle
        owner = await titleDeed.ownerOf(tokenIdBigNumber);
      } else {
        owner = null;
      }

      // set in database
      await supabase.from(mapCacheName)
        .upsert({
          id: key,
          value: owner,
        });

      return owner;
    };

    //

    // ensure GET
    if (request.method === 'GET') {
      try {
        // parse the numeric ethereum token id (e.g. https://worker.dev/1)
        const url = new URL(request.url);
        const pathname = url.pathname;

        let match;
        if (match = pathname.match(/^(\/refresh)?\/tokens\/((?:[0-9]+)(?:,[0-9]+)*)$/)) {
          const isRefresh = !!match[1];
          const coordStrings = match[2].split(',');
          const matches = [];
          for (let i = 0; i < coordStrings.length; i++) {
            const coordString = coordStrings[i];
            const match2 = coordString.match(/^([0-9]+)$/);
            if (match2) {
              const coord = parseInt(match2[1], 10);
              if (!isNaN(coord)) {
                matches.push(coord);
              } else {
                throw new Error('invalid coord string: ' + coordString);
              }
            } else {
              throw new Error('invalid coord string: ' + coordString);
            }
          }

          const promises = [];
          for (const tokenId of matches) {
            const p = (async () => {
              const key = tokenId + '';

              // try from database
              let location;
              if (!isRefresh) {
                const result = await supabase.from(mapCacheName)
                  .select('*')
                  .eq('id', key)
                  .maybeSingle();
                const {
                  data,
                } = result;
                location = data?.value || undefined;
              }
              if (location === undefined) {
                location = await getLocation(tokenId);
              }

              return location;
            })();
            promises.push(p);
          }

          const locations = await Promise.all(promises);
          const s = JSON.stringify(locations);
          return new Response(s, {
            headers: {
              'Content-Type': 'application/json',
              ...headersObject,
            },
            body: s,
          });
        } else if (match = pathname.match(/^(\/refresh)?\/locations\/((?:\-?[0-9]+:\-?[0-9]+)(?:,\-?[0-9]+:\-?[0-9]+)*)$/)) {
          const isRefresh = !!match[1];
          const coordStrings = match[2].split(',');
          const matches = [];
          for (let i = 0; i < coordStrings.length; i++) {
            const coordString = coordStrings[i];
            const match2 = coordString.match(/^(\-?[0-9]+):(\-?[0-9]+)$/);
            if (match2) {
              const x = parseInt(match2[1], 10);
              const z = parseInt(match2[2], 10);
              if (!isNaN(x) && !isNaN(z)) {
                matches.push([x, z]);
              } else {
                throw new Error('invalid coord string: ' + coordString);
              }
            } else {
              throw new Error('invalid coord string: ' + coordString);
            }
          }

          const promises = [];
          for (const [x, z] of matches) {
            const p = (async () => {
              const key = `${x}:${z}`;

              // try from database
              let owner;
              if (!isRefresh) {
                const result = await supabase.from(mapCacheName)
                  .select('*')
                  .eq('id', key)
                  .maybeSingle();
                const {
                  data,
                } = result;
                owner = data?.value || undefined;
              }
              // console.log('got owner key', [key, owner]);
              if (owner === undefined) {
                const location = [x, z];
                owner = await getOwner(location);
              }

              return owner;
            })();
            promises.push(p);
          }

          const owners = await Promise.all(promises);
          const s = JSON.stringify(owners);
          return new Response(s, {
            headers: {
              'Content-Type': 'application/json',
              ...headersObject,
            },
            body: s,
          });
        } else if (match = pathname.match(/^(\/refresh)?\/t\/([0-9]+)$/)) {
          const isRefresh = !!match[1];
          const tokenIdString = match[2];
          const tokenId = parseInt(tokenIdString, 10);

          if (!isNaN(tokenId)) {
            if (isRefresh) {
              const location = await getLocation(tokenId);
              const owner = await getOwner(location);
              console.log('got owner location', {
                location,
                owner,
              });
            }

            const results = await supabase.from(mapCacheName)
              .select('*')
              .eq('id', tokenId)
              .maybeSingle();

            if (results.error) {
              const s = JSON.stringify(results.error, null, 2);
              return new Response(s, {
                status: 500,
                headers: {
                  'Content-Type': 'application/json',
                  ...headersObject,
                },
                body: s,
              });
            } else {
              const values = results.data.map(o => {
                let {id, value} = o;
                id = parseInt(id, 10);
                const {location, owner} = JSON.parse(value);
                return {
                  id,
                  location,
                  owner,
                };
              }).sort((a, b) => a.id - b.id);
              const s = JSON.stringify(values, null, 2);
              return new Response(s, {
                headers: {
                  'Content-Type': 'application/json',
                  ...headersObject,
                },
                body: s,
              });
            }
          } else {
            return new Response(null, {
              status: 400,
            });
          }
        } else if (match = pathname.match(/^\/t\/([0-9]+)\-([0-9]+)$/)) {
          const tokenIdString1 = match[1];
          const tokenIdString2 = match[2];
          const tokenId1 = parseInt(tokenIdString1, 10);
          const tokenId2 = parseInt(tokenIdString2, 10);
          if (!isNaN(tokenId1) && !isNaN(tokenId2)) {
            const tokenIds = [];
            for (let i = tokenId1; i <= tokenId2; i++) {
              const key = i + '*';
              tokenIds.push(key);
            }

            // console.log('got tokenIds', tokenIds);

            const results = await supabase.from(mapCacheName)
              .select('*')
              .in('id', tokenIds);

            // console.log('got tokenIds', results);

            if (results.error) {
              const s = JSON.stringify(results.error, null, 2);
              return new Response(s, {
                status: 500,
                headers: {
                  'Content-Type': 'application/json',
                  ...headersObject,
                },
                body: s,
              });
            } else {
              const values = results.data.map(o => {
                let {id, value} = o;
                id = parseInt(id, 10);
                const {location, owner} = JSON.parse(value);
                return {
                  id,
                  location,
                  owner,
                };
              }).sort((a, b) => a.id - b.id);
              const s = JSON.stringify(values, null, 2);
              return new Response(s, {
                headers: {
                  'Content-Type': 'application/json',
                  ...headersObject,
                },
                body: s,
              });
            }
          } else {
            return new Response(null, {
              status: 400,
            });
          }
        } else {
          return new Response(null, {
            status: 404,
            statusText: 'Not Found',
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