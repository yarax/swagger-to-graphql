import nock from 'nock';
import { expect } from 'chai';
import { callBackend } from '../example/request-promise';

describe('request-promise', () => {
  beforeEach(() => {
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('should make json http calls', async () => {
    const nockScope = nock('http://mock-host')
      .post('/mock-uri?query-params=a&query-params=b', {
        mockBodyKey: 'mock body value',
      })
      .matchHeader('mock-header', 'mock header value')
      .matchHeader('content-type', 'application/json')
      .reply(200, 'mock result');

    const result = await callBackend({
      requestOptions: {
        method: 'post',
        baseUrl: 'http://mock-host',
        path: '/mock-uri',
        headers: {
          'mock-header': 'mock header value',
        },
        query: {
          'query-params': ['a', 'b'],
        },
        body: {
          mockBodyKey: 'mock body value',
        },
        bodyType: 'json',
      },
      context: {},
    });

    expect(result).to.equal('mock result');

    nockScope.done();
  });

  it('should post formData', async () => {
    const nockScope = nock('http://mock-host')
      .post('/mock-uri', 'mockBodyKey=mock%20body%20value')
      .matchHeader('content-type', 'application/x-www-form-urlencoded')
      .reply(200, 'mock result');

    const result = await callBackend({
      requestOptions: {
        method: 'post',
        baseUrl: 'http://mock-host',
        path: '/mock-uri',
        body: {
          mockBodyKey: 'mock body value',
        },
        bodyType: 'formData',
      },
      context: {},
    });

    expect(result).to.equal('mock result');

    nockScope.done();
  });
});
