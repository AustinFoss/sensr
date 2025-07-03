const path = require("path");

module.exports = {
  entry: "./src/main.js",
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.wasm$/,
        type: "asset/inline",
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "sw.js",
    globalObject: "this",
    path: path.resolve(__dirname, "dist"),
    library: {
      name: "sw",
      type: "umd",
    },
  },
  watchOptions: {
    ignored: /node_modules/, // Ignore node_modules to reduce watch overhead
    poll: 1000, // Poll every 1 second for file changes (useful for some systems)
    aggregateTimeout: 300, // Wait 300ms after changes to debounce rebuilds
  },
  experiments: {
    asyncWebAssembly: true,
  },
  mode: "production", 
};
