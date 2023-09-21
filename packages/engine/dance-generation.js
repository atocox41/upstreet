import {
  aiProxyHost,
} from './endpoints.js';

//

export const generateAudio = async (text, {
  duration,
} = {}) => {
  const u = new URL(`https://${aiProxyHost}/api/generateAudio`);
  u.searchParams.set('text', text);
  if (typeof duration === 'number') {
    u.searchParams.set('duration', duration + '');
  }
  const res = await fetch(u, {
    method: 'POST',
  });
  const file_name = await res.text();
  return file_name;
}
export const getAudio = async (file_name) => {
  const u2 = new URL(`https://${aiProxyHost}/api/getAudio`);
  u2.searchParams.set('file_name', file_name);
  const res = await fetch(u2);
  if (res.ok) {
    if (res.status === 204) {
      return null;
    } else {
      const blob = await res.blob();
      return blob;
    }
  } else {
    throw new Error('invalid status code: ' + res.status);
  }
};

//

export const generateDance = async (blob) => {
  const u = new URL(`https://${aiProxyHost}/api/generateDance`);
  const res = await fetch(u, {
    method: 'POST',
    body: blob,
  });
  const json = await res.json();
  const {name} = json;
  return name;
};
export const getDance = async (name) => {
  const u = new URL(`https://${aiProxyHost}/api/getDance/${name}`);
  const res = await fetch(u);

  if (res.ok) {
    if (res.status === 204) {
      return null;
      // const blob = await res.blob();
      // return blob;
    } else {
      const blob = await res.blob();
      return blob;
      // const json = await res.json();
      // const {error} = json;
      // throw new Error(error);
    }
  } else {
    // return null;
    throw new Error('invalid status code: ' + res.status);
  }
};

//

const generateFull = (generator, getter) => async (args, opts) => {
  const name = await generator(args, opts);

  const blob = await new Promise((accept, reject) => {
    const recurse = async () => {
      const blob = await getter(name);

      if (blob !== null) {
        accept(blob);
      } else {
        setTimeout(recurse, 3000);
      }
    };
    recurse();
  });
  console.log('got blob', blob);
  return blob;
};
export const generateAudioFull = generateFull(generateAudio, getAudio);
export const generateDanceFull = generateFull(generateDance, getDance);