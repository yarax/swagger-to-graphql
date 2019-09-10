import { JSONSchemaType } from './json-schema';

export interface EndpointParam {
  required: boolean;
  type: 'header' | 'query' | 'formData' | 'path' | 'body';
  name: string;
  swaggerName: string;
  jsonSchema: JSONSchemaType;
}

export interface RequestOptionsInput {
  method: string;
  baseUrl: string | undefined;
  path: string;
  parameterDetails: EndpointParam[];
  parameterValues: {
    [key: string]: any;
  };
  formData?: boolean;
}

export interface RequestOptions {
  baseUrl?: string;
  path: string;
  method: string;
  headers?: {
    [key: string]: string;
  };
  query?: {
    [key: string]: string | string[];
  };
  body?: any;
  bodyType: 'json' | 'formData';
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
        result.body = result.body || {};
        result.body[swaggerName] = value;
        break;
      case 'path':
        result.path =
          typeof result.path === 'string'
            ? result.path.replace(`{${swaggerName}}`, value)
            : result.path;
        break;
      case 'query':
        result.query = result.query || {};
        result.query[swaggerName] = value;
        break;
      case 'header':
        result.headers = result.headers || {};
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
