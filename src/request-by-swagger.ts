export function getRequestOptions(endpoint, fixture, baseUrl, schemaParameters?) {
  fixture.url = fixture.url || fixture.path;
  fixture.request = fixture.request || fixture.args;
  baseUrl = baseUrl || fixture.baseUrl || '';
  var reqOpts: any = {
    headers: {}
  };
  var contentType = endpoint.consumes ? endpoint.consumes[0] : 'application/json';
  reqOpts.method = fixture.method;
  reqOpts.url = '' + baseUrl + fixture.url;
  reqOpts.headers['content-type'] = contentType;

  (endpoint.parameters || []).forEach(function (param) {
    if (param.$ref) {
      if (schemaParameters.get && typeof schemaParameters.get === 'function') {
        param = schemaParameters.get(param.$ref);
      } else {
        const paramName = param.$ref.replace('#/parameters/', '');
        param = schemaParameters[paramName];
      }
    }

    var value = fixture.request[param.name];

    if (param.required && !value && value !== '') throw new Error('No required request field ' + param.name + ' for ' + fixture.method.toUpperCase() + ' ' + fixture.url);
    if (!value && value !== '') return;

    switch (param.in) {
      case 'body':
        if (contentType === 'application/x-www-form-urlencoded') {
          reqOpts.body = reqOpts.body ? reqOpts.body + '&' + param.name + '=' + value : param.name + '=' + value;
          reqOpts.json = false;
        } else if (contentType.includes('application/json')) {
          reqOpts.body = JSON.stringify(value);
        } else {
          reqOpts.body = value;
        }
        break;
      case 'formData':
        if (!reqOpts.formData) reqOpts.formData = {
          attachments: []
        };
        reqOpts.formData.attachments.push(value);
        reqOpts.json = false;
        break;
      case 'path':
        reqOpts.url = reqOpts.url.replace('{' + param.name + '}', value);
        break;
      case 'query':
        if (!reqOpts.qs) reqOpts.qs = {};
        var newValue;
        if (Array.isArray(value)) {
          newValue = value[0];
        } else {
          newValue = value;
        }
        if (typeof newValue !== 'string' && typeof newValue !== 'number') {
          throw new Error('GET query string for non string/number values is not supported');
        }
        reqOpts.qs[param.name] = newValue;
        break;
      case 'header':
        if (!reqOpts.headers) reqOpts.headers = {};
        reqOpts.headers[param.name] = value;
        break;
      default:
        throw new Error(`Unsupported param type for param ${param.name}: ${param.in}`)
    }
  });

  return reqOpts;
}
