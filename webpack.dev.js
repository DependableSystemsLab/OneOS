const path = require("path");
const webpack = require("webpack");
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
// const CopyWebpackPlugin = require('copy-webpack-plugin');


module.exports = {
  entry: {
    main: './src/web/index.jsx',
    oneosWebRuntime: './src/web/lib/oneos-web-runtime.js'
  },
  mode: "development",
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        options: { presets: ['@babel/preset-env', '@babel/preset-react'] }
      },
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      },
      {
        test: /\.(png|jpg|gif|svg|ttf|woff2|woff|eot)$/,
        use: [{
          loader: 'file-loader',
          options: {}
        }]
      }
    ]
  },
  resolve: { extensions: ['*', '.js', '.jsx'] },
  plugins: [
    new CleanWebpackPlugin(['lib/core/runtime/web']),
    new HtmlWebpackPlugin({
      template: "./src/web/index.html",
      inject: true,
      chunks: ['main']
    }),
    // new CopyWebpackPlugin([{
    //   from: 'src/web/lib/oneos-web-runtime.js',
    //   to: 'lib/oneos-web-runtime.js'
    // }, {
    //   from: 'src/web/lib/oneos-web-common.js',
    //   to: 'lib/oneos-web-common.js'
    // }]),
    new webpack.HotModuleReplacementPlugin()
  ],
  output: {
    path: path.resolve(__dirname, "lib/core/runtime/web/"),
    publicPath: "/",
    filename: "[name].js",
    globalObject: 'this'  // Without this, bundled WebRuntime cannot find the "window" object
  },
  devServer: {
    // contentBase: path.join(__dirname, "public/"),
    // host: 'localhost',
    disableHostCheck: true, // SECURITY WARNING: This flag makes the dev server open to public
    host: '0.0.0.0',  // Need this + disableHostCheck=true to be able to access this from public
    port: 5000,
    proxy: {
      "/fs": "http://localhost:3000",
      "/api": "http://localhost:3000",
      "/shell": "http://localhost:3000",
      "/pubsub": {
        "target": "http://localhost:3000",
        "ws": true
      }
    },
    hotOnly: true
  }
};
