const _ = require('lodash');
const graphql = require('graphql');
const swagger = require('./swagger');

function createGQLObject(jsonSchema, title, pathToDefinition, isMutation) {
  if (!jsonSchema) {
    jsonSchema = {
      type: 'object',
      properties: {}
    }
  }

  if (jsonSchema.type === 'array') {
    const primitiveInArray = getPrimitiveTypes(jsonSchema.items.type);
    if (primitiveInArray) {
      return new graphql.GraphQLList(primitiveInArray);
    } else {
      return new graphql.GraphQLList(createGQLObject(jsonSchema.items, title + '_items', pathToDefinition));
    }
  }

  title = title ||  jsonSchema.title;

  const objectType = isMutation ? 'GraphQLInputObjectType' : 'GraphQLObjectType';

  return new graphql[objectType]({
    name: title,
    description: jsonSchema.description,
    fields: getTypeFields(jsonSchema, title, pathToDefinition, isMutation)
  });
}

function getTypeFields(jsonSchema, title, pathToDefinition, isMutation) {
  if (isMutation) {
    console.log(jsonSchema);
  }
  const fields = _.mapValues(jsonSchema.properties || {}, (propertySchema, propertyName) => {
    return {
      description: propertySchema.description,
      type: jsonSchemaTypeToGraphQL(title, propertySchema, propertyName, pathToDefinition)
    };
  });

  if (!Object.keys(fields).length) {
    fields.empty = {
      description: 'This object is empty actually',
      type: graphql.GraphQLString
    }
  }
  //console.log(jsonSchema.title, require('util').inspect(fields, {depth: null}));
  return fields;
}

/**
 *
 * @param title
 * @param jsonSchema
 * @param schemaName propertyName (meta)
 * @param pathToDefinition
 * @returns {*}
 */
function jsonSchemaTypeToGraphQL(title, jsonSchema, schemaName, pathToDefinition, isMutation) {
  if (jsonSchema.properties || jsonSchema.type === 'object' || jsonSchema.type === "array") {
    return createGQLObject(jsonSchema, title + '_' + schemaName, pathToDefinition, isMutation);
  } else if (jsonSchema.type) {
    return getPrimitiveTypes(jsonSchema.type);
  } else {
    throw new Error("Don't know how to handle schema " + JSON.stringify(jsonSchema) + " without type and schema");
  }
}

function getPrimitiveTypes(jsonSchemaType) {
  return {
    string: graphql.GraphQLString,
    date: graphql.GraphQLString,
    integer: graphql.GraphQLInt,
    number: graphql.GraphQLInt,
    boolean: graphql.GraphQLBoolean
  }[jsonSchemaType];
}

function mapParametersToFields(parameters, endpointLocation, typeName, isMutation) {
  return parameters.reduce((res, param) => {
    const type = jsonSchemaTypeToGraphQL('param_' + typeName, param.jsonSchema, param.name, endpointLocation, isMutation);
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
}