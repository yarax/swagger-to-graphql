'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildOptions = exports.BUILD_OPTIONS = undefined;

var _yargs = require('yargs');

var BUILD_OPTIONS = exports.BUILD_OPTIONS = {
  NaN: 'nan'
};

var buildOptions = exports.buildOptions = _yargs.argv.buildOptions ? _yargs.argv.buildOptions.split(',').map(function (opt) {
  return opt.toLowerCase();
}) : [];