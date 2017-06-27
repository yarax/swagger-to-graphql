'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _requestPromise = require('request-promise');

var _requestPromise2 = _interopRequireDefault(_requestPromise);

var _graphql = require('graphql');

var _swagger = require('./swagger');

var _typeMap = require('./typeMap');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step('next', value); }, function (err) { step('throw', err); }); } } return step('next'); }); }; }

// @flow
require('babel-polyfill');


var schemaFromEndpoints = function schemaFromEndpoints(endpoints) {
  var rootType = new _graphql.GraphQLObjectType({
    name: 'Query',
    fields: function fields() {
      return {
        viewer: {
          type: new _graphql.GraphQLObjectType({
            name: 'viewer',
            fields: function fields() {
              var queryFields = getQueriesFields(endpoints, false);
              if (!Object.keys(queryFields).length) {
                throw new Error('Did not find any GET endpoints');
              }
              return queryFields;
            }
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

  var mutationFields = getQueriesFields(endpoints, true);
  if (Object.keys(mutationFields).length) {
    graphQLSchema.mutation = new _graphql.GraphQLObjectType({
      name: 'Mutation',
      fields: mutationFields
    });
  }

  return new _graphql.GraphQLSchema(graphQLSchema);
};

var resolver = function resolver(endpoint) {
  return (function () {
    var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(_, args, opts) {
      var req, res;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
          case 0:
            req = endpoint.request(args, {
              baseUrl: opts.GQLProxyBaseUrl
            });

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
  }());
};

var getQueriesFields = function getQueriesFields(endpoints, isMutation) {
  return Object.keys(endpoints).filter(function (typeName) {
    return !!endpoints[typeName].mutation === !!isMutation;
  }).reduce(function (result, typeName) {
    var endpoint = endpoints[typeName];
    var type = (0, _typeMap.createGQLObject)(endpoint.response, typeName, endpoint.location);
    result[typeName] = {
      type: type,
      description: endpoint.description,
      args: (0, _typeMap.mapParametersToFields)(endpoint.parameters, endpoint.location, typeName),
      resolve: resolver(endpoint)
    };
    return result;
  }, {});
};

var build = (function () {
  var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(swaggerPath) {
    var swaggerSchema, endpoints, schema;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
        case 0:
          _context2.next = 2;
          return (0, _swagger.loadSchema)(swaggerPath);

        case 2:
          swaggerSchema = _context2.sent;
          endpoints = (0, _swagger.getAllEndPoints)(swaggerSchema);
          schema = schemaFromEndpoints(endpoints);
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
}());

exports.default = build;
module.exports = exports.default;