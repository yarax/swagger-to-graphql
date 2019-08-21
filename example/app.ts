import express from 'express';
import graphqlHTTP from 'express-graphql';
import requestPromise from 'request-promise';
import { IncomingMessage } from 'http';
import graphQLSchema from '../src';
import { CallBackendArguments } from '../src/types';

const app = express();

const pathToSwaggerSchema = `${__dirname}/../test/fixtures/petstore.yaml`;

graphQLSchema(pathToSwaggerSchema, {
  async callBackend({
    requestOptions: { method, body, baseUrl, path, query, headers, bodyType },
    context,
  }: CallBackendArguments<IncomingMessage>) {
    return requestPromise({
      ...(bodyType === 'json' && {
        json: true,
        body,
      }),
      ...(bodyType === 'formData' && {
        form: body,
      }),
      qs: query,
      method,
      headers: {
        ...headers,
        ...{ authorization: context.headers.authorization },
      },
      baseUrl,
      uri: path,
    });
  },
})
  .then(schema => {
    app.use(
      '/graphql',
      graphqlHTTP(() => {
        return {
          schema,
          graphiql: true,
        };
      }),
    );

    app.listen(3009, 'localhost', () => {
      console.info('http://localhost:3009/graphql');
    });
  })
  .catch(e => {
    console.log(e);
  });
