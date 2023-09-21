import fs from 'fs';
import {
  createClient,
} from '@supabase/supabase-js';

// Create an async function to fetch based on tokens
const wanglerToml = fs.readFileSync('./wrangler.toml', 'utf8'); // read from wrangler.toml
const SUPABASE_URL = wanglerToml.match(/SUPABASE_URL\s*=\s*"(.*)"/)[1];
const SUPABASE_SERVICE_API_KEY = wanglerToml.match(/SUPABASE_SERVICE_API_KEY\s*=\s*"(.*)"/)[1];

async function fetchByTokens() {
  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_API_KEY,
    {
      auth: {
        persistSession: false,
      },
    },
  );

  let location;
  for (let token = 0; token <= 7000; token++) {
    const url = `https://map-api.upstreet.ai/refresh/tokens/${token}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Error fetching 1.1 ${url}: ${response.statusText}`);
        token--;
        continue;
      }

      const json = await response.json();

      console.log('fetch 1 ok', token, json);

      location = json[0];
    } catch (err) {
      console.error(`Error fetching 1.2 ${url}: ${err}`);
    }

    let owner;
    if (location) {
      let locationString;
      try {
        locationString = JSON.parse(location).join(':');
      } catch(err) {
        console.warn('failed to parse', JSON.stringify(location), err.stack);
        locationString = '';
      }
      if (locationString) {
        for (;;) {
          const url = `https://map-api.upstreet.ai/refresh/locations/${locationString}`;
          try {
            const response = await fetch(url);
            if (!response.ok) {
              console.error(`Error fetching 2.1 ${url}: ${response.statusText}`);
              continue;
            }
      
            const json = await response.json();
            console.log('fetch 2 ok', token, json);

            owner = json[0];

            break;
          } catch (err) {
            console.error(`Error fetching 2.2 ${url}: ${err}`);
          }
        }
      } else {
        owner = '';
      }
    } else {
      owner = '';
    }

    //

    const tokenId = token + '';

    const tokenObject = {
      tokenId,
      location,
      owner,
    };
    console.log('fetch 3 ok', tokenObject);
    await supabase.from('mapCache')
      .insert({
        id: tokenId + '*',
        value: JSON.stringify(tokenObject),
      });
  }
}

await fetchByTokens();