// @ts-check
import { defineConfig } from 'astro/config';
import fs from 'fs';

import solidJs from '@astrojs/solid-js';

// https://astro.build/config
export default defineConfig({
  integrations: [solidJs()],
  vite: {
    server: {
      // https: {
      //   key: fs.readFileSync('./key.pem'),
      //   cert: fs.readFileSync('./cert.pem'),
      // },
    },
    build: {
      // Configure Rollup to handle the service worker file
      rollupOptions: {
        // Define the input file(s) for the service worker
        input: {
          'service-worker': './src/service-worker.js',
        },
        // Specify output options
        output: {
          // Ensure the service worker is output as a single file
          entryFileNames: '[name].js', // Outputs service-worker.js
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
          // Place the service worker in the root of the output directory
          dir: './dist',
        },
      },
    },
    // Ensure the service worker is not processed as an ES module if it uses classic syntax
    // (optional, depending on your service worker code)
    resolve: {
      alias: {
        // Optional: Alias to ensure correct path resolution if needed
        '/service-worker.js': './src/service-worker.js',
      },
    },
  },
});