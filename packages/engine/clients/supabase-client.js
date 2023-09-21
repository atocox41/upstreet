import { createClient } from '@supabase/supabase-js';
import {
  supabaseEndpointUrl,
} from '../endpoints.js';
import {
  SUPABASE_PUBLIC_API_KEY,
} from '../constants/auth.js';

//

const makeSupabase = (jwt) => {
  let supabase;
  if (jwt) {
    supabase = createClient(
      supabaseEndpointUrl,
      SUPABASE_PUBLIC_API_KEY,
      {
        global: {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      }
    }
    );
  } else {
    supabase = createClient(
      supabaseEndpointUrl,
      SUPABASE_PUBLIC_API_KEY,
    );
  }
  return supabase;
};

export class SupabaseClient {
  constructor({
    jwt,
  } = {}) {
    this.supabase = makeSupabase(jwt);
  }
  destroy() {
    this.supabase.realtime.disconnect();
    this.supabase = null;
  }
}