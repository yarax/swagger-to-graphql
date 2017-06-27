// @flow
import type {SwaggerSchema, Endpoint, Responses} from './types';
import refParser from 'json-schema-ref-parser';
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

export const loadSchema = (pathToSchema: string) => {
  const schema = refParser.dereference(pathToSchema);
  __schema = schema;
  return schema;
};

const replaceOddChars = (str) => str.replace(/[^_a-zA-Z0-9]/g, '_');

/**
 * Going throw schema and grab routes
 */
export const getAllEndPoints = (schema: SwaggerSchema): {[string]: Endpoint} => {
  const allTypes = {};
  Object.keys(schema.paths).forEach(path => {
    const route = schema.paths[path];
    Object.keys(route).forEach(method => {
      const obj = route[method];
      const isMutation = ['post', 'put', 'patch', 'delete'].indexOf(method) !== -1;
      const typeName = obj.operationId || getGQLTypeNameFromURL(method, path);
      const parameters = obj.parameters ? obj.parameters.map(param => {
        const type = param.type;
        return {name: replaceOddChars(param.name), type, jsonSchema: param};
      }) : [];
      const endpoint: Endpoint = {
        parameters,
        description: obj.description,
        response: getSuccessResponse(obj.responses),
        request: (args: GraphQLParameters, baseUrl: string) => {
          const url = `${baseUrl}${path}`;
          return getRequestOptions(obj, {
            request: args,
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
