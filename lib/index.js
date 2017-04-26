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
  });
};

function resolver(endpoint) {
  return (_, args, opts) => {
    const req = endpoint.request(args, {
      baseUrl: opts.GQLProxyBaseUrl
    });

    req.headers.Accept = 'application/json';

    // if Bearer token provided, include that
    if(opts.BearerToken){
      req.headers.Authorization = opts.BearerToken;
    }

    // if pfx certificate and passphrase files provided, add those in
    if(opts.PfxCertFile && opts.PfxPassphraseFile) {
      req.agentOptions = {
        pfx: fs.readFileSync(opts.PfxCertFile),
        passphrase: fs.readFileSync(opts.PfxPassphraseFile, { encoding: 'utf8' }),
        securityOptions: 'SSL_OP_NO_SSLv3'
      };
    }

    // add in crt/key files if provided
    if(opts.CrtFile && opts.KeyFile) {
      req.agentOptions = {
        cert: fs.readFileSync(opts.CrtFile),
        key: fs.readFileSync(opts.KeyFile),
        securityOptions: 'SSL_OP_NO_SSLv3'
      }
    }

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
      description: endpoint.description,
      args: mapParametersToFields(endpoint.parameters, endpoint.location, typeName),
      resolve: resolver(endpoint)
    };
    return result;
  }, {});
}

module.exports = build;
