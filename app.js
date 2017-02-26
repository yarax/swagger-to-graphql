const express = require('express');
const app = express();
var graphqlHTTP = require('express-graphql');
var graphql = require('graphql');
var graphQLSchema = require('./lib');
let host = 'localhost'
let port = 3009

graphQLSchema('./test/fixtures/petstore.json').then(schema => {
  app.use('/graphql', graphqlHTTP(() => {
    return {
      schema,
      context: {
        GQLProxyBaseUrl: 'http://petstore.swagger.io/v2'
      },
      graphiql: true
    };
  }));

  app.listen(port, host, () => {
    console.info(`http://${host}:${port}/graphql`);
  });
}).catch(e => {
  console.log(e);
});
