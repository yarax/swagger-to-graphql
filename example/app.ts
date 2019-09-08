import express from 'express';
import graphqlHTTP from 'express-graphql';
import { callBackend } from './request-promise';
import { createSchema } from '../src';

const app = express();

const pathToSwaggerSchema = `${__dirname}/../test/fixtures/petstore.yaml`;

createSchema({
  swaggerSchema: pathToSwaggerSchema,
  callBackend,
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
