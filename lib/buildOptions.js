'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildOptions = exports.BUILD_OPTIONS = undefined;

var _yargs = require('yargs');

var BUILD_OPTIONS = exports.BUILD_OPTIONS = {
  NaN: 'allow-nan',
  EmptyToJSON: 'empty-to-json'
};

var buildOptions = exports.buildOptions = _yargs.argv.options ? _yargs.argv.options.split(',').map(function (opt) {
  return opt.toLowerCase();
}) : [];