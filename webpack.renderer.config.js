const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  
  return {
    target: 'electron-renderer',
    entry: './src/renderer/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist/renderer'),
      filename: 'renderer.js',
      clean: true,
      publicPath: './',
      globalObject: 'this',
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@renderer': path.resolve(__dirname, 'src/renderer'),
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
      fallback: {
        "buffer": require.resolve("buffer"),
        "process": require.resolve("process/browser"),
        "util": require.resolve("util"),
        "path": require.resolve("path-browserify"),
        "fs": false,
        "crypto": false,
        "events": require.resolve('events/'),
        "stream": false,
        "assert": false,
        "http": false,
        "https": false,
        "os": false,
        "url": false,
      },
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          use: 'babel-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            'postcss-loader',
          ],
        },
        {
          test: /\.(png|jpe?g|gif|svg|ico)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/images/[name].[hash][ext]',
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name].[hash][ext]',
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html',
        filename: 'index.html',
        inject: 'body',
        minify: !isDevelopment,
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(argv.mode || 'development'),
        global: 'globalThis',
      }),
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser',
      }),
    ],
    devServer: {
      port: 3000,
      hot: true,
      historyApiFallback: true,
      static: {
        directory: path.join(__dirname, 'dist/renderer'),
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
      },
    },
    devtool: isDevelopment ? 'eval-source-map' : 'source-map',
    optimization: {
      splitChunks: false, // 禁用代码分割以避免 Electron 中的加载问题
    },
  };
};