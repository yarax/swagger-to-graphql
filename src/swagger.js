// @flow
import type {SwaggerSchema, Endpoint, Responses} from './types';
import refParser from 'json-schema-ref-parser';
import deref from 'json-schema-deref-sync';
import type {GraphQLParameters} from './types';
import getRequestOptions from 'node-request-by-swagger';
let __schema;

export const getSchema = () => {
  if (!__schema || !Object.keys(__schema).length) {
    throw new Error('Schema was not loaded');
  }
  return __schema;
};

const getGQLTypeNameFromURL = (method: string, url: string) => {
  const fromUrl = url.replace(/[\{\}]+/g, '').replace(/[^a-zA-Z0-9_]+/g, '_');
  return `${method}${fromUrl}`;
};

const getSuccessResponse = (responses: Responses) => {
  let resp;

  if (!responses) return null;

  Object.keys(responses).some(code => {
    resp = responses[code];
    return code[0] === '2';
  });

  return resp && resp.schema;
};

export const loadSchema = async (pathToSchema: string) => {
  __schema = await refParser.bundle(pathToSchema);
  return __schema;
};

export const loadRefs = async (pathToSchema: string) => {
  return deref(pathToSchema);
};

const replaceOddChars = (str) => str.replace(/[^_a-zA-Z0-9]/g, '_');

const getServerPath = (schema) => {
  let server = schema.servers && Array.isArray(schema.servers) ? schema.servers[0] : schema.servers;
  if (!server) {
    return undefined;
  } else if (typeof server === 'string') {
    return server;
  }
  let url = server.url;
  if (server.variables) {
    Object.keys(server.variables).forEach((variable) => {
      let value = server.variables[variable];
      if (typeof (value) === 'object') {
        value = value.default || value.enum[0];
      }
      url = url.replace('{' + variable + '}', value);
    });
  }
  return url;
};

const getParamDetails = (param) => {
  const name = replaceOddChars(param.name);
  const type = param.type;
  const jsonSchema = param.schema || param;
  return {name, type, jsonSchema};
};

const renameGraphqlParametersToSwaggerParameters = (graphqlParameters, parameterDetails) => {
  const result = {};
  Object.keys(graphqlParameters).forEach(inputGraphqlName => {
    const { jsonSchema: { name: swaggerName } } = parameterDetails.find(
      ({ name: graphqlName }) => graphqlName === inputGraphqlName
    );
    result[swaggerName] = graphqlParameters[inputGraphqlName];
  });
  return result;
};

/**
 * Go through schema and grab routes
 */
export const getAllEndPoints = (schema: SwaggerSchema): {[string]: Endpoint} => {
  const allTypes = {};
  const serverPath = getServerPath(schema);
  Object.keys(schema.paths).forEach(path => {
    const route = schema.paths[path];
    Object.keys(route).forEach(method => {
      const obj = route[method];
      const isMutation = ['post', 'put', 'patch', 'delete'].indexOf(method) !== -1;
      const typeName = obj.operationId || getGQLTypeNameFromURL(method, path);
      const parameterDetails = obj.parameters ? obj.parameters.map(param => getParamDetails(param, schema)) : [];
      const endpoint: Endpoint = {
        parameters: parameterDetails,
        description: obj.description,
        response: getSuccessResponse(obj.responses),
        request: (graphqlParameters: GraphQLParameters, optBaseUrl: string) => {
          const baseUrl = optBaseUrl || serverPath;  // eslint-disable-line no-param-reassign
          if (!baseUrl) {
            throw new Error('Could not get the base url for endpoints. Check that either your schema has baseUrl or you provided it to constructor');
          }
          const url = `${baseUrl}${path}`;
          const request = renameGraphqlParametersToSwaggerParameters(graphqlParameters, parameterDetails);
          return getRequestOptions(obj, {
            request,
            url,
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
