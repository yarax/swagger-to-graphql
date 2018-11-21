const graphQLSchema = require('../lib');
const graphql = require('graphql');
const fs = require('fs');
const expect = require('chai').expect;

describe('Fixture', () => {
  const directory = `${__dirname}/fixtures/`;
  fs.readdirSync(directory).forEach(file => {
    if (file.endsWith('.json')) {
      describe(file, () => {
        const graphqlFile = file.replace('.json', '.graphql');
        it(`should convert to ${graphqlFile}`, () => {
          return graphQLSchema(directory + file)
            .then((schema) => {
              const graphqlfile = directory + graphqlFile;
              const graphschema = graphql.printSchema(schema);
              console.log(graphschema);
              const expected = fs.readFileSync(graphqlfile, 'utf8');
              expect(graphschema).to.equal(expected);
            });
        });
      })
    }
  });
});
