![Build Status](https://travis-ci.org/yarax/swagger-to-graphql.svg?branch=master)

# Swagger-to-GraphQL

Swagger-to-GraphQL converts your existing Swagger schema to an executable GraphQL schema where resolvers perform HTTP calls
to certain real endpoints. It allows you to move your API to GraphQL with nearly zero effort and maintain both REST and
GraphQL APIs. Our CLI tool also allows you get the GraphQL schema in Schema Definition Language.

[Try it](https://0xr.github.io/swagger-to-graphql-web/) online! You can paste in the url to your own Swagger schema. There are
also public OpenAPI schemas available in the [APIs.guru OpenAPI directory](https://apis.guru/browse-apis/). Use the JSON version.

## Features

- Swagger (OpenAPI 2) and OpenAPI 3 support
- Bring you own HTTP client
- Typescript types included
- Runs in the browser
- Formdata request body
- Custom request headers

# Usage

## Basic server

This library will fetch your swagger schema, convert it to a GraphQL schema and convert GraphQL parameters to REST
parameters. From there you are control of making the actual REST call. This means you can reuse your existing HTTP
client, use existing authentication schemes and override any part of the REST call. You can override the REST host,
proxy incoming request headers along to your REST backend, add caching etc.

```typescript
import express, { Request } from 'express';
import graphqlHTTP from 'express-graphql';
import { createSchema, CallBackendArguments } from 'swagger-to-graphql';

const app = express();

// Define your own http client here
async function callBackend({
  context,
  requestOptions,
}: CallBackendArguments<Request>) {
  return 'Not implemented';
}

createSchema({
  swaggerSchema: `./petstore.yaml`,
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
```

Constructor (graphQLSchema) arguments:

```typescript
export interface Options<TContext> {
  swaggerSchema: string | JSONSchema;
  callBackend: (args: CallBackendArguments<TContext>) => Promise<any>;
}
```

- `swaggerUrl` (string) is a path or URL to your swagger schema file. _required_
- `callBackend` (async function) is called with all parameters needed to make a REST call as well as the GraphQL
  context.

## CLI usage

You can use the library just to convert schemas without actually running server

```
npx swagger-to-graphql --swagger-schema=/path/to/swagger_schema.json > ./types.graphql
```

## Defining your HTTP client

This repository has:

- [node-fetch example](./example/node-fetch.ts). Read more about [node-fetch](https://github.com/bitinn/node-fetch).
- [request-promise example](./example/request-promise.ts). Read more about [request](https://github.com/request/request).

To get started install `node-fetch` and copy the [node-fetch example](./example/node-fetch.ts) into your server.

```sh
npm install node-fetch --save
```

### Implementing your own HTTP client

There a [unit test](./test/http-adapters-test.ts) for our HTTP client example, it might be useful when implementing your
own client as well.

The function `callBackend` is called with 2 parameters:

- `context` is your GraphQL context. For `express-graphql` this is the incoming `request` object by default.
  [Read more](https://github.com/graphql/express-graphql#options). Use this if you want to proxy headers like
  `authorization`. For example `const authorizationHeader = context.get('authorization')`.
- `requestOptions` includes everything you need to make a REST call.

```typescript
export interface CallBackendArguments<TContext> {
  context: TContext;
  requestOptions: RequestOptions;
}
```

### RequestOptions

```typescript
export interface RequestOptions {
  baseUrl?: string;
  path: string;
  method: string;
  headers?: {
    [key: string]: string;
  };
  query?: {
    [key: string]: string | string[];
  };
  body?: any;
  bodyType: 'json' | 'formData';
}
```

- `baseUrl` like defined in your swagger schema: `http://my-backend/v2`
- `path` the next part of the url: `/widgets`
- `method` HTTP verb: `get`
- `headers` HTTP headers which are filled using GraphQL parameters: `{ api_key: 'xxxx-xxxx' }`. Note these are not the
  http headers sent to the GraphQL server itself. Those will be on the `context` parameter
- `query` Query parameters for this calls: `{ id: 123 }`. Note this can be an array. You can find some examples on how
  to deal with arrays in query parameters in the [qs documentation](https://github.com/ljharb/qs#stringifying).
- `body` the request payload to send with this REST call.
- `bodyType` how to encode your request payload. When the `bodyType` is `formData` the request should be URL encoded
  form data. Ensure your HTTP client sends the right `Content-Type` headers.

# Resources
- Blogpost v3: [Start with GraphQL today by converting your Swagger schema](https://xebia.com/blog/start-with-graphql-today-by-converting-your-swagger-schema/)
- Blogpost: [Moving existing API from REST to GraphQL](https://medium.com/@raxwunter/moving-existing-api-from-rest-to-graphql-205bab22c184)
- Video: [O.J. Sousa Rodrigues at Vienna.JS](https://www.youtube.com/watch?v=551gKWJEsK0&feature=youtu.be&t=1269")
