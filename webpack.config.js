const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');
require('dotenv').config();

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      popup: './src/popup/index.js',
      sidepanel: './src/sidepanel/index.js',
      content: './src/content/content.js',
      background: './src/background/background.js',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react'],
            },
          },
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            'postcss-loader',
          ],
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.OPENAI_API_KEY': JSON.stringify(
          process.env.OPENAI_API_KEY
        ),
        'process.env.NODE_ENV': JSON.stringify(
          process.env.NODE_ENV || 'development'
        ),
      }),
      new HtmlWebpackPlugin({
        template: './src/popup/popup.html',
        filename: 'popup.html',
        chunks: ['popup'],
      }),
      new HtmlWebpackPlugin({
        template: './src/sidepanel/sidepanel.html',
        filename: 'sidepanel.html',
        chunks: ['sidepanel'],
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'manifest.json',
            to: 'manifest.json',
          },
          {
            from: 'public',
            to: '.',
            globOptions: {
              ignore: ['**/popup.html'],
            },
          },
        ],
      }),
      ...(isProduction
        ? [new MiniCssExtractPlugin({ filename: '[name].css' })]
        : []),
    ],
    resolve: {
      extensions: ['.js', '.jsx'],
    },
    devtool: isProduction ? false : 'cheap-module-source-map',
  };
};
