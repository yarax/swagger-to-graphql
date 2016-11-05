'use strict';

const rp = require('request-promise');
const {GraphQLSchema, GraphQLObjectType} = require('graphql');
const {getAllEndPoints, loadSchema} = require('./swagger');
const {createGQLObject, mapParametersToFields} = require('./type_map');
const build = (swaggerPath) => {
  return loadSchema(swaggerPath).then(swaggerSchema => {
    const endpoints = getAllEndPoints(swaggerSchema);
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
          })
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
  });
};

function resolver(endpoint) {
  return (_, args, opts) => {
    const req = endpoint.request(args, {
      baseUrl: opts.GQLProxyBaseUrl
    });
    return rp(req).then(res => {
      return JSON.parse(res);
    }).catch(e => {
      throw e;
    });
  };
}

function getQueriesFields(endpoints, isMutation) {
  return Object.keys(endpoints).filter((typeName) => {
    return !!endpoints[typeName].mutation === !!isMutation;
  }).reduce((result, typeName) => {
    const endpoint = endpoints[typeName];
    const type = createGQLObject(endpoint.response, typeName, endpoint.location);
    result[typeName] = {
      type,
      description: typeName,
      args: mapParametersToFields(endpoint.parameters, endpoint.location, typeName),
      resolve: resolver(endpoint)
    };
    return result;
  }, {});
}

module.exports = build;