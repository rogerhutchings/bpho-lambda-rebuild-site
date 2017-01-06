var webpack = require('webpack');
var nodeExternals = require('webpack-node-externals');
var execFileSync = require('child_process').execFileSync;
var CopyWebpackPlugin = require('copy-webpack-plugin');
var path = require('path');

var packages = execFileSync('npm', ['ls', '--parseable', '--production'])
  .toString()
  .split(/\r?\n/)
  .filter(package => package.indexOf('node_modules') > -1)
  .map(package => ({
    from: package,
    to: package.substr(package.indexOf('node_modules'))
  }));

module.exports = {
  entry: './src/RebuildSite.js',
  target: 'node',
  output: {
    filename: 'RebuildSite.js',
    path: path.join(__dirname, 'dist'),
    library: "[name]",
    libraryTarget: "commonjs2",
  },
  externals: [
    nodeExternals()
  ],
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          presets: ['es2015'],
        }
      }
    ]
  },
  noParse: [
    /aws\-sdk/,
  ],
  plugins: [
    new CopyWebpackPlugin(packages),
    new CopyWebpackPlugin([{
      from: './lib/*'
    }]),
  ],
}
