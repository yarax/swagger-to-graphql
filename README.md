# Swagger2GraphQL

Swagger2GraphQL converts your existing Swagger schema to GraphQL types where resolvers perform HTTP calls to certain real endpoints.
It allows you to move your API to GraphQL with nearly zero afford and maintain both: REST and GraphQL APIs.

<a href="https://medium.com/@raxwunter/moving-existing-api-from-rest-to-graphql-205bab22c184">Why?</a>

# Usage

## Basic server

```js
const express = require('express');
const app = express();
const graphqlHTTP = require('express-graphql');
const graphQLSchema = require('swagger-to-graphql');

graphQLSchema('./petstore.json').then(schema => {
  app.use('/graphql', graphqlHTTP(() => {
    return {
      schema,
      context: {
        GQLProxyBaseUrl: API_BASE_URL
      },
      graphiql: true
    };
  }));

  app.listen(3009, 'localhost', () => {
    console.info(`API is here localhost:3009/graphql`);
  });
}).catch(e => {
  throw e;
});
```

## CLI convertion

```
npm i -g swagger-to-graphql
swagger-to-graphql --swagger=/path/to/swagger_schema.json > ./types.graphql
```
## Authorization

Basic Auth example:
```js
 ...
  context: {
    GQLProxyBaseUrl: API_BASE_URL,
    headers: {
      Authorization: 'Basic YWRkOmJhc2ljQXV0aA==',
      "X-Custom": 'customValue'
    }
    BearerToken: req.get('authorization')
  },
 ...
```

Bearer Token example:
```js
 ...
  context: {
    GQLProxyBaseUrl: API_BASE_URL,
    headers: {
      Authorization: req.get('authorization'),
      "X-Custom": 'customValue'
    }
  },
 ...
```

<a href="https://github.com/yarax/swagger-to-graphql/blob/master/src/types.js#L3"> All context options </a>
