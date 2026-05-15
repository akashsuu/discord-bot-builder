const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
 entry: './src/index.jsx',
 output: {
 path: path.resolve(__dirname, 'dist'),
 filename: 'bundle.js',
 publicPath: './',
 },
 module: {
 rules: [
 {
 test: /\.(js|jsx)$/,
 exclude: /node_modules/,
 use: 'babel-loader',
 },
 {
 test: /\.css$/,
 use: ['style-loader', 'css-loader', 'postcss-loader'],
 },
 ],
 },
 resolve: {
 extensions: ['.js', '.jsx'],
 },
 plugins: [
 new HtmlWebpackPlugin({
 template: './src/index.html',
 favicon: './kiodium.ico',
 }),
 ],
 target: 'electron-renderer',
};
