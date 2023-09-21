import {isProd} from './env.js';

/* export const compilerBaseUrl = isProd ?
  `https://compiler-two.webaverse.com/`
:  (() => {
  const u = new URL(location.origin + location.pathname.replace(/\/[\s\S]+$/, '/'));
  u.host = u.host.replace(/^local/, 'local-compiler');
  return u.href;
  
  // XXX this can be used to debug mobile (iOS/Android):
  // return 'https://local.webaverse.live:4443/';
})(); */

// scenes
export const scenesBaseUrl = `/scenes/`;
// export const defaultSceneName = 'block.scn';
export const defaultSceneName = 'storymode.scn';

// characters
export const charactersBaseUrl = `/characters/`;
export const defaultCharacterName = 'scillia.npc';

// voice packs
// export const voicePacksUrl = `/voice/all_packs.json`;
export const voicePacksUrl = `https://avaer.github.io/voicepacks/all_packs.json`;

// voice endpoints
// export const voiceEndpointBaseUrl = `https://voice-cw.webaverse.com/tts`;
// export const voiceEndpointBaseUrl = `https://local.webaverse.com/tts`;
// export const voiceEndpointBaseUrl = `https://local.webaverse.com:8888/tts`;
// export const voiceEndpointsUrl = `https://raw.githubusercontent.com/webaverse/tiktalknet/main/model_lists/voice_models_upstreet.json`;
export const voiceEndpointsUrl = `/voice/voice_models.json`;

// image generation
// export const imageAIEndpointUrl = `https://stable-diffusion.webaverse.com`;

// image captioning
// export const imageCaptionAIEndpointUrl = `https://clip.webaverse.com`;

// sfx generation
// export const audioAIEndpointUrl = `https://diffsound.webaverse.com`;

// pod
export const localPodUrl = globalThis.location.protocol + '//' + globalThis.location.host + `/pod/`;

// database
// export const qdrantUrl = (() => {
//   const qs = new URLSearchParams(location.search);
//   let qsUrl = qs.get('qdrantUrl');
//   if (qsUrl && !qsUrl.endsWith('/')) {
//     qsUrl += '/';
//   }
//   return qsUrl || (`${localPodUrl}qdrant/`);
// })();

// file server
export const fileServerUrl = `${localPodUrl}fs/`;
export const remoteFileServerUrl = `https://pod.isekai.chat/`;

export const aiProxyHost = import.meta.env.VITE_AI_PROXY_HOST || `ai-proxy.isekai.chat`;

export const supabaseEndpointUrl = import.meta.env.VITE_SUPABASE_URL || `https://friddlbqibjnxjoxeocc.supabase.co`;

// multiplayer

export const multiplayerEndpointUrl = (() => {
  const wss = 'wss://';
  let hostname = import.meta.env.VITE_MULTIPLAYER_HOST || 'multiplayer.isekaichat.workers.dev';

  // The local development server's WebSocket is provided at ws://localhost.
  if (!isProd) {
    // wss = 'ws://';
    // hostname = `localhost:${MULTIPLAYER_PORT}`;
    hostname = globalThis.location.host;
  }

  return `${wss}${hostname}`;
})();

//

export const paymentsEndpointUrl = import.meta.env.VITE_PAYMENTS_ENDPOINT || `https://payments.isekai.chat`;

//

export const discordInviteUrl = `https://discord.gg/fj6N8a4VUb`;