const express = require('express');
const app = express();
var graphqlHTTP = require('express-graphql');
var graphql = require('graphql');
var graphQLSchema = require('./lib');

graphQLSchema('./petstore.json').then(schema => {
  app.use('/graphql', graphqlHTTP(req => {
    return {
      schema,
      context: {
        app,
        headers: req.headers
      },
      graphiql: true
    };
  }));

  const listener = app.listen(3009, 'localhost', () => {
    console.info(`Controller server is running here: http://localhost:3009`);
    app.listener = listener;
    app.emit('server:running');
  });
}).catch(e => {
  console.log(e);
  throw e;
});