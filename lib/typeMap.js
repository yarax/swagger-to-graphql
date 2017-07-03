'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mapParametersToFields = exports.getTypeFields = exports.createGQLObject = undefined;

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _graphql = require('graphql');

var graphql = _interopRequireWildcard(_graphql);

var _swagger = require('./swagger');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var __allTypes = {};

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
  var allSchema = (0, _swagger.getSchema)();
  if (!__allTypes[typeName]) {
    var schema = allSchema.definitions[typeName];
    if (!schema) {
      throw new Error('Definition ' + typeName + ' was not found in schema');
    }
    __allTypes[typeName] = createGQLObject(schema, typeName, isInputType);
  }
  return __allTypes[typeName];
};

var getRefProp = function getRefProp(jsonSchema) {
  return jsonSchema.$ref || jsonSchema.schema && jsonSchema.schema.$ref;
};

var createGQLObject = exports.createGQLObject = function createGQLObject(jsonSchema, title, isInputType) {
  if (!jsonSchema) {
    jsonSchema = { // eslint-disable-line no-param-reassign
      type: 'object',
      properties: {},
      description: '',
      title: ''
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

  title = title || jsonSchema.title; // eslint-disable-line no-param-reassign
  var description = jsonSchema.description;
  var fields = getTypeFields(jsonSchema, title, isInputType);
  if (isInputType) {
    return new graphql.GraphQLInputObjectType({
      name: title,
      description: description,
      fields: fields
    });
  }
  return new graphql.GraphQLObjectType({
    name: title,
    description: description,
    fields: fields
  });
};

var getTypeFields = exports.getTypeFields = function getTypeFields(jsonSchema, title, isInputType) {
  var fields = _lodash2.default.mapValues(jsonSchema.properties || {}, function (propertySchema, propertyName) {
    return {
      description: propertySchema.description,
      type: jsonSchemaTypeToGraphQL(title, propertySchema, propertyName, isInputType)
    };
  });

  if (!(0, _keys2.default)(fields).length) {
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
  throw new Error("Don't know how to handle schema " + (0, _stringify2.default)(jsonSchema) + ' without type and schema');
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

var mapParametersToFields = exports.mapParametersToFields = function mapParametersToFields(parameters, typeName) {
  return parameters.reduce(function (res, param) {
    var type = jsonSchemaTypeToGraphQL('param_' + typeName, param.jsonSchema, param.name, true);
    res[param.name] = {
      type: type
    };
    return res;
  }, {});
};