#!/usr/bin/env node
var argv = require('yargs')
    .usage('Usage: $0 -i [path] -o [path]')
    .demandOption(['i','o'])
    .argv;