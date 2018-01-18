// @flow
import type {GraphQLParameters, Endpoint, GraphQLType, RootGraphQLSchema, SwaggerToGraphQLOptions} from './types';
import rp from 'request-promise';
import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import { getAllEndPoints, loadSchema, setSchema } from './swagger';
import { createGQLObject, mapParametersToFields } from './typeMap';

type Endpoints ={[string]: Endpoint};

const mergeNamespaces = (endpoints: Object) => {
	const schema = { query: {}, mutation: {} };
	Object.keys(endpoints).forEach(namespace => {
		const endpoint = endpoints[namespace];
		setSchema(endpoint.__schema__);
		const endpointSchema = schemaFromEndpointsEx(endpoint);
		schema.query[namespace] = {
			type: new GraphQLObjectType({
				name: namespace,
				fields: endpointSchema.query
			}),
			resolve: () => 'Without this resolver graphql does not resolve further'
		};
		schema.mutation[namespace] = {
			type: new GraphQLObjectType({
				name: namespace + '_mutation',
				fields: endpointSchema.mutation
			}),
			resolve: () => 'Without this resolver graphql does not resolve further'
		}
	});


	const rootType = new GraphQLObjectType({
		name: 'Query',
		fields: schema.query
	});

	const graphQLSchema: RootGraphQLSchema = {
		query: rootType
	};

	if (Object.keys(schema.mutation).length) {
		graphQLSchema.mutation = new GraphQLObjectType({
			name: 'Mutation',
			fields: schema.mutation
		});
	}

	return new GraphQLSchema(graphQLSchema);
};

const schemaFromEndpoints = (endpoints: Endpoints) => {
	const schema = schemaFromEndpointsEx(endpoints);
  const rootType = new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
      viewer: {
        type: new GraphQLObjectType({
          name: 'viewer',
          fields: schema.query
        }),
        resolve: () => 'Without this resolver graphql does not resolve further'
      }
    })
  });

  const graphQLSchema: RootGraphQLSchema = {
    query: rootType
  };

  if (Object.keys(schema.mutation).length) {
		graphQLSchema.mutation = new GraphQLObjectType({
			name: 'Mutation',
			fields: schema.mutation
		});
	}

  return new GraphQLSchema(graphQLSchema);
};

const schemaFromEndpointsEx = (endpoints: Endpoints) => {
  return {
    query: () => {
      const queryFields = getQueriesFields(endpoints, false);
      if (!Object.keys(queryFields).length) {
        throw new Error('Did not find any GET endpoints');
      }
      return queryFields;
    },
    mutation: getQueriesFields(endpoints, true)
  };
};  

const resolver = (endpoint: Endpoint) =>
  async (_, args: GraphQLParameters, opts: SwaggerToGraphQLOptions) => {
    const req = endpoint.request(args, opts.GQLProxyBaseUrl);
    if (opts.headers) {
      req.headers = Object.assign({}, req.headers, opts.headers);
    }
    const res = await rp(req);
    return JSON.parse(res);
  };

const getQueriesFields = (endpoints: Endpoints, isMutation: boolean): {[string]: GraphQLType} => {
  return Object.keys(endpoints).filter((typeName: string) => {
    return !!endpoints[typeName].mutation === !!isMutation && typeName !== '__schema__' && typeName !== '__namespace__';
  }).reduce((result, typeName) => {
    const endpoint = endpoints[typeName];
		const namespace = endpoints.__namespace__;
		const typeFullName = (namespace ? namespace + '_' : '') + typeName;
    const type = createGQLObject(endpoint.response, typeFullName, false);
    const gType: GraphQLType = {
      type,
      description: endpoint.description,
      args: mapParametersToFields(endpoint.parameters, typeFullName),
      resolve: resolver(endpoint)
    };
    result[typeName] = gType;
    return result;
  }, {});
};

const isSimpleObject = (value) => {
	return value instanceof Object && value.constructor === Object;
};

const build = async (swaggerPath: string) => {
	if (isSimpleObject(swaggerPath) && !swaggerPath.swagger) {
		return join(swaggerPath);
	}
  const swaggerSchema = await loadSchema(swaggerPath);
  const endpoints = getAllEndPoints(swaggerSchema);
  const schema = schemaFromEndpoints(endpoints);
  return schema;
};


const join = async (swaggerPaths: Object) => {
	const namespaces = {};
	for (let namespace in swaggerPaths) {
		var swaggerPath = swaggerPaths[namespace];
		const swaggerSchema = await loadSchema(swaggerPath);

		swaggerSchema.__namespace__ = namespace;
		namespaces[namespace] = getAllEndPoints(swaggerSchema);
		namespaces[namespace].__namespace__ = namespace;
		namespaces[namespace].__schema__ = swaggerSchema;
	}
	const schema = mergeNamespaces(namespaces);
	return schema;
};

export default build;
