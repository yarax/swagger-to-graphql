// @flow
import type {GraphQLType, JSONSchemaType, EndpointParam} from './types';
import type {GraphQLScalarType} from 'graphql/type/definition.js.flow';
import _ from 'lodash';
import * as graphql from 'graphql';
import {getSchema} from './swagger';

const __allTypes = {};
const primitiveTypes = {
  string: graphql.GraphQLString,
  date: graphql.GraphQLString,
  integer: graphql.GraphQLInt,
  number: graphql.GraphQLInt,
  boolean: graphql.GraphQLBoolean
};

const isObjectType = (jsonSchema) =>
  jsonSchema.properties || jsonSchema.type === 'object' || jsonSchema.type === 'array' || jsonSchema.schema;

const getTypeNameFromRef = (ref: string) => {
  const cutRef = ref.replace('#/definitions/', '');
  return cutRef.replace(/\//, '_');
};

const getExistingType = (ref: string, isInputType: boolean) => {
	var typeName = getTypeNameFromRef(ref);
	const schemaTypeName = typeName;
	const allSchema = (0, getSchema)();

	isInputType && (typeName += 'Input');
  allSchema.__namespace__ && (typeName = allSchema.__namespace__ + '_' + typeName);
  
  if (!__allTypes[typeName]) {
    const schema = allSchema.definitions[schemaTypeName];
    if (!schema) {
      throw new Error(`Definition ${schemaTypeName} was not found in schema`);
    }
    __allTypes[typeName] = createGQLObjectEx(schema, typeName, isInputType);
  }
  return __allTypes[typeName];
};

const getRefProp = (jsonSchema: JSONSchemaType) => {
  var typeSchema = jsonSchema.schema || jsonSchema;
	const allSchema = (0, getSchema)();
	for (var definitionName in allSchema.definitions) {
		if (allSchema.definitions[definitionName] === typeSchema) {
			return definitionName;
		}
	}
  return jsonSchema.$ref || (jsonSchema.schema && jsonSchema.schema.$ref);
};

export const createGQLObject = (jsonSchema: JSONSchemaType, title: string, isInputType: boolean): GraphQLType => {
  if (!jsonSchema) {
    jsonSchema = { // eslint-disable-line no-param-reassign
      type: 'object',
      properties: {},
      description: '',
      title: ''
    };
  }

  const reference = getRefProp(jsonSchema);

  if (reference) {
    return getExistingType(reference, isInputType);
  }

  return createGQLObjectEx(jsonSchema, title, isInputType);
};

const createGQLObjectEx = (jsonSchema: JSONSchemaType, title: string, isInputType: boolean): GraphQLType => {
  if (jsonSchema.type === 'array') {
    if (isObjectType(jsonSchema.items)) {
      return new graphql.GraphQLList(createGQLObject(jsonSchema.items, title + '_items', isInputType));
    }
    return new graphql.GraphQLList(getPrimitiveTypes(jsonSchema.items));
  }

  title = title ||  jsonSchema.title;  // eslint-disable-line no-param-reassign
  const description = jsonSchema.description;
  const fields = getTypeFields(jsonSchema, title, isInputType);
  if (isInputType) {
    return new graphql.GraphQLInputObjectType({
      name: title,
      description,
      fields
    });
  }
  return new graphql.GraphQLObjectType({
    name: title,
    description,
    fields
  });
};


export const getTypeFields = (jsonSchema: JSONSchemaType, title: string, isInputType: boolean) => {
  const fields = _.mapValues(jsonSchema.properties || {}, (propertySchema, propertyName) => {
    return {
      description: propertySchema.description,
      type: jsonSchemaTypeToGraphQL(title, propertySchema, propertyName, isInputType)
    };
  });

  if (!Object.keys(fields).length) {
    fields.empty = {
      description: 'default field',
      type: graphql.GraphQLString
    };
  }
  return fields;
};

const jsonSchemaTypeToGraphQL = (title: string, jsonSchema: JSONSchemaType, schemaName: string, isInputType: boolean) => {
  if (isObjectType(jsonSchema)) {
    return createGQLObject(jsonSchema, title + '_' + schemaName, isInputType);
  } else if (jsonSchema.type) {
    return getPrimitiveTypes(jsonSchema);
  }
  throw new Error("Don't know how to handle schema " + JSON.stringify(jsonSchema) + ' without type and schema');
};

const getPrimitiveTypes = (jsonSchema: JSONSchemaType): GraphQLScalarType => {
  let jsonType = jsonSchema.type;
  const format = jsonSchema.format;
  if (format === 'int64') {
    jsonType = 'string';
  }
  const type = primitiveTypes[jsonType];
  if (!type) {
    throw new Error(`Cannot build primitive type "${jsonType}"`);
  }
  return type;
};

export const mapParametersToFields = (parameters: Array<EndpointParam>, typeName: string) => {
  return parameters.reduce((res, param) => {
    const type = jsonSchemaTypeToGraphQL('param_' + typeName, param.jsonSchema, param.name, true);
    res[param.name] = {
      type
    };
    return res;
  }, {});
};
