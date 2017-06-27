'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.mapParametersToFields = exports.getTypeFields = exports.createGQLObject = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _graphql = require('graphql');

var graphql = _interopRequireWildcard(_graphql);

var _swagger = require('./swagger');

var _swagger2 = _interopRequireDefault(_swagger);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; }  var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj;  }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var __allTypes = {}; // @flow

var primitiveTypes = {
  string: graphql.GraphQLString,
  date: graphql.GraphQLString,
  integer: graphql.GraphQLInt,
  number: graphql.GraphQLInt,
  boolean: graphql.GraphQLBoolean
};

var isObjectType = function isObjectType(jsonSchema) {
  return jsonSchema.properties || jsonSchema.type === 'object' || jsonSchema.type === 'array' || jsonSchema.schema;
};

var getTypeNameFromRef = function getTypeNameFromRef(ref) {
  var cutRef = ref.replace('#/definitions/', '');
  return cutRef.replace(/\//, '_');
};

var getExistingType = function getExistingType(ref, isInputType) {
  var typeName = getTypeNameFromRef(ref);
  var allSchema = _swagger2.default.getSchema();
  if (!__allTypes[typeName]) {
    var schema = allSchema.definitions[typeName];
    if (!schema) {
      throw new Error('Definition ' + typeName + ' was not found in schema');
    }
    __allTypes[typeName] = createGQLObject(schema, typeName, ref, isInputType);
  }
  return __allTypes[typeName];
};

var getRefProp = function getRefProp(jsonSchema) {
  return jsonSchema.$ref || jsonSchema.schema && jsonSchema.schema.$ref;
};

var createGQLObject = exports.createGQLObject = function createGQLObject(jsonSchema, title, isInputType) {
  if (!jsonSchema) {
    jsonSchema = {
      type: 'object',
      properties: {}
    };
  }

  var reference = getRefProp(jsonSchema);

  if (reference) {
    return getExistingType(reference, isInputType);
  }

  if (jsonSchema.type === 'array') {
    if (isObjectType(jsonSchema.items)) {
      return new graphql.GraphQLList(createGQLObject(jsonSchema.items, title + '_items', isInputType));
    }
    return new graphql.GraphQLList(getPrimitiveTypes(jsonSchema.items));
  }

  title = title || jsonSchema.title;

  var objectType = isInputType ? 'GraphQLInputObjectType' : 'GraphQLObjectType';

  return new graphql[objectType]({
    name: title,
    description: jsonSchema.description,
    fields: getTypeFields(jsonSchema, title, isInputType)
  });
};

var getTypeFields = exports.getTypeFields = function getTypeFields(jsonSchema, title, isInputType) {
  var fields = _lodash2.default.mapValues(jsonSchema.properties || {}, function (propertySchema, propertyName) {
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

var jsonSchemaTypeToGraphQL = function jsonSchemaTypeToGraphQL(title, jsonSchema, schemaName, isInputType) {
  if (isObjectType(jsonSchema)) {
    return createGQLObject(jsonSchema, title + '_' + schemaName, isInputType);
  } else if (jsonSchema.type) {
    return getPrimitiveTypes(jsonSchema);
  }
  throw new Error("Don't know how to handle schema " + JSON.stringify(jsonSchema) + ' without type and schema');
};

var getPrimitiveTypes = function getPrimitiveTypes(jsonSchema) {
  var jsonType = jsonSchema.type;
  var format = jsonSchema.format;
  if (format === 'int64') {
    jsonType = 'string';
  }
  var type = primitiveTypes[jsonType];
  if (!type) {
    throw new Error('Cannot build primitive type "' + jsonType + '"');
  }
  return type;
};

var mapParametersToFields = exports.mapParametersToFields = function mapParametersToFields(parameters, endpointLocation, typeName) {
  return parameters.reduce(function (res, param) {
    var type = jsonSchemaTypeToGraphQL('param_' + typeName, param.jsonSchema, param.name, true);
    res[param.name] = {
      type: type
    };
    return res;
  }, {});
};