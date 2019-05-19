// TODO: fix no-param-reassign
/* eslint-disable no-param-reassign */
import * as graphql from 'graphql';
import _ from 'lodash';
import {
  ArraySchema,
  BodySchema,
  EndpointParam,
  GraphQLType,
  GraphQLTypeMap,
  JSONSchemaNoRefOrBody,
  JSONSchemaType,
  ObjectSchema,
  RefType,
  ScalarSchema,
} from './types';
import { getSchema } from './swagger';

const primitiveTypes = {
  string: graphql.GraphQLString,
  date: graphql.GraphQLString,
  integer: graphql.GraphQLInt,
  number: graphql.GraphQLFloat,
  boolean: graphql.GraphQLBoolean,
};

function isRefType(input: JSONSchemaType): input is RefType {
  return Object.keys(input).includes('$ref');
}

const isBodyType = (jsonSchema: JSONSchemaType): jsonSchema is BodySchema =>
  Object.keys(jsonSchema).includes('in') &&
  (jsonSchema as BodySchema).in === 'body';

const isObjectType = (jsonSchema: JSONSchemaType): jsonSchema is ObjectSchema =>
  !isRefType(jsonSchema) &&
  !isBodyType(jsonSchema) &&
  (Object.keys(jsonSchema).includes('properties') ||
    jsonSchema.type === 'object');

const isArrayType = (jsonSchema: JSONSchemaType): jsonSchema is ArraySchema =>
  !isRefType(jsonSchema) &&
  !isBodyType(jsonSchema) &&
  (Object.keys(jsonSchema).includes('items') || jsonSchema.type === 'array');

function isScalarType(input: JSONSchemaType): input is ScalarSchema {
  return Object.keys(input).includes('format');
}

