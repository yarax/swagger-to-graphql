require('babel-polyfill');
const express = require('express');
const app = express();
const graphqlHTTP = require('express-graphql');
const graphQLSchema = require('../lib');

graphQLSchema(`${__dirname}/../test/fixtures/petstore.yaml`).then(schema => {
  app.use('/graphql', graphqlHTTP(() => {
    return {
      schema,
      context: {
        GQLProxyBaseUrl: 'http://petstore.swagger.io/v2'
      },
      graphiql: true
    };
  }));

  app.listen(3009, 'localhost', () => {
    console.info('http://localhost:3009/graphql');
  });
}).catch(e => {
  console.log(e);
});
