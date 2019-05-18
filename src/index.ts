// @flow
import rp from 'request-promise';
import { GraphQLSchema, GraphQLObjectType, GraphQLNonNull } from 'graphql';
import type {
  GraphQLParameters,
  Endpoint,
  GraphQLType,
  RootGraphQLSchema,
  SwaggerToGraphQLOptions,
  GraphQLTypeMap,
} from './types';
import { getAllEndPoints, loadSchema, loadRefs } from './swagger';
import { createGQLObject, mapParametersToFields } from './typeMap';

type Endpoints = { [string]: Endpoint };

const resolver = (
  endpoint: Endpoint,
  proxyUrl: ?(Function | string),
  customHeaders = {},
) => async (_, args: GraphQLParameters, opts: SwaggerToGraphQLOptions) => {
  const proxy = !proxyUrl
    ? opts.GQLProxyBaseUrl
    : typeof proxyUrl === 'function'
    ? proxyUrl(opts)
    : proxyUrl;
  const req = endpoint.request(args, proxy);
  if (opts.headers) {
    const { host, ...otherHeaders } = opts.headers;
    req.headers = Object.assign(req.headers, otherHeaders, customHeaders);
  } else {
    req.headers = Object.assign(req.headers, customHeaders);
  }
  const res = await rp(req);
  return JSON.parse(res);
};

const getFields = (
  endpoints,
  isMutation,
  gqlTypes,
  proxyUrl,
  headers,
): GraphQLTypeMap => {
  return Object.keys(endpoints)
    .filter((typeName: string) => {
      return !!endpoints[typeName].mutation === !!isMutation;
    })
    .reduce((result, typeName) => {
      const endpoint = endpoints[typeName];
      const type = GraphQLNonNull(
        createGQLObject(endpoint.response, typeName, false, gqlTypes),
      );
      const gType: GraphQLType = {
        type,
        description: endpoint.description,
        args: mapParametersToFields(endpoint.parameters, typeName, gqlTypes),
        resolve: resolver(endpoint, proxyUrl, headers),
      };
      return { ...result, [typeName]: gType };
    }, {});
};

const schemaFromEndpoints = (endpoints: Endpoints, proxyUrl, headers) => {
  const gqlTypes = {};
  const queryFields = getFields(endpoints, false, gqlTypes, proxyUrl, headers);
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

  const mutationFields = getFields(
    endpoints,
    true,
    gqlTypes,
    proxyUrl,
    headers,
  );
  if (Object.keys(mutationFields).length) {
    graphQLSchema.mutation = new GraphQLObjectType({
      name: 'Mutation',
      fields: mutationFields,
    });
  }

  return new GraphQLSchema(graphQLSchema);
};

const build = async (
  swaggerPath: string,
  proxyUrl: ?(Function | string) = null,
  headers: ?{ [string]: string },
) => {
  const swaggerSchema = await loadSchema(swaggerPath);
  const refs = await loadRefs(swaggerPath);
  const endpoints = getAllEndPoints(swaggerSchema, refs);
  const schema = schemaFromEndpoints(endpoints, proxyUrl, headers);
  return schema;
};

export default build;
