"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var json_schema_ref_parser_1 = __importDefault(require("json-schema-ref-parser"));
var types_1 = require("./types");
var getRequestOptions_1 = require("./getRequestOptions");
var json_schema_1 = require("./json-schema");
var replaceOddChars = function (str) { return str.replace(/[^_a-zA-Z0-9]/g, '_'); };
var getGQLTypeNameFromURL = function (method, url) {
    var fromUrl = replaceOddChars(url.replace(/[{}]+/g, ''));
    return "" + method + fromUrl;
};
exports.getSuccessResponse = function (responses) {
    var successCode = Object.keys(responses).find(function (code) {
        return code[0] === '2';
    });
    if (!successCode) {
        return undefined;
    }
    var successResponse = responses[successCode];
    if (!successResponse) {
        throw new Error("Expected responses[" + successCode + "] to be defined");
    }
    if (successResponse.schema) {
        return successResponse.schema;
    }
    if (successResponse.content) {
        return successResponse.content['application/json'].schema;
    }
    return undefined;
};
exports.loadSchema = function (pathToSchema) { return __awaiter(_this, void 0, void 0, function () {
    var result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, json_schema_ref_parser_1.default.dereference(pathToSchema)];
            case 1:
                result = _a.sent();
                return [2 /*return*/, result];
        }
    });
}); };
function addTitlesToJsonSchemas(schema) {
    var requestBodies = (schema.components || {}).requestBodies || {};
    Object.keys(requestBodies).forEach(function (requestBodyName) {
        var content = requestBodies[requestBodyName].content;
        Object.keys(content).forEach(function (contentKey) {
            var contentValue = content[contentKey];
            if (contentValue) {
                contentValue.schema.title =
                    contentValue.schema.title || requestBodyName;
            }
        });
    });
    var jsonSchemas = (schema.components || {}).schemas || {};
    Object.keys(jsonSchemas).forEach(function (schemaName) {
        var jsonSchema = jsonSchemas[schemaName];
        jsonSchema.title = jsonSchema.title || schemaName;
    });
    var definitions = schema.definitions || {};
    Object.keys(definitions).forEach(function (definitionName) {
        var jsonSchema = definitions[definitionName];
        jsonSchema.title = jsonSchema.title || definitionName;
    });
    return schema;
}
exports.addTitlesToJsonSchemas = addTitlesToJsonSchemas;
exports.getServerPath = function (schema) {
    var server = schema.servers && Array.isArray(schema.servers)
        ? schema.servers[0]
        : schema.host
            ? [
                (schema.schemes && schema.schemes[0]) || 'http',
                '://',
                schema.host,
                schema.basePath,
            ]
                .filter(Boolean)
                .join('')
            : undefined;
    if (!server) {
        return undefined;
    }
    if (typeof server === 'string') {
        return server;
    }
    var url = server.url, variables = server.variables;
    return variables
        ? Object.keys(server.variables).reduce(function (acc, variableName) {
            var variable = server.variables[variableName];
            var value = typeof variable === 'string'
                ? variable
                : variable.default || variable.enum[0];
            return acc.replace("{" + variableName + "}", value);
        }, url)
        : url;
};
exports.getParamDetails = function (param) {
    var name = replaceOddChars(param.name);
    var swaggerName = param.name;
    if (types_1.isOa3Param(param)) {
        var _a = param, schema = _a.schema, required = _a.required, type = _a.in;
        return {
            name: name,
            swaggerName: swaggerName,
            type: type,
            required: !!required,
            jsonSchema: schema,
        };
    }
    return {
        name: name,
        swaggerName: swaggerName,
        type: param.in,
        required: !!param.required,
        jsonSchema: param,
    };
};
var contentTypeFormData = 'application/x-www-form-urlencoded';
exports.getParamDetailsFromRequestBody = function (requestBody) {
    var formData = requestBody.content[contentTypeFormData];
    function getSchemaFromRequestBody() {
        if (requestBody.content['application/json']) {
            return requestBody.content['application/json'].schema;
        }
        throw new Error("Unsupported content type(s) found: " + Object.keys(requestBody.content).join(', '));
    }
    if (formData) {
        var formdataSchema_1 = formData.schema;
        if (!json_schema_1.isObjectType(formdataSchema_1)) {
            throw new Error("RequestBody is formData, expected an object schema, got \"" + JSON.stringify(formdataSchema_1) + "\"");
        }
        return Object.entries(formdataSchema_1.properties).map(function (_a) {
            var name = _a[0], schema = _a[1];
            return ({
                name: replaceOddChars(name),
                swaggerName: name,
                type: 'formData',
                required: formdataSchema_1.required
                    ? formdataSchema_1.required.includes(name)
                    : false,
                jsonSchema: schema,
            });
        });
    }
    return [
        {
            name: 'body',
            swaggerName: 'requestBody',
            type: 'body',
            required: !!requestBody.required,
            jsonSchema: getSchemaFromRequestBody(),
        },
    ];
};
function isFormdataRequest(requestBody) {
    return !!requestBody.content[contentTypeFormData];
}
/**
 * Go through schema and grab routes
 */
exports.getAllEndPoints = function (schema) {
    var allOperations = {};
    var serverPath = exports.getServerPath(schema);
    Object.keys(schema.paths).forEach(function (path) {
        var route = schema.paths[path];
        Object.keys(route).forEach(function (method) {
            if (method === 'parameters') {
                return;
            }
            var operationObject = route[method];
            var isMutation = ['post', 'put', 'patch', 'delete'].indexOf(method) !== -1;
            var operationId = operationObject.operationId
                ? replaceOddChars(operationObject.operationId)
                : getGQLTypeNameFromURL(method, path);
            // [FIX] for when parameters is a child of route and not route[method]
            if (route.parameters) {
                if (operationObject.parameters) {
                    operationObject.parameters = route.parameters.concat(operationObject.parameters);
                }
                else {
                    operationObject.parameters = route.parameters;
                }
            }
            var bodyParams = operationObject.requestBody
                ? exports.getParamDetailsFromRequestBody(operationObject.requestBody)
                : [];
            var parameterDetails = (operationObject.parameters
                ? operationObject.parameters.map(function (param) { return exports.getParamDetails(param); })
                : []).concat(bodyParams);
            var endpoint = {
                parameters: parameterDetails,
                description: operationObject.description,
                response: exports.getSuccessResponse(operationObject.responses),
                request: function (parameterValues, optBaseUrl) {
                    var baseUrl = optBaseUrl || serverPath; // eslint-disable-line no-param-reassign
                    if (!baseUrl) {
                        throw new Error('Could not get the base url for endpoints. Check that either your schema has baseUrl or you provided it to constructor');
                    }
                    return getRequestOptions_1.getRequestOptions({
                        parameterDetails: parameterDetails,
                        parameterValues: parameterValues,
                        baseUrl: baseUrl,
                        path: path,
                        method: method,
                        formData: operationObject.consumes
                            ? !operationObject.consumes.includes('application/json')
                            : operationObject.requestBody
                                ? isFormdataRequest(operationObject.requestBody)
                                : false,
                    });
                },
                mutation: isMutation,
            };
            allOperations[operationId] = endpoint;
        });
    });
    return allOperations;
};
