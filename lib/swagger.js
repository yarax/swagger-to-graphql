'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.getAllEndPoints = exports.loadSchema = exports.getSchema = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _requestPromise = require('request-promise');

var _requestPromise2 = _interopRequireDefault(_requestPromise);

var _jsonSchemaRefParser = require('json-schema-ref-parser');

var _jsonSchemaRefParser2 = _interopRequireDefault(_jsonSchemaRefParser);

var _nodeRequestBySwagger = require('node-request-by-swagger');

var _nodeRequestBySwagger2 = _interopRequireDefault(_nodeRequestBySwagger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var __schema = void 0;

var getSchema = exports.getSchema = function getSchema() {
	if (!__schema || !(0, _keys2.default)(__schema).length) {
		throw new Error('Schema was not loaded');
	}
	return __schema;
};

var getGQLTypeNameFromURL = function getGQLTypeNameFromURL(method, url) {
	var fromUrl = url.replace(/[\{\}]+/g, '').replace(/[^a-zA-Z0-9_]+/g, '_');
	return '' + method + fromUrl;
};

var getSuccessResponse = function getSuccessResponse(responses) {
	var resp = void 0;

	if (!responses) return null;

	(0, _keys2.default)(responses).some(function (code) {
		resp = responses[code];
		return code[0] === '2';
	});

	return resp && resp.schema;
};

var loadSchema = exports.loadSchema = function () {
	var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(pathToSchema) {
		var schema;
		return _regenerator2.default.wrap(function _callee$(_context) {
			while (1) {
				switch (_context.prev = _context.next) {
					case 0:
						if (!(typeof pathToSchema === 'string' && pathToSchema.toLowerCase().startsWith('http'))) {
							_context.next = 4;
							break;
						}

						_context.next = 3;
						return fetchSchema(pathToSchema);

					case 3:
						pathToSchema = _context.sent;

					case 4:
						schema = _jsonSchemaRefParser2.default.dereference(pathToSchema);

						__schema = schema;
						return _context.abrupt('return', schema);

					case 7:
					case 'end':
						return _context.stop();
				}
			}
		}, _callee, undefined);
	}));

	return function loadSchema(_x) {
		return _ref.apply(this, arguments);
	};
}();

var fetchSchema = function fetchSchema(schemaurl) {
	var options = {
		uri: schemaurl,
		transform: function transform(body) {
			return JSON.parse(body);
		}
	};
	return (0, _requestPromise2.default)(options);
};

var replaceOddChars = function replaceOddChars(str) {
	return str.replace(/[^_a-zA-Z0-9]/g, '_');
};

/**
 * Going throw schema and grab routes
 */
var getAllEndPoints = exports.getAllEndPoints = function getAllEndPoints(schema) {
	var allTypes = {};
	__schema = schema;
	var schemaBaseUrl;

	if (schema.schemes && schema.schemes.length && schema.host && schema.basePath) {
		var url = require('url');
		var protocol = schema.schemes.indexOf('https') !== -1 ? 'https' : schema.schemes[0];
		schemaBaseUrl = url.format({ protocol: protocol, host: schema.host, pathname: schema.basePath }).toString();
	}

	(0, _keys2.default)(schema.paths).forEach(function (path) {
		var route = schema.paths[path];
		(0, _keys2.default)(route).forEach(function (method) {
			var obj = route[method];
			var isMutation = ['post', 'put', 'patch', 'delete'].indexOf(method) !== -1;
			var typeName = obj.operationId || getGQLTypeNameFromURL(method, path);
			var parameters = obj.parameters ? obj.parameters.map(function (param) {
				var type = param.type;
				return { name: replaceOddChars(param.name), type: type, jsonSchema: param };
			}) : [];
			var endpoint = {
				parameters: parameters,
				description: obj.description,
				response: getSuccessResponse(obj.responses),
				request: function request(args, baseUrl) {
					var url = '' + (baseUrl || schemaBaseUrl) + path;
					return (0, _nodeRequestBySwagger2.default)(obj, {
						request: args,
						url: url,
						method: method
					}, '');
				},
				mutation: isMutation
			};
			allTypes[typeName] = endpoint;
		});
	});
	return allTypes;
};