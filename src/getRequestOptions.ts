import { EndpointParam, RequestOptions } from './types';

export interface RequestOptionsInput {
  method: string;
  baseUrl: string;
  path: string;
  parameterDetails: EndpointParam[];
  parameterValues: {
    [key: string]: any;
  };
  formData?: boolean;
}

export function getRequestOptions({
  method,
  baseUrl,
  path,
  parameterDetails,
  parameterValues,
  formData = false,
}: RequestOptionsInput): RequestOptions {
  const result: RequestOptions = {
    method,
    baseUrl,
    path,
    bodyType: formData ? 'formData' : 'json',
    headers: {},
    query: {},
    body: {},
  };

  parameterDetails.forEach(({ name, swaggerName, type, required }) => {
    const value = parameterValues[name];

    if (required && !value && value !== '')
      throw new Error(
        `No required request field ${name} for ${method.toUpperCase()} ${path}`,
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
        result.path =
          typeof result.path === 'string'
            ? result.path.replace(`{${swaggerName}}`, value)
            : result.path;
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
