import requestPromise from 'request-promise';

import { CallBackendArguments } from '../src';

export async function callBackend({
  requestOptions: { method, body, baseUrl, path, query, headers, bodyType },
}: CallBackendArguments<{}>) {
  return requestPromise({
    ...(bodyType === 'json' && {
      json: true,
      body,
    }),
    ...(bodyType === 'formData' && {
      form: body,
    }),
    qs: query,
    qsStringifyOptions: {
      indices: false,
    },
    method,
    headers,
    baseUrl,
    uri: path,
  });
}
