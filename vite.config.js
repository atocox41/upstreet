import {fileURLToPath} from 'url';
import {defineConfig} from 'vite';
import {nodePolyfills} from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
  ],
  build: {
    outDir: './dist/web/',
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        // login: fileURLToPath(new URL('./login.html', import.meta.url)),
        titlescreen: fileURLToPath(new URL('./titlescreen.html', import.meta.url)),
        adventure: fileURLToPath(new URL('./adventure.html', import.meta.url)),
        world: fileURLToPath(new URL('./world.html', import.meta.url)),
        creative: fileURLToPath(new URL('./creative.html', import.meta.url)),
        // multiplayer: fileURLToPath(new URL('./multiplayer.html', import.meta.url)),
        // generative: fileURLToPath(new URL('./generative.html', import.meta.url)),
        indev: fileURLToPath(new URL('./indev.html', import.meta.url)),
        jedicouncil: fileURLToPath(new URL('./jedicouncil.html', import.meta.url)),
        // network: fileURLToPath(new URL('./network.html', import.meta.url)),
        home: fileURLToPath(new URL('./home.html', import.meta.url)),
        '404': fileURLToPath(new URL('./404.html', import.meta.url)),
      },
    },
  },
});
