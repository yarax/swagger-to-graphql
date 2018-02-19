const graphQLSchema = require('../lib');
const graphql = require('graphql');
const fs = require('fs');
const expect = require('chai').expect;

describe('Test Cases', () => {
  const directory = `${__dirname}/fixtures/`;
  fs.readdirSync(directory).forEach(file => {
    if (file.endsWith('.json')) {
      it(file, () => {
        return graphQLSchema(directory + file)
          .then((schema) => {
            const graphqlfile = directory + (file.replace('.json', '.graphql'));
            const graphschema = graphql.printSchema(schema);
            const expected = fs.readFileSync(graphqlfile, 'utf8');
            expect(graphschema).to.equal(expected);
          });
      });
    }
  });
});
