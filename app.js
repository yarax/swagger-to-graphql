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
        GQLProxyBaseUrl: 'http://petstore.swagger.io/v2',
        //BearerToken: 'Bearer xxxx',
        //PfxCertFile: __dirname + '/path/to/cert.pfx',
        //PfxPassphraseFile: __dirname + '/path/to/passphrase.p12',
      },
      graphiql: true
    };
  }));

  app.listen(3009, 'localhost', () => {
    console.info(`http://localhost:3009/graphql`);
  });
}).catch(e => {
  console.log(e);
});
