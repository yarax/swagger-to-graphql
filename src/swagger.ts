import refParser from 'json-schema-ref-parser';
import {
  Endpoint,
  Endpoints,
  GraphQLParameters,
  OperationObject,
  Responses,
  SwaggerSchema,
  EndpointParam,
  Param,
  isOa3NonBodyParam,
  JSONSchemaType,
  Oa3NonBodyParam,
} from './types';
import { getRequestOptions } from './request-by-swagger';

let globalSchema: SwaggerSchema | undefined;

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

const getSuccessResponse = (
  responses: Responses,
): JSONSchemaType | undefined => {
  const successCode = Object.keys(responses).find(code => {
    return code[0] === '2';
  });

  return successCode ? responses[successCode].schema : undefined;
};

export const loadSchema = async (
  pathToSchema: string,
): Promise<SwaggerSchema> => {
  const result = await refParser.dereference(pathToSchema);
  globalSchema = result;
  return result;
};

const replaceOddChars = (str: string) => str.replace(/[^_a-zA-Z0-9]/g, '_');

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

export const getParamDetails = (param: Param): EndpointParam => {
  const name = replaceOddChars(param.name);
  const swaggerName = param.name;
  if (isOa3NonBodyParam(param)) {
    const { schema, required } = param as Oa3NonBodyParam;
    return {
      name,
      swaggerName,
      required: !!required,
      jsonSchema: schema,
    };
  }

  return {
    name,
    swaggerName,
    required: !!param.required,
    jsonSchema: param,
  };
};

const renameGraphqlParametersToSwaggerParameters = (
  graphqlParameters: GraphQLParameters,
  parameterDetails: EndpointParam[],
): GraphQLParameters => {
  const result: GraphQLParameters = {};
  Object.keys(graphqlParameters).forEach(inputGraphqlName => {
    const foundParameterDetail = parameterDetails.find(
      ({ name: graphqlName }) => graphqlName === inputGraphqlName,
    );
    if (!foundParameterDetail) {
      throw new Error(
        `Expected parameter detail with name: ${inputGraphqlName}`,
      );
    }
    const { swaggerName } = foundParameterDetail;
    result[swaggerName] = graphqlParameters[inputGraphqlName];
  });
  return result;
};

/**
 * Go through schema and grab routes
 */
export const getAllEndPoints = (schema: SwaggerSchema): Endpoints => {
  const allOperations: Endpoints = {};
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

      // [FIX] for when parameters is a child of route and not route[method]
      if (route.parameters) {
        if (obj.parameters) {
          obj.parameters = route.parameters.concat(obj.parameters);
        } else {
          obj.parameters = route.parameters;
        }
      }
      //

      const parameterDetails = obj.parameters
        ? obj.parameters.map(param => getParamDetails(param))
        : [];

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
          return getRequestOptions(obj, {
            request,
            url,
            method,
          });
        },
        mutation: isMutation,
      };
      allOperations[operationId] = endpoint;
    });
  });
  return allOperations;
};
