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
var node_request_by_swagger_1 = __importDefault(require("node-request-by-swagger"));
var globalSchema;
exports.getSchema = function () {
    if (!globalSchema || !Object.keys(globalSchema).length) {
        throw new Error('Schema was not loaded');
    }
    return globalSchema;
};
var getGQLTypeNameFromURL = function (method, url) {
    var fromUrl = url.replace(/[{}]+/g, '').replace(/[^a-zA-Z0-9_]+/g, '_');
    return "" + method + fromUrl;
};
var getSuccessResponse = function (responses) {
    var resp;
    if (!responses)
        return null;
    Object.keys(responses).some(function (code) {
        resp = responses[code];
        return code[0] === '2';
    });
    return resp && resp.schema;
};
exports.loadSchema = function (pathToSchema) { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, json_schema_ref_parser_1.default.bundle(pathToSchema)];
            case 1:
                globalSchema = _a.sent();
                return [2 /*return*/, globalSchema];
        }
    });
}); };
exports.loadRefs = function (pathToSchema) { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, json_schema_ref_parser_1.default.resolve(pathToSchema)];
    });
}); };
var replaceOddChars = function (str) { return str.replace(/[^_a-zA-Z0-9]/g, '_'); };
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
var getParamDetails = function (param, schema, refResolver) {
    var resolvedParam = param;
    if (param.$ref) {
        resolvedParam = refResolver.get(param.$ref);
    }
    var name = replaceOddChars(resolvedParam.name);
    var type = resolvedParam.type;
    return { name: name, type: type, jsonSchema: resolvedParam };
};
var renameGraphqlParametersToSwaggerParameters = function (graphqlParameters, parameterDetails) {
    var result = {};
    Object.keys(graphqlParameters).forEach(function (inputGraphqlName) {
        var swaggerName = parameterDetails.find(function (_a) {
            var graphqlName = _a.name;
            return graphqlName === inputGraphqlName;
        }).jsonSchema.name;
        result[swaggerName] = graphqlParameters[inputGraphqlName];
    });
    return result;
};
/**
 * Go through schema and grab routes
 */
exports.getAllEndPoints = function (schema, refs) {
    var allOperations = {};
    var serverPath = exports.getServerPath(schema);
    Object.keys(schema.paths).forEach(function (path) {
        var route = schema.paths[path];
        Object.keys(route).forEach(function (method) {
            if (method === 'parameters') {
                return;
            }
            var obj = route[method];
            var isMutation = ['post', 'put', 'patch', 'delete'].indexOf(method) !== -1;
            var operationId = obj.operationId || getGQLTypeNameFromURL(method, path);
            var parameterDetails;
            // [FIX] for when parameters is a child of route and not route[method]
            if (route.parameters) {
                if (obj.parameters) {
                    obj.parameters = route.parameters.concat(obj.parameters);
                }
                else {
                    obj.parameters = route.parameters;
                }
            }
            //
            if (obj.parameters) {
                parameterDetails = obj.parameters.map(function (param) {
                    return getParamDetails(param, schema, refs);
                });
            }
            else {
                parameterDetails = [];
            }
            var endpoint = {
                parameters: parameterDetails,
                description: obj.description,
                response: getSuccessResponse(obj.responses),
                request: function (graphqlParameters, optBaseUrl) {
                    var baseUrl = optBaseUrl || serverPath; // eslint-disable-line no-param-reassign
                    if (!baseUrl) {
                        throw new Error('Could not get the base url for endpoints. Check that either your schema has baseUrl or you provided it to constructor');
                    }
                    var url = "" + baseUrl + path;
                    var request = renameGraphqlParametersToSwaggerParameters(graphqlParameters, parameterDetails);
                    return node_request_by_swagger_1.default(obj, {
                        request: request,
                        url: url,
                        method: method,
                    }, '');
                },
                mutation: isMutation,
            };
            allOperations[operationId] = endpoint;
        });
    });
    return allOperations;
};
