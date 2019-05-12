"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));

var _requestPromise = _interopRequireDefault(require("request-promise"));

var _graphql = require("graphql");

var _swagger = require("./swagger");

var _typeMap = require("./typeMap");

const resolver = (endpoint, proxyUrl, customHeaders = {}) => async (_, args, opts) => {
  const proxy = !proxyUrl ? opts.GQLProxyBaseUrl : typeof proxyUrl === 'function' ? proxyUrl(opts) : proxyUrl;
  const req = endpoint.request(args, proxy);

  if (opts.headers) {
    const _opts$headers = opts.headers,
          {
      host
    } = _opts$headers,
          otherHeaders = (0, _objectWithoutProperties2.default)(_opts$headers, ["host"]);
    req.headers = Object.assign(req.headers, otherHeaders, customHeaders);
  } else {
    req.headers = Object.assign(req.headers, customHeaders);
  }

  const res = await (0, _requestPromise.default)(req);
  return JSON.parse(res);
};

const getFields = (endpoints, isMutation, gqlTypes, proxyUrl, headers) => {
  return Object.keys(endpoints).filter(typeName => {
    return !!endpoints[typeName].mutation === !!isMutation;
  }).reduce((result, typeName) => {
    const endpoint = endpoints[typeName];
    const type = (0, _graphql.GraphQLNonNull)((0, _typeMap.createGQLObject)(endpoint.response, typeName, false, gqlTypes));
    const gType = {
      type,
      description: endpoint.description,
      args: (0, _typeMap.mapParametersToFields)(endpoint.parameters, typeName, gqlTypes),
      resolve: resolver(endpoint, proxyUrl, headers)
    };
    return (0, _objectSpread2.default)({}, result, {
      [typeName]: gType
    });
  }, {});
};

const schemaFromEndpoints = (endpoints, proxyUrl, headers) => {
  const gqlTypes = {};
  const queryFields = getFields(endpoints, false, gqlTypes, proxyUrl, headers);

  if (!Object.keys(queryFields).length) {
    throw new Error('Did not find any GET endpoints');
  }

  const rootType = new _graphql.GraphQLObjectType({
    name: 'Query',
    fields: queryFields
  });
  const graphQLSchema = {
    query: rootType
  };
  const mutationFields = getFields(endpoints, true, gqlTypes, proxyUrl, headers);

  if (Object.keys(mutationFields).length) {
    graphQLSchema.mutation = new _graphql.GraphQLObjectType({
      name: 'Mutation',
      fields: mutationFields
    });
  }

  return new _graphql.GraphQLSchema(graphQLSchema);
};

const build = async (swaggerPath, proxyUrl = null, headers) => {
  const swaggerSchema = await (0, _swagger.loadSchema)(swaggerPath);
  const refs = await (0, _swagger.loadRefs)(swaggerPath);
  const endpoints = (0, _swagger.getAllEndPoints)(swaggerSchema, refs);
  const schema = schemaFromEndpoints(endpoints, proxyUrl, headers);
  return schema;
};

var _default = build;
exports.default = _default;
module.exports = exports.default;