import { GraphQLScalarType } from 'graphql';
import type {GraphQLOutputType, GraphQLInputType, GraphQLObjectType, GraphQLNamedType} from 'graphql/type/definition.js.flow';

export type SwaggerToGraphQLOptions = {
  GQLProxyBaseUrl: string,
  BearerToken?: string
}

type Param = {
  type: string,
  name: string
}

type EndpointParam = {
  type: string,
  name: string,
  jsonSchema: string
}

export type RootGraphQLSchema = {
  query: GraphQLObjectType,
  mutation?: GraphQLObjectType,
  types?: [GraphQLNamedType]
}

export type GraphQLParameters = {[string]: any};

export type GraphQLTypeMap = {[string]: GraphQLType};

export type Endpoint = {
  parameters: Array<EndpointParam>,
  description?: string,
  response: Object,
  request: (args:GraphQLParameters, url: string) => Object,
  mutation: boolean
}


export type GraphQLType = GraphQLOutputType | GraphQLInputType;

export type Responses = {
        [string|number] : {
          schema?: Object
        }
      };

export type JSONSchemaType = {
  $ref?: string,
  schema?: JSONSchemaType,
  type?: string,
  properties?: Array<string>,
  title?: string,
  description?: string,
  required?: boolean | Array<string>
}

export type SwaggerSchema = {
  paths: {
    [string]: {
      description?: string,
      operationId?: string,
      parameters?: Array<Param>,
      responses: Responses
    }
  }
}

export type RefType = {
  $Ref: SwaggerSchema
}

export const FloatOrNaN = new GraphQLScalarType({
  name: 'FloatOrNaN',
  description: 'Float type that can be "NaN" in addition to null or a real value.',
  serialize(value) {
    return isNaN(value) ? 'NaN' : value;
  }
});
