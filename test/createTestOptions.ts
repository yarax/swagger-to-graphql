import requestPromise from 'request-promise';

import { Options } from '../src/types';

export function createTestOptions(): Options<any> {
  return {
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
