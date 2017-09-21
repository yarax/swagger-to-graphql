// @flow
import type {SwaggerSchema, Endpoint, Responses } from './types';
import rp from 'request-promise';
import refParser from 'json-schema-ref-parser';
import type {GraphQLParameters } from './types';
import getRequestOptions from 'node-request-by-swagger';
let __schema;

export const getSchema = () => {
	if (!__schema || !Object.keys(__schema).length) {
		throw new Error('Schema was not loaded');
	}
	return __schema;
};

const getGQLTypeNameFromURL = (method: string, url: string) => {
	const fromUrl = url.replace(/[\{\}]+/g, '').replace(/[^a-zA-Z0-9_]+/g, '_');
	return `${method}${fromUrl}`;
};

const getSuccessResponse = (responses: Responses) => {
	let resp;

	if (!responses) return null;

	Object.keys(responses).some(code => {
		resp = responses[code];
		return code[0] === '2';
	});

	return resp && resp.schema;
};

export const loadSchema = async (pathToSchema: string) => {
	if (typeof pathToSchema === 'string' && pathToSchema.toLowerCase().startsWith('http')) {
		pathToSchema = await fetchSchema(pathToSchema);
	}
	const schema = refParser.dereference(pathToSchema);
	__schema = schema;
	return schema;
};

const fetchSchema = (schemaurl: string) => {
	var options = {
		uri: schemaurl,
		transform: function (body) {
			return JSON.parse(body);
		}
	};
	return rp(options);
};

const replaceOddChars = (str) => str.replace(/[^_a-zA-Z0-9]/g, '_');

/**
 * Going throw schema and grab routes
 */
export const getAllEndPoints = (schema: SwaggerSchema): { [string]: Endpoint } => {
	const allTypes = {};
	__schema = schema;
	var schemaBaseUrl;

	if (schema.schemes && schema.schemes.length && schema.host && schema.basePath) {
		var url = require('url');
		const protocol = schema.schemes.indexOf('https') !== -1 ? 'https' : schema.schemes[0];
		schemaBaseUrl = url.format({ protocol: protocol, host: schema.host, pathname: schema.basePath }).toString();
	}

	Object.keys(schema.paths).forEach(path => {
		const route = schema.paths[path];
		Object.keys(route).forEach(method => {
			const obj = route[method];
			const isMutation = ['post', 'put', 'patch', 'delete'].indexOf(method) !== -1;
			const typeName = obj.operationId || getGQLTypeNameFromURL(method, path);
			const parameters = obj.parameters ? obj.parameters.map(param => {
				const type = param.type;
				return { name: replaceOddChars(param.name), type, jsonSchema: param };
			}) : [];
			const endpoint: Endpoint = {
				parameters,
				description: obj.description,
				response: getSuccessResponse(obj.responses),
				request: (args: GraphQLParameters, baseUrl: string) => {
					const url = `${baseUrl || schemaBaseUrl}${path}`;
					return getRequestOptions(obj, {
						request: args,
						url,
						method: method
					}, '');
				},
				mutation: isMutation
			};
			allTypes[typeName] = endpoint;
		});
	});
	return allTypes;
};
