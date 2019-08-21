import {
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql';
import {
  Endpoint,
  Endpoints,
  GraphQLParameters,
  GraphQLTypeMap,
  Options,
  RootGraphQLSchema,
} from './types';
import { addTitlesToJsonSchemas, getAllEndPoints, loadSchema } from './swagger';
import { jsonSchemaTypeToGraphQL, mapParametersToFields } from './typeMap';

const getFields = <TContext>(
  endpoints: Endpoints,
  isMutation: boolean,
  gqlTypes: GraphQLTypeMap,
  { callBackend }: Options<TContext>,
): GraphQLFieldConfigMap<any, any> => {
  return Object.keys(endpoints)
    .filter((operationId: string) => {
      return !!endpoints[operationId].mutation === !!isMutation;
    })
    .reduce((result, operationId) => {
      const endpoint: Endpoint = endpoints[operationId];
      const type = jsonSchemaTypeToGraphQL(
        operationId,
        endpoint.response || { type: 'string' },
        'response',
        false,
        gqlTypes,
        true,
      );
      const gType: GraphQLFieldConfig<any, any> = {
        type,
        description: endpoint.description,
        args: mapParametersToFields(endpoint.parameters, operationId, gqlTypes),
        resolve: async (
          _source: any,
          args: GraphQLParameters,
          context: TContext,
        ): Promise<any> => {
          return callBackend({
            context,
            requestOptions: endpoint.getRequestOptions(args),
          });
        },
      };
      return { ...result, [operationId]: gType };
    }, {});
};

const schemaFromEndpoints = <TContext>(
  endpoints: Endpoints,
  options: Options<TContext>,
): GraphQLSchema => {
  const gqlTypes = {};
  const queryFields = getFields(endpoints, false, gqlTypes, options);
  if (!Object.keys(queryFields).length) {
    throw new Error('Did not find any GET endpoints');
  }
  const rootType = new GraphQLObjectType({
    name: 'Query',
    fields: queryFields,
  });

  const graphQLSchema: RootGraphQLSchema = {
    query: rootType,
  };

  const mutationFields = getFields(endpoints, true, gqlTypes, options);
  if (Object.keys(mutationFields).length) {
    graphQLSchema.mutation = new GraphQLObjectType({
      name: 'Mutation',
      fields: mutationFields,
    });
  }

  return new GraphQLSchema(graphQLSchema);
};

const build = async <TContext>(
  swaggerPath: string,
  options: Options<TContext>,
): Promise<GraphQLSchema> => {
  const swaggerSchema = addTitlesToJsonSchemas(await loadSchema(swaggerPath));
  const endpoints = getAllEndPoints(swaggerSchema);
  return schemaFromEndpoints(endpoints, options);
};

export default build;
