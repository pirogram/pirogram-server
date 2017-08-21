const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './client/index.js',
    devtool: 'inline-source-map',
    output: {
        path: path.resolve('static/js'),
        filename: 'client_bundle.js'
    },
    module: {
        loaders: [
            { test: /\.js$/, loader: 'babel-loader', exclude: /node_modules/ },
            { test: /\.jsx$/, loader: 'babel-loader', exclude: /node_modules/ },
            { test: /\.css$/, use: [ 'style-loader', 'css-loader' ] }
        ]
    },
    plugins: [
        new CopyWebpackPlugin([
          {
            from: 'node_modules/monaco-editor/min/vs',
            to: 'vs',
          }
        ])
    ]
}