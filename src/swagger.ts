import refParser from 'json-schema-ref-parser';
import {
  Endpoint,
  EndpointParam,
  Endpoints,
  GraphQLParameters,
  isOa3Param,
  JSONSchemaType,
  OA3BodyParam,
  Oa3Param,
  OperationObject,
  Param,
  Responses,
  SwaggerSchema,
} from './types';
import { getRequestOptions } from './getRequestOptions';
import { isObjectType } from './json-schema';

const replaceOddChars = (str: string): string =>
  str.replace(/[^_a-zA-Z0-9]/g, '_');

const getGQLTypeNameFromURL = (method: string, url: string): string => {
  const fromUrl = replaceOddChars(url.replace(/[{}]+/g, ''));
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

  return undefined;
};

export const loadSchema = async (
  pathToSchema: string,
): Promise<SwaggerSchema> => {
  const result = await refParser.dereference(pathToSchema);
  return result as SwaggerSchema;
};

export function addTitlesToJsonSchemas(schema: SwaggerSchema): SwaggerSchema {
  const requestBodies = (schema.components || {}).requestBodies || {};
  Object.keys(requestBodies).forEach(requestBodyName => {
    const { content } = requestBodies[requestBodyName];
    (Object.keys(content) as (keyof OA3BodyParam['content'])[]).forEach(
      contentKey => {
        const contentValue = content[contentKey];
        if (contentValue) {
          contentValue.schema.title =
            contentValue.schema.title || requestBodyName;
        }
      },
    );
  });

  const jsonSchemas = (schema.components || {}).schemas || {};
  Object.keys(jsonSchemas).forEach(schemaName => {
    const jsonSchema = jsonSchemas[schemaName];
    jsonSchema.title = jsonSchema.title || schemaName;
  });

  const definitions = schema.definitions || {};
  Object.keys(definitions).forEach(definitionName => {
    const jsonSchema = definitions[definitionName];
    jsonSchema.title = jsonSchema.title || definitionName;
  });

  return schema;
}

export const getServerPath = (schema: SwaggerSchema): string | undefined => {
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
    const { schema, required, in: type } = param as Oa3Param;
    return {
      name,
      swaggerName,
      type,
      required: !!required,
      jsonSchema: schema,
    };
  }

  return {
    name,
    swaggerName,
    type: param.in,
    required: !!param.required,
    jsonSchema: param,
  };
};

const contentTypeFormData = 'application/x-www-form-urlencoded';
export const getParamDetailsFromRequestBody = (
  requestBody: OA3BodyParam,
): EndpointParam[] => {
  const formData = requestBody.content[contentTypeFormData];
  function getSchemaFromRequestBody(): JSONSchemaType {
    if (requestBody.content['application/json']) {
      return requestBody.content['application/json'].schema;
    }
    throw new Error(
      `Unsupported content type(s) found: ${Object.keys(
        requestBody.content,
      ).join(', ')}`,
    );
  }
  if (formData) {
    const formdataSchema = formData.schema;
    if (!isObjectType(formdataSchema)) {
      throw new Error(
        `RequestBody is formData, expected an object schema, got "${JSON.stringify(
          formdataSchema,
        )}"`,
      );
    }
    return Object.entries(formdataSchema.properties).map<EndpointParam>(
      ([name, schema]) => ({
        name: replaceOddChars(name),
        swaggerName: name,
        type: 'formData',
        required: formdataSchema.required
          ? formdataSchema.required.includes(name)
          : false,
        jsonSchema: schema,
      }),
    );
  }
  return [
    {
      name: 'body',
      swaggerName: 'requestBody',
      type: 'body',
      required: !!requestBody.required,
      jsonSchema: getSchemaFromRequestBody(),
    },
  ];
};

function isFormdataRequest(requestBody: OA3BodyParam): boolean {
  return !!requestBody.content[contentTypeFormData];
}

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
      const operationId = operationObject.operationId
        ? replaceOddChars(operationObject.operationId)
        : getGQLTypeNameFromURL(method, path);

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
        ? getParamDetailsFromRequestBody(operationObject.requestBody)
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
        getRequestOptions: (parameterValues: GraphQLParameters) => {
          return getRequestOptions({
            parameterDetails,
            parameterValues,
            baseUrl: serverPath,
            path,
            method,
            formData: operationObject.consumes
              ? !operationObject.consumes.includes('application/json')
              : operationObject.requestBody
              ? isFormdataRequest(operationObject.requestBody)
              : false,
          });
        },
        mutation: isMutation,
      };
      allOperations[operationId] = endpoint;
    });
  });
  return allOperations;
};
