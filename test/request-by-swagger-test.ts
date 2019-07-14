import { getRequestOptions } from '../src/request-by-swagger';

const assert = require('assert');
const request = require('request');
const schema = require('./fixtures/petstore.json');

let requestOptions;

describe('build options by endpoint', () => {
  it('should add request body to request options', () => {
    const url = '/pet';
    const endpoint = schema.paths[url].post;
    const request = {
      body: { name: 'test' },
    };
    const options = {
      method: 'post',
      baseUrl: `http://${schema.host}${schema.basePath}`,
      url,
      request,
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
    request(requestOptions, (err, data) => {
      done();
    });
  });

  it('should add request headers to request options', () => {
    const url = '/pet/{petId}';
    const endpoint = schema.paths[url].delete;
    const request = {
      petId: 'mock-pet-id',
      api_key: 'mock api key',
    };
    const options = {
      method: 'delete',
      baseUrl: `http://${schema.host}${schema.basePath}`,
      url,
      request,
    };
    requestOptions = getRequestOptions(endpoint, options);
    assert.deepEqual(requestOptions, {
      url: 'http://petstore.swagger.io/v2/pet/mock-pet-id',
      method: 'delete',
      headers: {
        'content-type': 'application/json',
        api_key: 'mock api key',
      },
    });
  });

  it('should allow empty strings', () => {
    const url = '/pet/{petId}';
    const endpoint = schema.paths[url].delete;
    const request = {
      petId: '',
      api_key: 'mock api key',
    };
    const options = {
      method: 'delete',
      baseUrl: `http://${schema.host}${schema.basePath}`,
      url,
      request,
    };
    requestOptions = getRequestOptions(endpoint, options);
    assert.deepEqual(requestOptions, {
      url: 'http://petstore.swagger.io/v2/pet/',
      method: 'delete',
      headers: {
        'content-type': 'application/json',
        api_key: 'mock api key',
      },
    });
  });
});
