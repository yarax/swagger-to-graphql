import nock from 'nock';
import request from 'supertest';
import express from 'express';
import graphqlHTTP from 'express-graphql';
import graphQLSchema from '../src';

const getServer = async schemaPath => {
  const app = express();
  const schema = await graphQLSchema(schemaPath, 'http://mock-backend');
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
      await getServer(require.resolve('./fixtures/special-parameters.json')),
    )
      .post('/graphql')
      .send({
        query: `
query { get_path_dashed_path_param(
    dashed_request_header: "mock request header"
    dashed_query_param: "mock query param"
    dashed_path_param:"mock path")
  {
    result
  }
}`,
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
