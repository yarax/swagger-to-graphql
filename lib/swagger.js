'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAllEndPoints = exports.loadRefs = exports.loadSchema = exports.getSchema = undefined;

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

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
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return _jsonSchemaRefParser2.default.bundle(pathToSchema);

          case 2:
            __schema = _context.sent;
            return _context.abrupt('return', __schema);

          case 4:
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

var loadRefs = exports.loadRefs = function () {
  var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(pathToSchema) {
    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return _jsonSchemaRefParser2.default.resolve(pathToSchema);

          case 2:
            return _context2.abrupt('return', _context2.sent);

          case 3:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, undefined);
  }));

  return function loadRefs(_x2) {
    return _ref2.apply(this, arguments);
  };
}();

var replaceOddChars = function replaceOddChars(str) {
  return str.replace(/[^_a-zA-Z0-9]/g, '_');
};

var getServerPath = function getServerPath(schema) {
  var server = schema.servers && Array.isArray(schema.servers) ? schema.servers[0] : schema.servers;
  if (!server) {
    return undefined;
  } else if (typeof server === 'string') {
    return server;
  }
  var url = server.url;
  if (server.variables) {
    (0, _keys2.default)(server.variables).forEach(function (variable) {
      var value = server.variables[variable];
      if ((typeof value === 'undefined' ? 'undefined' : (0, _typeof3.default)(value)) === 'object') {
        value = value.default || value.enum[0];
      }
      url = url.replace('{' + variable + '}', value);
    });
  }
  return url;
};

var getParamDetails = function getParamDetails(param, schema, refResolver) {
  var _param = param;
  if (param.$ref) {
    _param = refResolver.get(param.$ref);
  }
  var name = replaceOddChars(_param.name);
  var type = _param.type;
  var jsonSchema = _param;

  return { name: name, type: type, jsonSchema: jsonSchema };
};

var renameGraphqlParametersToSwaggerParameters = function renameGraphqlParametersToSwaggerParameters(graphqlParameters, parameterDetails) {
  var result = {};
  (0, _keys2.default)(graphqlParameters).forEach(function (inputGraphqlName) {
    var _parameterDetails$fin = parameterDetails.find(function (_ref3) {
      var graphqlName = _ref3.name;
      return graphqlName === inputGraphqlName;
    }),
        swaggerName = _parameterDetails$fin.jsonSchema.name;

    result[swaggerName] = graphqlParameters[inputGraphqlName];
  });
  return result;
};

/**
 * Go through schema and grab routes
 */
var getAllEndPoints = exports.getAllEndPoints = function getAllEndPoints(schema, refs) {
  var allTypes = {};
  var serverPath = getServerPath(schema);
  (0, _keys2.default)(schema.paths).forEach(function (path) {
    var route = schema.paths[path];
    (0, _keys2.default)(route).forEach(function (method) {
      var obj = route[method];
      var isMutation = ['post', 'put', 'patch', 'delete'].indexOf(method) !== -1;
      var typeName = obj.operationId || getGQLTypeNameFromURL(method, path);
      var parameterDetails = obj.parameters ? obj.parameters.map(function (param) {
        return getParamDetails(param, schema, refs);
      }) : [];
      var endpoint = {
        parameters: parameterDetails,
        description: obj.description,
        response: getSuccessResponse(obj.responses),
        request: function request(graphqlParameters, optBaseUrl) {
          var baseUrl = optBaseUrl || serverPath; // eslint-disable-line no-param-reassign
          if (!baseUrl) {
            throw new Error('Could not get the base url for endpoints. Check that either your schema has baseUrl or you provided it to constructor');
          }
          var url = '' + baseUrl + path;
          var request = renameGraphqlParametersToSwaggerParameters(graphqlParameters, parameterDetails);
          return (0, _nodeRequestBySwagger2.default)(obj, {
            request: request,
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