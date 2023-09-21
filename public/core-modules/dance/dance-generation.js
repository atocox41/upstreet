export const generateAudio = async ({
  text,
}) => {
  const u = new URL(`https://ai-proxy.webaverse.com/api/generateAudio`);
  u.searchParams.set('text', text);
  const res = await fetch(u, {
    method: 'POST',
  });
  const arrayBuffer = await res.blob();
  return arrayBuffer;
};

//

export const generateDance = async ({
  blob,
}) => {
  const u = new URL(`https://ai-proxy.webaverse.com/api/generateDance`);
  const res = await fetch(u, {
    method: 'POST',
    body: blob,
  });
  const json = await res.json();
  const {name} = json;
  return name;
};

//

export const getDance = async (name) => {
    const u = new URL(`https://ai-proxy.webaverse.com/api/getDance/${name}`);
    const res = await fetch(u);
    const blob = await res.blob();
    return blob;
};