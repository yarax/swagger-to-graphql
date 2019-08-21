"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getRequestOptions(_a) {
    var method = _a.method, baseUrl = _a.baseUrl, path = _a.path, parameterDetails = _a.parameterDetails, parameterValues = _a.parameterValues, _b = _a.formData, formData = _b === void 0 ? false : _b;
    var result = {
        method: method,
        baseUrl: baseUrl,
        path: path,
        bodyType: formData ? 'formData' : 'json',
        headers: {},
        query: {},
        body: {},
    };
    parameterDetails.forEach(function (_a) {
        var name = _a.name, swaggerName = _a.swaggerName, type = _a.type, required = _a.required;
        var value = parameterValues[name];
        if (required && !value && value !== '')
            throw new Error("No required request field " + name + " for " + method.toUpperCase() + " " + path);
        if (!value && value !== '')
            return;
        switch (type) {
            case 'body':
                result.body = value;
                break;
            case 'formData':
                result.body[swaggerName] = value;
                break;
            case 'path':
                result.path =
                    typeof result.path === 'string'
                        ? result.path.replace("{" + swaggerName + "}", value)
                        : result.path;
                break;
            case 'query':
                result.query[swaggerName] = value;
                break;
            case 'header':
                result.headers[swaggerName] = value;
                break;
            default:
                throw new Error("Unsupported param type for param \"" + name + "\" and type \"" + type + "\"");
        }
    });
    return result;
}
exports.getRequestOptions = getRequestOptions;
