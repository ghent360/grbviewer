"use strict";

let browserConfig = require("./config/webpack.browser.config");
let workerConfig = require("./config/webpack.workers.config");

module.exports = [
	    browserConfig(),
	    workerConfig()
];

