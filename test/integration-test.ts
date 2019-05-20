/* eslint-disable @typescript-eslint/camelcase */
import nock from 'nock';
import request from 'supertest';
import express from 'express';
import graphqlHTTP from 'express-graphql';
import graphQLSchema from '../src';

const createServer = async (path, ...schemaArgs) => {
  const app = express();
  const schema = await graphQLSchema(path, ...schemaArgs);
  app.use(
    '/graphql',
    graphqlHTTP(() => ({
      schema,
      graphiql: true,
    })),
  );
  return app;
};

describe('swagger-to-graphql', () => {
  beforeEach(() => {
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('special parameter names', () => {
    it('should convert graphql parameter names back to swagger parameter names', async () => {
      const nockScope = nock('http://mock-backend', {
        reqheaders: {
          'dashed-request-header': 'mock request header',
        },
      })
        .get('/path/mock%20path')
        .query({
          'dashed-query-param': 'mock query param',
        })
        .reply(200, { result: 'mocked' });

      await request(
        await createServer(
          require.resolve('./fixtures/special-parameters.json'),
          'http://mock-backend',
        ),
      )
        .post('/graphql')
        .send({
          query: `
            query { 
              get_path_dashed_path_param(
                dashed_request_header: "mock request header"
                dashed_query_param: "mock query param"
                dashed_path_param:"mock path"
              ) {
                result
              }
            }
            `,
        })
        .expect({
          data: {
            get_path_dashed_path_param: {
              result: 'mocked',
            },
          },
        });

      nockScope.done();
    });
  });

  describe('simple swagger schema', () => {
    const getMockPathQuery = `
        query { 
          get_mock_path {
            result
          }
        }
        `;
    it('should make a simple rest call', async () => {
      const nockScope = nock('http://mock-host')
        .get('/mock-basepath/mock-path')
        .reply(200, { result: 'mock result' });

      await request(
        await createServer(require.resolve('./fixtures/simple.json')),
      )
        .post('/graphql')
        .send({
          query: getMockPathQuery,
        })
        .expect({
          data: {
            get_mock_path: {
              result: 'mock result',
            },
          },
        });

      nockScope.done();
    });

    it('should pass request headers to the backend', async () => {
      const nockScope = nock('http://mock-host', {
        reqheaders: {
          MockRequestHeader: 'mock header value',
        },
      })
        .get('/mock-basepath/mock-path')
        .reply(200, { result: 'mock result' });

      await request(
        await createServer(require.resolve('./fixtures/simple.json')),
      )
        .post('/graphql')
        .send({
          query: getMockPathQuery,
        })
        .set('MockRequestHeader', 'mock header value')
        .expect({
          data: {
            get_mock_path: {
              result: 'mock result',
            },
          },
        });

      nockScope.done();
    });

    it('should allow overriding the base path with a string', async () => {
      const nockScope = nock('http://override-host')
        .get('/override-basepath/mock-path')
        .reply(200, { result: 'mock result' });

      await request(
        await createServer(
          require.resolve('./fixtures/simple.json'),
          'http://override-host/override-basepath',
        ),
      )
        .post('/graphql')
        .send({
          query: getMockPathQuery,
        })
        .expect({
          data: {
            get_mock_path: {
              result: 'mock result',
            },
          },
        });

      nockScope.done();
    });

    it('should allow overriding the base path with a function', async () => {
      const nockScope = nock('http://api.override-host')
        .get('/override-basepath/mock-path')
        .reply(200, { result: 'mock result' });

      await request(
        await createServer(require.resolve('./fixtures/simple.json'), opts => {
          return `http://${opts
            .get('host')
            .replace('graphql', 'api')}/override-basepath`;
        }),
      )
        .post('/graphql')
        .send({
          query: getMockPathQuery,
        })
        .set('host', 'graphql.override-host')
        .expect({
          data: {
            get_mock_path: {
              result: 'mock result',
            },
          },
        });

      nockScope.done();
    });

    it('should allow overriding headers', async () => {
      const nockScope = nock('http://mock-host', {
        reqheaders: {
          OverrideHeader: 'mock header value',
        },
      })
        .get('/mock-basepath/mock-path')
        .reply(200, { result: 'mock result' });

      await request(
        await createServer(
          require.resolve('./fixtures/simple.json'),
          undefined,
          {
            OverrideHeader: 'mock header value',
          },
        ),
      )
        .post('/graphql')
        .send({
          query: getMockPathQuery,
        })
        .expect({
          data: {
            get_mock_path: {
              result: 'mock result',
            },
          },
        });

      nockScope.done();
    });
  });

  describe('return-scalar', () => {
    const getMockPathQuery = `
        query { 
          get_mock_path
        }
        `;
    it('should return scalars', async () => {
      const nockScope = nock('http://mock-host')
        .get('/mock-basepath/mock-path')
        .reply(200, 'mock result');

      await request(
        await createServer(require.resolve('./fixtures/return-scalar.json')),
      )
        .post('/graphql')
        .send({
          query: getMockPathQuery,
        })
        .expect({
          data: { get_mock_path: 'mock result' },
        });

      nockScope.done();
    });
  });
});
