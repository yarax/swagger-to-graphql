'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAllEndPoints = exports.loadSchema = exports.getSchema = undefined;

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _jsonSchemaRefParser = require('json-schema-ref-parser');

var _jsonSchemaRefParser2 = _interopRequireDefault(_jsonSchemaRefParser);

var _nodeRequestBySwagger = require('node-request-by-swagger');

var _nodeRequestBySwagger2 = _interopRequireDefault(_nodeRequestBySwagger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var __schema = void 0;
var getSchema = exports.getSchema = function getSchema() {
  if (!__schema || !(0, _keys2.default)(__schema).length) {
    throw new Error('Schema was not loaded');
  }
  return __schema;
};

var getGQLTypeNameFromURL = function getGQLTypeNameFromURL(method, url) {
  var fromUrl = url.replace(/[\{\}]+/g, '').replace(/[^a-zA-Z0-9_]+/g, '_');
  return '' + method + fromUrl;
};

var getSuccessResponse = function getSuccessResponse(responses) {
  var resp = void 0;

  if (!responses) return null;

  (0, _keys2.default)(responses).some(function (code) {
    resp = responses[code];
    
    return code[0] === '2';
  });

  // If there is an allOf reference, flatten its properties and the
  // additional properties into a single respone. 
  if (resp.schema && resp.schema.allOf) {
    return flattenAllOfProperties(resp.schema);
  }

  // If it's an array of a definition that uses an allOf, change the items
  // to be the flattened definition.
  else if (resp.schema && resp.schema.items && resp.schema.items.allOf) {
    return {
      items: flattenAllOfProperties(resp.schema.items),
      type: 'array'
    };
  }

  return resp && resp.schema;
};

var flattenAllOfProperties = function flattenAllOfProperties(schemaDefinition) {
  let parentSchema = JSON.parse(JSON.stringify(schemaDefinition.allOf[0]));
  let additionalSchema = schemaDefinition.allOf[1] || {};
  let finalSchema = parentSchema;
  for (const key in additionalSchema) {
    // If it's an object, we need to merge in all properties.
    if (additionalSchema[key] === Object(additionalSchema[key])) {
      for (const propertyKey in additionalSchema[key]) {
        finalSchema[key][propertyKey] = additionalSchema[key][propertyKey];
      }
    }
    // If it's not, just add it on.  E.g. the 'type' property is a string.
    else {
      finalSchema[key] = additionalSchema[key];
    }
  }
  // Return this flattened response (instead of the standard one, which would
  // contain the allOf elements).
  return finalSchema;
}

var loadSchema = exports.loadSchema = function loadSchema(pathToSchema) {
  var schema = _jsonSchemaRefParser2.default.dereference(pathToSchema);
  __schema = schema;
  return schema;
};

var replaceOddChars = function replaceOddChars(str) {
  return str.replace(/[^_a-zA-Z0-9]/g, '_');
};

var censor = function censor(censor) {
  var i = 0;

  return function(key, value) {
    if(i !== 0 && typeof(censor) === 'object' && typeof(value) == 'object' && censor == value) 
      return '[Circular]'; 

    if(i >= 29) // seems to be a harded maximum of 30 serialized objects?
      return '[Unknown]';

    ++i; // so we know we aren't using the original object anymore

    return value;  
  }
}

/**
 * Going throw schema and grab routes
 */
var getAllEndPoints = exports.getAllEndPoints = function getAllEndPoints(schema) {
  var allTypes = {};
  (0, _keys2.default)(schema.paths).forEach(function (path) {
    var route = schema.paths[path];
    (0, _keys2.default)(route).forEach(function (method) {
      var obj = route[method];
      var isMutation = ['post', 'put', 'patch', 'delete'].indexOf(method) !== -1;
      var typeName = obj.operationId || getGQLTypeNameFromURL(method, path);
      var parameters = obj.parameters ? obj.parameters.map(function (param) {
        var type = param.type;
        return { name: replaceOddChars(param.name), type: type, jsonSchema: param };
      }) : [];
      var endpoint = {
        parameters: parameters,
        description: obj.description,
        response: getSuccessResponse(obj.responses),
        request: function request(args, baseUrl) {
          var url = '' + baseUrl + path;
          return (0, _nodeRequestBySwagger2.default)(obj, {
            request: args,
            url: url,
            method: method
          }, '');
        },
        mutation: isMutation
      };
      allTypes[typeName] = endpoint;
    });
  });
  return allTypes;
};