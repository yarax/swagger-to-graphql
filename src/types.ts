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

export interface BodyParam {
  name: string;
  required?: boolean;
  schema: JSONSchemaType;
  in: 'body';
}

export interface Oa2NonBodyParam {
  name: string;
  type: JSONSchemaTypes;
  in: 'header' | 'query' | 'formData' | 'path';
  required?: boolean;
}

export interface Oa3NonBodyParam {
  name: string;
  in: 'header' | 'query' | 'formData' | 'path';
  required?: boolean;
  schema: JSONSchemaType;
}

export type NonBodyParam = Oa2NonBodyParam | Oa3NonBodyParam;

export type Param = BodyParam | NonBodyParam;

export const isOa3NonBodyParam = (param: Param): param is Oa3NonBodyParam => {
  return param.name !== 'body' && !!(param as Oa3NonBodyParam).schema;
};
export interface EndpointParam {
  type?: string;
  required: boolean;
  name: string;
  swaggerName: string;
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
    schema?: JSONSchemaType;
    content?: {
      'application/json': { schema: JSONSchemaType };
    };
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
  properties: {
    [propertyName: string]: JSONSchemaType;
  };
  required?: string[];
  xml?: {
    name?: string;
  };
}

export interface ArraySchema extends CommonSchema {
  type: 'array';
  items: JSONSchemaNoBody | JSONSchemaNoBody[];
  required?: boolean;
}

type JSONSchemaTypes = 'string' | 'date' | 'integer' | 'number' | 'boolean' | 'file';

export interface ScalarSchema extends CommonSchema {
  type: JSONSchemaTypes;
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
  requestBody?: any;
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
