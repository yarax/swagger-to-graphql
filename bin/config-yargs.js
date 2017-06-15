module.exports = function Conf(yargs) {
  yargs
		.help('help')
		.alias('help', 'h', '?')
		.version()
		.alias('version', 'v')
		.options({
  'swagger-schema': {
    type: 'string',
    alias: 'i',
    describe: 'Path to Swagger schema (JSON or YAML)',
    requiresArg: true
  },
  'output': {
    alias: 'o',
    type: 'string',
    requiresArg: true,
    describe: 'Path to file with GraphQL schema'
  }
}).strict();
};