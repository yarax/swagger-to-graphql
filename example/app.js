/* eslint-disable no-console, @typescript-eslint/no-var-requires */
const express = require('express');

const app = express();
const graphqlHTTP = require('express-graphql');
const graphQLSchema = require('../lib');

const proxyUrl = 'http://petstore.swagger.io/v2';
const pathToSwaggerSchema = `${__dirname}/../test/fixtures/petstore.yaml`;
const customHeaders = {
  Authorization: 'Basic YWRkOmJhc2ljQXV0aA==',
};

const requestOptions = {
  gzip: false
};

graphQLSchema(pathToSwaggerSchema, proxyUrl, customHeaders, requestOptions)
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
