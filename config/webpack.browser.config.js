"use strict";

var path = require('path');

module.exports = () => {
    return {
        entry: ["babel-polyfill", "./src/index.tsx"],
        output: {
            filename: "bundle.js",
            path: path.resolve(__dirname, '../dist/')
        },

        // Enable sourcemaps for debugging webpack's output.
        devtool: "source-map",

        resolve: {
            // Add '.ts' and '.tsx' as resolvable extensions.
            extensions: [".ts", ".tsx", ".js", ".json", ".css" ]
        },

        devServer: {
            contentBase: path.resolve(__dirname, '..'),
        },
        module: {
            rules: [
                // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
                { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
                // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
                {
                    test: /\.tsx?$/,
                    exclude: [
                        path.resolve(__dirname, "../workers"),
                    ],
                    loader: "awesome-typescript-loader",
                    options: {
                        configFileName: './tsconfig.json',
                        useBabel: true,
                        babelOptions: {
                            babelrc: false,
                            presets: [
                                [
                                    "env", { 
                                        "targets": "last 2 versions", 
                                    }
                                ]
                            ]
                        },
                    }
                },

                { test: /\.css$/, use: [ 'style-loader', 'css-loader' ] }
            ]
        },

        // When importing a module whose path matches one of the following, just
        // assume a corresponding global variable exists and use that instead.
        // This is important because it allows us to avoid bundling all of our
        // dependencies, which allows browsers to cache those libraries between builds.
        externals: {
            "react": "React",
            "react-dom": "ReactDOM",
            "fs": "fs"
        },
    };
};
