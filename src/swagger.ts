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
  isOa3Param,
  JSONSchemaType,
  Oa3Param,
  OA3BodyParam,
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

export const getSuccessResponse = (
  responses: Responses,
): JSONSchemaType | undefined => {
  const successCode = Object.keys(responses).find(code => {
    return code[0] === '2';
  });

  if (!successCode) {
    return undefined;
  }

  const successResponse = responses[successCode];
  if (!successResponse) {
    throw new Error(`Expected responses[${successCode}] to be defined`);
  }
  if (successResponse.schema) {
    return successResponse.schema;
  }

  if (successResponse.content) {
    return successResponse.content['application/json'].schema;
  }
  throw new Error(
    `Expected response to have either schema or content, got: ${Object.keys(
      successResponse,
    ).join(', ')}`,
  );
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
  if (isOa3Param(param)) {
    const { schema, required } = param as Oa3Param;
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

export const getParamDetailsFromRequestBody = (
  requestBody: OA3BodyParam,
): EndpointParam => {
  function getSchemaFromRequestBody(): JSONSchemaType {
    if (requestBody.content['application/json']) {
      return requestBody.content['application/json'].schema;
    }
    if (requestBody.content['application/x-www-form-urlencoded']) {
      return requestBody.content['application/x-www-form-urlencoded'].schema;
    }
    throw new Error(
      `Unsupported content type(s) found: ${Object.keys(
        requestBody.content,
      ).join(', ')}`,
    );
  }
  return {
    name: 'body',
    swaggerName: 'requestBody',
    required: !!requestBody.required,
    jsonSchema: getSchemaFromRequestBody(),
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
      const operationObject: OperationObject = route[method] as OperationObject;
      const isMutation =
        ['post', 'put', 'patch', 'delete'].indexOf(method) !== -1;
      const operationId =
        operationObject.operationId || getGQLTypeNameFromURL(method, path);

      // [FIX] for when parameters is a child of route and not route[method]
      if (route.parameters) {
        if (operationObject.parameters) {
          operationObject.parameters = route.parameters.concat(
            operationObject.parameters,
          );
        } else {
          operationObject.parameters = route.parameters;
        }
      }

      const bodyParams = operationObject.requestBody
        ? [getParamDetailsFromRequestBody(operationObject.requestBody)]
        : [];

      const parameterDetails = [
        ...(operationObject.parameters
          ? operationObject.parameters.map(param => getParamDetails(param))
          : []),
        ...bodyParams,
      ];

      const endpoint: Endpoint = {
        parameters: parameterDetails,
        description: operationObject.description,
        response: getSuccessResponse(operationObject.responses),
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
          return getRequestOptions(operationObject, {
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
