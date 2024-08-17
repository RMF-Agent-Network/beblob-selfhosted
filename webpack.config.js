const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack'); // Required for HMR

module.exports = {
    mode: 'development', // or 'production'
    entry: './src/js/main.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    devServer: {
        static: {
            directory: path.resolve(__dirname, 'dist'),
        },
        compress: true,
        port: 8080,
        hot: true, // Enable hot module replacement
        open: true, // Automatically open the browser on server start
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
        }),
        new CopyPlugin({
            patterns: [
                { from: 'src/css', to: 'css' }, // Copy CSS folder and contents to 'dist/css'
                { from: 'src/images', to: 'images' }, // Copy images folder and contents to 'dist/images'
            ],
        }),
        new webpack.HotModuleReplacementPlugin(), // HMR plugin
    ],
};
