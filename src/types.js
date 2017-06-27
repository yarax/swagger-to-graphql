import type {GraphQLOutputType, GraphQLInputType} from 'flow/type/definition.js.flow';

type Param = {
  type: string,
  name: string
}

type EndpointParam = {
  type: string,
  name: string,
  jsonSchema: string
}

export type GraphQLParameters = {[string]: any};

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
  properties?: Array<string>
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