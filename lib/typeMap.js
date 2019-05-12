"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mapParametersToFields = exports.createGQLObject = exports.getTypeFields = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

var graphql = _interopRequireWildcard(require("graphql"));

var _swagger = require("./swagger");

// TODO: fix no-param-reassign

/* eslint-disable no-param-reassign */
const primitiveTypes = {
  string: graphql.GraphQLString,
  date: graphql.GraphQLString,
  integer: graphql.GraphQLInt,
  number: graphql.GraphQLFloat,
  boolean: graphql.GraphQLBoolean
};

const isObjectType = jsonSchema => jsonSchema.properties || jsonSchema.type === 'object' || jsonSchema.type === 'array' || jsonSchema.schema;

const getTypeNameFromRef = ref => {
  const cutRef = ref.replace('#/definitions/', '');
  return cutRef.replace(/\//, '_');
};

const getExistingType = (ref, isInputType, gqlTypes) => {
  const refTypeName = getTypeNameFromRef(ref);
  let typeName = refTypeName;

  if (isInputType && !typeName.endsWith('Input')) {
    typeName += 'Input';
  }

  const allSchema = (0, _swagger.getSchema)();

  if (!gqlTypes[typeName]) {
    const schema = allSchema.definitions[refTypeName];

    if (!schema) {
      throw new Error(`Definition ${refTypeName} was not found in schema`);
    } // eslint-disable-next-line no-use-before-define


    return createGQLObject(schema, refTypeName, isInputType, gqlTypes);
  }

  return gqlTypes[typeName];
};

const getPrimitiveTypes = jsonSchema => {
  let jsonType = jsonSchema.type;
  const {
    format
  } = jsonSchema;

  if (format === 'int64') {
    jsonType = 'string';
  }

  const type = primitiveTypes[jsonType];

  if (!type) {
    throw new Error(`Cannot build primitive type "${jsonType}"`);
  }

  return type;
};

const jsonSchemaTypeToGraphQL = (title, jsonSchema, schemaName, isInputType, gqlTypes) => {
  const baseType = (() => {
    if (jsonSchema.$ref) {
      return getExistingType(jsonSchema.$ref, isInputType, gqlTypes);
    }

    if (isObjectType(jsonSchema)) {
      // eslint-disable-next-line no-use-before-define
      return createGQLObject(jsonSchema, `${title}_${schemaName}`, isInputType, gqlTypes);
    }

    if (jsonSchema.type) {
      return getPrimitiveTypes(jsonSchema);
    }

    throw new Error(`Don't know how to handle schema ${JSON.stringify(jsonSchema)} without type and schema`);
  })();

  return jsonSchema.required ? graphql.GraphQLNonNull(baseType) : baseType;
};

const makeValidName = name => name.replace(/[^_0-9A-Za-z]/g, '_');

const getTypeFields = (jsonSchema, title, isInputType, gqlTypes) => {
  if (!Object.keys(jsonSchema.properties || {}).length) {
    return {
      empty: {
        description: 'default field',
        type: graphql.GraphQLString
      }
    };
  }

  return () => {
    const properties = {};

    if (jsonSchema.properties) {
      Object.keys(jsonSchema.properties).forEach(key => {
        properties[makeValidName(key)] = jsonSchema.properties[key];
      });
    }

    return _lodash.default.mapValues(properties, (propertySchema, propertyName) => {
      const baseType = jsonSchemaTypeToGraphQL(title, propertySchema, propertyName, isInputType, gqlTypes);
      const type = jsonSchema.required && jsonSchema.required.includes(propertyName) && !(baseType instanceof graphql.GraphQLNonNull) ? graphql.GraphQLNonNull(baseType) : baseType;
      return {
        description: propertySchema.description,
        type
      };
    });
  };
};

exports.getTypeFields = getTypeFields;

const getRefProp = jsonSchema => {
  return jsonSchema.$ref || jsonSchema.schema && jsonSchema.schema.$ref;
};

const createGQLObject = (jsonSchema, title, isInputType, gqlTypes) => {
  title = jsonSchema && jsonSchema.title || title || '';
  title = makeValidName(title);

  if (isInputType && !title.endsWith('Input')) {
    title += 'Input';
    jsonSchema = _lodash.default.clone(jsonSchema);
  }

  if (title in gqlTypes) {
    return gqlTypes[title];
  }

  if (!jsonSchema) {
    jsonSchema = {
      type: 'object',
      properties: {},
      description: '',
      title
    };
  } else if (!jsonSchema.title) {
    jsonSchema.title = title;
  }

  const reference = getRefProp(jsonSchema);

  if (reference) {
    return getExistingType(reference, isInputType, gqlTypes);
  }

  if (jsonSchema.type === 'array') {
    if (jsonSchema.items && jsonSchema.items.$ref) {
      return new graphql.GraphQLList(graphql.GraphQLNonNull(getExistingType(jsonSchema.items.$ref, isInputType, gqlTypes)));
    }

    if (isObjectType(jsonSchema.items)) {
      return new graphql.GraphQLList(graphql.GraphQLNonNull(createGQLObject(jsonSchema.items, `${title}_items`, isInputType, gqlTypes)));
    }

    return new graphql.GraphQLList(graphql.GraphQLNonNull(getPrimitiveTypes(jsonSchema.items)));
  }

  const {
    description
  } = jsonSchema;
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

exports.createGQLObject = createGQLObject;

const mapParametersToFields = (parameters, typeName, gqlTypes) => {
  return parameters.reduce((res, param) => {
    const type = jsonSchemaTypeToGraphQL(`param_${typeName}`, param.jsonSchema, param.name, true, gqlTypes);
    res[param.name] = {
      type
    };
    return res;
  }, {});
};

exports.mapParametersToFields = mapParametersToFields;