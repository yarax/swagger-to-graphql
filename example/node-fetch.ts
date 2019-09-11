import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import { CallBackendArguments } from '../src';

export async function callBackend({
  requestOptions: { method, body, baseUrl, path, query, headers, bodyType },
}: CallBackendArguments<{}>) {
  const searchPath = query ? `?${new URLSearchParams(query)}` : '';
  const url = `${baseUrl}${path}${searchPath}`;
  switch (bodyType) {
    case 'json':
      headers = {...headers, 'content-type': 'application/json'};
      body = JSON.stringify(body);
      break;
    case 'formData':
      body = new URLSearchParams(body);
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
