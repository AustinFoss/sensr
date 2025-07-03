const path = require('path');

module.exports = {
  entry: './src/main.ts', // Changed to .ts entry point
  module: {
    rules: [
      {
        test: /\.tsx?$/, // Support both .ts and .tsx files
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.wasm$/,
        type: 'asset/inline',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'], // Added .tsx to support TypeScript with JSX if needed
    alias: {
      // Optional: Add aliases for libp2p modules if needed for browser compatibility
      '@libp2p': path.resolve(__dirname, 'node_modules/@libp2p'),
    },
  },
  output: {
    filename: 'sw.js',
    path: path.resolve(__dirname, 'dist'),
    globalObject: 'this', // Required for service worker in browser environments
    library: {
      name: 'sw',
      type: 'umd', // Universal module definition for compatibility
    },
    clean: true, // Clean the output directory before each build
  },
  watchOptions: {
    ignored: /node_modules/,
    poll: 1000,
    aggregateTimeout: 300,
  },
  experiments: {
    asyncWebAssembly: true, // Enable async WebAssembly support
  },
  mode: 'production',
  devtool: 'source-map', // Add source maps for debugging TypeScript
  target: 'webworker', // Optimize for service worker environment
  plugins: [
    // Optional: Add plugins if needed, e.g., for environment variables
  ],
};