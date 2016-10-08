'use strict';

const fs = require('fs');
const nodePath = require('path');
const refParser = require('json-schema-ref-parser');
const _ = require('lodash');
const getRequestOptions = require('node-request-by-swagger');

function getGQLTypeNameFromURL(url) {
  return url.replace(/[\/\-]+/g, '_').replace(/[\{\}]+/g, '');
}

function getSuccessResponse(responses, routePath) {
  let resp;
  Object.keys(responses).some(code => {
    resp = responses[code];
    return code[0] === '2';
  });

  return replaceWithFullRef(resp, routePath);
}

/**
 * Going throw schema and grab routes
 * @returns Promise<T>
 */
function getAllEndPoints(pathToSchema) {
  return refParser.dereference(pathToSchema).then(schema => {
    const allTypes = {};
    Object.keys(schema.paths).forEach(path => {
      const route = schema.paths[path];
      Object.keys(route).forEach(method => {
        const obj = route[method];
        const isMutation = obj['x-mutation'];
        let typeName;
        if (isMutation || method.toLowerCase() === 'get') {
          typeName = getGQLTypeNameFromURL(path);
        } else {
          return;
        }
        const parameters = obj.parameters ? obj.parameters.map(param => {
          let type;
          if (param.schema) {
            type = replaceWithFullRef(param.schema, routePath);
          } else {
            type = param.type;
          }
          return {name: param.name, type, jsonSchema: param};
        }) : [];
        allTypes[typeName] = {
          parameters,
          response: getSuccessResponse(obj.responses, routePath),
          request: (args, server) => {
            const url = `http://${server.address}:${server.port}/v1/${path}`;
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
  });
}

module.exports = {
  getAllEndPoints,
}