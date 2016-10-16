'use strict';

const rp = require('request-promise');
const {GraphQLSchema, GraphQLObjectType} = require('graphql');
const {getAllEndPoints, loadSchema} = require('./swagger');
const {createGQLObject, mapParametersToFields} = require('./type_map');
const build = (swaggerPath) => {
  return loadSchema(swaggerPath).then(schema => {
    const endpoints = getAllEndPoints(schema);
    var rootType = new GraphQLObjectType({
      name: 'Query',
      fields: () => ({
        viewer: {
          type: new GraphQLObjectType({
            name: 'viewer',
            fields: () => {
              return getQueriesFields(endpoints, false);
            }
          }),
          resolve: () => ({})
        }
      })
    });

    const mutationType = new GraphQLObjectType({
      name: 'Mutation',
      fields: () => {
        return getQueriesFields(endpoints, true);
      }
    });

    return new GraphQLSchema({
      query: rootType,
      mutation: mutationType
    });
  });
};

function resolver(endpoint) {
  return (_, args, opts) => {
    const req = endpoint.request(args, {
      baseUrl: opts.GQLProxyBaseUrl
    });
    console.log('Performing request..', req);
    return rp(req).then(res => {
      return JSON.parse(res);
    }).catch(e => {
        console.log('GQL proxy exception', e.message, e.stack);
        throw e;
      });
  }
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