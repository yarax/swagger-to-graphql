const graphQLSchema = require('../lib');

describe('petstore schema', () => {
  it('converting', (done) => {
    graphQLSchema(`${__dirname}/fixtures/petstore.json`).then(() => done()).catch(done);
  });
});