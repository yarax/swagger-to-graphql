# Swagger2graphQL

Swagger2graphQL wraps your existing Swagger schema to GraphQL types where resolvers perform HTTP requests to certain real endpoints.
It allows you to move your API to GraphQL with nearly zero afford and maintain both: REST and GraphQL APIs.

```js
const express = require('express');
const app = express();
var graphqlHTTP = require('express-graphql');
var graphql = require('graphql');
var graphQLSchema = require('./lib');

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

  app.listen(3009, 'localhost', () => {
    console.info(`http://localhost:3009/graphql`);
  });
}).catch(e => {
  throw e;
});
```