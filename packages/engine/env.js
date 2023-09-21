export const isProd = false; // import.meta.env.MODE === 'production';
export const isWorker = !globalThis.window;