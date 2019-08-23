import requestPromise from 'request-promise';
import { JSONSchema } from 'json-schema-ref-parser';
import { Options } from '../src';

export function createTestOptions(
  swaggerSchema: string | JSONSchema,
): Options<any> {
  return {
    swaggerSchema,
    async callBackend({
      requestOptions: { method, body, baseUrl, path, query, headers, bodyType },
    }) {
      return requestPromise({
        ...(bodyType === 'json' && {
          json: true,
          body,
        }),
        ...(bodyType === 'formData' && {
          form: body,
        }),
        qs: query,
        method,
        headers,
        baseUrl,
        uri: path,
      });
    },
  };
}
