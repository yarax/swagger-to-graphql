'use strict';

const _ = require('lodash');
const graphql = require('graphql');
const swagger = require('./swagger');

const __allTypes = {};
const primitiveTypes = {
  string: graphql.GraphQLString,
  date: graphql.GraphQLString,
  integer: graphql.GraphQLInt,
  number: graphql.GraphQLInt,
  boolean: graphql.GraphQLBoolean
};

function isObjectType(jsonSchema) {
  return jsonSchema.properties || jsonSchema.type === 'object' || jsonSchema.type === "array" || jsonSchema.schema;
}

function getTypeNameFromRef(ref) {
  const cutRef = ref.replace('#/definitions/', '');
  return cutRef.replace(/\//, '_');
}

function getExistingType(ref, isInputType) {
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
}

function getRefProp(jsonSchema) {
  return jsonSchema.$ref || (jsonSchema.schema && jsonSchema.schema.$ref);
}

function createGQLObject(jsonSchema, title, isInputType) {
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
      return new graphql.GraphQLList(getPrimitiveTypes(jsonSchema.items.type));
    }
  }

  title = title ||  jsonSchema.title;

  const objectType = isInputType ? 'GraphQLInputObjectType' : 'GraphQLObjectType';

  return new graphql[objectType]({
    name: title,
    description: jsonSchema.description,
    fields: getTypeFields(jsonSchema, title, isInputType)
  });
}

function getTypeFields(jsonSchema, title, isInputType) {
  const fields = _.mapValues(jsonSchema.properties || {}, (propertySchema, propertyName) => {
    return {
      description: propertySchema.description,
      type: jsonSchemaTypeToGraphQL(title, propertySchema, propertyName, isInputType)
    };
  });

  if (!Object.keys(fields).length) {
    fields.empty = {
      description: 'This object is empty actually',
      type: graphql.GraphQLString
    }
  }
  return fields;
}

function jsonSchemaTypeToGraphQL(title, jsonSchema, schemaName, isInputType) {
  if (isObjectType(jsonSchema)) {
    return createGQLObject(jsonSchema, title + '_' + schemaName, isInputType);
  } else if (jsonSchema.type) {
    return getPrimitiveTypes(jsonSchema.type);
  } else {
    throw new Error("Don't know how to handle schema " + JSON.stringify(jsonSchema) + " without type and schema");
  }
}

function getPrimitiveTypes(jsonSchemaType) {
  const type = primitiveTypes[jsonSchemaType];
  if (!type) {
    throw new Error(`Cannot build primitive type "${jsonSchemaType}"`);
  }
  return type;
}

function mapParametersToFields(parameters, endpointLocation, typeName) {
  return parameters.reduce((res, param) => {
    const type = jsonSchemaTypeToGraphQL('param_' + typeName, param.jsonSchema, param.name, true);
    res[param.name] = {
      type
    };
    return res;
  }, {});
}


module.exports = {
  createGQLObject,
  mapParametersToFields,
  getTypeFields
};