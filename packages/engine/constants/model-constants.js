import {
  aiProxyHost,
} from "../endpoints.js";

export const model = 'text-davinci-003';
export const imageModels = [
  {
    name: `SD:openjourney-v2`,
    endpointUrl: `https://${aiProxyHost}/api/imaginairy/imagine`,
    handleFn: async (promptObject) => {
      const fd = new FormData();
      fd.append('prompt_texts', promptObject + 'beautiful, best quality, highres, trending on artstation, masterpiece');
      fd.append('width', 512);
      fd.append('height', 512);
      return fd;
    },
  },
];