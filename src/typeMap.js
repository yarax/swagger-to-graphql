// @flow

import _ from 'lodash';
import * as graphql from 'graphql';
import swagger from './swagger';

const __allTypes = {};
const primitiveTypes = {
  string: graphql.GraphQLString,
  date: graphql.GraphQLString,
  integer: graphql.GraphQLInt,
  number: graphql.GraphQLInt,
  boolean: graphql.GraphQLBoolean
};

const isObjectType = (jsonSchema) =>
  jsonSchema.properties || jsonSchema.type === 'object' || jsonSchema.type === "array" || jsonSchema.schema;

const getTypeNameFromRef = (ref) => {
  const cutRef = ref.replace('#/definitions/', '');
  return cutRef.replace(/\//, '_');
};

const getExistingType = (ref, isInputType) => {
  const typeName = getTypeNameFromRef(ref);
  const allSchema = swagger.getSchema();
  if (!__allTypes[typeName]) {
    const schema = allSchema.definitions[typeName];
    if (!schema) {
      throw new Error(`Definition ${typeName} was not found in schema`);
    }
    __allTypes[typeName] = createGQLObject(schema, typeName, ref, isInputType);
  }
  return __allTypes[typeName];
};

const getRefProp = (jsonSchema) => {
  return jsonSchema.$ref || (jsonSchema.schema && jsonSchema.schema.$ref);
};

export const createGQLObject = (jsonSchema, title, isInputType) => {
  if (!jsonSchema) {
    jsonSchema = {
      type: 'object',
      properties: {}
    }
  }

  const reference = getRefProp(jsonSchema);

  if (reference) {
    return getExistingType(reference, isInputType);
  }

  if (jsonSchema.type === 'array') {
    if (isObjectType(jsonSchema.items)) {
      return new graphql.GraphQLList(createGQLObject(jsonSchema.items, title + '_items', isInputType));
    } else {
      return new graphql.GraphQLList(getPrimitiveTypes(jsonSchema.items));
    }
  }

  title = title ||  jsonSchema.title;

  const objectType = isInputType ? 'GraphQLInputObjectType' : 'GraphQLObjectType';

  return new graphql[objectType]({
    name: title,
    description: jsonSchema.description,
    fields: getTypeFields(jsonSchema, title, isInputType)
  });
};

export const getTypeFields = (jsonSchema, title, isInputType) => {
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
    }
  }
  return fields;
};

const jsonSchemaTypeToGraphQL = (title, jsonSchema, schemaName, isInputType) => {
  if (isObjectType(jsonSchema)) {
    return createGQLObject(jsonSchema, title + '_' + schemaName, isInputType);
  } else if (jsonSchema.type) {
    return getPrimitiveTypes(jsonSchema);
  } else {
    throw new Error("Don't know how to handle schema " + JSON.stringify(jsonSchema) + " without type and schema");
  }
};

const getPrimitiveTypes = (jsonSchema) => {
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

export const mapParametersToFields = (parameters, endpointLocation, typeName) => {
  return parameters.reduce((res, param) => {
    const type = jsonSchemaTypeToGraphQL('param_' + typeName, param.jsonSchema, param.name, true);
    res[param.name] = {
      type
    };
    return res;
  }, {});
};
