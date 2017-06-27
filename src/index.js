// @flow
require('babel-polyfill');
import type {GraphQLParameters, Endpoint, GraphQLType, RootGraphQLSchema, SwaggerToGraphQLOptions} from './types';
import rp from 'request-promise';
import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import { getAllEndPoints, loadSchema } from './swagger';
import { createGQLObject, mapParametersToFields } from './typeMap';

type Endpoints ={[string]: Endpoint};

const schemaFromEndpoints = (endpoints: Endpoints) => {
  const rootType = new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
      viewer: {
        type: new GraphQLObjectType({
          name: 'viewer',
          fields: () => {
            const queryFields = getQueriesFields(endpoints, false);
            if (!Object.keys(queryFields).length) {
              throw new Error('Did not find any GET endpoints');
            }
            return queryFields;
          }
        }),
        resolve: () => 'Without this resolver graphql does not resolve further'
      }
    })
  });

  const graphQLSchema: RootGraphQLSchema = {
    query: rootType
  };

  const mutationFields = getQueriesFields(endpoints, true);
  if (Object.keys(mutationFields).length) {
    graphQLSchema.mutation = new GraphQLObjectType({
      name: 'Mutation',
      fields: mutationFields
    });
  }

  return new GraphQLSchema(graphQLSchema);
};

const resolver = (endpoint: Endpoint) =>
  async (_, args: GraphQLParameters, opts: SwaggerToGraphQLOptions) => {
    const req = endpoint.request(args, opts.GQLProxyBaseUrl);
    if (opts.BearerToken) {
      req.headers.Authorization = opts.BearerToken;
    }
    const res = await rp(req);
    return JSON.parse(res);
  };

const getQueriesFields = (endpoints: Endpoints, isMutation: boolean): {[string]: GraphQLType} => {
  return Object.keys(endpoints).filter((typeName: string) => {
    return !!endpoints[typeName].mutation === !!isMutation;
  }).reduce((result, typeName) => {
    const endpoint = endpoints[typeName];
    const type = createGQLObject(endpoint.response, typeName, false);
    const gType: GraphQLType = {
      type,
      description: endpoint.description,
      args: mapParametersToFields(endpoint.parameters, typeName),
      resolve: resolver(endpoint)
    };
    result[typeName] = gType;
    return result;
  }, {});
};

const build = async (swaggerPath: string) => {
  const swaggerSchema = await loadSchema(swaggerPath);
  const endpoints = getAllEndPoints(swaggerSchema);
  const schema = schemaFromEndpoints(endpoints);
  return schema;
};

export default build;
