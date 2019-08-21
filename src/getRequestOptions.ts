import { EndpointParam, RequestOptions } from './types';

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
}: RequestOptionsInput): RequestOptions {
  const result: RequestOptions = {
    bodyType: formData ? 'formData' : 'json',
    url: `${baseUrl}${url}`,
    method,
    headers: {},
    query: {},
    body: {},
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
        result.body = value;
        break;
      case 'formData':
        result.body[swaggerName] = value;
        break;
      case 'path':
        result.url =
          typeof result.url === 'string'
            ? result.url.replace(`{${swaggerName}}`, value)
            : result.url;
        break;
      case 'query':
        result.query[swaggerName] = value;
        break;
      case 'header':
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
