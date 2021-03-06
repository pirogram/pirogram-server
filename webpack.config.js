const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: './client/index.js',
    devtool: 'inline-source-map', /*'cheap-module-eval-source-map',*/
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
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': '"development"'
        }),
        /*new webpack.optimize.UglifyJsPlugin({
            mangle: true,
            compress: {
                warnings: false, // Suppress uglification warnings
                pure_getters: true,
                unsafe: true,
                unsafe_comps: true,
                screw_ie8: true
            },
            output: {
                comments: false,
            },
            exclude: [/\.min\.js$/gi] // skip pre-minified libs
        }),*/
        new webpack.IgnorePlugin(/^\.\/locale$/, [/moment$/]),
        new webpack.NoEmitOnErrorsPlugin(),
    ]
}