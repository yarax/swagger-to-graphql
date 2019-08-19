"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBodyType = function (jsonSchema) {
    return Object.keys(jsonSchema).includes('in') &&
        jsonSchema.in === 'body';
};
exports.isObjectType = function (jsonSchema) {
    return !exports.isBodyType(jsonSchema) &&
        (Object.keys(jsonSchema).includes('properties') ||
            jsonSchema.type === 'object');
};
exports.isArrayType = function (jsonSchema) {
    return !exports.isBodyType(jsonSchema) &&
        (Object.keys(jsonSchema).includes('items') || jsonSchema.type === 'array');
};
