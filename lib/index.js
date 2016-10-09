'use strict';

const rp = require('request-promise');
const {GraphQLInputObjectType, GraphQLSchema, GraphQLObjectType} = require('graphql');
const {getAllEndPoints} = require('./swagger');
const {createGQLObject, mapParametersToFields} = require('./type_map');
const build = (swaggerPath) => {
  return getAllEndPoints(swaggerPath).then(endpoints => {
    var rootType = new GraphQLObjectType({
      name: 'Query',
      fields: () => ({
        root: {
          type: new GraphQLObjectType({
            name: 'Root',
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
      //mutation: mutationType
    });
  });
}

function resolver(endpoint, isMutation) {
  return (_, args, opts) => {
    const req = endpoint.request(args, opts.app.listener.address());
    req.headers = req.headers || {};
    req.headers.authorization = opts.headers.authorization;
    delete req.headers['content-length'];
    return rp(req)
      .catch(e => {
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
      args: mapParametersToFields(endpoint.parameters, endpoint.location, typeName, isMutation),
      resolve: resolver(endpoint)
    };
    return result;
  }, {});
}

module.exports = build;