import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist', // Temporary output directory
    rollupOptions: {
      input: './src/main.js', // TypeScript worker entry
      output: {
        format: 'esm',
        entryFileNames: 'sw.js', // Output JS file
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