import { getRequestOptions } from "../src/request-by-swagger";

const schema = require('./fixtures/petstore.json');
const assert = require('assert');
const request = require('request');
let requestOptions;

describe('build options by endpoint', () => {
  it('should add request body to request options', () => {
    const path = '/pet';
    const endpoint = schema.paths[path].post;
    const args = {
      body: { name: 'test' }
    };
    const options = {
      method: 'post',
      baseUrl: `http://${schema.host}${schema.basePath}`,
      path: path,
      args: args,
    };
    requestOptions = getRequestOptions(endpoint, options, null, schema.parameters);
    assert.deepEqual(requestOptions, {
      url: 'http://petstore.swagger.io/v2/pet',
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'test' }) });
  });

  it('should generate valid request options', (done) => {
    request(requestOptions, (err, data) => {
      done();
    });
  });

  it('should add request headers to request options', () => {
    const path = '/pet/{petId}';
    const endpoint = schema.paths[path].delete;
    const args = {
      petId: 'mock-pet-id',
      api_key: 'mock api key'
    };
    const options = {
      method: 'delete',
      baseUrl: `http://${schema.host}${schema.basePath}`,
      path: path,
      args: args,
    };
    requestOptions = getRequestOptions(endpoint, options, null, schema.parameters);
    assert.deepEqual(requestOptions, {
      url: 'http://petstore.swagger.io/v2/pet/mock-pet-id',
      method: 'delete',
      headers: {
        'content-type': 'application/json',
        api_key: 'mock api key'
      }
    });
  });

  it('should allow empty strings', () => {
    const path = '/pet/{petId}';
    const endpoint = schema.paths[path].delete;
    const args = {
      petId: '',
      api_key: 'mock api key'
    };
    const options = {
      method: 'delete',
      baseUrl: `http://${schema.host}${schema.basePath}`,
      path: path,
      args: args,
    };
    requestOptions = getRequestOptions(endpoint, options, null, schema.parameters);
    assert.deepEqual(requestOptions, {
      url: 'http://petstore.swagger.io/v2/pet/',
      method: 'delete',
      headers: {
        'content-type': 'application/json',
        api_key: 'mock api key'
      }
    });
  });
});

