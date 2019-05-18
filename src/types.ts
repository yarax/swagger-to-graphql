// @flow

import type {
  GraphQLOutputType,
  GraphQLInputType,
  GraphQLObjectType,
} from 'graphql/type/definition.js.flow';

export type SwaggerToGraphQLOptions = {
  GQLProxyBaseUrl: string,
  BearerToken?: string,
};

type Param = {
  type: string,
  name: string,
};

type EndpointParam = {
  type: string,
  name: string,
  jsonSchema: string,
};

export type RootGraphQLSchema = {
  query: GraphQLObjectType,
  mutation?: GraphQLObjectType,
};

export type GraphQLParameters = { [string]: any };

export type Endpoint = {
  parameters: Array<EndpointParam>,
  description?: string,
  response: Object,
  request: (args: GraphQLParameters, url: string) => Object,
  mutation: boolean,
};

export type GraphQLType = GraphQLOutputType | GraphQLInputType;

export type GraphQLTypeMap = { [string]: GraphQLType };

export type Responses = {
  [string | number]: {
    schema?: Object,
  },
};

export type JSONSchemaType = {
  $ref?: string,
  schema?: JSONSchemaType,
  type?: string,
  properties?: Array<string>,
  title?: string,
  description?: string,
  required?: boolean | Array<string>,
};

export type ServerObject = {
  url: string,
  description: string,
  variables: {
    [string]: string,
  },
};

export type SwaggerSchema = {
  host?: string,
  basePath?: string,
  schemes?: [string],
  servers: ServerObject[],
  paths: {
    [string]: {
      description?: string,
      operationId?: string,
      parameters?: Array<Param>,
      responses: Responses,
    },
  },
};

export type RefType = {
  $Ref: SwaggerSchema,
};
