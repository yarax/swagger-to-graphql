import { OptionsWithUrl } from 'request';
import { OperationObject } from './types';

export interface Fixture {
  url?: string;
  parameterValues: {
    [key: string]: any;
  };
  method: string;
  baseUrl?: string;
}

export function getRequestOptions(
  { consumes, parameters }: OperationObject,
  fixture: Fixture,
  baseUrlParam?: string,
) {
  const contentType = consumes ? consumes[0] : 'application/json';
  const baseUrl = baseUrlParam || fixture.baseUrl || '';
  const reqOpts: OptionsWithUrl = {
    url: `${baseUrl}${fixture.url}`,
    method: fixture.method,
    headers: {
      'content-type': contentType,
    },
  };

  (parameters || []).forEach(param => {
    const value = fixture.parameterValues[param.name];

    if (param.required && !value && value !== '')
      throw new Error(
        `No required request field ${
          param.name
        } for ${fixture.method.toUpperCase()} ${fixture.url}`,
      );
    if (!value && value !== '') return;

    switch (param.in) {
      case 'body':
        if (contentType === 'application/x-www-form-urlencoded') {
          reqOpts.body = reqOpts.body
            ? `${reqOpts.body}&${param.name}=${value}`
            : `${param.name}=${value}`;
          reqOpts.json = false;
        } else if (contentType.includes('application/json')) {
          reqOpts.body = JSON.stringify(value);
        } else {
          reqOpts.body = value;
        }
        break;
      case 'formData':
        if (!reqOpts.formData)
          reqOpts.formData = {
            attachments: [],
          };
        reqOpts.formData.attachments.push(value);
        reqOpts.json = false;
        break;
      case 'path':
        reqOpts.url =
          typeof reqOpts.url === 'string'
            ? reqOpts.url.replace(`{${param.name}}`, value)
            : reqOpts.url;
        break;
      case 'query': {
        if (!reqOpts.qs) reqOpts.qs = {};
        const newValue = Array.isArray(value) ? value[0] : value;
        if (typeof newValue !== 'string' && typeof newValue !== 'number') {
          throw new Error(
            'GET query string for non string/number values is not supported',
          );
        }
        reqOpts.qs[param.name] = newValue;
        break;
      }
      case 'header':
        if (!reqOpts.headers) reqOpts.headers = {};
        reqOpts.headers[param.name] = value;
        break;
      default:
        throw new Error(
          `Unsupported param type for param ${JSON.stringify(param)}`,
        );
    }
  });

  return reqOpts;
}
