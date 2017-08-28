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

var schemaFromEndpoints = function schemaFromEndpoints(endpoints, resolver) {
  var rootType = new _graphql.GraphQLObjectType({
    name: 'Query',
    fields: function fields() {
      return {
        viewer: {
          type: new _graphql.GraphQLObjectType({
            name: 'viewer',
            fields: function fields() {
              var queryFields = getQueriesFields(endpoints, false, resolver);
              if (!(0, _keys2.default)(queryFields).length) {
                throw new Error('Did not find any GET endpoints');
              }
              return queryFields;
            }
          }),
          resolve: function resolve() {
            return 'The very first resolver';
          }
        }
      };
    }
  });

  var graphQLSchema = {
    query: rootType
  };

  var mutationFields = getQueriesFields(endpoints, true);
  if ((0, _keys2.default)(mutationFields).length) {
    graphQLSchema.mutation = new _graphql.GraphQLObjectType({
      name: 'Mutation',
      fields: mutationFields
    });
  }

  return new _graphql.GraphQLSchema(graphQLSchema);
};


var defaultResolver = function defaultResolver(endpoint) {
  return function () {
    var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(_, args, opts) {
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

var getQueriesFields = function getQueriesFields(endpoints, isMutation, resolver) {
  return (0, _keys2.default)(endpoints).filter(function (typeName) {
    return !!endpoints[typeName].mutation === !!isMutation;
  }).reduce(function (result, typeName) {
    var endpoint = endpoints[typeName];
    var type = (0, _typeMap.createGQLObject)(endpoint.response, typeName, false);
    var gType = {
      type: type,
      description: endpoint.description,
      args: (0, _typeMap.mapParametersToFields)(endpoint.parameters, typeName),
      resolve: resolver ? resolver(endpoint) : defaultResolver(endpoint)
    };
    result[typeName] = gType;
    return result;
  }, {});
};

var build = function () {
  var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(swaggerPath) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var swaggerSchema, endpoints, schema;
    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return (0, _swagger.loadSchema)(swaggerPath);

          case 2:
            swaggerSchema = _context2.sent;
            endpoints = (0, _swagger.getAllEndPoints)(swaggerSchema);
            schema = schemaFromEndpoints(endpoints, opts.resolver);
            return _context2.abrupt('return', schema);

          case 6:
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

exports.default = build;
module.exports = exports['default'];