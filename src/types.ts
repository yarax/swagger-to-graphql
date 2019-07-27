import {
  GraphQLOutputType,
  GraphQLInputType,
  GraphQLObjectType,
} from 'graphql';
import { OptionsWithUrl, Request } from 'request';

export interface SwaggerToGraphQLOptions extends Request {
  GQLProxyBaseUrl: string;
  BearerToken?: string;
}

export interface Param {
  type?: string;
  name: string;
  required?: boolean;
  in: 'header' | 'query' | 'body' | 'formData' | 'path';
}

export interface EndpointParam {
  type?: string;
  name: string;
  jsonSchema: JSONSchemaType;
}

export interface RootGraphQLSchema {
  query: GraphQLObjectType;
  mutation?: GraphQLObjectType;
}

export interface GraphQLParameters {
  [key: string]: any;
}

export interface Endpoint {
  parameters: EndpointParam[];
  description?: string;
  response: JSONSchemaType | undefined;
  request: (args: GraphQLParameters, url: string) => OptionsWithUrl;
  mutation: boolean;
}

export interface Endpoints {
  [operationId: string]: Endpoint;
}

export type GraphQLType = GraphQLOutputType | GraphQLInputType;

export interface GraphQLTypeMap {
  [typeName: string]: GraphQLType;
}

export interface Responses {
  [key: string]: {
    schema?: Record<string, any>;
    type?: 'file';
  };
}

interface CommonSchema {
  description?: string;
  title?: string;
}

export interface BodySchema extends CommonSchema {
  in: 'body';
  schema: JSONSchemaType;
  required?: boolean;
}

export interface ObjectSchema extends CommonSchema {
  type: 'object';
  properties?: {
    [propertyName: string]: JSONSchemaType;
  };
  required: string[];
  xml?: {
    name?: string;
  };
}

export interface ArraySchema extends CommonSchema {
  type: 'array';
  items: JSONSchemaNoBody | JSONSchemaNoBody[];
  required?: boolean;
}

export interface ScalarSchema extends CommonSchema {
  type: string;
  format?: string;
  required?: boolean;
}

export type JSONSchemaNoBody = ObjectSchema | ArraySchema | ScalarSchema;

export type JSONSchemaType = BodySchema | JSONSchemaNoBody;

export interface Variable {
  default?: string;
  enum: string[];
}

export interface ServerObject {
  url: string;
  description?: string;
  variables: {
    [key: string]: string | Variable;
  };
}

export interface OperationObject {
  description?: string;
  operationId?: string;
  parameters?: Param[];
  responses: Responses;
  consumes?: string[];
}

export type PathObject = {
  parameters?: Param[];
} & {
  [operation: string]: OperationObject;
};

export interface SwaggerSchema {
  host?: string;
  basePath?: string;
  schemes?: [string];
  servers?: ServerObject[];
  paths: {
    [pathUrl: string]: PathObject;
  };
}