const getTypeNameFromRef = (ref: string) => {
  const cutRef = ref.replace('#/definitions/', '');
  return cutRef.replace(/\//, '_');
};

const getExistingType = (
  ref: string,
  isInputType: boolean,
  gqlTypes: GraphQLTypeMap,
) => {
  const refTypeName = getTypeNameFromRef(ref);
  let typeName = refTypeName;
  if (isInputType && !typeName.endsWith('Input')) {
    typeName += 'Input';
  }
  const allSchema = getSchema();
  if (!gqlTypes[typeName]) {
    const schema = allSchema.definitions[refTypeName];
    if (!schema) {
      throw new Error(`Definition ${refTypeName} was not found in schema`);
    }
    // eslint-disable-next-line no-use-before-define,@typescript-eslint/no-use-before-define
    return createGQLObject(schema, refTypeName, isInputType, gqlTypes);
  }
  return gqlTypes[typeName];
};

const getPrimitiveTypes = (
  jsonSchema: JSONSchemaNoRefOrBody,
): graphql.GraphQLScalarType => {
  let jsonType = jsonSchema.type;
  if (isScalarType(jsonSchema) && jsonSchema.format === 'int64') {
    jsonType = 'string';
  }
  const type = primitiveTypes[jsonType];
  if (!type) {
    throw new Error(`Cannot build primitive type "${jsonType}"`);
  }
  return type;
};

export const jsonSchemaTypeToGraphQL = (
  title: string,
  jsonSchema: JSONSchemaType,
  propertyName: string,
  isInputType: boolean,
  gqlTypes: GraphQLTypeMap,
) => {
  const baseType = (() => {
    if (isRefType(jsonSchema)) {
      return getExistingType(jsonSchema.$ref, isInputType, gqlTypes);
    }
    if (isBodyType(jsonSchema)) {
      return jsonSchemaTypeToGraphQL(
        title,
        jsonSchema.schema,
        propertyName,
        isInputType,
        gqlTypes,
      );
    }
    if (isObjectType(jsonSchema) || isArrayType(jsonSchema)) {
      // eslint-disable-next-line no-use-before-define,@typescript-eslint/no-use-before-define
      return createGQLObject(
        jsonSchema,
        `${title}_${propertyName}`,
        isInputType,
        gqlTypes,
      );
    }
    if (jsonSchema.type) {
      return getPrimitiveTypes(jsonSchema);
    }
    throw new Error(
      `Don't know how to handle schema ${JSON.stringify(
        jsonSchema,
      )} without type and schema`,
    );
  })();
  return !isRefType(jsonSchema) && jsonSchema.required === true
    ? graphql.GraphQLNonNull(baseType)
    : baseType;
};

const makeValidName = name => name.replace(/[^_0-9A-Za-z]/g, '_');

export const getTypeFields = (
  jsonSchema: JSONSchemaType,
  title: string,
  isInputType: boolean,
  gqlTypes: GraphQLTypeMap,
) => {
  if (
    isObjectType(jsonSchema) &&
    !Object.keys(jsonSchema.properties || {}).length
  ) {
    return {
      empty: {
        description: 'default field',
        type: graphql.GraphQLString,
      },
    };
  }
  return () => {
    const properties = {};
    if (isObjectType(jsonSchema)) {
      Object.keys(jsonSchema.properties).forEach(key => {
        properties[makeValidName(key)] = jsonSchema.properties[key];
      });
    }
    return _.mapValues(
      properties,
      (propertySchema: JSONSchemaType, propertyName) => {
        const baseType = jsonSchemaTypeToGraphQL(
          title,
          propertySchema,
          propertyName,
          isInputType,
          gqlTypes,
        );
        const type =
          isObjectType(jsonSchema) &&
          jsonSchema.required &&
          jsonSchema.required.includes(propertyName) &&
          !(baseType instanceof graphql.GraphQLNonNull)
            ? graphql.GraphQLNonNull(baseType)
            : baseType;
        return {
          description: isRefType(propertySchema)
            ? ''
            : propertySchema.description,
          type,
        };
      },
    );
  };
};

const getRefProp = (jsonSchema: JSONSchemaType) => {
  return isRefType(jsonSchema) && jsonSchema.$ref;
};

export const createGQLObject = (
  jsonSchema: JSONSchemaType | undefined,
  title: string,
  isInputType: boolean,
  gqlTypes: GraphQLTypeMap,
): GraphQLType => {
  title =
    (jsonSchema && !isRefType(jsonSchema) && jsonSchema.title) || title || '';
  title = makeValidName(title);

  if (isInputType && !title.endsWith('Input')) {
    title += 'Input';
    jsonSchema = _.clone(jsonSchema);
  }

  if (title in gqlTypes) {
    return gqlTypes[title];
  }

  if (!jsonSchema) {
    jsonSchema = {
      type: 'object',
      properties: {},
      description: '',
      title,
    };
  } else if (!isRefType(jsonSchema) && !jsonSchema.title) {
    jsonSchema.title = title;
  }

  const reference = getRefProp(jsonSchema);

  if (reference) {
    return getExistingType(reference, isInputType, gqlTypes);
  }

  if (isRefType(jsonSchema)) {
    throw new Error('jsonSchema should not be a refType at this point');
  }

  if (isArrayType(jsonSchema)) {
    if (isRefType(jsonSchema.items)) {
      return new graphql.GraphQLList(
        graphql.GraphQLNonNull(
          getExistingType(jsonSchema.items.$ref, isInputType, gqlTypes),
        ),
      );
    }
    if (isObjectType(jsonSchema.items) || isArrayType(jsonSchema.items)) {
      return new graphql.GraphQLList(
        graphql.GraphQLNonNull(
          createGQLObject(
            jsonSchema.items,
            `${title}_items`,
            isInputType,
            gqlTypes,
          ),
        ),
      );
    }
    return new graphql.GraphQLList(
      graphql.GraphQLNonNull(getPrimitiveTypes(jsonSchema.items)),
    );
  }

  const { description } = jsonSchema;
  const fields = getTypeFields(jsonSchema, title, isInputType, gqlTypes);
  let result;
  if (isInputType) {
    result = new graphql.GraphQLInputObjectType({
      name: title,
      description,
      fields,
    });
  } else {
    result = new graphql.GraphQLObjectType({
      name: title,
      description,
      fields,
    });
  }
  gqlTypes[title] = result;
  return result;
};

export const mapParametersToFields = (
  parameters: EndpointParam[],
  typeName: string,
  gqlTypes: GraphQLTypeMap,
) => {
  return parameters.reduce((res, param) => {
    const type = jsonSchemaTypeToGraphQL(
      `param_${typeName}`,
      param.jsonSchema,
      param.name,
      true,
      gqlTypes,
    );
    res[param.name] = {
      type,
    };
    return res;
  }, {});
};
