import { OptionsWithUrl } from 'request';
import { OperationObject } from './types';

export interface RequestOptionsInput {
  url?: string;
  parameterValues: {
    [key: string]: any;
  };
  method: string;
  baseUrl?: string;
}

export function getRequestOptions(
  { consumes, parameters }: OperationObject,
  requestOptionsInput: RequestOptionsInput,
) {
  const contentType = consumes ? consumes[0] : 'application/json';
  const baseUrl = requestOptionsInput.baseUrl || '';
  const result: OptionsWithUrl = {
    url: `${baseUrl}${requestOptionsInput.url}`,
    method: requestOptionsInput.method,
    headers: {
      'content-type': contentType,
    },
  };

  (parameters || []).forEach(param => {
    const value = requestOptionsInput.parameterValues[param.name];

    if (param.required && !value && value !== '')
      throw new Error(
        `No required request field ${
          param.name
        } for ${requestOptionsInput.method.toUpperCase()} ${
          requestOptionsInput.url
        }`,
      );
    if (!value && value !== '') return;

    switch (param.in) {
      case 'body':
        if (contentType === 'application/x-www-form-urlencoded') {
          result.body = result.body
            ? `${result.body}&${param.name}=${value}`
            : `${param.name}=${value}`;
          result.json = false;
        } else if (contentType.includes('application/json')) {
          result.body = JSON.stringify(value);
        } else {
          result.body = value;
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
            ? result.url.replace(`{${param.name}}`, value)
            : result.url;
        break;
      case 'query': {
        if (!result.qs) result.qs = {};
        const newValue = Array.isArray(value) ? value[0] : value;
        if (typeof newValue !== 'string' && typeof newValue !== 'number') {
          throw new Error(
            'GET query string for non string/number values is not supported',
          );
        }
        result.qs[param.name] = newValue;
        break;
      }
      case 'header':
        if (!result.headers) result.headers = {};
        result.headers[param.name] = value;
        break;
      default:
        throw new Error(
          `Unsupported param type for param ${JSON.stringify(param)}`,
        );
    }
  });

  return result;
}
