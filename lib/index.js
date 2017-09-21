'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _requestPromise = require('request-promise');

var _requestPromise2 = _interopRequireDefault(_requestPromise);

var _graphql = require('graphql');

var _swagger = require('./swagger');

var _typeMap = require('./typeMap');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var mergeNamespaces = function mergeNamespaces(endpoints) {
	var schema = { query: {}, mutation: {} };
	(0, _keys2.default)(endpoints).forEach(function (namespace) {
		var endpoint = endpoints[namespace];
		var endpointSchema = schemaFromEndpointsEx(endpoint);
		schema.query[namespace] = {
			type: new _graphql.GraphQLObjectType({
				name: namespace,
				fields: endpointSchema.query
			}),
			resolve: function resolve() {
				return 'Without this resolver graphql does not resolve further';
			}
		};
		schema.mutation[namespace] = {
			type: new _graphql.GraphQLObjectType({
				name: namespace + '_mutation',
				fields: endpointSchema.mutation
			}),
			resolve: function resolve() {
				return 'Without this resolver graphql does not resolve further';
			}
		};
	});

	var rootType = new _graphql.GraphQLObjectType({
		name: 'Query',
		fields: schema.query
	});

	var graphQLSchema = {
		query: rootType
	};

	if ((0, _keys2.default)(schema.mutation).length) {
		graphQLSchema.mutation = new _graphql.GraphQLObjectType({
			name: 'Mutation',
			fields: schema.mutation
		});
	}

	return new _graphql.GraphQLSchema(graphQLSchema);
};


var schemaFromEndpoints = function schemaFromEndpoints(endpoints) {
	var schema = schemaFromEndpointsEx(endpoints);
	var rootType = new _graphql.GraphQLObjectType({
		name: 'Query',
		fields: function fields() {
			return {
				viewer: {
					type: new _graphql.GraphQLObjectType({
						name: 'viewer',
						fields: schema.query
					}),
					resolve: function resolve() {
						return 'Without this resolver graphql does not resolve further';
					}
				}
			};
		}
	});

	var graphQLSchema = {
		query: rootType
	};

	if ((0, _keys2.default)(schema.mutation).length) {
		graphQLSchema.mutation = new _graphql.GraphQLObjectType({
			name: 'Mutation',
			fields: schema.mutation
		});
	}

	return new _graphql.GraphQLSchema(graphQLSchema);
};

var schemaFromEndpointsEx = function schemaFromEndpointsEx(endpoints) {
	return {
		query: function query() {
			var queryFields = getQueriesFields(endpoints, false);
			if (!(0, _keys2.default)(queryFields).length) {
				throw new Error('Did not find any GET endpoints');
			}
			return queryFields;
		},
		mutation: getQueriesFields(endpoints, true)
	};
};

var resolver = function resolver(endpoint) {
	return function () {
		var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(_, args, opts) {
			var req, res;
			return _regenerator2.default.wrap(function _callee$(_context) {
				while (1) {
					switch (_context.prev = _context.next) {
						case 0:
							req = endpoint.request(args, opts.GQLProxyBaseUrl);

							if (opts.BearerToken) {
								req.headers.Authorization = opts.BearerToken;
							}
							_context.next = 4;
							return (0, _requestPromise2.default)(req);

						case 4:
							res = _context.sent;
							return _context.abrupt('return', JSON.parse(res));

						case 6:
						case 'end':
							return _context.stop();
					}
				}
			}, _callee, undefined);
		}));

		return function (_x, _x2, _x3) {
			return _ref.apply(this, arguments);
		};
	}();
};

var getQueriesFields = function getQueriesFields(endpoints, isMutation) {
	return (0, _keys2.default)(endpoints).filter(function (typeName) {
		return !!endpoints[typeName].mutation === !!isMutation && typeName !== '__namespace__';
	}).reduce(function (result, typeName) {
		var endpoint = endpoints[typeName];
		var namespace = endpoints.__namespace__;
		var typeFullName = (namespace ? namespace + '_' : '') + typeName;
		var type = (0, _typeMap.createGQLObject)(endpoint.response, typeFullName, false);
		var gType = {
			type: type,
			description: endpoint.description,
			args: (0, _typeMap.mapParametersToFields)(endpoint.parameters, typeFullName),
			resolve: resolver(endpoint)
		};
		result[typeName] = gType;
		return result;
	}, {});
};

var isSimpleObject = function isSimpleObject(value) {
	return value instanceof Object && value.constructor === Object;
};

var build = function () {
	var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(swaggerPath) {
		var swaggerSchema, endpoints, schema;
		return _regenerator2.default.wrap(function _callee2$(_context2) {
			while (1) {
				switch (_context2.prev = _context2.next) {
					case 0:
						if (!(isSimpleObject(swaggerPath) && !swaggerPath.swagger)) {
							_context2.next = 2;
							break;
						}

						return _context2.abrupt('return', join(swaggerPath));

					case 2:
						_context2.next = 4;
						return (0, _swagger.loadSchema)(swaggerPath);

					case 4:
						swaggerSchema = _context2.sent;
						endpoints = (0, _swagger.getAllEndPoints)(swaggerSchema);
						schema = schemaFromEndpoints(endpoints);
						return _context2.abrupt('return', schema);

					case 8:
					case 'end':
						return _context2.stop();
				}
			}
		}, _callee2, undefined);
	}));

	return function build(_x4) {
		return _ref2.apply(this, arguments);
	};
}();

var join = function () {
	var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(swaggerPaths) {
		var namespaces, namespace, swaggerPath, swaggerSchema, schema;
		return _regenerator2.default.wrap(function _callee3$(_context3) {
			while (1) {
				switch (_context3.prev = _context3.next) {
					case 0:
						namespaces = {};
						_context3.t0 = _regenerator2.default.keys(swaggerPaths);

					case 2:
						if ((_context3.t1 = _context3.t0()).done) {
							_context3.next = 13;
							break;
						}

						namespace = _context3.t1.value;
						swaggerPath = swaggerPaths[namespace];
						_context3.next = 7;
						return (0, _swagger.loadSchema)(swaggerPath);

					case 7:
						swaggerSchema = _context3.sent;


						swaggerSchema.__namespace__ = namespace;
						namespaces[namespace] = (0, _swagger.getAllEndPoints)(swaggerSchema);
						namespaces[namespace].__namespace__ = namespace;
						_context3.next = 2;
						break;

					case 13:
						schema = mergeNamespaces(namespaces);
						return _context3.abrupt('return', schema);

					case 15:
					case 'end':
						return _context3.stop();
				}
			}
		}, _callee3, undefined);
	}));

	return function join(_x5) {
		return _ref3.apply(this, arguments);
	};
}();

exports.default = build;
module.exports = exports['default'];