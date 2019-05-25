import {
  GraphQLOutputType,
  GraphQLInputType,
  GraphQLObjectType,
} from 'graphql';
import { CoreOptions, Request } from 'request';

export interface SwaggerToGraphQLOptions extends Request {
  GQLProxyBaseUrl: string;
  BearerToken?: string;
}

interface Param {
  type: string;
  name: string;
}

export interface EndpointParam {
  type: string;
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

export interface RequestOptions extends CoreOptions {
  url: string;
}

export interface Endpoint {
  parameters: EndpointParam[];
  description?: string;
  response: JSONSchemaType | undefined;
  request: (args: GraphQLParameters, url: string) => RequestOptions;
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
  [key: number]: {
    schema?: Record<string, any>;
    type?: 'file';
  };
}

export interface RefType {
  $ref: string;
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
}

export interface ArraySchema extends CommonSchema {
  type: 'array';
  items: RefType | JSONSchemaNoRefOrBody | RefType[] | JSONSchemaNoRefOrBody[];
  required?: boolean;
}

export interface ScalarSchema extends CommonSchema {
  type: string;
  format?: string;
  required?: boolean;
}

export type JSONSchemaNoRefOrBody = ObjectSchema | ArraySchema | ScalarSchema;

export type JSONSchemaType = RefType | BodySchema | JSONSchemaNoRefOrBody;

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
}

export interface PathObject {
  parameters?: Param[];
  [operation: string]: OperationObject | Param[];
}

export interface SwaggerSchema {
  host?: string;
  basePath?: string;
  schemes?: [string];
  servers?: ServerObject[];
  paths: {
    [pathUrl: string]: PathObject;
  };
}
