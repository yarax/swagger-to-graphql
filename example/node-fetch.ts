import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import { CallBackendArguments } from '../src';

export async function callBackend({
  requestOptions: { method, body: userBody, baseUrl, path, query, headers: userHeaders, bodyType },
}: CallBackendArguments<{}>) {
  const searchPath = query ? `?${new URLSearchParams(query)}` : '';
  const url = `${baseUrl}${path}${searchPath}`;
  let body = userBody;
  let headers = userHeaders;
  switch (bodyType) {
    case 'json':
      headers = {...userHeaders, 'content-type': 'application/json'};
      body = JSON.stringify(userBody);
      break;
    case 'formData':
      body = new URLSearchParams(userBody);
      break;
  }
  const response = await fetch(url, {
      method,
      body,
      headers,
  });
  const text = await response.text();
  if (response.ok) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  }
  throw new Error(`Response: ${response.status} - ${text}`);
}
