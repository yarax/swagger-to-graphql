import rp from 'request-promise';
import {
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql';
import {
  Endpoint,
  Endpoints,
  GraphQLParameters,
  RootGraphQLSchema,
  SwaggerToGraphQLOptions,
} from './types';
import { getAllEndPoints, loadRefs, loadSchema } from './swagger';
import { jsonSchemaTypeToGraphQL, mapParametersToFields } from './typeMap';

const resolver = (
  endpoint: Endpoint,
  proxyUrl: Function | string | null,
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
  endpoints: Endpoints,
  isMutation: boolean,
  gqlTypes,
  proxyUrl,
  headers,
): GraphQLFieldConfigMap<any, any> => {
  return Object.keys(endpoints)
    .filter((operationId: string) => {
      return !!endpoints[operationId].mutation === !!isMutation;
    })
    .reduce((result, operationId) => {
      const endpoint: Endpoint = endpoints[operationId];
      const type = GraphQLNonNull(
        jsonSchemaTypeToGraphQL(
          operationId,
          endpoint.response || { type: 'string' },
          'response',
          false,
          gqlTypes,
        ),
      );
      const gType: GraphQLFieldConfig<any, any> = {
        type,
        description: endpoint.description,
        args: mapParametersToFields(endpoint.parameters, operationId, gqlTypes),
        resolve: resolver(endpoint, proxyUrl, headers),
      };
      return { ...result, [operationId]: gType };
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
  proxyUrl?: Function | string | null,
  headers?: { [key: string]: string } | undefined,
) => {
  const swaggerSchema = await loadSchema(swaggerPath);
  const refs = await loadRefs(swaggerPath);
  const endpoints = getAllEndPoints(swaggerSchema, refs);
  const schema = schemaFromEndpoints(endpoints, proxyUrl, headers);
  return schema;
};

module.exports = build;
export default build;
