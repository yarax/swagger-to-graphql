// @flow
import rp from 'request-promise';
import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import { getAllEndPoints, loadSchema } from './swagger';
import { createGQLObject, mapParametersToFields } from './typeMap';

export const schemaFromEndpoints = (endpoints) => {
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

  const graphQLSchema = {
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

const resolver = (endpoint) =>
  async (_, args, opts) => {
    const req = endpoint.request(args, {
      baseUrl: opts.GQLProxyBaseUrl
    });
    const res = await rp(req);
    return JSON.parse(res);
  };

const getQueriesFields = (endpoints, isMutation) => {
  return Object.keys(endpoints).filter((typeName) => {
    return !!endpoints[typeName].mutation === !!isMutation;
  }).reduce((result, typeName) => {
    const endpoint = endpoints[typeName];
    const type = createGQLObject(endpoint.response, typeName, endpoint.location);
    result[typeName] = {
      type,
      description: endpoint.description,
      args: mapParametersToFields(endpoint.parameters, endpoint.location, typeName),
      resolve: resolver(endpoint)
    };
    return result;
  }, {});
};

const build = async (swaggerPath) => {
  const swaggerSchema = await loadSchema(swaggerPath);
  const endpoints = getAllEndPoints(swaggerSchema);
  return schemaFromEndpoints(endpoints);
};

export default build;
