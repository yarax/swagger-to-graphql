import nock from 'nock';
import { expect } from 'chai';
import * as requestPromise from '../example/request-promise';
import * as nodeFetch from '../example/node-fetch';

type AdapterConfig = {
  name: string;
  callBackend: typeof requestPromise.callBackend;
}[];

const adapterConfig: AdapterConfig = [
  {
    name: 'request-promise',
    callBackend: requestPromise.callBackend,
  },
  {
    name: 'node-fetch',
    callBackend: nodeFetch.callBackend,
  },
];

adapterConfig.forEach(({ name, callBackend }) => {
  describe(name, () => {
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
        .post('/mock-uri', {
          mockBodyKey: 'mock body value',
        })
        .query({
          'query-params': 'a,b',
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
        .post('/mock-uri', body => {
          expect(body).to.deep.equal({
            mockBodyKey: 'mock body value',
          });
          return true;
        })
        .matchHeader('content-type', /application\/x-www-form-urlencoded/)
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
});
