'use strict';

const refParser = require('json-schema-ref-parser');
const getRequestOptions = require('node-request-by-swagger');
let __schema;

function getSchema() {
  if (!__schema || !Object.keys(__schema).length) {
    throw new Error('Schema was not loaded');
  }
  return __schema;
}

function getGQLTypeNameFromURL(method, url) {
  const fromUrl = url.replace(/[\{\}]+/g, '').replace(/[^a-zA-Z0-9_]+/g, '_');
  return `${method}${fromUrl}`;
}

function getSuccessResponse(responses) {
  let resp;

  if (!responses) return null;

  Object.keys(responses).some(code => {
    resp = responses[code];
    return code[0] === '2';
  });

  return resp && resp.schema;
}

function loadSchema(pathToSchema) {
  const schema = refParser.dereference(pathToSchema);
  __schema = schema;
  return schema;
}

function replaceOddChars(str) {
  return str.replace(/[^_a-zA-Z0-9]/g, '_');
}

/**
 * Going throw schema and grab routes
 * @returns Promise<T>
 */
function getAllEndPoints(schema) {
  const allTypes = {};
  Object.keys(schema.paths).forEach(path => {
    const route = schema.paths[path];
    Object.keys(route).forEach(method => {
      const obj = route[method];
      const isMutation = ['post', 'put', 'patch', 'delete'].indexOf(method) !== -1;
      const typeName = obj.operationId || getGQLTypeNameFromURL(method, path);
      const parameters = obj.parameters ? obj.parameters.map(param => {
        const type = param.type;
        return {name: replaceOddChars(param.name), type, jsonSchema: param};
      }) : [];
      allTypes[typeName] = {
        parameters,
        description: obj.description,
        response: getSuccessResponse(obj.responses),
        request: (args, server) => {
          const url = `${server.baseUrl}${path}`;
          return getRequestOptions(obj, {
            request: args,
            url,
            method: method
          }, '')
        },
        mutation: isMutation
      }
    });
  });
  return allTypes;
}

module.exports = {
  getAllEndPoints,
  loadSchema,
  getSchema
}
