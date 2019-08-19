import request, { OptionsWithUrl } from 'request';
import { expect } from 'chai';

import {
  getRequestOptions,
  RequestOptionsInput,
} from '../src/request-by-swagger';
import { EndpointParam } from '../src/types';

let requestOptions: OptionsWithUrl;

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
    requestOptions = getRequestOptions(options);

    expect(requestOptions).to.deep.equal({
      url: 'http://mock-baseurl/pet',
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
    requestOptions = getRequestOptions(options);
    expect(requestOptions).to.deep.equal({
      url: 'http://mock-baseurl/pet/mock-pet-id',
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
    requestOptions = getRequestOptions(options);
    expect(requestOptions).to.deep.equal({
      url: 'http://mock-baseurl/pet/',
      method: 'delete',
      headers: {
        'content-type': 'application/json',
      },
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
          type: 'body',
          name: 'name',
          swaggerName: 'name',
        }),
      ],
      parameterValues: {
        name: 'mock name',
      },
    };
    requestOptions = getRequestOptions(options);

    expect(requestOptions).to.deep.equal({
      url: 'http://mock-baseurl/pet',
      method: 'post',
      json: false,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'name=mock name',
    });
  });
});
