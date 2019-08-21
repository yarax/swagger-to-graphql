import express from 'express';
import graphqlHTTP from 'express-graphql';
import graphQLSchema from '../src';

const app = express();

const proxyUrl = 'http://petstore.swagger.io/v2';
const pathToSwaggerSchema = `${__dirname}/../test/fixtures/petstore.yaml`;
const customHeaders = {
  Authorization: 'Basic YWRkOmJhc2ljQXV0aA==',
};

graphQLSchema(pathToSwaggerSchema, proxyUrl, customHeaders)
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
