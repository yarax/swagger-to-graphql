"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// TODO: fix no-param-reassign
/* eslint-disable no-param-reassign */
var graphql_1 = require("graphql");
var mapValues_1 = __importDefault(require("lodash/mapValues"));
function parseResponse(response, returnType) {
    var nullableType = returnType instanceof graphql_1.GraphQLNonNull ? returnType.ofType : returnType;
    if (nullableType instanceof graphql_1.GraphQLObjectType ||
        nullableType instanceof graphql_1.GraphQLList) {
        return JSON.parse(response);
    }
    if (nullableType instanceof graphql_1.GraphQLScalarType) {
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
    throw new Error("Unexpected returnType " + nullableType);
}
exports.parseResponse = parseResponse;
var isBodyType = function (jsonSchema) {
    return Object.keys(jsonSchema).includes('in') &&
        jsonSchema.in === 'body';
};
var isObjectType = function (jsonSchema) {
    return !isBodyType(jsonSchema) &&
        (Object.keys(jsonSchema).includes('properties') ||
            jsonSchema.type === 'object');
};
var isArrayType = function (jsonSchema) {
    return !isBodyType(jsonSchema) &&
        (Object.keys(jsonSchema).includes('items') || jsonSchema.type === 'array');
};
var primitiveTypes = {
    string: graphql_1.GraphQLString,
    date: graphql_1.GraphQLString,
    integer: graphql_1.GraphQLInt,
    number: graphql_1.GraphQLFloat,
    boolean: graphql_1.GraphQLBoolean,
};
var getPrimitiveTypes = function (jsonSchema) {
    var jsonType = jsonSchema.format === 'int64' ? 'string' : jsonSchema.type;
    var type = primitiveTypes[jsonType];
    if (!type) {
        throw new Error("Cannot build primitive type \"" + jsonType + "\"");
    }
    return type;
};
exports.jsonSchemaTypeToGraphQL = function (title, jsonSchema, propertyName, isInputType, gqlTypes) {
    var baseType = (function () {
        if (isBodyType(jsonSchema)) {
            return exports.jsonSchemaTypeToGraphQL(title, jsonSchema.schema, propertyName, isInputType, gqlTypes);
        }
        if (isObjectType(jsonSchema) || isArrayType(jsonSchema)) {
            // eslint-disable-next-line no-use-before-define,@typescript-eslint/no-use-before-define
            return exports.createGraphQLType(jsonSchema, title + "_" + propertyName, isInputType, gqlTypes);
        }
        if (jsonSchema.type === 'file') {
            // eslint-disable-next-line no-use-before-define,@typescript-eslint/no-use-before-define
            return exports.createGraphQLType({ type: 'object', properties: { unsupported: { type: 'string' } } }, title + "_" + propertyName, isInputType, gqlTypes);
        }
        if (jsonSchema.type) {
            return getPrimitiveTypes(jsonSchema);
        }
        throw new Error("Don't know how to handle schema " + JSON.stringify(jsonSchema) + " without type and schema");
    })();
    return jsonSchema.required === true ? graphql_1.GraphQLNonNull(baseType) : baseType;
};
var makeValidName = function (name) { return name.replace(/[^_0-9A-Za-z]/g, '_'); };
exports.getTypeFields = function (jsonSchema, title, isInputType, gqlTypes) {
    if (isObjectType(jsonSchema) &&
        !Object.keys(jsonSchema.properties || {}).length) {
        return {
            empty: {
                description: 'default field',
                type: graphql_1.GraphQLString,
            },
        };
    }
    return function () {
        var properties = {};
        if (isObjectType(jsonSchema)) {
            Object.keys(jsonSchema.properties).forEach(function (key) {
                properties[makeValidName(key)] = jsonSchema.properties[key];
            });
        }
        return mapValues_1.default(properties, function (propertySchema, propertyName) {
            var baseType = exports.jsonSchemaTypeToGraphQL(title, propertySchema, propertyName, isInputType, gqlTypes);
            var type = isObjectType(jsonSchema) &&
                jsonSchema.required &&
                jsonSchema.required.includes(propertyName) &&
                !(baseType instanceof graphql_1.GraphQLNonNull)
                ? graphql_1.GraphQLNonNull(baseType)
                : baseType;
            return {
                description: propertySchema.description,
                type: type,
            };
        });
    };
};
exports.createGraphQLType = function (jsonSchema, title, isInputType, gqlTypes) {
    title =
        (jsonSchema &&
            ((isObjectType(jsonSchema) && jsonSchema.xml && jsonSchema.xml.name) ||
                jsonSchema.title)) ||
            title ||
            '';
    title = makeValidName(title);
    if (isInputType && !title.endsWith('Input')) {
        title += 'Input';
    }
    if (title in gqlTypes) {
        return gqlTypes[title];
    }
    if (!jsonSchema) {
        jsonSchema = {
            type: 'object',
            properties: {},
            description: '',
            title: title,
        };
    }
    else if (!jsonSchema.title) {
        jsonSchema = __assign({}, jsonSchema, { title: title });
    }
    if (isArrayType(jsonSchema)) {
        var itemsSchema = Array.isArray(jsonSchema.items)
            ? jsonSchema.items[0]
            : jsonSchema.items;
        if (isObjectType(itemsSchema) || isArrayType(itemsSchema)) {
            return new graphql_1.GraphQLList(graphql_1.GraphQLNonNull(exports.createGraphQLType(itemsSchema, title + "_items", isInputType, gqlTypes)));
        }
        if (itemsSchema.type === 'file') {
            // eslint-disable-next-line no-use-before-define,@typescript-eslint/no-use-before-define
            return new graphql_1.GraphQLList(graphql_1.GraphQLNonNull(exports.createGraphQLType({ type: 'object', properties: { unsupported: { type: 'string' } } }, title, isInputType, gqlTypes)));
        }
        return new graphql_1.GraphQLList(graphql_1.GraphQLNonNull(getPrimitiveTypes(itemsSchema)));
    }
    var description = jsonSchema.description;
    var fields = exports.getTypeFields(jsonSchema, title, isInputType, gqlTypes);
    var result;
    if (isInputType) {
        result = new graphql_1.GraphQLInputObjectType({
            name: title,
            description: description,
            fields: fields,
        });
    }
    else {
        result = new graphql_1.GraphQLObjectType({
            name: title,
            description: description,
            fields: fields,
        });
    }
    gqlTypes[title] = result;
    return result;
};
exports.mapParametersToFields = function (parameters, typeName, gqlTypes) {
    return parameters.reduce(function (res, param) {
        var type = exports.jsonSchemaTypeToGraphQL("param_" + typeName, param.jsonSchema, param.name, true, gqlTypes);
        res[param.name] = {
            type: type,
        };
        return res;
    }, {});
};
