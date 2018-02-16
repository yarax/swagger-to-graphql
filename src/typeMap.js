// @flow
import type {GraphQLType, JSONSchemaType, EndpointParam, GraphQLTypeMap} from './types';
import type {GraphQLScalarType} from 'graphql/type/definition.js.flow';
import _ from 'lodash';
import * as graphql from 'graphql';
import {getSchema} from './swagger';

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

const getExistingType = (ref: string, isInputType: boolean, gqlTypes: GraphQLTypeMap) => {
  const refTypeName = getTypeNameFromRef(ref);
  let typeName = refTypeName;
  if (isInputType && !typeName.endsWith('Input')) {
    typeName = typeName + 'Input';
  }
  const allSchema = getSchema();
  if (!gqlTypes[typeName]) {
    const schema = allSchema.definitions[refTypeName];
    if (!schema) {
      throw new Error(`Definition ${refTypeName} was not found in schema`);
    }
    return createGQLObject(schema, refTypeName, isInputType, gqlTypes);
  }
  return gqlTypes[typeName];
};

const getRefProp = (jsonSchema: JSONSchemaType) => {
  return jsonSchema.$ref || (jsonSchema.schema && jsonSchema.schema.$ref);
};

export const createGQLObject = (jsonSchema: JSONSchemaType, title: string, isInputType: boolean, gqlTypes: GraphQLTypeMap): GraphQLType => {
  title = (jsonSchema && jsonSchema.title) || title || '';  // eslint-disable-line no-param-reassign

  if (isInputType && !title.endsWith('Input')) {
    title = title + 'Input'; // eslint-disable-line no-param-reassign
  }

  if (title in gqlTypes) {
    return gqlTypes[title];
  }

  if (!jsonSchema) {
    jsonSchema = { // eslint-disable-line no-param-reassign
      type: 'object',
      properties: {},
      description: '',
      title: title
    };
  } else if (!jsonSchema.title) {
    jsonSchema.title = title;
  }

  let reference = getRefProp(jsonSchema);

  if (reference) {
    return getExistingType(reference, isInputType, gqlTypes);
  }

  if (jsonSchema.type === 'array') {
    if (jsonSchema.items && jsonSchema.items.$ref) {
      return new graphql.GraphQLList(getExistingType(jsonSchema.items.$ref, isInputType, gqlTypes));
    } else if (isObjectType(jsonSchema.items)) {
      return new graphql.GraphQLList(createGQLObject(jsonSchema.items, title + '_items', isInputType, gqlTypes));
    }
    return new graphql.GraphQLList(getPrimitiveTypes(jsonSchema.items));
  }

  const description = jsonSchema.description;
  const fields = getTypeFields(jsonSchema, title, isInputType, gqlTypes);
  let result;
  if (isInputType) {
    result = new graphql.GraphQLInputObjectType({
      name: title,
      description,
      fields
    });
  } else {
    result = new graphql.GraphQLObjectType({
      name: title,
      description,
      fields
    });
  }
  gqlTypes[title] = result;
  return result;
};


export const getTypeFields = (jsonSchema: JSONSchemaType, title: string, isInputType: boolean, gqlTypes: GraphQLTypeMap) => {
  if (!Object.keys(jsonSchema.properties || {}).length) {
    return {
      empty: {
        description: 'default field',
        type: graphql.GraphQLString
      }
    };
  }
  return () =>
    _.mapValues(jsonSchema.properties || {}, (propertySchema, propertyName) => {
      return {
        description: propertySchema.description,
        type: jsonSchemaTypeToGraphQL(title, propertySchema, propertyName, isInputType, gqlTypes)
      };
    });
};

const jsonSchemaTypeToGraphQL = (title: string, jsonSchema: JSONSchemaType, schemaName: string, isInputType: boolean, gqlTypes: GraphQLTypeMap) => {
  if (jsonSchema.$ref) {
    return getExistingType(jsonSchema.$ref, isInputType, gqlTypes);
  } else if (isObjectType(jsonSchema)) {
    return createGQLObject(jsonSchema, title + '_' + schemaName, isInputType, gqlTypes);
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

export const mapParametersToFields = (parameters: Array<EndpointParam>, typeName: string, gqlTypes: GraphQLTypeMap) => {
  return parameters.reduce((res, param) => {
    const type = jsonSchemaTypeToGraphQL('param_' + typeName, param.jsonSchema, param.name, true, gqlTypes);
    res[param.name] = {
      type
    };
    return res;
  }, {});
};
