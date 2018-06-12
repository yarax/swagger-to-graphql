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

var primitiveTypes = {
  string: graphql.GraphQLString,
  date: graphql.GraphQLString,
  integer: graphql.GraphQLInt,
  number: graphql.GraphQLFloat,
  boolean: graphql.GraphQLBoolean
};


var isObjectType = function isObjectType(jsonSchema) {
  return jsonSchema.properties || jsonSchema.type === 'object' || jsonSchema.type === 'array' || jsonSchema.schema;
};

var getTypeNameFromRef = function getTypeNameFromRef(ref) {
  var cutRef = ref.replace('#/definitions/', '');
  return cutRef.replace(/\//, '_');
};

var getExistingType = function getExistingType(ref, isInputType, gqlTypes) {
  var refTypeName = getTypeNameFromRef(ref);
  var typeName = refTypeName;
  if (isInputType && !typeName.endsWith('Input')) {
    typeName = typeName + 'Input';
  }
  var allSchema = (0, _swagger.getSchema)();
  if (!gqlTypes[typeName]) {
    var schema = allSchema.definitions[refTypeName];
    if (!schema) {
      throw new Error('Definition ' + refTypeName + ' was not found in schema');
    }
    return createGQLObject(schema, refTypeName, isInputType, gqlTypes);
  }
  return gqlTypes[typeName];
};

var getRefProp = function getRefProp(jsonSchema) {
  return jsonSchema.$ref || jsonSchema.schema && jsonSchema.schema.$ref;
};

var createGQLObject = exports.createGQLObject = function createGQLObject(jsonSchema, title, isInputType, gqlTypes) {
  title = jsonSchema && jsonSchema.title || title || ''; // eslint-disable-line no-param-reassign

  if (isInputType && !title.endsWith('Input')) {
    title = title + 'Input'; // eslint-disable-line no-param-reassign
    jsonSchema = _lodash2.default.clone(jsonSchema); // eslint-disable-line no-param-reassign
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

  var reference = getRefProp(jsonSchema);

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

  var description = jsonSchema.description;
  var fields = getTypeFields(jsonSchema, title, isInputType, gqlTypes);
  var result = void 0;
  if (isInputType) {
    result = new graphql.GraphQLInputObjectType({
      name: title,
      description: description,
      fields: fields
    });
  } else {
    result = new graphql.GraphQLObjectType({
      name: title,
      description: description,
      fields: fields
    });
  }
  gqlTypes[title] = result;
  return result;
};

var getTypeFields = exports.getTypeFields = function getTypeFields(jsonSchema, title, isInputType, gqlTypes) {
  if (!(0, _keys2.default)(jsonSchema.properties || {}).length) {
    return {
      empty: {
        description: 'default field',
        type: graphql.GraphQLString
      }
    };
  }
  return function () {
    return _lodash2.default.mapValues(jsonSchema.properties || {}, function (propertySchema, propertyName) {
      var baseType = jsonSchemaTypeToGraphQL(title, propertySchema, propertyName, isInputType, gqlTypes);
      var type = jsonSchema.required && jsonSchema.required.includes(propertyName) ? graphql.GraphQLNonNull(baseType) : baseType;
      return {
        description: propertySchema.description,
        type: type
      };
    });
  };
};

var jsonSchemaTypeToGraphQL = function jsonSchemaTypeToGraphQL(title, jsonSchema, schemaName, isInputType, gqlTypes) {
  var baseType = function () {
    if (jsonSchema.$ref) {
      return getExistingType(jsonSchema.$ref, isInputType, gqlTypes);
    } else if (isObjectType(jsonSchema)) {
      return createGQLObject(jsonSchema, title + '_' + schemaName, isInputType, gqlTypes);
    } else if (jsonSchema.type) {
      return getPrimitiveTypes(jsonSchema);
    }
    throw new Error("Don't know how to handle schema " + (0, _stringify2.default)(jsonSchema) + ' without type and schema');
  }();
  return jsonSchema.required ? graphql.GraphQLNonNull(baseType) : baseType;
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

var mapParametersToFields = exports.mapParametersToFields = function mapParametersToFields(parameters, typeName, gqlTypes) {
  return parameters.reduce(function (res, param) {
    var type = jsonSchemaTypeToGraphQL('param_' + typeName, param.jsonSchema, param.name, true, gqlTypes);
    res[param.name] = {
      type: type
    };
    return res;
  }, {});
};