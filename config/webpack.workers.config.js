"use strict";

var path = require('path');

module.exports = () => {
    return {
        entry: {
            AsyncGerberParser: "./workers/AsyncGerberParser.worker.ts",
        },

        output: {
            filename: "./[name].worker.js",
            path: path.resolve(__dirname, "../dist")
        },

        // Enable sourcemaps for debugging webpack's output.
        devtool: "source-map",

        resolve: {
            // Add '.ts' and '.tsx' as resolvable extensions.
            extensions: [".ts", ".js"]
        },

        module: {
            rules: [
                // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
                {
                    test: /\.ts$/,
                    include: [
                        path.resolve(__dirname, "../workers"),
                        path.resolve(__dirname, "../common"),
                    ],
                    use: [
                        {
                            loader: "awesome-typescript-loader",
                            options: {
                                configFileName: './workers/tsconfig.json',
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
                    ],
                },
                // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
                { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
            ]
        },
        externals: {
            "fs": "fs"
        },
    };
};
