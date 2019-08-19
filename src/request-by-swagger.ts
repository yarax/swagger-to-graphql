import { OptionsWithUrl } from 'request';
import { EndpointParam } from './types';

export interface RequestOptionsInput {
  url?: string;
  parameterDetails: EndpointParam[];
  parameterValues: {
    [key: string]: any;
  };
  method: string;
  baseUrl?: string;
  formData?: boolean;
}

export function getRequestOptions({
  baseUrl = '',
  formData = false,
  url,
  method,
  parameterDetails,
  parameterValues,
}: RequestOptionsInput) {
  const contentType = formData
    ? 'application/x-www-form-urlencoded'
    : 'application/json';
  const result: OptionsWithUrl = {
    url: `${baseUrl}${url}`,
    method,
    headers: {
      'content-type': contentType,
    },
  };

  parameterDetails.forEach(({ name, swaggerName, type, required }) => {
    const value = parameterValues[name];

    if (required && !value && value !== '')
      throw new Error(
        `No required request field ${name} for ${method.toUpperCase()} ${url}`,
      );
    if (!value && value !== '') return;

    switch (type) {
      case 'body':
        if (formData) {
          result.body = result.body
            ? `${result.body}&${swaggerName}=${value}`
            : `${swaggerName}=${value}`;
          result.json = false;
        } else {
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
            ? result.url.replace(`{${swaggerName}}`, value)
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
        result.qs[swaggerName] = newValue;
        break;
      }
      case 'header':
        if (!result.headers) result.headers = {};
        result.headers[swaggerName] = value;
        break;
      default:
        throw new Error(
          `Unsupported param type for param "${name}" and type "${type}"`,
        );
    }
  });

  return result;
}
