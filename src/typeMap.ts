// TODO: fix no-param-reassign
/* eslint-disable no-param-reassign */
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLString,
} from 'graphql';
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

export function parseResponse(response: string, returnType: GraphQLOutputType) {
  const nullableType =
    returnType instanceof GraphQLNonNull ? returnType.ofType : returnType;
  if (
    nullableType instanceof GraphQLObjectType ||
    nullableType instanceof GraphQLList
  ) {
    return JSON.parse(response);
  }
  if (nullableType instanceof GraphQLScalarType) {
    if (nullableType.name === 'String') {
      return response;
    }
    if (nullableType.name === 'Int') {
      return parseInt(response, 10);
    }
    if (nullableType.name === 'Float') {
      return parseFloat(response);
    }
    if (nullableType.name === 'Boolean') {
      return Boolean(response);
    }
  }

  throw new Error(`Unexpected returnType ${nullableType}`);
}

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

const getTypeNameFromRef = (ref: string) => {
  const cutRef = ref.replace('#/definitions/', '');
  return cutRef.replace(/\//, '_');
};

const primitiveTypes = {
  string: GraphQLString,
  date: GraphQLString,
  integer: GraphQLInt,
  number: GraphQLFloat,
  boolean: GraphQLBoolean,
};

const getPrimitiveTypes = (jsonSchema: ScalarSchema): GraphQLScalarType => {
  const jsonType = jsonSchema.format === 'int64' ? 'string' : jsonSchema.type;
  const type = primitiveTypes[jsonType];
  if (!type) {
    throw new Error(`Cannot build primitive type "${jsonType}"`);
  }
  return type;
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
    return createGraphQLType(schema, refTypeName, isInputType, gqlTypes);
  }
  return gqlTypes[typeName];
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
      return createGraphQLType(
        jsonSchema,
        `${title}_${propertyName}`,
        isInputType,
        gqlTypes,
      );
    }

    if (jsonSchema.type === 'file') {
      // eslint-disable-next-line no-use-before-define,@typescript-eslint/no-use-before-define
      return createGraphQLType(
        { type: 'object', properties: { unsupported: { type: 'string' } } },
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
    ? GraphQLNonNull(baseType)
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
        type: GraphQLString,
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
          !(baseType instanceof GraphQLNonNull)
            ? GraphQLNonNull(baseType)
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

export const createGraphQLType = (
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
    const itemsSchema = Array.isArray(jsonSchema.items)
      ? jsonSchema.items[0]
      : jsonSchema.items;
    if (isRefType(itemsSchema)) {
      return new GraphQLList(
        GraphQLNonNull(
          getExistingType(itemsSchema.$ref, isInputType, gqlTypes),
        ),
      );
    }
    if (isObjectType(itemsSchema) || isArrayType(itemsSchema)) {
      return new GraphQLList(
        GraphQLNonNull(
          createGraphQLType(
            itemsSchema,
            `${title}_items`,
            isInputType,
            gqlTypes,
          ),
        ),
      );
    }

    if (itemsSchema.type === 'file') {
      // eslint-disable-next-line no-use-before-define,@typescript-eslint/no-use-before-define
      return new GraphQLList(
        GraphQLNonNull(
          createGraphQLType(
            { type: 'object', properties: { unsupported: { type: 'string' } } },
            title,
            isInputType,
            gqlTypes,
          ),
        ),
      );
    }
    return new GraphQLList(GraphQLNonNull(getPrimitiveTypes(itemsSchema)));
  }

  const { description } = jsonSchema;
  const fields = getTypeFields(jsonSchema, title, isInputType, gqlTypes);
  let result;
  if (isInputType) {
    result = new GraphQLInputObjectType({
      name: title,
      description,
      fields,
    });
  } else {
    result = new GraphQLObjectType({
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
