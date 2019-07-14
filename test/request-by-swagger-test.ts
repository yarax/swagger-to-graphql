import assert from 'assert';
import request from 'request';

import { getRequestOptions } from '../src/request-by-swagger';
import { OperationObject } from '../src/types';

import schema = require('./fixtures/petstore.json');

let requestOptions;

describe('build options by endpoint', () => {
  it('should add request body to request options', () => {
    const url = '/pet';
    const endpoint = schema.paths[url].post as OperationObject;
    const options = {
      method: 'post',
      baseUrl: `http://${schema.host}${schema.basePath}`,
      url,
      request: {
        body: { name: 'test' },
      },
    };
    requestOptions = getRequestOptions(endpoint, options);
    assert.deepEqual(requestOptions, {
      url: 'http://petstore.swagger.io/v2/pet',
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });
  });

  it('should generate valid request options', done => {
    request(requestOptions, () => {
      done();
    });
  });

  it('should add request headers to request options', () => {
    const url = '/pet/{petId}';
    const endpoint = schema.paths[url].delete as OperationObject;
    const options = {
      method: 'delete',
      baseUrl: `http://${schema.host}${schema.basePath}`,
      url,
      request: {
        petId: 'mock-pet-id',
        // eslint-disable-next-line @typescript-eslint/camelcase
        api_key: 'mock api key',
      },
    };
    requestOptions = getRequestOptions(endpoint, options);
    assert.deepEqual(requestOptions, {
      url: 'http://petstore.swagger.io/v2/pet/mock-pet-id',
      method: 'delete',
      headers: {
        'content-type': 'application/json',
        // eslint-disable-next-line @typescript-eslint/camelcase
        api_key: 'mock api key',
      },
    });
  });

  it('should allow empty strings', () => {
    const url = '/pet/{petId}';
    const endpoint = schema.paths[url].delete as OperationObject;
    const options = {
      method: 'delete',
      baseUrl: `http://${schema.host}${schema.basePath}`,
      url,
      request: {
        petId: '',
        // eslint-disable-next-line @typescript-eslint/camelcase
        api_key: 'mock api key',
      },
    };
    requestOptions = getRequestOptions(endpoint, options);
    assert.deepEqual(requestOptions, {
      url: 'http://petstore.swagger.io/v2/pet/',
      method: 'delete',
      headers: {
        'content-type': 'application/json',
        // eslint-disable-next-line @typescript-eslint/camelcase
        api_key: 'mock api key',
      },
    });
  });
});
