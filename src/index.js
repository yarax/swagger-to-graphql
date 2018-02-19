// @flow
import type {GraphQLParameters, Endpoint, GraphQLType, RootGraphQLSchema, SwaggerToGraphQLOptions, GraphQLTypeMap} from './types';
import rp from 'request-promise';
import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import { getAllEndPoints, loadSchema } from './swagger';
import { createGQLObject, mapParametersToFields } from './typeMap';

type Endpoints = {[string]: Endpoint};

const schemaFromEndpoints = (endpoints: Endpoints, proxyUrl: ?(Function | string) = null) => {
  const gqlTypes = {};

  const rootType = new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
      viewer: {
        type: new GraphQLObjectType({
          name: 'viewer',
          fields: () => {
            const queryFields = getQueriesFields(endpoints, false, gqlTypes, proxyUrl);
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

  const mutationFields = getQueriesFields(endpoints, true, gqlTypes, proxyUrl);
  if (Object.keys(mutationFields).length) {
    graphQLSchema.mutation = new GraphQLObjectType({
      name: 'Mutation',
      fields: mutationFields
    });
  }

  return new GraphQLSchema(graphQLSchema);
};

const resolver = (endpoint: Endpoint, proxyUrl: ?(Function | string)) =>
  async (_, args: GraphQLParameters, opts: SwaggerToGraphQLOptions) => {
    const proxy = !proxyUrl ? opts.GQLProxyBaseUrl : (typeof proxyUrl === 'function' ? proxyUrl(opts) : proxyUrl);
    const req = endpoint.request(args, proxy);
    if (opts.headers) {
      req.headers = Object.assign({}, req.headers, opts.headers);
    }
    const res = await rp(req);
    return JSON.parse(res);
  };

const getQueriesFields = (endpoints: Endpoints, isMutation: boolean, gqlTypes: GraphQLTypeMap, proxyUrl: ?(Function | string)): GraphQLTypeMap => {
  return Object.keys(endpoints).filter((typeName: string) => {
    return !!endpoints[typeName].mutation === !!isMutation;
  }).reduce((result, typeName) => {
    const endpoint = endpoints[typeName];
    const type = createGQLObject(endpoint.response, typeName, false, gqlTypes);
    const gType: GraphQLType = {
      type,
      description: endpoint.description,
      args: mapParametersToFields(endpoint.parameters, typeName, gqlTypes),
      resolve: resolver(endpoint, proxyUrl)
    };
    result[typeName] = gType;
    return result;
  }, {});
};

const build = async (swaggerPath: string, proxyUrl: ?(Function | string) = null) => {
  const swaggerSchema = await loadSchema(swaggerPath);
  const endpoints = getAllEndPoints(swaggerSchema);
  const schema = schemaFromEndpoints(endpoints, proxyUrl);
  return schema;
};

export default build;
