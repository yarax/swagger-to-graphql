/* eslint-disable @typescript-eslint/camelcase */
import nock from 'nock';
import request from 'supertest';
import express, { Express } from 'express';
import graphqlHTTP from 'express-graphql';
import graphQLSchema from '../src';
import { createTestOptions } from './createTestOptions';

const createServer = async (
  ...args: Parameters<typeof graphQLSchema>
): Promise<Express> => {
  const app = express();
  const schema = await graphQLSchema(...args);
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

  describe('openapi 3', () => {
    it('should work with formdata', async () => {
      const nockScope = nock('http://petstore.swagger.io/v2')
        .post('/pet/1111', 'name=new%20name&status=new%20status')
        .reply(200, 'mock result');

      await request(
        await createServer(
          require.resolve('./fixtures/petstore-openapi3.yaml'),
          createTestOptions(),
        ),
      )
        .post('/graphql')
        .send({
          query: `
            mutation {
              updatePetWithForm(
                petId: "1111"
                name: "new name"
                status: "new status" 
              )
            }
          `,
        })
        .expect({
          data: {
            updatePetWithForm: 'mock result',
          },
        });

      nockScope.done();
    });
  });

  describe('special parameter names', () => {
    it('should convert graphql parameter names back to swagger parameter names', async () => {
      const nockScope = nock('http://mock.api.com/v2', {
        reqheaders: {
          'dashed-request-header': 'mock request header',
        },
      })
        .log(console.log)
        .get('/path/mock%20path')
        .query({
          'dashed-query-param': 'mock query param',
        })
        .reply(200, { result: 'mocked' });

      await request(
        await createServer(
          require.resolve('./fixtures/special-parameters.json'),
          createTestOptions(),
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
        await createServer(
          require.resolve('./fixtures/simple.json'),
          createTestOptions(),
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
        await createServer(
          require.resolve('./fixtures/return-scalar.json'),
          createTestOptions(),
        ),
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
