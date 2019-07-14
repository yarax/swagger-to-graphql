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
  JSONSchemaType,
  ObjectSchema,
  ScalarSchema,
} from './types';

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

const isBodyType = (jsonSchema: JSONSchemaType): jsonSchema is BodySchema =>
  Object.keys(jsonSchema).includes('in') &&
  (jsonSchema as BodySchema).in === 'body';

const isObjectType = (jsonSchema: JSONSchemaType): jsonSchema is ObjectSchema =>
  !isBodyType(jsonSchema) &&
  (Object.keys(jsonSchema).includes('properties') ||
    jsonSchema.type === 'object');

const isArrayType = (jsonSchema: JSONSchemaType): jsonSchema is ArraySchema =>
  !isBodyType(jsonSchema) &&
  (Object.keys(jsonSchema).includes('items') || jsonSchema.type === 'array');

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

export const jsonSchemaTypeToGraphQL = (
  title: string,
  jsonSchema: JSONSchemaType,
  propertyName: string,
  isInputType: boolean,
  gqlTypes: GraphQLTypeMap,
) => {
  const baseType = (() => {
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
  return jsonSchema.required === true ? GraphQLNonNull(baseType) : baseType;
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
          description: propertySchema.description,
          type,
        };
      },
    );
  };
};

export const createGraphQLType = (
  jsonSchema: JSONSchemaType | undefined,
  title: string,
  isInputType: boolean,
  gqlTypes: GraphQLTypeMap,
): GraphQLType => {
  title =
    (jsonSchema &&
      ((isObjectType(jsonSchema) && jsonSchema.xml && jsonSchema.xml.name) ||
        jsonSchema.title)) ||
    title ||
    '';
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
  } else if (!jsonSchema.title) {
    jsonSchema.title = title;
  }

  if (isArrayType(jsonSchema)) {
    const itemsSchema = Array.isArray(jsonSchema.items)
      ? jsonSchema.items[0]
      : jsonSchema.items;
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
