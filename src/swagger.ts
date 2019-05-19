import refParser from 'json-schema-ref-parser';
import getRequestOptions from 'node-request-by-swagger';
import {
  Endpoint,
  Endpoints,
  GraphQLParameters,
  OperationObject,
  Responses,
  SwaggerSchema,
} from './types';

import $RefParser = require('json-schema-ref-parser');

let globalSchema;

export const getSchema = () => {
  if (!globalSchema || !Object.keys(globalSchema).length) {
    throw new Error('Schema was not loaded');
  }
  return globalSchema;
};

const getGQLTypeNameFromURL = (method: string, url: string) => {
  const fromUrl = url.replace(/[{}]+/g, '').replace(/[^a-zA-Z0-9_]+/g, '_');
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
  globalSchema = await refParser.bundle(pathToSchema);
  return globalSchema;
};

export const loadRefs = async (pathToSchema: string) => {
  return refParser.resolve(pathToSchema);
};

const replaceOddChars = str => str.replace(/[^_a-zA-Z0-9]/g, '_');

export const getServerPath = (schema: SwaggerSchema) => {
  const server =
    schema.servers && Array.isArray(schema.servers)
      ? schema.servers[0]
      : schema.host
      ? [
          (schema.schemes && schema.schemes[0]) || 'http',
          '://',
          schema.host,
          schema.basePath,
        ]
          .filter(Boolean)
          .join('')
      : undefined;
  if (!server) {
    return undefined;
  }
  if (typeof server === 'string') {
    return server;
  }
  const { url, variables } = server;
  return variables
    ? Object.keys(server.variables).reduce((acc, variableName) => {
        const variable = server.variables[variableName];
        const value =
          typeof variable === 'string'
            ? variable
            : variable.default || variable.enum[0];
        return acc.replace(`{${variableName}}`, value);
      }, url)
    : url;
};

const getParamDetails = (param, schema, refResolver) => {
  let resolvedParam = param;
  if (param.$ref) {
    resolvedParam = refResolver.get(param.$ref);
  }
  const name = replaceOddChars(resolvedParam.name);
  const { type } = resolvedParam;
  return { name, type, jsonSchema: resolvedParam };
};

const renameGraphqlParametersToSwaggerParameters = (
  graphqlParameters,
  parameterDetails,
) => {
  const result = {};
  Object.keys(graphqlParameters).forEach(inputGraphqlName => {
    const {
      jsonSchema: { name: swaggerName },
    } = parameterDetails.find(
      ({ name: graphqlName }) => graphqlName === inputGraphqlName,
    );
    result[swaggerName] = graphqlParameters[inputGraphqlName];
  });
  return result;
};

/**
 * Go through schema and grab routes
 */
export const getAllEndPoints = (
  schema: SwaggerSchema,
  refs: $RefParser.$Refs,
): Endpoints => {
  const allOperations = {};
  const serverPath = getServerPath(schema);
  Object.keys(schema.paths).forEach(path => {
    const route = schema.paths[path];
    Object.keys(route).forEach(method => {
      if (method === 'parameters') {
        return;
      }
      const obj: OperationObject = route[method] as OperationObject;
      const isMutation =
        ['post', 'put', 'patch', 'delete'].indexOf(method) !== -1;
      const operationId =
        obj.operationId || getGQLTypeNameFromURL(method, path);
      let parameterDetails;

      // [FIX] for when parameters is a child of route and not route[method]
      if (route.parameters) {
        if (obj.parameters) {
          obj.parameters = route.parameters.concat(obj.parameters);
        } else {
          obj.parameters = route.parameters;
        }
      }
      //

      if (obj.parameters) {
        parameterDetails = obj.parameters.map(param =>
          getParamDetails(param, schema, refs),
        );
      } else {
        parameterDetails = [];
      }

      const endpoint: Endpoint = {
        parameters: parameterDetails,
        description: obj.description,
        response: getSuccessResponse(obj.responses),
        request: (graphqlParameters: GraphQLParameters, optBaseUrl: string) => {
          const baseUrl = optBaseUrl || serverPath; // eslint-disable-line no-param-reassign
          if (!baseUrl) {
            throw new Error(
              'Could not get the base url for endpoints. Check that either your schema has baseUrl or you provided it to constructor',
            );
          }
          const url = `${baseUrl}${path}`;
          const request = renameGraphqlParametersToSwaggerParameters(
            graphqlParameters,
            parameterDetails,
          );
          return getRequestOptions(
            obj,
            {
              request,
              url,
              method,
            },
            '',
          );
        },
        mutation: isMutation,
      };
      allOperations[operationId] = endpoint;
    });
  });
  return allOperations;
};
