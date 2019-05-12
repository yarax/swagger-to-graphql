"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAllEndPoints = exports.loadRefs = exports.loadSchema = exports.getSchema = void 0;

var _jsonSchemaRefParser = _interopRequireDefault(require("json-schema-ref-parser"));

var _nodeRequestBySwagger = _interopRequireDefault(require("node-request-by-swagger"));

let globalSchema;

const getSchema = () => {
  if (!globalSchema || !Object.keys(globalSchema).length) {
    throw new Error('Schema was not loaded');
  }

  return globalSchema;
};

exports.getSchema = getSchema;

const getGQLTypeNameFromURL = (method, url) => {
  const fromUrl = url.replace(/[{}]+/g, '').replace(/[^a-zA-Z0-9_]+/g, '_');
  return `${method}${fromUrl}`;
};

const getSuccessResponse = responses => {
  let resp;
  if (!responses) return null;
  Object.keys(responses).some(code => {
    resp = responses[code];
    return code[0] === '2';
  });
  return resp && resp.schema;
};

const loadSchema = async pathToSchema => {
  globalSchema = await _jsonSchemaRefParser.default.bundle(pathToSchema);
  return globalSchema;
};

exports.loadSchema = loadSchema;

const loadRefs = async pathToSchema => {
  return _jsonSchemaRefParser.default.resolve(pathToSchema);
};

exports.loadRefs = loadRefs;

const replaceOddChars = str => str.replace(/[^_a-zA-Z0-9]/g, '_');

const getServerPath = schema => {
  const server = schema.servers && Array.isArray(schema.servers) ? schema.servers[0] : schema.servers;

  if (!server) {
    return undefined;
  }

  if (typeof server === 'string') {
    return server;
  }

  let {
    url
  } = server;

  if (server.variables) {
    Object.keys(server.variables).forEach(variable => {
      let value = server.variables[variable];

      if (typeof value === 'object') {
        value = value.default || value.enum[0];
      }

      url = url.replace(`{${variable}}`, value);
    });
  }

  return url;
};

const getParamDetails = (param, schema, refResolver) => {
  let resolvedParam = param;

  if (param.$ref) {
    resolvedParam = refResolver.get(param.$ref);
  }

  const name = replaceOddChars(resolvedParam.name);
  const {
    type
  } = resolvedParam;
  const jsonSchema = resolvedParam;
  return {
    name,
    type,
    jsonSchema
  };
};

const renameGraphqlParametersToSwaggerParameters = (graphqlParameters, parameterDetails) => {
  const result = {};
  Object.keys(graphqlParameters).forEach(inputGraphqlName => {
    const {
      jsonSchema: {
        name: swaggerName
      }
    } = parameterDetails.find(({
      name: graphqlName
    }) => graphqlName === inputGraphqlName);
    result[swaggerName] = graphqlParameters[inputGraphqlName];
  });
  return result;
};
/**
 * Go through schema and grab routes
 */


const getAllEndPoints = (schema, refs) => {
  const allTypes = {};
  const serverPath = getServerPath(schema);
  Object.keys(schema.paths).forEach(path => {
    const route = schema.paths[path];
    Object.keys(route).forEach(method => {
      if (method === 'parameters') {
        return;
      }

      const obj = route[method];
      const isMutation = ['post', 'put', 'patch', 'delete'].indexOf(method) !== -1;
      const typeName = obj.operationId || getGQLTypeNameFromURL(method, path);
      let parameterDetails; // [FIX] for when parameters is a child of route and not route[method]

      if (route.parameters) {
        if (obj.parameters) {
          obj.parameters = route.parameters.concat(obj.parameters);
        } else {
          obj.parameters = route.parameters;
        }
      } //


      if (obj.parameters) {
        parameterDetails = obj.parameters.map(param => getParamDetails(param, schema, refs));
      } else {
        parameterDetails = [];
      }

      const endpoint = {
        parameters: parameterDetails,
        description: obj.description,
        response: getSuccessResponse(obj.responses),
        request: (graphqlParameters, optBaseUrl) => {
          const baseUrl = optBaseUrl || serverPath; // eslint-disable-line no-param-reassign

          if (!baseUrl) {
            throw new Error('Could not get the base url for endpoints. Check that either your schema has baseUrl or you provided it to constructor');
          }

          const url = `${baseUrl}${path}`;
          const request = renameGraphqlParametersToSwaggerParameters(graphqlParameters, parameterDetails);
          return (0, _nodeRequestBySwagger.default)(obj, {
            request,
            url,
            method
          }, '');
        },
        mutation: isMutation
      };
      allTypes[typeName] = endpoint;
    });
  });
  return allTypes;
};

exports.getAllEndPoints = getAllEndPoints;