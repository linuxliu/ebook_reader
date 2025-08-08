const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  target: 'electron-main',
  entry: './src/main/main.ts',
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'main.js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.node$/,
        use: 'node-loader',
      },
    ],
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  externals: {
    'better-sqlite3': 'commonjs better-sqlite3',
    'pdfjs-dist': 'commonjs pdfjs-dist',
    'pdfjs-dist/legacy/build/pdf.mjs': 'commonjs pdfjs-dist/legacy/build/pdf.mjs',
    'fsevents': 'commonjs fsevents',
    'electron-reload': 'commonjs electron-reload',
    'epubjs': 'commonjs epubjs',
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src/main/workers'),
          to: path.resolve(__dirname, 'dist/main/workers'),
        },
      ],
    }),
  ],
  devtool: process.env.NODE_ENV === 'development' ? 'source-map' : false,
};