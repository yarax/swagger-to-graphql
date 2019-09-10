import { expect } from 'chai';

import {
  EndpointParam,
  getRequestOptions,
  RequestOptionsInput,
} from '../src/getRequestOptions';

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
  it('should add request body', () => {
    const options: RequestOptionsInput = {
      method: 'post',
      baseUrl,
      path: '/pet',
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
      baseUrl,
      path: '/pet',
      method: 'post',
      bodyType: 'json',
      body: { name: 'test' },
    });
  });

  it('should add request headers', () => {
    const options = {
      method: 'delete',
      baseUrl,
      path: '/pet',
      parameterDetails: [
        createParameterDetails({
          name: 'api_key',
          swaggerName: 'api_key',
          type: 'header',
        }),
      ],
      parameterValues: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        api_key: 'mock api key',
      },
    };
    const requestOptions = getRequestOptions(options);
    expect(requestOptions).to.deep.equal({
      baseUrl,
      path: '/pet',
      method: 'delete',
      bodyType: 'json',
      headers: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        api_key: 'mock api key',
      },
    });
  });

  it('should add query parameters', () => {
    const options = {
      method: 'delete',
      baseUrl,
      path: '/pet',
      parameterDetails: [
        createParameterDetails({
          name: 'id',
          swaggerName: 'swaggerId',
          type: 'query',
        }),
      ],
      parameterValues: {
        id: 'mock id',
      },
    };
    const requestOptions = getRequestOptions(options);
    expect(requestOptions).to.deep.equal({
      baseUrl,
      path: '/pet',
      method: 'delete',
      bodyType: 'json',
      query: { swaggerId: 'mock id' },
    });
  });

  it('should set path parameters', () => {
    const options: RequestOptionsInput = {
      method: 'get',
      baseUrl,
      path: '/{mock swaggerName}/',
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
      baseUrl,
      method: 'get',
      path: '/mock-path/',
      bodyType: 'json',
    });
  });

  it('should allow empty strings', () => {
    const path = '/pet/{petId}';
    const options = {
      method: 'delete',
      baseUrl,
      path,
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
      baseUrl,
      path: '/pet/',
      method: 'delete',
      bodyType: 'json',
    });
  });

  it('should send formdata', () => {
    const path = '/pet';
    const options: RequestOptionsInput = {
      method: 'post',
      baseUrl,
      path,
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
      baseUrl,
      method: 'post',
      path: '/pet',
      body: { name: 'mock name' },
      bodyType: 'formData',
    });
  });
});
