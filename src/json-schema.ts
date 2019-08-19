import { ArraySchema, BodySchema, JSONSchemaType, ObjectSchema } from './types';

export const isBodyType = (
  jsonSchema: JSONSchemaType,
): jsonSchema is BodySchema =>
  Object.keys(jsonSchema).includes('in') &&
  (jsonSchema as BodySchema).in === 'body';

export const isObjectType = (
  jsonSchema: JSONSchemaType,
): jsonSchema is ObjectSchema =>
  !isBodyType(jsonSchema) &&
  (Object.keys(jsonSchema).includes('properties') ||
    jsonSchema.type === 'object');

export const isArrayType = (
  jsonSchema: JSONSchemaType,
): jsonSchema is ArraySchema =>
  !isBodyType(jsonSchema) &&
  (Object.keys(jsonSchema).includes('items') || jsonSchema.type === 'array');
