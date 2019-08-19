"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getRequestOptions(_a) {
    var _b = _a.baseUrl, baseUrl = _b === void 0 ? '' : _b, _c = _a.formData, formData = _c === void 0 ? false : _c, url = _a.url, method = _a.method, parameterDetails = _a.parameterDetails, parameterValues = _a.parameterValues;
    var contentType = formData
        ? 'application/x-www-form-urlencoded'
        : 'application/json';
    var result = {
        url: "" + baseUrl + url,
        method: method,
        headers: {
            'content-type': contentType,
        },
    };
    parameterDetails.forEach(function (_a) {
        var name = _a.name, swaggerName = _a.swaggerName, type = _a.type, required = _a.required;
        var value = parameterValues[name];
        if (required && !value && value !== '')
            throw new Error("No required request field " + name + " for " + method.toUpperCase() + " " + url);
        if (!value && value !== '')
            return;
        switch (type) {
            case 'body':
                if (formData) {
                    result.body = result.body
                        ? result.body + "&" + swaggerName + "=" + value
                        : swaggerName + "=" + value;
                    result.json = false;
                }
                else {
                    result.body = JSON.stringify(value);
                }
                break;
            case 'formData':
                if (!result.formData)
                    result.formData = {
                        attachments: [],
                    };
                result.formData.attachments.push(value);
                result.json = false;
                break;
            case 'path':
                result.url =
                    typeof result.url === 'string'
                        ? result.url.replace("{" + swaggerName + "}", value)
                        : result.url;
                break;
            case 'query': {
                if (!result.qs)
                    result.qs = {};
                var newValue = Array.isArray(value) ? value[0] : value;
                if (typeof newValue !== 'string' && typeof newValue !== 'number') {
                    throw new Error('GET query string for non string/number values is not supported');
                }
                result.qs[swaggerName] = newValue;
                break;
            }
            case 'header':
                if (!result.headers)
                    result.headers = {};
                result.headers[swaggerName] = value;
                break;
            default:
                throw new Error("Unsupported param type for param \"" + name + "\" and type \"" + type + "\"");
        }
    });
    return result;
}
exports.getRequestOptions = getRequestOptions;
