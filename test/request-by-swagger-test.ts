import { expect } from 'chai';

import {
  getRequestOptions,
  RequestOptionsInput,
} from '../src/request-by-swagger';
import { EndpointParam } from '../src/types';

const baseUrl = 'http://mock-baseurl';

function createParameterDetails(
  override: Partial<EndpointParam>,
): EndpointParam {
  return {
    type: 'query',
    name: 'mock name',
    required: true,
    swaggerName: 'mock swaggerName',
    jsonSchema: {
      type: 'string',
    },
    ...override,
  };
}

describe('getRequestOptions', () => {
  it('should add request body to request options', () => {
    const url = '/pet';
    const options: RequestOptionsInput = {
      method: 'post',
      baseUrl,
      url,
      parameterDetails: [
        createParameterDetails({
          type: 'body',
          name: 'body',
        }),
      ],
      parameterValues: {
        body: { name: 'test' },
      },
    };
    const requestOptions = getRequestOptions(options);

    expect(requestOptions).to.deep.equal({
      url: 'http://mock-baseurl/pet',
      method: 'post',
      bodyType: 'json',
      headers: {},
      body: { name: 'test' },
      query: {},
    });
  });

  it('should add request headers to request options', () => {
    const url = '/pet/{petId}';
    const options = {
      method: 'delete',
      baseUrl,
      url,
      parameterDetails: [
        createParameterDetails({
          name: 'graphql name',
          swaggerName: 'petId',
          type: 'path',
        }),
        createParameterDetails({
          name: 'api_key',
          swaggerName: 'api_key',
          type: 'header',
        }),
      ],
      parameterValues: {
        'graphql name': 'mock-pet-id',
        // eslint-disable-next-line @typescript-eslint/camelcase
        api_key: 'mock api key',
      },
    };
    const requestOptions = getRequestOptions(options);
    expect(requestOptions).to.deep.equal({
      url: 'http://mock-baseurl/pet/mock-pet-id',
      method: 'delete',
      body: {},
      bodyType: 'json',
      headers: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        api_key: 'mock api key',
      },
      query: {},
    });
  });

  it('should allow empty strings', () => {
    const url = '/pet/{petId}';
    const options = {
      method: 'delete',
      baseUrl,
      url,
      parameterDetails: [
        createParameterDetails({
          name: 'petId',
          swaggerName: 'petId',
          type: 'path',
        }),
      ],
      parameterValues: {
        petId: '',
      },
    };
    const requestOptions = getRequestOptions(options);
    expect(requestOptions).to.deep.equal({
      url: 'http://mock-baseurl/pet/',
      method: 'delete',
      body: {},
      bodyType: 'json',
      headers: {},
      query: {},
    });
  });

  it('should send formdata', () => {
    const url = '/pet';
    const options: RequestOptionsInput = {
      method: 'post',
      baseUrl,
      url,
      formData: true,
      parameterDetails: [
        createParameterDetails({
          type: 'formData',
          name: 'name',
          swaggerName: 'name',
        }),
      ],
      parameterValues: {
        name: 'mock name',
      },
    };
    const requestOptions = getRequestOptions(options);

    expect(requestOptions).to.deep.equal({
      method: 'post',
      url: 'http://mock-baseurl/pet',
      query: {},
      headers: {},
      body: { name: 'mock name' },
      bodyType: 'formData',
    });
  });

  it('should set path parameters', () => {
    const options: RequestOptionsInput = {
      method: 'get',
      baseUrl,
      url: '/{mock swaggerName}/',
      formData: false,
      parameterDetails: [
        createParameterDetails({
          type: 'path',
        }),
      ],
      parameterValues: {
        'mock name': 'mock-path',
      },
    };
    const requestOptions = getRequestOptions(options);

    expect(requestOptions).to.deep.equal({
      method: 'get',
      url: 'http://mock-baseurl/mock-path/',
      query: {},
      headers: {},
      body: {},
      bodyType: 'json',
    });
  });
});
