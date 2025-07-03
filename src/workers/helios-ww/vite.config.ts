import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist', // Temporary output directory
    rollupOptions: {
      input: './src/main.ts', // TypeScript worker entry
      output: {
        format: 'esm',
        entryFileNames: 'worker.js', // Output JS file
        chunkFileNames: '[name].js',
        assetFileNames: 'assets/[name].[ext]',
        // external: [], // Bundle all dependencies
      },
    },
    emptyOutDir: true,
    minify: 'esbuild',
    target: 'esnext',
  },
});