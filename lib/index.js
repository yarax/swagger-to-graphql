'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _objectWithoutProperties2 = require('babel-runtime/helpers/objectWithoutProperties');

var _objectWithoutProperties3 = _interopRequireDefault(_objectWithoutProperties2);

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

var schemaFromEndpoints = function schemaFromEndpoints(endpoints, proxyUrl, headers) {
  var gqlTypes = {};
  var queryFields = getFields(endpoints, false, gqlTypes, proxyUrl, headers);
  if (!(0, _keys2.default)(queryFields).length) {
    throw new Error('Did not find any GET endpoints');
  }
  var rootType = new _graphql.GraphQLObjectType({
    name: 'Query',
    fields: queryFields
  });

  var graphQLSchema = {
    query: rootType
  };

  var mutationFields = getFields(endpoints, true, gqlTypes, proxyUrl, headers);
  if ((0, _keys2.default)(mutationFields).length) {
    graphQLSchema.mutation = new _graphql.GraphQLObjectType({
      name: 'Mutation',
      fields: mutationFields
    });
  }

  return new _graphql.GraphQLSchema(graphQLSchema);
};


var resolver = function resolver(endpoint, proxyUrl) {
  var customHeaders = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  return function () {
    var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(_, args, opts) {
      var proxy, req, _opts$headers, host, otherHeaders, res;

      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              proxy = !proxyUrl ? opts.GQLProxyBaseUrl : typeof proxyUrl === 'function' ? proxyUrl(opts) : proxyUrl;
              req = endpoint.request(args, proxy);

              if (opts.headers) {
                _opts$headers = opts.headers, host = _opts$headers.host, otherHeaders = (0, _objectWithoutProperties3.default)(_opts$headers, ['host']);

                req.headers = (0, _assign2.default)(customHeaders, req.headers, otherHeaders);
              }
              _context.next = 5;
              return (0, _requestPromise2.default)(req);

            case 5:
              res = _context.sent;
              return _context.abrupt('return', JSON.parse(res));

            case 7:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, undefined);
    }));

    return function (_x2, _x3, _x4) {
      return _ref.apply(this, arguments);
    };
  }();
};

var getFields = function getFields(endpoints, isMutation, gqlTypes, proxyUrl, headers) {
  return (0, _keys2.default)(endpoints).filter(function (typeName) {
    return !!endpoints[typeName].mutation === !!isMutation;
  }).reduce(function (result, typeName) {
    var endpoint = endpoints[typeName];
    var type = (0, _typeMap.createGQLObject)(endpoint.response, typeName, false, gqlTypes);
    var gType = {
      type: type,
      description: endpoint.description,
      args: (0, _typeMap.mapParametersToFields)(endpoint.parameters, typeName, gqlTypes),
      resolve: resolver(endpoint, proxyUrl, headers)
    };
    result[typeName] = gType;
    return result;
  }, {});
};

var build = function () {
  var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(swaggerPath) {
    var proxyUrl = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var headers = arguments[2];
    var swaggerSchema, refs, endpoints, schema;
    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return (0, _swagger.loadSchema)(swaggerPath);

          case 2:
            swaggerSchema = _context2.sent;
            _context2.next = 5;
            return (0, _swagger.loadRefs)(swaggerPath);

          case 5:
            refs = _context2.sent;
            endpoints = (0, _swagger.getAllEndPoints)(swaggerSchema, refs);
            schema = schemaFromEndpoints(endpoints, proxyUrl, headers);
            return _context2.abrupt('return', schema);

          case 9:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, undefined);
  }));

  return function build(_x5) {
    return _ref2.apply(this, arguments);
  };
}();

exports.default = build;
module.exports = exports['default'];